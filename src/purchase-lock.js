const PURCHASE_LOCK_CALLOUT_ID = 'amz-purchase-lock-callout';
const PURCHASE_LOCK_NOTICE_ID = 'amz-purchase-lock-notice';
const PURCHASE_LOCK_STYLE_ID = 'amz-purchase-lock-styles';
const PURCHASE_LOCK_ACTIVE_CLASS = 'amz-purchase-lock-active';
const PURCHASE_LOCK_SYNC_INTERVAL = 15000;
const PURCHASE_LOCK_CALLOUT_GAP = 8;
const PURCHASE_LOCK_VIEWPORT_MARGIN = 10;

const PURCHASE_INPUT_SELECTORS = [
  'input[name="submit.buy-now"]',
  'input[name^="submit.one-click"]',
  'input[name="proceedToRetailCheckout"]',
  'input[name="placeYourOrder1"]',
];

const PURCHASE_BUTTON_SELECTOR = [
  ...PURCHASE_INPUT_SELECTORS,
  '#buy-now-button',
  '[id="submit.buy-now"]',
  '#one-click-button',
  '#checkoutButtonId',
  '[data-feature-id="proceed-to-checkout-action"]',
  '#sc-buy-box-ptc-button',
  '.place-your-order-button',
  '#submitOrderButtonId',
  '#bottomSubmitOrderButtonId',
  '#placeYourOrder',
  '#buy-for-others-buy-button',
].join(', ');

const PURCHASE_BADGE_SELECTORS = [
  `.a-button:has(${PURCHASE_INPUT_SELECTORS.join(', ')})`,
  '#buy-for-others-buy-button',
];

const PURCHASE_LINK_PATTERN =
  /\/checkout\/entry\/|\/gp\/checkoutportal\/|\/gp\/cart\/desktop\/go-to-checkout/i;

const PURCHASE_FORM_PATTERN =
  /\/checkout\/entry\/|\/place-order|\/gp\/checkoutportal\/|\/gp\/buy\/spc\/handlers\/|\/digital\/bulk-checkout|\/api\/bifrost\/acquisitions\//i;

const PURCHASE_LOCK_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9900" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;

const PURCHASE_LOCK_BADGE_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FF9900' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='11' width='16' height='10' rx='2'/%3E%3Cpath d='M8 11V7a4 4 0 0 1 8 0v4'/%3E%3C/svg%3E";

let purchaseLockInitialized = false;
let purchaseLockIconUrl = '';
let purchaseLockSpendingData;
let purchaseLockCalloutAnchor = null;
let purchaseLockRepositionFrame = null;

function initPurchaseLock() {
  if (purchaseLockInitialized) return;
  purchaseLockInitialized = true;

  purchaseLockIconUrl = chrome.runtime.getURL('assets/images/icons/amz_icon.png');
  injectPurchaseLockStyles();
  syncPurchaseLockState();

  window.addEventListener('click', handlePurchaseClick, true);
  window.addEventListener('submit', handlePurchaseSubmit, true);
  setInterval(syncPurchaseLockState, PURCHASE_LOCK_SYNC_INTERVAL);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_KEY]) {
      syncPurchaseLockState();
    }
  });
}

function syncPurchaseLockState() {
  const active = isPurchaseLockActive(getSettings());
  document.documentElement.classList.toggle(PURCHASE_LOCK_ACTIVE_CLASS, active);
  if (active && window.location.href.includes('checkout')) {
    showCheckoutLockNotice();
  }
  if (!active) {
    closePurchaseLockCallout();
    const notice = document.getElementById(PURCHASE_LOCK_NOTICE_ID);
    if (notice) notice.remove();
  }
}

function injectPurchaseLockStyles() {
  if (document.getElementById(PURCHASE_LOCK_STYLE_ID)) return;

  const scoped = PURCHASE_BADGE_SELECTORS.map(
    selector => `html.${PURCHASE_LOCK_ACTIVE_CLASS} ${selector}`,
  );

  const style = document.createElement('style');
  style.id = PURCHASE_LOCK_STYLE_ID;
  style.textContent = `
    ${scoped.join(',\n    ')} { position: relative; }
    ${scoped.map(selector => `${selector}::after`).join(',\n    ')} {
      content: '';
      position: absolute;
      top: 50%;
      right: 8px;
      width: 20px;
      height: 20px;
      transform: translateY(-50%);
      border-radius: 50%;
      background: #232f3e url("${PURCHASE_LOCK_BADGE_ICON}") center / 12px no-repeat;
      box-shadow: 0 0 0 2px #ffffff;
      pointer-events: none;
      z-index: 2;
    }
    @keyframes amz-purchase-lock-in {
      0% { opacity: 0; transform: translateY(4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      #${PURCHASE_LOCK_CALLOUT_ID} { animation: none !important; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function getUrlPath(value) {
  try {
    return new URL(value, window.location.href).pathname;
  } catch (e) {
    return '';
  }
}

function findPurchaseTrigger(target) {
  if (!(target instanceof Element)) return null;
  if (target.closest(`#${PURCHASE_LOCK_CALLOUT_ID}, #${PURCHASE_LOCK_NOTICE_ID}`)) {
    return null;
  }

  const button = target.closest(PURCHASE_BUTTON_SELECTOR);
  if (button) return button.closest('.a-button') || button;

  const link = target.closest('a[href]');
  if (link && PURCHASE_LINK_PATTERN.test(getUrlPath(link.getAttribute('href')))) {
    return link;
  }

  return null;
}

function blockPurchaseEvent(event, anchor) {
  event.preventDefault();
  event.stopImmediatePropagation();
  showPurchaseLockCallout(anchor);
}

function handlePurchaseClick(event) {
  if (!isPurchaseLockActive(getSettings())) return;

  const trigger = findPurchaseTrigger(event.target);
  if (!trigger) return;

  blockPurchaseEvent(event, trigger);
}

function handlePurchaseSubmit(event) {
  if (!isPurchaseLockActive(getSettings())) return;

  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const submitter = event.submitter || null;
  const submitterTrigger = submitter ? findPurchaseTrigger(submitter) : null;
  const action =
    (submitter && submitter.getAttribute('formaction')) ||
    form.getAttribute('action') ||
    '';

  if (!submitterTrigger && !PURCHASE_FORM_PATTERN.test(getUrlPath(action))) {
    return;
  }

  blockPurchaseEvent(event, submitterTrigger || submitter || form);
}

function buildPurchaseLockSpendingLine(spendingData) {
  if (!spendingData) return '';

  const isMonth = spendingData.total !== undefined;
  const amount = isMonth ? spendingData.total : spendingData.total3Months;
  if (amount === undefined) return '';

  const rangeLabel = isMonth ? 'in the last 30 days' : 'in the last 3 months';
  const displayAmount = formatAmountHtml(
    spendingData.allCurrencies,
    amount,
    getCurrentDomainConfig().symbol,
  );
  return `You have already spent <strong style="color:#0f1111;">${displayAmount}</strong> ${rangeLabel}.`;
}

function withPurchaseLockSpendingData(callback) {
  if (purchaseLockSpendingData !== undefined) {
    callback(purchaseLockSpendingData);
    return;
  }
  loadSpendingDataForLock(spendingData => {
    purchaseLockSpendingData = spendingData;
    callback(spendingData);
  });
}

function buildPurchaseLockContent(settings, closable) {
  return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
      <span style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#232f3e;">
        ${purchaseLockIconUrl ? `<img src="${purchaseLockIconUrl}" alt="" style="width:16px; height:16px;">` : ''}
        SpendGuard
      </span>
      ${closable ? '<button type="button" data-amz-purchase-lock-close title="Close" style="background:none; border:none; cursor:pointer; padding:0 2px; margin:0; line-height:1; color:#565959; font-size:18px;">×</button>' : ''}
    </div>
    <div style="display:flex; align-items:center; gap:6px; font-size:14px; font-weight:700; color:#0f1111; margin-bottom:4px;">
      ${PURCHASE_LOCK_ICON_SVG}
      <span>Purchases are locked until ${settings.lockEndTime}</span>
    </div>
    <div style="font-size:13px; color:#565959; line-height:1.4;">
      SpendGuard is blocking checkout during your lock hours. You can keep browsing and adding items to your cart.
    </div>
    <div data-amz-purchase-lock-spending style="font-size:13px; color:#565959; line-height:1.4; margin-top:6px;"></div>
  `;
}

function fillPurchaseLockSpending(container) {
  withPurchaseLockSpendingData(spendingData => {
    const slot = container.querySelector('[data-amz-purchase-lock-spending]');
    if (!slot) return;
    const line = buildPurchaseLockSpendingLine(spendingData);
    if (line) {
      slot.innerHTML = line;
    } else {
      slot.remove();
    }
  });
}

function positionPurchaseLockCallout() {
  purchaseLockRepositionFrame = null;

  const callout = document.getElementById(PURCHASE_LOCK_CALLOUT_ID);
  if (!callout) return;

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const width = callout.offsetWidth;
  const height = callout.offsetHeight;
  const anchor = purchaseLockCalloutAnchor;

  if (!anchor || !anchor.isConnected) {
    closePurchaseLockCallout();
    return;
  }

  const rect = anchor.getBoundingClientRect();
  const margin = PURCHASE_LOCK_VIEWPORT_MARGIN;
  const maxLeft = Math.max(margin, vw - width - margin);
  const maxTop = Math.max(margin, vh - height - margin);

  let left;
  let top;
  if (rect.width === 0 && rect.height === 0) {
    left = (vw - width) / 2;
    top = vh - height - margin;
  } else {
    left = rect.left + rect.width / 2 - width / 2;
    const below = rect.bottom + PURCHASE_LOCK_CALLOUT_GAP;
    const above = rect.top - PURCHASE_LOCK_CALLOUT_GAP - height;
    const fitsBelow = below + height <= vh - margin;
    top = fitsBelow || above < margin ? below : above;
  }

  callout.style.left = Math.max(margin, Math.min(left, maxLeft)) + 'px';
  callout.style.top = Math.max(margin, Math.min(top, maxTop)) + 'px';
}

function schedulePurchaseLockReposition() {
  if (purchaseLockRepositionFrame !== null) return;
  purchaseLockRepositionFrame = requestAnimationFrame(positionPurchaseLockCallout);
}

function handlePurchaseLockOutsideClick(event) {
  const callout = document.getElementById(PURCHASE_LOCK_CALLOUT_ID);
  if (callout && !callout.contains(event.target)) {
    closePurchaseLockCallout();
  }
}

function handlePurchaseLockKeydown(event) {
  if (event.key === 'Escape') {
    closePurchaseLockCallout();
  }
}

function closePurchaseLockCallout() {
  const callout = document.getElementById(PURCHASE_LOCK_CALLOUT_ID);
  if (callout) callout.remove();

  purchaseLockCalloutAnchor = null;
  if (purchaseLockRepositionFrame !== null) {
    cancelAnimationFrame(purchaseLockRepositionFrame);
    purchaseLockRepositionFrame = null;
  }
  window.removeEventListener('scroll', schedulePurchaseLockReposition, true);
  window.removeEventListener('resize', schedulePurchaseLockReposition);
  document.removeEventListener('click', handlePurchaseLockOutsideClick);
  document.removeEventListener('keydown', handlePurchaseLockKeydown);
}

function showPurchaseLockCallout(anchor) {
  closePurchaseLockCallout();

  const settings = getSettings();
  const rc = getResponsiveConfig();
  const calloutWidth = Math.min(
    320,
    rc.popupMaxWidth,
    document.documentElement.clientWidth - 2 * PURCHASE_LOCK_VIEWPORT_MARGIN,
  );
  const callout = document.createElement('div');
  callout.id = PURCHASE_LOCK_CALLOUT_ID;
  callout.setAttribute('role', 'alert');

  Object.assign(callout.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    zIndex: '2147483647',
    width: calloutWidth + 'px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    border: '1px solid #d5d9d9',
    borderLeft: '4px solid #FF9900',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(15,17,17,0.2)',
    padding: '12px',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    textAlign: 'left',
    animation: 'amz-purchase-lock-in 0.2s ease-out',
  });

  callout.innerHTML = buildPurchaseLockContent(settings, true);
  document.body.appendChild(callout);

  callout.querySelector('[data-amz-purchase-lock-close]').onclick = closePurchaseLockCallout;

  purchaseLockCalloutAnchor = anchor;
  positionPurchaseLockCallout();
  fillPurchaseLockSpending(callout);

  window.addEventListener('scroll', schedulePurchaseLockReposition, true);
  window.addEventListener('resize', schedulePurchaseLockReposition);
  document.addEventListener('click', handlePurchaseLockOutsideClick);
  document.addEventListener('keydown', handlePurchaseLockKeydown);
}

function showCheckoutLockNotice() {
  if (document.getElementById(PURCHASE_LOCK_NOTICE_ID)) return;

  const subtotals = document.getElementById('subtotals');
  if (!subtotals || !subtotals.parentNode) return;

  const spendingAlert = document.getElementById('amz-spending-checkout-alert');
  if (spendingAlert) spendingAlert.remove();

  const notice = document.createElement('div');
  notice.id = PURCHASE_LOCK_NOTICE_ID;
  Object.assign(notice.style, {
    backgroundColor: '#ffffff',
    border: '1px solid #d5d9d9',
    borderLeft: '4px solid #FF9900',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    textAlign: 'left',
  });

  notice.innerHTML = buildPurchaseLockContent(getSettings(), false);
  subtotals.parentNode.insertBefore(notice, subtotals.nextSibling);
  fillPurchaseLockSpending(notice);
}
