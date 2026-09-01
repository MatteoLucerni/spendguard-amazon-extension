importScripts('src/constants.js');

chrome.runtime.setUninstallURL('https://forms.gle/xnYk8M4eSxgzgiMT7');

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://getspendguard.com/#features' });
  }
});

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
        monthTotal: 0,
        monthUnparsed: 0,
        hasMonthData: false,
        orderCount: 0,
        symbol: config.symbol,
        currency: curr,
      };
    }
    byCurrency[curr].total += value.data.total || 0;
    byCurrency[curr].orderCount += value.data.orderCount || 0;
    if (value.data.monthTotal !== undefined) {
      byCurrency[curr].hasMonthData = true;
      byCurrency[curr].monthTotal += value.data.monthTotal || 0;
      byCurrency[curr].monthUnparsed += value.data.monthUnparsed || 0;
    }
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

// Month names for a locale, generated rather than hardcoded for 21 domains.
// Only month and year ever matter, so the day is never parsed.
function buildMonthContext(locale) {
  const now = new Date();
  const names = [];

  for (const style of ['long', 'short']) {
    const fmt = new Intl.DateTimeFormat(locale || 'en-US', { month: style });
    for (let m = 0; m < 12; m++) {
      const name = fmt.format(new Date(Date.UTC(2020, m, 15))).toLowerCase();
      if (/\d/.test(name)) continue; // numeric month names carry no signal
      names.push({ name, month: m + 1 });
    }
  }
  // longest first so a long name is never shadowed by a shorter one
  names.sort((a, b) => b.name.length - a.name.length);

  // Amazon renders dates as display text with no machine readable form, so a
  // purely numeric date has to be read positionally. Intl knows the field
  // order for the locale, which is what makes 03/04 decidable.
  const order = new Intl.DateTimeFormat(locale || 'en-US')
    .formatToParts(new Date(Date.UTC(2020, 2, 4)))
    .filter(p => p.type === 'day' || p.type === 'month' || p.type === 'year')
    .map(p => p.type);

  return { year: now.getFullYear(), month: now.getMonth() + 1, names, order };
}

// Injected into the order history page by chrome.scripting, which serialises
// it: this must stay self-contained, with no reference to any outer scope.
function scrapePageOrders(totalPatternStr, priceFormat, monthCtx) {
  const toAscii = str =>
    String(str)
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06f0-\u06f9]/g, d => String(d.charCodeAt(0) - 0x06f0));

  const parseAmount = raw => {
    let clean = toAscii(raw).replace(/[^\d.,]/g, '').trim();
    if (priceFormat === 'eu') {
      if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      } else if (clean.includes('.') && /^\d{1,3}(\.\d{3})+$/.test(clean)) {
        clean = clean.replace(/\./g, '');
      }
    } else {
      clean = clean.replace(/,/g, '');
    }
    return parseFloat(clean) || 0;
  };

  // Unambiguous forms only: a month name with a four digit year, or the CJK
  // year/month markers. A bare numeric date is left unparsed rather than
  // guessed at, because day-first and month-first cannot be told apart.
  const parseMonthYear = text => {
    const t = toAscii(text).toLowerCase();

    const cjk = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
    if (cjk) return { year: Number(cjk[1]), month: Number(cjk[2]) };

    const year = t.match(/(?:^|\D)(\d{4})(?:\D|$)/);

    if (year) {
      for (const entry of monthCtx.names) {
        if (t.includes(entry.name)) {
          return { year: Number(year[1]), month: entry.month };
        }
      }
    }

    // no month name: read the numeric form using the locale's own field order
    const numeric = t.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
    if (numeric && monthCtx.order && monthCtx.order.length === 3) {
      const values = [numeric[1], numeric[2], numeric[3]].map(Number);
      const picked = {};
      monthCtx.order.forEach((field, i) => {
        picked[field] = values[i];
      });
      if (picked.year && picked.month >= 1 && picked.month <= 12) {
        return { year: picked.year, month: picked.month };
      }
    }

    return null;
  };

  const totalRegex = new RegExp(totalPatternStr, 'i');
  const orderCount = document.querySelectorAll('.yohtmlc-order-id').length;
  const items = document.querySelectorAll('.order-header__header-list-item');

  let pageSum = 0;
  items.forEach(item => {
    if (!totalRegex.test(item.innerText)) return;
    const lines = item.innerText.trim().split('\n');
    const amount = parseAmount(lines[lines.length - 1]);
    if (amount > 0) pageSum += amount;
  });

  // Month to date needs every total paired with its own order's date, so the
  // orders have to be read per card rather than as one flat list. Anything
  // that cannot be paired is counted, never silently dropped: the caller
  // falls back to the 30 day figure rather than under-reporting a limit.
  let monthSum = 0;
  let monthUnparsed = 0;

  if (monthCtx) {
    const cards = document.querySelectorAll('.order-card, .js-order-card');
    if (!cards.length) {
      monthUnparsed = orderCount || 1;
    } else {
      cards.forEach(card => {
        const cardItems = card.querySelectorAll(
          '.order-header__header-list-item',
        );
        let amount = null;
        let when = null;

        cardItems.forEach(item => {
          const text = item.innerText || '';
          if (amount === null && totalRegex.test(text)) {
            const lines = text.trim().split('\n');
            amount = parseAmount(lines[lines.length - 1]);
          }
          if (when === null) when = parseMonthYear(text);
        });

        if (amount === null || amount <= 0) return; // cancelled or zero total
        if (!when) {
          monthUnparsed++;
          return;
        }
        if (when.year === monthCtx.year && when.month === monthCtx.month) {
          monthSum += amount;
        }
      });
    }
  }

  return {
    sum: pageSum,
    monthSum,
    monthUnparsed,
    orderCount,
    hasNextPage: !!document.querySelector('.a-pagination .a-last a'),
    isBlocked:
      document.body.innerText.includes('captcha') ||
      document.querySelector('form[action*="signin"]') !== null,
  };
}

async function scrapeSinglePage(
  filter,
  domain,
  domainConfig,
  startIndex = 0,
  monthCtx = null,
) {
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
              func: scrapePageOrders,
              args: [domainConfig.totalPattern, domainConfig.priceFormat, monthCtx],
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
  let monthSum = 0;
  let monthUnparsed = 0;

  // month to date is only derived from the 30 day window; the 3 month range
  // is a rolling figure where a calendar month has no meaning
  const monthCtx = filter === 'last30' ? buildMonthContext(domainConfig.locale) : null;

  for (let page = 0; page < maxPages; page++) {
    const result = await scrapeSinglePage(
      filter,
      domain,
      domainConfig,
      startIndex,
      monthCtx,
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
    monthSum += result.monthSum || 0;
    monthUnparsed += result.monthUnparsed || 0;

    if (!result.hasNextPage) {
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

  if (monthCtx && monthUnparsed > 0) {
    console.warn(
      `[SpendGuard] ${filter} - ${monthUnparsed} order(s) had no readable date; month to date is incomplete`,
    );
  }

  return {
    sum: totalSum,
    orderCount: totalOrders,
    limitReached,
    monthTotal: monthCtx ? monthSum : undefined,
    monthUnparsed: monthCtx ? monthUnparsed : undefined,
  };
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
            monthTotal:
              currentCurrency && currentCurrency.hasMonthData
                ? currentCurrency.monthTotal
                : undefined,
            monthUnparsed:
              currentCurrency && currentCurrency.hasMonthData
                ? currentCurrency.monthUnparsed
                : undefined,
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
          monthTotal: result.monthTotal,
          monthUnparsed: result.monthUnparsed,
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
            monthTotal:
              currentCurrency && currentCurrency.hasMonthData
                ? currentCurrency.monthTotal
                : undefined,
            monthUnparsed:
              currentCurrency && currentCurrency.hasMonthData
                ? currentCurrency.monthUnparsed
                : undefined,
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
          monthTotal: result.monthTotal,
          monthUnparsed: result.monthUnparsed,
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
