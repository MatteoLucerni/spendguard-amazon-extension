(() => {
  const DEMO_UPDATED_AT = Date.now() - 12 * 60 * 1000;
  const DEMO_SPENDING = {
    GET_SPENDING_30: { total: 248.37, orderCount: 7 },
    GET_SPENDING_3M: { total: 713.9, orderCount: 19 },
  };
  const store = {};

  function buildSpendingResponse(action) {
    const data = DEMO_SPENDING[action];
    if (!data) return { error: 'UNKNOWN_ACTION' };
    return {
      total: data.total,
      orderCount: data.orderCount,
      limitReached: false,
      updatedAt: DEMO_UPDATED_AT,
      symbol: '$',
      currency: 'USD',
      allCurrencies: [
        {
          total: data.total,
          orderCount: data.orderCount,
          symbol: '$',
          currency: 'USD',
        },
      ],
    };
  }

  function pickKeys(keys) {
    if (keys === null || keys === undefined) return { ...store };
    const list = Array.isArray(keys) ? keys : [keys];
    const result = {};
    list.forEach(key => {
      if (key in store) result[key] = store[key];
    });
    return result;
  }

  window.SCREENSHOT_DEMO = {
    updatedAt: DEMO_UPDATED_AT,
    spending: DEMO_SPENDING,
    buildSpendingResponse,
  };

  window.chrome = {
    runtime: {
      lastError: undefined,
      getURL: path => '../../' + path,
      sendMessage: (message, callback) => {
        const response = buildSpendingResponse(message && message.action);
        if (callback) callback(response);
      },
    },
    storage: {
      local: {
        get: (keys, callback) => {
          const result = pickKeys(keys);
          if (callback) callback(result);
          return Promise.resolve(result);
        },
        set: (items, callback) => {
          Object.assign(store, items);
          if (callback) callback();
          return Promise.resolve();
        },
        remove: (keys, callback) => {
          (Array.isArray(keys) ? keys : [keys]).forEach(key => delete store[key]);
          if (callback) callback();
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener: () => {},
      },
    },
  };
})();
