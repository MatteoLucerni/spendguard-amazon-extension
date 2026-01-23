const STORAGE_KEY_30 = 'amz_spending_cache_30';
const STORAGE_KEY_3M = 'amz_spending_cache_3m';
const CACHE_TIME = 1000 * 60 * 60 * 24; // 1 day

async function createTabWithRetry(url, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await chrome.tabs.create({
      url: url,
      active: false,
    }).catch(err => {
      lastError = err;
      return null;
    });

    if (result) {
      return result;
    }

    console.log(`[Amazon Tracker] Tab creation attempt ${attempt + 1} failed: ${lastError?.message}`);

    if (attempt < maxRetries - 1) {
      // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }

  // All retries failed
  throw lastError;
}

async function scrapeSinglePage(filter, startIndex = 0) {
  let url = `https://www.amazon.it/your-orders/orders?timeFilter=${filter}&_scraping=1`;
  if (startIndex > 0) {
    url += `&startIndex=${startIndex}`;
  }

  let tab;
  try {
    tab = await createTabWithRetry(url);
  } catch (err) {
    console.error(`[Amazon Tracker] Failed to create tab after retries: ${err.message}`);
    return { sum: 0, orderCount: 0, isBlocked: false, error: 'TAB_CREATE_FAILED' };
  }

  return new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        setTimeout(async () => {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                let pageSum = 0;
                let orderCount = 0;
                const items = document.querySelectorAll(
                  '.order-header__header-list-item',
                );

                items.forEach(item => {
                  if (/total|totale/i.test(item.innerText)) {
                    const lines = item.innerText.trim().split('\n');
                    const priceRaw = lines[lines.length - 1];
                    let clean = priceRaw.replace(/[^\d.,]/g, '').trim();
                    if (clean.includes('.') && clean.includes(',')) {
                      clean = clean.replace(/\./g, '').replace(',', '.');
                    } else if (clean.includes(',')) {
                      clean = clean.replace(',', '.');
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

async function scrapeWithTab(filter) {
  let totalSum = 0;
  let startIndex = 0;
  const maxPages = 20; // Limite per evitare troppe tab
  let totalOrders = 0;
  let limitReached = false;

  for (let page = 0; page < maxPages; page++) {
    const result = await scrapeSinglePage(filter, startIndex);

    if (result.error === 'TAB_CREATE_FAILED') {
      return { sum: -1, orderCount: 0, limitReached: false, error: 'TAB_CREATE_FAILED' };
    }

    if (result.isBlocked) {
      return { sum: -1, orderCount: 0, limitReached: false };
    }

    console.log(`[Amazon Tracker] ${filter} - Page ${page + 1}: ${result.orderCount} orders, €${result.sum.toFixed(2)}`);

    // Se non ci sono ordini in questa pagina, abbiamo finito
    if (result.orderCount === 0) {
      console.log(`[Amazon Tracker] ${filter} - No more orders found, stopping.`);
      break;
    }

    totalSum += result.sum;
    totalOrders += result.orderCount;

    // Amazon mostra 10 ordini per pagina, se ne troviamo meno significa che è l'ultima pagina
    if (result.orderCount < 10) {
      console.log(`[Amazon Tracker] ${filter} - Found less than 10 orders, this is the last page.`);
      break;
    }

    // Se abbiamo raggiunto il limite di pagine
    if (page === maxPages - 1) {
      console.log(`[Amazon Tracker] ${filter} - Reached page limit (${maxPages} pages)`);
      limitReached = true;
      break;
    }

    startIndex += 10;
  }

  console.log(`[Amazon Tracker] ${filter} TOTAL: ${totalOrders} orders, €${totalSum.toFixed(2)}${limitReached ? ' (limit reached)' : ''}`);

  return { sum: totalSum, orderCount: totalOrders, limitReached };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_SPENDING_30') {
    (async () => {
      const cached = await chrome.storage.local.get(STORAGE_KEY_30);
      const now = Date.now();

      if (!request.force && cached[STORAGE_KEY_30] && now - cached[STORAGE_KEY_30].ts < CACHE_TIME) {
        console.log('[Amazon Tracker] Using cached data for last 30 days');
        sendResponse({ ...cached[STORAGE_KEY_30].data, updatedAt: cached[STORAGE_KEY_30].ts });
      } else if (request.cacheOnly) {
        // Cache only mode: return empty if no valid cache
        console.log('[Amazon Tracker] Cache only mode: no valid cache for 30 days');
        sendResponse({ noCache: true });
      } else {
        console.log('[Amazon Tracker] Fetching last 30 days...');
        const result = await scrapeWithTab('last30');
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
          limitReached: result.limitReached
        };
        await chrome.storage.local.set({ [STORAGE_KEY_30]: { data, ts: now } });
        sendResponse({ ...data, updatedAt: now });
      }
    })();
    return true;
  }

  if (request.action === 'GET_SPENDING_3M') {
    (async () => {
      const cached = await chrome.storage.local.get(STORAGE_KEY_3M);
      const now = Date.now();

      if (!request.force && cached[STORAGE_KEY_3M] && now - cached[STORAGE_KEY_3M].ts < CACHE_TIME) {
        console.log('[Amazon Tracker] Using cached data for last 3 months');
        sendResponse({ ...cached[STORAGE_KEY_3M].data, updatedAt: cached[STORAGE_KEY_3M].ts });
      } else if (request.cacheOnly) {
        // Cache only mode: return empty if no valid cache
        console.log('[Amazon Tracker] Cache only mode: no valid cache for 3 months');
        sendResponse({ noCache: true });
      } else {
        console.log('[Amazon Tracker] Fetching last 3 months...');
        const result = await scrapeWithTab('months-3');
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
          limitReached: result.limitReached
        };
        await chrome.storage.local.set({ [STORAGE_KEY_3M]: { data, ts: now } });
        sendResponse({ ...data, updatedAt: now });
      }
    })();
    return true;
  }
});
