const STORAGE_KEY_30 = 'amz_spending_cache_30';
const STORAGE_KEY_3M = 'amz_spending_cache_3m';
const CACHE_TIME = 1000 * 60 * 60 * 24; // 1 day

async function scrapeSinglePage(filter, startIndex = 0) {
  let url = `https://www.amazon.it/your-orders/orders?timeFilter=${filter}&_scraping=1`;
  if (startIndex > 0) {
    url += `&startIndex=${startIndex}`;
  }

  const tab = await chrome.tabs.create({
    url: url,
    active: false,
  });

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
      } else {
        console.log('[Amazon Tracker] Fetching last 30 days...');
        const result = await scrapeWithTab('last30');
        if (result.sum === -1) {
          sendResponse({ error: 'AUTH_REQUIRED' });
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
      } else {
        console.log('[Amazon Tracker] Fetching last 3 months...');
        const result = await scrapeWithTab('months-3');
        if (result.sum === -1) {
          sendResponse({ error: 'AUTH_REQUIRED' });
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
