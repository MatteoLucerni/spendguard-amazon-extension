(() => {
  const BASE_SETTINGS = {
    show30Days: true,
    show3Months: true,
    interfaceLockEnabled: true,
    lockMode: 'normal',
    allowUnlockWhileLocked: true,
    lockStartTime: '09:00',
    lockEndTime: '18:00',
  };

  const PRODUCT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`;

  const TOPBAR_HTML = `
    <div class="mock-topbar">
      <div class="mock-logo"></div>
      <div class="mock-search"></div>
      <div class="mock-nav-pill"></div>
      <div class="mock-nav-pill"></div>
      <div class="mock-nav-pill"></div>
    </div>
  `;

  function mockButton(name, label, variant) {
    return `
      <span class="a-button mock-button-${variant}">
        <span class="a-button-inner">
          <input class="a-button-input" type="submit" name="${name}" aria-label="${label}">
          <span class="a-button-text">${label}</span>
        </span>
      </span>
    `;
  }

  function renderProductPage() {
    document.body.innerHTML = `
      ${TOPBAR_HTML}
      <div class="mock-main">
        <div class="mock-image">${PRODUCT_ICON_SVG}</div>
        <div>
          <h1 class="mock-title">Wireless Noise Cancelling Headphones</h1>
          <div class="mock-line mock-line--medium"></div>
          <div class="mock-line mock-line--short"></div>
          <div class="mock-price">$59.99</div>
          <div class="mock-line"></div>
          <div class="mock-line mock-line--medium"></div>
          <div class="mock-line"></div>
          <div class="mock-line mock-line--short"></div>
        </div>
        <div class="mock-card" id="mock-buy-box">
          <div class="mock-price" style="margin-top:0;">$59.99</div>
          <p class="mock-stock">In stock</p>
          ${mockButton('submit.add-to-cart', 'Add to Cart', 'secondary')}
          ${mockButton('submit.buy-now', 'Buy Now', 'primary')}
          <div class="mock-line mock-line--medium" style="margin-top:6px;"></div>
          <div class="mock-line mock-line--short"></div>
        </div>
      </div>
    `;
  }

  function renderCheckoutPage() {
    document.body.innerHTML = `
      ${TOPBAR_HTML}
      <div class="mock-main mock-main--checkout">
        <div class="mock-stack">
          <div class="mock-card">
            <p class="mock-label">Delivery address</p>
            <div class="mock-line mock-line--medium"></div>
            <div class="mock-line mock-line--short"></div>
          </div>
          <div class="mock-card">
            <p class="mock-label">Payment method</p>
            <div class="mock-line mock-line--short"></div>
          </div>
          <div class="mock-card">
            <p class="mock-label">Items</p>
            <div class="mock-line"></div>
            <div class="mock-line mock-line--medium"></div>
          </div>
        </div>
        <div>
          <div class="mock-card" id="subtotals">
            ${mockButton('placeYourOrder1', 'Place your order', 'primary')}
            <div class="mock-row"><span>Items</span><span>$59.99</span></div>
            <div class="mock-row"><span>Shipping</span><span>$0.00</span></div>
            <div class="mock-row mock-row--total"><span>Order total</span><span>$59.99</span></div>
          </div>
        </div>
      </div>
    `;
  }

  function buildWidgetData() {
    const demo = window.SCREENSHOT_DEMO;
    const month = demo.buildSpendingResponse('GET_SPENDING_30');
    const quarter = demo.buildSpendingResponse('GET_SPENDING_3M');
    return {
      total: month.total,
      orderCount: month.orderCount,
      limitReached: false,
      updatedAt30: month.updatedAt,
      symbol: month.symbol,
      allCurrencies30: month.allCurrencies,
      total3Months: quarter.total,
      orderCount3Months: quarter.orderCount,
      limitReached3Months: false,
      updatedAt3M: quarter.updatedAt,
      allCurrencies3M: quarter.allCurrencies,
    };
  }

  function applySettings(overrides) {
    saveSettings({ ...BASE_SETTINGS, ...overrides });
  }

  function placeWidgetOn(side) {
    localStorage.setItem(
      'amz-popup-state',
      JSON.stringify({ isMinimized: false, side }),
    );
  }

  function freezeClock() {
    isInLockTimeRange = settings => Boolean(settings.interfaceLockEnabled);
    calculateTimeUntilUnlock = () => ({
      hours: 2,
      minutes: 14,
      seconds: 37,
      totalSeconds: 8077,
    });
  }

  const SCENES = {
    widget() {
      applySettings({});
      renderProductPage();
      injectPopup(buildWidgetData());
    },
    settings() {
      applySettings({});
      renderProductPage();
      injectPopup(buildWidgetData());
      showSettingsView();
    },
    'normal-lock'() {
      applySettings({});
      placeWidgetOn('left');
      renderProductPage();
      injectPopup(buildWidgetData());
      initPurchaseLock();
      const buyNow = document.querySelector('input[name="submit.buy-now"]');
      showPurchaseLockCallout(buyNow.closest('.a-button'));
    },
    'checkout-lock'() {
      applySettings({});
      renderCheckoutPage();
      initPurchaseLock();
      showCheckoutLockNotice();
    },
    'hard-lock'() {
      applySettings({ lockMode: 'hard' });
      renderProductPage();
      const month = window.SCREENSHOT_DEMO.buildSpendingResponse('GET_SPENDING_30');
      showLockOverlay(getSettings(), {
        total: month.total,
        allCurrencies: month.allCurrencies,
      });
      injectPopup(buildWidgetData());
    },
    'checkout-warning'() {
      applySettings({ interfaceLockEnabled: false });
      renderCheckoutPage();
      const month = window.SCREENSHOT_DEMO.buildSpendingResponse('GET_SPENDING_30');
      injectCheckoutAlert(month.total, 'This month', month.allCurrencies);
    },
  };

  const sceneName = new URLSearchParams(window.location.search).get('scene');
  const scene = SCENES[sceneName];

  freezeClock();
  localStorage.removeItem('amz-popup-state');

  if (!scene) {
    document.body.textContent = `Unknown scene: ${sceneName}`;
    return;
  }
  scene();
})();
