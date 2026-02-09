importScripts('src/constants.js');

const CACHE_TIME = 1000 * 60 * 60 * 24;

function getStorageKey(period, domain) {
  return `amz_spending_cache_${period}_${domain}`;
}

async function aggregateAllDomains(period) {
  const allData = await chrome.storage.local.get(null);
  const prefix = `amz_spending_cache_${period}_`;
  const now = Date.now();
  const byCurrency = {};

  for (const [key, value] of Object.entries(allData)) {
    if (!key.startsWith(prefix)) continue;
    if (!value || !value.data) continue;
    if (now - value.ts > CACHE_TIME) continue;

    const domain = key.substring(prefix.length);
    const config = getAmazonDomainConfig(domain);
    const curr = config.currency;

    if (!byCurrency[curr]) {
      byCurrency[curr] = {
        total: 0,
        orderCount: 0,
        symbol: config.symbol,
        currency: curr,
      };
    }
    byCurrency[curr].total += value.data.total || 0;
    byCurrency[curr].orderCount += value.data.orderCount || 0;
  }

  const expiredKeys = [];
  for (const [key, value] of Object.entries(allData)) {
    if (!key.startsWith(prefix)) continue;
    if (value && value.data && now - value.ts > CACHE_TIME) {
      expiredKeys.push(key);
    }
  }
  if (expiredKeys.length > 0) {
    chrome.storage.local.remove(expiredKeys);
  }

  return Object.values(byCurrency).sort((a, b) => b.total - a.total);
}

function getDomainFromSender(sender) {
  try {
    const url = sender.tab?.url || sender.url || '';
    if (url) {
      const hostname = new URL(url).hostname;
      if (AMAZON_DOMAINS[hostname]) return hostname;
      console.warn(
        `[SpendGuard] Unknown domain: ${hostname}, ignoring request`,
      );
    }
  } catch (e) {}
  return null;
}

async function createTabWithRetry(url, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await chrome.tabs
      .create({
        url: url,
        active: false,
      })
      .catch(err => {
        lastError = err;
        return null;
      });

    if (result) {
      return result;
    }

    console.log(
      `[SpendGuard] Tab creation attempt ${attempt + 1} failed: ${lastError?.message}`,
    );

    if (attempt < maxRetries - 1) {
      // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
      await new Promise(resolve =>
        setTimeout(resolve, 500 * Math.pow(2, attempt)),
      );
    }
  }

  // All retries failed
  throw lastError;
}

async function scrapeSinglePage(filter, domain, domainConfig, startIndex = 0) {
  let url = `https://${domain}/your-orders/orders?timeFilter=${filter}&_scraping=1`;
  if (startIndex > 0) {
    url += `&startIndex=${startIndex}`;
  }

  let tab;
  try {
    tab = await createTabWithRetry(url);
  } catch (err) {
    console.error(
      `[SpendGuard] Failed to create tab after retries: ${err.message}`,
    );
    return {
      sum: 0,
      orderCount: 0,
      isBlocked: false,
      error: 'TAB_CREATE_FAILED',
    };
  }

  return new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        setTimeout(async () => {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (totalPatternStr, priceFormat) => {
                let pageSum = 0;
                let orderCount = 0;
                const totalRegex = new RegExp(totalPatternStr, 'i');
                const items = document.querySelectorAll(
                  '.order-header__header-list-item',
                );

                items.forEach(item => {
                  if (totalRegex.test(item.innerText)) {
                    const lines = item.innerText.trim().split('\n');
                    const priceRaw = lines[lines.length - 1];
                    let clean = priceRaw.replace(/[^\d.,]/g, '').trim();
                    if (priceFormat === 'eu') {
                      if (clean.includes('.') && clean.includes(',')) {
                        clean = clean.replace(/\./g, '').replace(',', '.');
                      } else if (clean.includes(',')) {
                        clean = clean.replace(',', '.');
                      } else if (
                        clean.includes('.') &&
                        /^\d{1,3}(\.\d{3})+$/.test(clean)
                      ) {
                        clean = clean.replace(/\./g, '');
                      }
                    } else if (priceFormat === 'jp') {
                      clean = clean.replace(/,/g, '');
                    } else {
                      clean = clean.replace(/,/g, '');
                    }
                    const amount = parseFloat(clean) || 0;
                    if (amount > 0) {
                      pageSum += amount;
                      orderCount++;
                    }
                  }
                });

                return {
                  sum: pageSum,
                  orderCount: orderCount,
                  isBlocked:
                    document.body.innerText.includes('captcha') ||
                    document.querySelector('form[action*="signin"]') !== null,
                };
              },
              args: [domainConfig.totalPattern, domainConfig.priceFormat],
            });

            const data = results[0].result;
            chrome.tabs.remove(tab.id);

            resolve(data);
          } catch (err) {
            chrome.tabs.remove(tab.id);
            resolve({ sum: 0, orderCount: 0, isBlocked: false });
          }
        }, 2000);
      }
    });
  });
}

async function scrapeWithTab(filter, domain, domainConfig) {
  let totalSum = 0;
  let startIndex = 0;
  const maxPages = 20;
  let totalOrders = 0;
  let limitReached = false;

  for (let page = 0; page < maxPages; page++) {
    const result = await scrapeSinglePage(
      filter,
      domain,
      domainConfig,
      startIndex,
    );

    if (result.error === 'TAB_CREATE_FAILED') {
      return {
        sum: -1,
        orderCount: 0,
        limitReached: false,
        error: 'TAB_CREATE_FAILED',
      };
    }

    if (result.isBlocked) {
      return { sum: -1, orderCount: 0, limitReached: false };
    }

    console.log(
      `[SpendGuard] ${filter} - Page ${page + 1}: ${result.orderCount} orders, ${domainConfig.symbol}${result.sum.toFixed(2)}`,
    );

    if (result.orderCount === 0) {
      console.log(`[SpendGuard] ${filter} - No more orders found, stopping.`);
      break;
    }

    totalSum += result.sum;
    totalOrders += result.orderCount;

    if (result.orderCount < 10) {
      console.log(
        `[SpendGuard] ${filter} - Found less than 10 orders, this is the last page.`,
      );
      break;
    }

    if (page === maxPages - 1) {
      console.log(
        `[SpendGuard] ${filter} - Reached page limit (${maxPages} pages)`,
      );
      limitReached = true;
      break;
    }

    startIndex += 10;
  }

  console.log(
    `[SpendGuard] ${filter} TOTAL: ${totalOrders} orders, ${domainConfig.symbol}${totalSum.toFixed(2)}${limitReached ? ' (limit reached)' : ''}`,
  );

  return { sum: totalSum, orderCount: totalOrders, limitReached };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_SPENDING_30') {
    (async () => {
      const domain = getDomainFromSender(sender);
      if (!domain) {
        sendResponse({ error: 'UNKNOWN_DOMAIN' });
        return;
      }
      const domainConfig = getAmazonDomainConfig(domain);
      const storageKey = getStorageKey('30', domain);
      const cached = await chrome.storage.local.get(storageKey);
      const now = Date.now();

      if (
        !request.force &&
        cached[storageKey] &&
        now - cached[storageKey].ts < CACHE_TIME
      ) {
        console.log('[SpendGuard] Using cached data for last 30 days');
        const allCurrencies = await aggregateAllDomains('30');
        sendResponse({
          ...cached[storageKey].data,
          updatedAt: cached[storageKey].ts,
          symbol: domainConfig.symbol,
          currency: domainConfig.currency,
          allCurrencies,
        });
      } else if (request.cacheOnly) {
        const allCurrencies = await aggregateAllDomains('30');
        if (allCurrencies.length > 0) {
          const currentCurrency = allCurrencies.find(
            c => c.currency === domainConfig.currency,
          );
          sendResponse({
            total: currentCurrency ? currentCurrency.total : 0,
            orderCount: currentCurrency ? currentCurrency.orderCount : 0,
            symbol: domainConfig.symbol,
            currency: domainConfig.currency,
            allCurrencies,
          });
        } else {
          sendResponse({ noCache: true });
        }
      } else {
        console.log('[SpendGuard] Fetching last 30 days...');
        const result = await scrapeWithTab('last30', domain, domainConfig);
        if (result.sum === -1) {
          if (result.error === 'TAB_CREATE_FAILED') {
            sendResponse({ error: 'TAB_CREATE_FAILED' });
          } else {
            sendResponse({ error: 'AUTH_REQUIRED' });
          }
          return;
        }

        const data = {
          total: result.sum,
          orderCount: result.orderCount,
          limitReached: result.limitReached,
        };
        await chrome.storage.local.set({ [storageKey]: { data, ts: now } });
        const allCurrencies = await aggregateAllDomains('30');
        sendResponse({
          ...data,
          updatedAt: now,
          symbol: domainConfig.symbol,
          currency: domainConfig.currency,
          allCurrencies,
        });
      }
    })();
    return true;
  }

  if (request.action === 'GET_SPENDING_3M') {
    (async () => {
      const domain = getDomainFromSender(sender);
      if (!domain) {
        sendResponse({ error: 'UNKNOWN_DOMAIN' });
        return;
      }
      const domainConfig = getAmazonDomainConfig(domain);
      const storageKey = getStorageKey('3m', domain);
      const cached = await chrome.storage.local.get(storageKey);
      const now = Date.now();

      if (
        !request.force &&
        cached[storageKey] &&
        now - cached[storageKey].ts < CACHE_TIME
      ) {
        console.log('[SpendGuard] Using cached data for last 3 months');
        const allCurrencies = await aggregateAllDomains('3m');
        sendResponse({
          ...cached[storageKey].data,
          updatedAt: cached[storageKey].ts,
          symbol: domainConfig.symbol,
          currency: domainConfig.currency,
          allCurrencies,
        });
      } else if (request.cacheOnly) {
        const allCurrencies = await aggregateAllDomains('3m');
        if (allCurrencies.length > 0) {
          const currentCurrency = allCurrencies.find(
            c => c.currency === domainConfig.currency,
          );
          sendResponse({
            total: currentCurrency ? currentCurrency.total : 0,
            orderCount: currentCurrency ? currentCurrency.orderCount : 0,
            symbol: domainConfig.symbol,
            currency: domainConfig.currency,
            allCurrencies,
          });
        } else {
          sendResponse({ noCache: true });
        }
      } else {
        console.log('[SpendGuard] Fetching last 3 months...');
        const result = await scrapeWithTab('months-3', domain, domainConfig);
        if (result.sum === -1) {
          if (result.error === 'TAB_CREATE_FAILED') {
            sendResponse({ error: 'TAB_CREATE_FAILED' });
          } else {
            sendResponse({ error: 'AUTH_REQUIRED' });
          }
          return;
        }

        const data = {
          total: result.sum,
          orderCount: result.orderCount,
          limitReached: result.limitReached,
        };
        await chrome.storage.local.set({ [storageKey]: { data, ts: now } });
        const allCurrencies = await aggregateAllDomains('3m');
        sendResponse({
          ...data,
          updatedAt: now,
          symbol: domainConfig.symbol,
          currency: domainConfig.currency,
          allCurrencies,
        });
      }
    })();
    return true;
  }
});
