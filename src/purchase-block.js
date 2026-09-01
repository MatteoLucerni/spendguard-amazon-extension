const PURCHASE_BLOCK_BANNER_ID = 'amz-purchase-block-banner';

let purchaseBlockObserver = null;
let purchaseBlockRescanTimer = null;
let purchaseBlockFlashTimer = null;

function disablePurchaseControls() {
  const controls = document.querySelectorAll(PURCHASE_CONTROL_SELECTORS);

  controls.forEach(control => {
    if (control.dataset.amzPurchaseBlocked === '1') return;
    control.dataset.amzPurchaseBlocked = '1';

    if ('disabled' in control) {
      control.disabled = true;
    }
    control.setAttribute('aria-disabled', 'true');
    control.style.opacity = '0.45';
    control.style.cursor = 'not-allowed';
    control.title = 'Blocked by SpendGuard: spending limit reached';
  });

  return controls.length;
}

// Amazon wraps its buy buttons as span.a-button > span.a-button-inner > input,
// so a click often lands on the wrapper rather than the control itself. closest()
// only walks up, so look inside a button wrapper as well - bounded to .a-button
// so that a click on some outer container cannot match every buy control on the
// page and swallow unrelated clicks.
function findBlockedControl(target) {
  const direct = target.closest(PURCHASE_CONTROL_SELECTORS);
  if (direct) return direct;

  const wrapper = target.closest('.a-button, .a-button-inner');
  return wrapper ? wrapper.querySelector(PURCHASE_CONTROL_SELECTORS) : null;
}

// disabled inputs stop mouse and keyboard activation on their own, but Amazon
// re-renders buy boxes and swaps controls in; this catches anything a rescan
// has not reached yet.
function handleBlockedPurchaseClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  if (!findBlockedControl(target)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  flashPurchaseBlockBanner();
}

// a submitted form is the other way a purchase starts: Amazon's own scripts can
// submit the buy box without the click ever reaching the control. Note that a
// script calling form.submit() directly fires no event at all and cannot be
// caught from a content script - checkout is locked outright for that reason.
function handleBlockedPurchaseSubmit(event) {
  const form = event.target;
  if (!form || typeof form.querySelector !== 'function') return;
  if (!form.querySelector(PURCHASE_CONTROL_SELECTORS)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  flashPurchaseBlockBanner();
}

function buildPurchaseBlockBanner(settings, spendingData) {
  const symbol = getCurrentDomainConfig().symbol;
  const spent = Math.round(spendingData.total);
  const limit = Math.round(Number(settings.spendingLimitAmount));

  const banner = document.createElement('div');
  banner.id = PURCHASE_BLOCK_BANNER_ID;

  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '2147483646',
    backgroundColor: '#232f3e',
    color: '#ffffff',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    fontSize: '13px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    transition: 'background-color .2s',
  });

  banner.innerHTML = `
    <svg style="flex-shrink:0;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <span>Buying is blocked &mdash; you have spent <strong style="color:#ff9900;">${spent} ${symbol}</strong> of your ${limit} ${symbol} limit in the last 30 days. Browsing still works.</span>
  `;

  return banner;
}

function showPurchaseBlockBanner(settings, spendingData) {
  if (document.getElementById(PURCHASE_BLOCK_BANNER_ID)) return;
  if (!spendingData) return;

  document.body.appendChild(buildPurchaseBlockBanner(settings, spendingData));
}

function flashPurchaseBlockBanner() {
  const banner = document.getElementById(PURCHASE_BLOCK_BANNER_ID);
  if (!banner) return;

  banner.style.backgroundColor = '#b12704';

  if (purchaseBlockFlashTimer) clearTimeout(purchaseBlockFlashTimer);
  purchaseBlockFlashTimer = setTimeout(() => {
    banner.style.backgroundColor = '#232f3e';
    purchaseBlockFlashTimer = null;
  }, 600);
}

function startPurchaseBlockObserver() {
  if (purchaseBlockObserver) return;

  purchaseBlockObserver = new MutationObserver(() => {
    if (purchaseBlockRescanTimer) return;
    purchaseBlockRescanTimer = setTimeout(() => {
      purchaseBlockRescanTimer = null;
      disablePurchaseControls();
    }, 300);
  });

  purchaseBlockObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function applyPurchaseBlock(settings, spendingData) {
  disablePurchaseControls();
  showPurchaseBlockBanner(settings, spendingData);
  document.addEventListener('click', handleBlockedPurchaseClick, true);
  document.addEventListener('submit', handleBlockedPurchaseSubmit, true);
  startPurchaseBlockObserver();
}
