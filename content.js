let cachedSpendingData = {};
let contextInvalidated = false;
let isLoading30 = false;
let isLoading3M = false;
let tourActive = false;
let resizeDebounceTimer = null;
let dragAbortController = null;

function getResponsiveConfig() {
  const vw = document.documentElement.clientWidth;
  if (vw <= 480) return { tier: 'mobile', popupWidth: vw - 20, settingsWidth: vw - 20, maxSettingsHeight: '70vh', draggable: false, tourTooltipMode: 'bottom-sheet', tourTooltipMaxWidth: vw - 32, welcomeMaxWidth: vw - 32, minIconSize: 44 };
  if (vw <= 768) return { tier: 'tablet', popupWidth: Math.min(Math.max(140, vw * 0.22), 180), settingsWidth: 200, maxSettingsHeight: 'none', draggable: true, tourTooltipMode: 'positioned', tourTooltipMaxWidth: 280, welcomeMaxWidth: 400, minIconSize: 36 };
  return { tier: 'desktop', popupWidth: 160, settingsWidth: 200, maxSettingsHeight: 'none', draggable: true, tourTooltipMode: 'positioned', tourTooltipMaxWidth: 320, welcomeMaxWidth: 400, minIconSize: 36 };
}

function injectGlobalStyles() {
  if (document.getElementById('amz-tracker-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'amz-tracker-global-styles';
  style.textContent = `
    @keyframes amz-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes amz-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes amz-flash { 0% { background-color: rgba(255,153,0,0.3); } 100% { background-color: transparent; } }
    @keyframes amz-slideIn { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
    @keyframes amz-slideOut { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(12px); } }
    @keyframes amz-bounce { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } 60% { transform: translateY(-3px); } }
    @keyframes amz-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes amz-countdown-ring { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 113; } }
    @keyframes amz-fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes amz-fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
    .amz-refresh-spinning { animation: amz-spin 0.6s linear infinite; }
    .amz-toggle-pulse { animation: amz-pulse 0.3s ease; }
    .amz-data-flash { animation: amz-flash 0.8s ease; }
    .amz-popup-enter { animation: amz-slideIn 0.25s ease-out; }
    .amz-popup-exit { animation: amz-slideOut 0.2s ease-in forwards; }
    .amz-icon-bounce { animation: amz-bounce 0.5s ease; }
    .amz-skeleton-bar { height: 14px; border-radius: 3px; background: linear-gradient(90deg, #e7e7e7 25%, #f0f0f0 50%, #e7e7e7 75%); background-size: 200px 100%; animation: amz-shimmer 1.5s infinite; }

    .amz-tour-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483646; pointer-events: none; }
    .amz-tour-spotlight { position: fixed; z-index: 2147483646; border-radius: 6px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.7); pointer-events: none; transition: all 0.35s ease; }
    .amz-tour-tooltip { position: fixed; z-index: 2147483647; background: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); font-family: Amazon Ember, Arial, sans-serif; pointer-events: auto; animation: amz-fadeIn 0.3s ease; }
    .amz-tour-tooltip-mobile { position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647; background: #fff; border-radius: 16px 16px 0 0; box-shadow: 0 -4px 20px rgba(0,0,0,0.25); font-family: Amazon Ember, Arial, sans-serif; pointer-events: auto; animation: amz-slideIn 0.3s ease-out; }

    .amz-welcome-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; justify-content: center; align-items: center; font-family: Amazon Ember, Arial, sans-serif; animation: amz-fadeIn 0.3s ease; }
    .amz-welcome-card { background: #fff; border-radius: 12px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .amz-btn-primary { display: inline-block; padding: 10px 24px; border: none; border-radius: 6px; background: #FF9900; color: #0f1111; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.2s; }
    .amz-btn-primary:hover { background: #e68a00; }
    .amz-btn-secondary { display: inline-block; padding: 10px 24px; border: 1px solid #d5d9d9; border-radius: 6px; background: #fff; color: #565959; font-size: 14px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .amz-btn-secondary:hover:not(:disabled) { background: #f7f7f7; }
    .amz-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    .amz-tour-dots { display: flex; gap: 6px; justify-content: center; }
    .amz-tour-dot { width: 8px; height: 8px; border-radius: 50%; background: #d5d9d9; transition: background 0.2s; }
    .amz-tour-dot-active { background: #FF9900; }

    @media (max-width: 480px) {
      .amz-welcome-card { padding: 20px 16px; margin: 0 16px; }
      .amz-btn-primary, .amz-btn-secondary { padding: 12px 20px; min-height: 44px; font-size: 14px; }
    }
  `;
  document.head.appendChild(style);
}

function showWelcomeGate(onStartTour, onSkip) {
  injectGlobalStyles();
  const rc = getResponsiveConfig();

  const overlay = document.createElement('div');
  overlay.id = 'amz-welcome-overlay';
  overlay.className = 'amz-welcome-overlay';

  const iconUrl = chrome.runtime.getURL('assets/images/icons/amz_icon.png');

  overlay.innerHTML = `
    <div class="amz-welcome-card" style="max-width:${rc.welcomeMaxWidth}px; width:100%;">
      <img src="${iconUrl}" alt="Amazon Spending Tracker" style="width:48px; height:48px; margin-bottom:16px;">
      <h2 style="font-size:18px; font-weight:700; color:#0f1111; margin:0 0 8px 0;">Welcome to Amazon Spending Tracker!</h2>
      <p style="font-size:13px; color:#565959; margin:0 0 24px 0; line-height:1.5;">This extension tracks your Amazon spending and helps you stay on budget. Would you like a quick guided tour?</p>
      <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
        <button id="amz-welcome-start" class="amz-btn-primary" style="width:100%; max-width:220px;">Start Tutorial</button>
        <button id="amz-welcome-skip" class="amz-btn-secondary" style="width:100%; max-width:220px;" disabled>
          <span style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg id="amz-skip-ring" width="22" height="22" viewBox="0 0 40 40" style="flex-shrink:0;">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#d5d9d9" stroke-width="2.5"/>
              <circle id="amz-skip-ring-progress" cx="20" cy="20" r="18" fill="none" stroke="#FF9900" stroke-width="2.5" stroke-dasharray="113" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 20 20)" style="animation: amz-countdown-ring 4s linear forwards;"/>
              <text id="amz-skip-ring-num" x="20" y="24" text-anchor="middle" fill="#565959" font-size="14" font-weight="600">4</text>
            </svg>
            <span id="amz-skip-label">Skip in 4s</span>
          </span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let countdown = 4;
  const skipBtn = document.getElementById('amz-welcome-skip');
  const skipLabel = document.getElementById('amz-skip-label');
  const ringNum = document.getElementById('amz-skip-ring-num');

  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      skipLabel.textContent = `Skip in ${countdown}s`;
      ringNum.textContent = countdown;
    } else {
      clearInterval(countdownInterval);
      skipBtn.disabled = false;
      skipLabel.textContent = "Skip, I got it";
      ringNum.textContent = '✓';
      document.getElementById('amz-skip-ring-progress').style.animation = 'none';
      document.getElementById('amz-skip-ring-progress').setAttribute('stroke-dashoffset', '113');
    }
  }, 1000);

  document.getElementById('amz-welcome-start').onclick = () => {
    clearInterval(countdownInterval);
    overlay.remove();
    onStartTour();
  };

  skipBtn.onclick = () => {
    if (skipBtn.disabled) return;
    clearInterval(countdownInterval);
    overlay.remove();
    onSkip();
  };

  const welcomeKeyHandler = (e) => {
    if (e.key === 'Escape' && document.getElementById('amz-welcome-overlay')) {
      if (!skipBtn.disabled) {
        clearInterval(countdownInterval);
        overlay.remove();
        document.removeEventListener('keydown', welcomeKeyHandler);
        onSkip();
      }
    }
  };
  document.addEventListener('keydown', welcomeKeyHandler);
}

function injectDemoPopup() {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const rc = getResponsiveConfig();
  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';

  const popupHeight = 164;
  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483645',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: rc.popupWidth + 'px',
    height: popupHeight + 'px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
    overflow: 'hidden',
    bottom: '10px',
    right: '10px',
  };

  if (rc.tier === 'mobile') {
    baseStyle.right = '10px';
    baseStyle.left = '10px';
    baseStyle.width = 'auto';
  }

  Object.assign(popup.style, baseStyle);

  const refreshIcon = `<svg style="cursor:pointer; flex-shrink:0;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#767676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Refresh</title><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;

  popup.innerHTML = `
    <style>@keyframes amz-spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>Spendings</span>
      <div id="amz-header-buttons" style="display:flex; align-items:center; gap:4px;">
        <svg id="amz-refresh-all" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Refresh all</title><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        <svg id="amz-settings" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Settings</title><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    </div>
    <div id="amz-popup-body" style="padding:8px 8px 10px 8px; display:flex; flex-direction:column; gap:4px; font-size:12px;">
      <div id="amz-range-30">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#565959;">Last 30 days:</span>
          <b style="color:#B12704; font-size:14px;">-- €</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#767676;">- orders</span>
          <span id="amz-refresh-30">${refreshIcon}</span>
        </div>
      </div>
      <div id="amz-range-3m" style="border-top:1px solid #e7e7e7; padding-top:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#565959;">Last 3 months:</span>
          <b style="color:#B12704; font-size:14px;">-- €</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#767676;">- orders</span>
          <span id="amz-refresh-3m">${refreshIcon}</span>
        </div>
      </div>
      <div style="font-size:10px; color:#999; text-align:center; border-top:1px solid #e7e7e7; padding-top:3px">Lock not configured</div>
    </div>
  `;

  document.body.appendChild(popup);
}

const tourSteps = [
  {
    target: null,
    title: 'How It Works',
    description: 'This extension automatically scans your Amazon orders and shows how much you\'ve spent recently. Here\'s a quick overview of what you\'ll see.',
  },
  {
    target: '#amz-spending-popup',
    title: 'Your Spending Panel',
    description: 'This floating panel shows your Amazon spending. You can drag it anywhere on the page by grabbing the header bar.',
  },
  {
    target: '#amz-popup-body',
    title: 'Spending Breakdown',
    description: 'See your spending for the last 30 days and 3 months. Each line shows the total amount, number of orders, and last update time.',
  },
  {
    target: '#amz-refresh-all',
    title: 'Refreshing Data',
    description: 'Click this to update your data. A few browser tabs may briefly open and close in the background, that\'s normal! It\'s how we read your orders.',
  },
  {
    target: '#amz-settings',
    title: 'Settings',
    description: 'Customize which time ranges to show. You can also set up an Interface Lock to block Amazon during certain hours and avoid impulse purchases.',
  },
  {
    target: '#amz-close',
    title: 'Minimize & Restore',
    description: 'Close the panel to shrink it into a small icon in the corner. Click the icon anytime to bring it back.',
  },
];

function startTour() {
  tourActive = true;
  injectGlobalStyles();
  injectDemoPopup();

  const spotlightEl = document.createElement('div');
  spotlightEl.id = 'amz-tour-spotlight';
  spotlightEl.className = 'amz-tour-spotlight';
  spotlightEl.style.display = 'none';
  document.body.appendChild(spotlightEl);

  const backdropEl = document.createElement('div');
  backdropEl.id = 'amz-tour-backdrop';
  backdropEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483645;pointer-events:auto;';
  backdropEl.style.display = 'none';
  document.body.appendChild(backdropEl);

  let currentStep = 0;

  function showStep(index) {
    currentStep = index;
    const step = tourSteps[index];
    const rc = getResponsiveConfig();

    const oldTooltip = document.getElementById('amz-tour-tooltip');
    if (oldTooltip) oldTooltip.remove();
    const oldCenterOverlay = document.getElementById('amz-tour-center-overlay');
    if (oldCenterOverlay) oldCenterOverlay.remove();

    const popup = document.getElementById('amz-spending-popup');
    if (popup) popup.style.zIndex = '2147483645';

    if (!step.target) {
      spotlightEl.style.display = 'none';
      backdropEl.style.display = 'none';
      showCenteredCard(step, index);
      return;
    }

    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      if (index < tourSteps.length - 1) showStep(index + 1);
      else endTour();
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const pad = 6;
    Object.assign(spotlightEl.style, {
      display: 'block',
      left: (rect.left - pad) + 'px',
      top: (rect.top - pad) + 'px',
      width: (rect.width + pad * 2) + 'px',
      height: (rect.height + pad * 2) + 'px',
    });
    backdropEl.style.display = 'block';

    const tooltip = document.createElement('div');
    tooltip.id = 'amz-tour-tooltip';

    if (rc.tourTooltipMode === 'bottom-sheet') {
      tooltip.className = 'amz-tour-tooltip-mobile';
      tooltip.style.maxWidth = '100%';
    } else {
      tooltip.className = 'amz-tour-tooltip';
      tooltip.style.maxWidth = rc.tourTooltipMaxWidth + 'px';
    }

    const dotsHtml = tourSteps.map((_, i) => `<div class="amz-tour-dot ${i === index ? 'amz-tour-dot-active' : ''}"></div>`).join('');

    tooltip.innerHTML = `
      <div style="padding:16px 18px;">
        <div style="font-size:15px; font-weight:700; color:#0f1111; margin-bottom:6px;">${step.title}</div>
        <p style="font-size:13px; color:#565959; line-height:1.5; margin:0 0 16px 0;">${step.description}</p>
        <div class="amz-tour-dots" style="margin-bottom:12px;">${dotsHtml}</div>
        <div style="font-size:11px; color:#999; text-align:center; margin-bottom:10px;">Step ${index + 1} of ${tourSteps.length}</div>
        <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
          ${index > 0 ? '<button id="amz-tour-back" class="amz-btn-secondary" style="padding:8px 16px; font-size:13px; min-height:36px;">← Back</button>' : ''}
          ${index < tourSteps.length - 1 ? '<button id="amz-tour-next" class="amz-btn-primary" style="padding:8px 16px; font-size:13px; min-height:36px;">Next →</button>' : '<button id="amz-tour-finish" class="amz-btn-primary" style="padding:8px 16px; font-size:13px; min-height:36px;">Got it!</button>'}
          <button id="amz-tour-skip" style="background:none; border:none; color:#999; font-size:12px; cursor:pointer; padding:8px; font-family:inherit;">Skip Tour</button>
        </div>
      </div>
    `;

    document.body.appendChild(tooltip);

    if (rc.tourTooltipMode !== 'bottom-sheet') {
      positionTooltip(tooltip, rect);
    }

    const backBtn = document.getElementById('amz-tour-back');
    if (backBtn) backBtn.onclick = () => showStep(index - 1);
    const nextBtn = document.getElementById('amz-tour-next');
    if (nextBtn) nextBtn.onclick = () => showStep(index + 1);
    const finishBtn = document.getElementById('amz-tour-finish');
    if (finishBtn) finishBtn.onclick = () => endTour();
    document.getElementById('amz-tour-skip').onclick = () => endTour();
  }

  function showCenteredCard(step, index) {
    const rc = getResponsiveConfig();
    const tooltip = document.createElement('div');
    tooltip.id = 'amz-tour-tooltip';

    const overlay = document.createElement('div');
    overlay.id = 'amz-tour-center-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2147483646;display:flex;justify-content:center;align-items:center;animation:amz-fadeIn 0.3s ease;';

    const dotsHtml = tourSteps.map((_, i) => `<div class="amz-tour-dot ${i === index ? 'amz-tour-dot-active' : ''}"></div>`).join('');
    const iconUrl = chrome.runtime.getURL('assets/images/icons/amz_icon.png');

    tooltip.style.cssText = `background:#fff; border-radius:12px; padding:24px 20px; text-align:center; max-width:${rc.tourTooltipMaxWidth}px; width:calc(100% - 32px); box-shadow:0 8px 32px rgba(0,0,0,0.3);`;
    tooltip.innerHTML = `
      <img src="${iconUrl}" alt="" style="width:40px; height:40px; margin-bottom:12px;">
      <div style="font-size:16px; font-weight:700; color:#0f1111; margin-bottom:8px;">${step.title}</div>
      <p style="font-size:13px; color:#565959; line-height:1.5; margin:0 0 16px 0;">${step.description}</p>
      <div class="amz-tour-dots" style="margin-bottom:12px;">${dotsHtml}</div>
      <div style="font-size:11px; color:#999; text-align:center; margin-bottom:10px;">Step ${index + 1} of ${tourSteps.length}</div>
      <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        ${index > 0 ? '<button id="amz-tour-back" class="amz-btn-secondary" style="padding:8px 16px; font-size:13px;">← Back</button>' : ''}
        <button id="amz-tour-next" class="amz-btn-primary" style="padding:8px 16px; font-size:13px;">Next →</button>
        <button id="amz-tour-skip" style="background:none; border:none; color:#999; font-size:12px; cursor:pointer; padding:8px; font-family:inherit;">Skip Tour</button>
      </div>
    `;

    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);

    const backBtn = document.getElementById('amz-tour-back');
    if (backBtn) backBtn.onclick = () => { overlay.remove(); showStep(index - 1); };
    document.getElementById('amz-tour-next').onclick = () => { overlay.remove(); showStep(index + 1); };
    document.getElementById('amz-tour-skip').onclick = () => { overlay.remove(); endTour(); };
  }

  function positionTooltip(tooltip, targetRect) {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const gap = 12;

    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;

    const spaceBelow = vh - targetRect.bottom - gap;
    const spaceAbove = targetRect.top - gap;
    const spaceRight = vw - targetRect.right - gap;
    const spaceLeft = targetRect.left - gap;

    let top, left;

    if (spaceBelow >= th) {
      top = targetRect.bottom + gap;
      left = targetRect.left + (targetRect.width / 2) - (tw / 2);
    } else if (spaceAbove >= th) {
      top = targetRect.top - th - gap;
      left = targetRect.left + (targetRect.width / 2) - (tw / 2);
    } else if (spaceLeft >= tw) {
      left = targetRect.left - tw - gap;
      top = targetRect.top + (targetRect.height / 2) - (th / 2);
    } else if (spaceRight >= tw) {
      left = targetRect.right + gap;
      top = targetRect.top + (targetRect.height / 2) - (th / 2);
    } else {
      top = Math.max(10, vh - th - 10);
      left = Math.max(10, (vw - tw) / 2);
    }

    left = Math.max(10, Math.min(left, vw - tw - 10));
    top = Math.max(10, Math.min(top, vh - th - 10));

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function endTour() {
    tourActive = false;
    document.removeEventListener('keydown', handleKeyboard);
    const spotlight = document.getElementById('amz-tour-spotlight');
    if (spotlight) spotlight.remove();
    const backdrop = document.getElementById('amz-tour-backdrop');
    if (backdrop) backdrop.remove();
    const tooltip = document.getElementById('amz-tour-tooltip');
    if (tooltip) tooltip.remove();
    const centerOverlay = document.getElementById('amz-tour-center-overlay');
    if (centerOverlay) centerOverlay.remove();
    const demoPopup = document.getElementById('amz-spending-popup');
    if (demoPopup) demoPopup.remove();

    chrome.storage.local.set({ 'amz-onboarding-completed': true });
    loadData(true);
  }

  function handleKeyboard(e) {
    if (!tourActive) {
      document.removeEventListener('keydown', handleKeyboard);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentStep < tourSteps.length - 1) showStep(currentStep + 1);
      else endTour();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentStep > 0) showStep(currentStep - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const centerOverlay = document.getElementById('amz-tour-center-overlay');
      if (centerOverlay) centerOverlay.remove();
      endTour();
    }
  }

  document.addEventListener('keydown', handleKeyboard);
  showStep(0);
}

function checkOnboardingAndInit() {
  if (window.location.href.includes('_scraping=1')) return;
  if (window.location.href.includes('signin')) return;

  const settings = getSettings();

  if (isInLockTimeRange(settings)) {
    loadSpendingDataForLock(spendingData => {
      showLockOverlay(settings, spendingData);
    });
    return;
  }

  if (window.location.href.includes('checkout')) {
    observeCheckoutPage();
    return;
  }

  chrome.storage.local.get('amz-onboarding-completed', result => {
    if (result['amz-onboarding-completed']) {
      loadData(true);
    } else {
      injectGlobalStyles();
      showWelcomeGate(
        () => startTour(),
        () => {
          chrome.storage.local.set({ 'amz-onboarding-completed': true });
          loadData(true);
        }
      );
    }
  });
}

// Safe wrapper for chrome.runtime.sendMessage to handle context invalidation
function safeSendMessage(message, callback) {
  if (contextInvalidated) {
    showErrorPopup('CONTEXT_INVALIDATED');
    return;
  }

  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || '';
        if (errorMessage.includes('Extension context invalidated')) {
          contextInvalidated = true;
          showErrorPopup('CONTEXT_INVALIDATED');
          return;
        }
        // Log as warning for non-critical errors like "message channel closed"
        if (errorMessage.includes('message channel closed')) {
          console.warn('[Amazon Tracker] sendMessage warning:', errorMessage);
          if (callback) callback(null);
          return;
        }
        console.error('[Amazon Tracker] sendMessage error:', errorMessage);
      }
      if (callback) callback(response);
    });
  } catch (err) {
    if (err.message && err.message.includes('Extension context invalidated')) {
      contextInvalidated = true;
      showErrorPopup('CONTEXT_INVALIDATED');
      return;
    }
    console.error('[Amazon Tracker] sendMessage error:', err);
  }
}

// Settings management
function getSettings() {
  try {
    const saved = localStorage.getItem('amz-spending-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all settings have defaults
      return {
        show30Days: parsed.show30Days !== undefined ? parsed.show30Days : true,
        show3Months: parsed.show3Months !== undefined ? parsed.show3Months : true,
        interfaceLockEnabled: parsed.interfaceLockEnabled || false,
        lockStartTime: parsed.lockStartTime || '09:00',
        lockEndTime: parsed.lockEndTime || '17:00',
      };
    }
  } catch (e) {
    console.error('Tracker: Error reading settings', e);
  }
  return {
    show30Days: true,
    show3Months: true,
    interfaceLockEnabled: false,
    lockStartTime: '09:00',
    lockEndTime: '17:00',
  };
}

function saveSettings(settings) {
  localStorage.setItem('amz-spending-settings', JSON.stringify(settings));
}

// Format timestamp as relative time (e.g., "5 min ago", "2 hours ago")
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Show confirmation dialog for enabling interface lock
function showLockConfirmDialog(onConfirm, onCancel) {
  // Remove any existing dialog
  const existingDialog = document.getElementById('amz-lock-confirm-dialog');
  if (existingDialog) existingDialog.remove();

  const overlay = document.createElement('div');
  overlay.id = 'amz-lock-confirm-dialog';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: '2147483647',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
  });

  overlay.innerHTML = `
    <div style="background:#fff; border-radius:8px; padding:20px; max-width:min(300px, calc(100vw - 40px)); box-shadow:0 4px 12px rgba(0,0,0,0.3); text-align:center;">
      <div style="font-size:16px; font-weight:600; color:#0f1111; margin-bottom:12px;">Enable Interface Lock?</div>
      <p style="font-size:13px; color:#565959; margin:0 0 20px 0; line-height:1.4;">
        This will block your access to Amazon during the scheduled time. <strong style="color:#0f1111;">You won't be able to change this setting while locked.</strong>
      </p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="amz-lock-cancel" style="padding:8px 16px; border:1px solid #d5d9d9; border-radius:4px; background:#fff; color:#0f1111; font-size:13px; cursor:pointer; min-height:44px;">Cancel</button>
        <button id="amz-lock-confirm" style="padding:8px 16px; border:none; border-radius:4px; background:#999; color:#fff; font-size:13px; cursor:not-allowed; min-height:44px;" disabled>Enable (3)</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Countdown timer for enable button
  const confirmBtn = document.getElementById('amz-lock-confirm');
  let countdown = 3;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      confirmBtn.textContent = `Enable (${countdown})`;
    } else {
      clearInterval(countdownInterval);
      confirmBtn.textContent = 'Enable';
      confirmBtn.disabled = false;
      confirmBtn.style.background = '#232f3e';
      confirmBtn.style.cursor = 'pointer';
    }
  }, 1000);

  document.getElementById('amz-lock-cancel').onclick = () => {
    clearInterval(countdownInterval);
    overlay.remove();
    if (onCancel) onCancel();
  };

  confirmBtn.onclick = () => {
    if (confirmBtn.disabled) return;
    clearInterval(countdownInterval);
    overlay.remove();
    if (onConfirm) onConfirm();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      clearInterval(countdownInterval);
      overlay.remove();
      if (onCancel) onCancel();
    }
  };
}

function showSettingsView() {
  const currentPosition = getCurrentPopupPosition();
  if (currentPosition) {
    savePopupState(false, currentPosition);
  }

  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const savedState = getPopupState();
  const settings = getSettings();
  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';

  const rc = getResponsiveConfig();
  const settingsWidth = rc.settingsWidth;
  const settingsHeight = 270;

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: settingsWidth + 'px',
    height: 'auto',
    maxHeight: rc.maxSettingsHeight,
    overflow: 'hidden',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  applyPosition(baseStyle, savedState.position, settingsHeight, settingsWidth);
  Object.assign(popup.style, baseStyle);

  popup.innerHTML = `
    <style>
      .amz-toggle { position:relative; width:28px; height:16px; flex-shrink:0; }
      .amz-toggle input { opacity:0; width:0; height:0; }
      .amz-toggle .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.2s; border-radius:16px; }
      .amz-toggle .slider:before { position:absolute; content:""; height:12px; width:12px; left:2px; bottom:2px; background-color:white; transition:.2s; border-radius:50%; }
      .amz-toggle input:checked + .slider { background-color:#4caf50; }
      .amz-toggle input:checked + .slider:before { transform:translateX(12px); }
      .amz-time-input { width:95px; padding:4px 6px; border:1px solid #d5d9d9; border-radius:4px; font-size:12px; font-family:inherit; }
      .amz-time-input:focus { outline:none; border-color:#232f3e; }
      .amz-section-divider { border-top:1px solid #e7e7e7; margin:8px 0; padding-top:8px; }
      .amz-help-icon { position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:4px; }
      .amz-help-icon svg { color:#767676; transition:color .2s; }
      .amz-help-icon:hover svg { color:#232f3e; }
      .amz-help-tooltip { position:absolute; right:calc(100% + 6px); top:50%; transform:translateY(-50%); background:#232f3e; color:#fff; padding:6px 8px; border-radius:4px; font-size:11px; line-height:1.3; max-width:140px; white-space:normal; opacity:0; visibility:hidden; transition:opacity .2s, visibility .2s; z-index:10; pointer-events:none; }
      .amz-help-icon:hover .amz-help-tooltip { opacity:1; visibility:visible; }
      .amz-settings-content { overflow:visible; }
    </style>
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>Settings</span>
      <div style="display:flex; align-items:center; gap:4px;">
        <svg id="amz-back" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Back</title><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    </div>
    <div class="amz-settings-content" style="padding:10px 8px; font-size:12px; display:flex; flex-direction:column; gap:8px;">
      <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span style="display:flex; align-items:center;">Last 30 days<span class="amz-help-icon" onclick="event.preventDefault();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="600">?</text></svg><span class="amz-help-tooltip">Shows total spent in the last 30 days</span></span></span>
        <div class="amz-toggle">
          <input type="checkbox" id="amz-setting-30days" ${settings.show30Days ? 'checked' : ''}>
          <span class="slider"></span>
        </div>
      </label>
      <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span style="display:flex; align-items:center;">Last 3 months<span class="amz-help-icon" onclick="event.preventDefault();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="600">?</text></svg><span class="amz-help-tooltip">Shows total spent in the last 3 months</span></span></span>
        <div class="amz-toggle">
          <input type="checkbox" id="amz-setting-3months" ${settings.show3Months ? 'checked' : ''}>
          <span class="slider"></span>
        </div>
      </label>

      <div class="amz-section-divider">
        <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
          <span style="display:flex; align-items:center; font-weight:600;">Interface Lock<span class="amz-help-icon" onclick="event.preventDefault();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="600">?</text></svg><span class="amz-help-tooltip">Blocks access during set hours to prevent impulse purchases</span></span></span>
          <div class="amz-toggle">
            <input type="checkbox" id="amz-setting-lock" ${settings.interfaceLockEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </div>
        </label>
        <div id="amz-lock-times" style="margin-top:8px; display:${settings.interfaceLockEnabled ? 'flex' : 'none'}; flex-direction:column; gap:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:#565959; font-size:11px; width:32px;">From:</span>
            <input type="time" id="amz-lock-start" class="amz-time-input" value="${settings.lockStartTime}">
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:#565959; font-size:11px; width:32px;">To:</span>
            <input type="time" id="amz-lock-end" class="amz-time-input" value="${settings.lockEndTime}">
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #e7e7e7; margin-top:4px; padding-top:8px;">
        <button id="amz-replay-tutorial" style="display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:6px 0; border:1px solid #d5d9d9; border-radius:4px; background:#fff; color:#565959; font-size:11px; cursor:pointer; font-family:inherit; transition:background 0.2s;" onmouseover="this.style.background='#f7f7f7'" onmouseout="this.style.background='#fff'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="600">?</text></svg>
          Replay Tutorial
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById('amz-replay-tutorial').onclick = () => {
    popup.remove();
    chrome.storage.local.set({ 'amz-onboarding-completed': false });
    injectGlobalStyles();
    showWelcomeGate(
      () => startTour(),
      () => {
        chrome.storage.local.set({ 'amz-onboarding-completed': true });
        loadData(true);
      }
    );
  };

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-back').onclick = () => {
    const newSettings = getCurrentSettingsFromForm();
    saveSettings(newSettings);

    const settingsPopup = document.getElementById('amz-spending-popup');
    if (settingsPopup) {
      const settingsRect = settingsPopup.getBoundingClientRect();
      const rc = getResponsiveConfig();
      const enabledCount = (newSettings.show30Days ? 1 : 0) + (newSettings.show3Months ? 1 : 0);
      const mainHeight = (enabledCount === 2 ? 140 : enabledCount === 1 ? 90 : 85) + 24;
      const mainWidth = rc.popupWidth;
      const adjustedLeft = settingsRect.right - mainWidth;
      const adjustedTop = settingsRect.bottom - mainHeight;
      settingsPopup.remove();
      savePopupState(false, { left: adjustedLeft, top: adjustedTop });
    }

    loadData(true);
  };

  // Helper to get all current settings from the form
  function getCurrentSettingsFromForm() {
    return {
      show30Days: document.getElementById('amz-setting-30days').checked,
      show3Months: document.getElementById('amz-setting-3months').checked,
      interfaceLockEnabled: document.getElementById('amz-setting-lock').checked,
      lockStartTime: document.getElementById('amz-lock-start').value,
      lockEndTime: document.getElementById('amz-lock-end').value,
    };
  }

  // Auto-save on any setting change
  const saveCurrentSettings = () => {
    saveSettings(getCurrentSettingsFromForm());
  };

  document.getElementById('amz-setting-30days').onchange = saveCurrentSettings;
  document.getElementById('amz-setting-3months').onchange = saveCurrentSettings;

  // Interface lock toggle - show/hide time inputs with confirmation
  document.getElementById('amz-setting-lock').onchange = () => {
    const lockCheckbox = document.getElementById('amz-setting-lock');
    const lockTimes = document.getElementById('amz-lock-times');

    if (lockCheckbox.checked) {
      // Show confirmation dialog before enabling
      showLockConfirmDialog(
        () => {
          // Confirmed - show time inputs and save
          lockTimes.style.display = 'flex';
          saveCurrentSettings();
        },
        () => {
          // Cancelled - revert checkbox
          lockCheckbox.checked = false;
        }
      );
    } else {
      // Disabling - no confirmation needed
      lockTimes.style.display = 'none';
      saveCurrentSettings();
    }
  };

  document.getElementById('amz-lock-start').onchange = saveCurrentSettings;
  document.getElementById('amz-lock-end').onchange = saveCurrentSettings;

  setupDraggable(popup);
}

function savePopupState(isMinimized, position = null) {
  const currentState = getPopupState();
  const state = {
    isMinimized,
    // Only update position if explicitly provided, otherwise keep existing
    position: position !== null ? position : currentState.position,
  };
  localStorage.setItem('amz-popup-state', JSON.stringify(state));
}

function getPopupState() {
  try {
    const saved = localStorage.getItem('amz-popup-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isMinimized: Boolean(parsed.isMinimized),
        position:
          parsed.position &&
          typeof parsed.position.left === 'number' &&
          typeof parsed.position.top === 'number'
            ? parsed.position
            : null,
      };
    }
  } catch (e) {
    console.error('Tracker: Error reading popup state', e);
  }
  return { isMinimized: false, position: null };
}

// Get current popup position from DOM
function getCurrentPopupPosition() {
  const popup = document.getElementById('amz-spending-popup');
  if (popup) {
    const rect = popup.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }
  return null;
}

// Apply position to a style object
function applyPosition(styleObj, position, height = null, width = null) {
  if (
    position &&
    typeof position.left === 'number' &&
    typeof position.top === 'number'
  ) {
    const constrained = constrainToViewport(
      position.left,
      position.top,
      height,
      width,
    );
    styleObj.left = constrained.left + 'px';
    styleObj.top = constrained.top + 'px';
  } else {
    styleObj.bottom = '10px';
    styleObj.right = '10px';
  }
}

// Constrain position to viewport bounds
function constrainToViewport(left, top, height = null, width = null) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const margin = 10;

  // Use provided dimensions or get from DOM or use defaults
  let popupWidth = width;
  let popupHeight = height;
  if (!popupWidth || !popupHeight) {
    const popup = document.getElementById('amz-spending-popup');
    if (!popupWidth) popupWidth = popup ? popup.offsetWidth : 160;
    if (!popupHeight) popupHeight = popup ? popup.offsetHeight : 130;
  }

  // Calculate max positions, ensuring they don't go below margin even if viewport is small
  const maxLeft = Math.max(margin, viewportWidth - popupWidth - margin);
  const maxTop = Math.max(margin, viewportHeight - popupHeight - margin);

  // Clamp position between margin and max
  left = Math.max(margin, Math.min(left, maxLeft));
  top = Math.max(margin, Math.min(top, maxTop));

  return { left, top };
}

// Reset popup to bottom-right when viewport resizes
function resetPopupPosition() {
  const popup = document.getElementById('amz-spending-popup');
  if (!popup) return;

  // Reset to bottom-right
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '10px';
  popup.style.right = '10px';
  savePopupState(false, null);
}

window.addEventListener('resize', () => {
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    resetPopupPosition();
  }, 300);
});

function showMinimizedIcon() {
  // Save current position before removing the popup (for when it reopens)
  const currentPosition = getCurrentPopupPosition();
  if (currentPosition) {
    savePopupState(true, currentPosition);
  }

  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const icon = document.createElement('div');
  icon.id = 'amz-spending-popup';

  const settings = getSettings();
  const isLoading = isLoading30 || isLoading3M;

  // Get spending amount from lowest active range
  let spendingAmount = null;
  if (settings.show30Days && cachedSpendingData.total !== undefined) {
    spendingAmount = Math.round(cachedSpendingData.total);
  } else if (
    settings.show3Months &&
    cachedSpendingData.total3Months !== undefined
  ) {
    spendingAmount = Math.round(cachedSpendingData.total3Months);
  }

  // Determine if we need pill shape (for amount) or circle (for $ icon)
  const showAmount = !isLoading && spendingAmount !== null;

  // Base styles for the icon
  Object.assign(icon.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: '2147483647',
    backgroundColor: '#232f3e',
    color: '#ffffff',
    height: '36px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    border: '2px solid #ffffff',
    boxSizing: 'border-box',
    userSelect: 'none',
  });

  // Check if no ranges are enabled
  const noRangesEnabled = !settings.show30Days && !settings.show3Months;

  if (showAmount) {
    // Pill shape for amount - auto width with padding
    icon.style.width = 'auto';
    icon.style.minWidth = '36px';
    icon.style.padding = '0 10px';
    icon.style.borderRadius = '18px';
    icon.innerHTML = `${spendingAmount}€`;
  } else if (isLoading) {
    // Circle with spinning € when loading
    icon.style.width = '36px';
    icon.style.borderRadius = '50%';
    icon.innerHTML = `
      <style>
        @keyframes amz-icon-spinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <span style="animation: amz-icon-spinner 1s linear infinite; display: inline-block;">€</span>
    `;
  } else if (noRangesEnabled) {
    // Circle with blinking ! if no ranges are enabled
    icon.style.width = '36px';
    icon.style.borderRadius = '50%';
    icon.innerHTML = `
      <style>
        @keyframes amz-icon-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
      <span style="animation: amz-icon-blink 1s ease-in-out infinite; font-size: 18px;">!</span>
    `;
  } else {
    // Circle with € if data not yet loaded
    icon.style.width = '36px';
    icon.style.borderRadius = '50%';
    icon.innerHTML = '€';
  }

  icon.onclick = () => {
    injectPopup(cachedSpendingData || {});
  };

  document.body.appendChild(icon);
}

function showLoadingPopup() {
  injectGlobalStyles();
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const savedState = getPopupState();
  const rc = getResponsiveConfig();
  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: rc.popupWidth + 'px',
    height: '130px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  if (rc.tier === 'mobile') {
    baseStyle.left = '10px';
    baseStyle.right = '10px';
    baseStyle.width = 'auto';
    baseStyle.bottom = '10px';
  } else {
    applyPosition(baseStyle, savedState.position, 130);
  }
  Object.assign(popup.style, baseStyle);

  popup.innerHTML = `
        <style>
            @keyframes amz-spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>Spendings</span>
            <div style="display:flex; align-items:center; gap:4px;">
                <svg id="amz-settings" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Settings</title><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
        </div>
        <div style="padding:8px; font-size:12px; color:#565959; line-height:1.3;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <div style="width:12px; height:12px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
                <span>Reading your orders...</span>
            </div>
            <div style="font-size:11px; color:#767676; line-height:1.4;">A few tabs may open briefly in the background, they'll close on their own!</div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-settings').onclick = () => showSettingsView();

  // Make loading popup draggable
  setupDraggable(popup);
}

function setupDraggable(popup) {
  if (dragAbortController) dragAbortController.abort();
  dragAbortController = new AbortController();
  const signal = dragAbortController.signal;

  let isDragging = false;
  let hasDragged = false;
  let offsetX = 0;
  let offsetY = 0;

  const dragHandle = document.getElementById('amz-drag-handle');
  if (!dragHandle) return;

  const headerBtnIds = ['amz-close', 'amz-settings', 'amz-back', 'amz-refresh-all'];
  const dragStart = e => {
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      const isHeaderButton = headerBtnIds.some(id => {
        const el = document.getElementById(id);
        return el && (el === e.target || el.contains(e.target));
      });
      if (isHeaderButton) return;
      isDragging = true;
      hasDragged = false;
      const rect = popup.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      popup.style.bottom = 'auto';
      popup.style.right = 'auto';
      popup.style.left = rect.left + 'px';
      popup.style.top = rect.top + 'px';
    }
  };

  const drag = e => {
    if (isDragging) {
      e.preventDefault();
      hasDragged = true;

      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      const constrained = constrainToViewport(newX, newY);

      popup.style.left = constrained.left + 'px';
      popup.style.top = constrained.top + 'px';
    }
  };

  const dragEnd = () => {
    if (isDragging && hasDragged) {
      const rect = popup.getBoundingClientRect();
      savePopupState(false, { left: rect.left, top: rect.top });
    }
    isDragging = false;
    hasDragged = false;
  };

  dragHandle.addEventListener('mousedown', dragStart, { signal });
  document.addEventListener('mousemove', drag, { signal });
  document.addEventListener('mouseup', dragEnd, { signal });
}

function injectPopup(data) {
  injectGlobalStyles();
  cachedSpendingData = data;

  // CRITICAL: Save current position BEFORE removing the popup
  const currentPosition = getCurrentPopupPosition();
  if (currentPosition) {
    savePopupState(false, currentPosition);
  }

  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const savedState = getPopupState();
  const settings = getSettings();
  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';

  // Calculate height based on enabled ranges (add extra height for lock status)
  const enabledCount =
    (settings.show30Days ? 1 : 0) + (settings.show3Months ? 1 : 0);
  const rc = getResponsiveConfig();
  const popupHeight = (enabledCount === 2 ? 140 : enabledCount === 1 ? 90 : 85) + 24;

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: rc.popupWidth + 'px',
    height: popupHeight + 'px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
    overflow: 'hidden',
  };

  if (rc.tier === 'mobile') {
    baseStyle.left = '10px';
    baseStyle.right = '10px';
    baseStyle.width = 'auto';
    baseStyle.bottom = '10px';
  } else {
    applyPosition(baseStyle, savedState.position, popupHeight);
  }
  Object.assign(popup.style, baseStyle);

  const is30DaysLoading = data.total === undefined;
  const warning30 =
    !is30DaysLoading && data.limitReached
      ? `<div style="font-size:10px; color:#ff9900;">⚠ Max 20 pages</div>`
      : '';

  const is3MonthsLoading = data.total3Months === undefined;
  const warning3Months =
    !is3MonthsLoading && data.limitReached3Months
      ? `<div style="font-size:10px; color:#ff9900;">⚠ Max 20 pages</div>`
      : '';

  // Refresh icon SVG
  const refreshIcon = `<svg style="cursor:pointer; flex-shrink:0;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#767676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Refresh</title><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;

  // Build 30 days content
  let thirtyDaysContent = '';
  if (settings.show30Days) {
    const time30 = data.updatedAt30 ? formatRelativeTime(data.updatedAt30) : '';
    thirtyDaysContent = is30DaysLoading
      ? `<div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#565959;">Last 30 days:</span>
            <div class="amz-skeleton-bar" style="width:50px; height:14px;"></div>
          </div>
          <div style="margin-top:4px;"><div class="amz-skeleton-bar" style="width:80px; height:10px;"></div></div>
        </div>`
      : `<div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#565959;">Last 30 days:</span>
            <b style="color:#B12704; font-size:14px;">${Math.round(data.total)} €</b>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#767676;">${data.orderCount} order${data.orderCount !== 1 ? 's' : ''}${time30 ? ` · ${time30}` : ''} ${warning30}</span>
            <span id="amz-refresh-30">${refreshIcon}</span>
          </div>
        </div>`;
  }

  // Build 3 months content
  let threeMonthsContent = '';
  if (settings.show3Months) {
    const time3M = data.updatedAt3M ? formatRelativeTime(data.updatedAt3M) : '';
    const separator = settings.show30Days
      ? 'border-top:1px solid #e7e7e7; padding-top:4px;'
      : '';
    const innerContent = is3MonthsLoading
      ? `<div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#565959;">Last 3 months:</span>
            <div class="amz-skeleton-bar" style="width:50px; height:14px;"></div>
          </div>
          <div style="margin-top:4px;"><div class="amz-skeleton-bar" style="width:80px; height:10px;"></div></div>
        </div>`
      : `<div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#565959;">Last 3 months:</span>
          <b style="color:#B12704; font-size:14px;">${Math.round(data.total3Months)} €</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#767676;">${data.orderCount3Months} order${data.orderCount3Months !== 1 ? 's' : ''}${time3M ? ` · ${time3M}` : ''} ${warning3Months}</span>
          <span id="amz-refresh-3m">${refreshIcon}</span>
        </div>`;
    threeMonthsContent = `<div style="${separator}">${innerContent}</div>`;
  }

  // Message when no ranges are enabled
  const gearIcon = `<svg style="vertical-align: middle; margin: 0 2px;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  const noRangesMessage =
    enabledCount === 0
      ? `<div style="color:#565959; text-align:center; line-height: 1.4;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d5d9d9" stroke-width="1.5" style="margin-bottom:4px;"><path d="M3 3l18 18M21 12a9 9 0 0 1-1.5 5M3.6 15A9 9 0 0 1 12 3a9 9 0 0 1 5 1.5"/></svg>
          <div style="font-size:12px; margin-bottom:4px;">No spending ranges selected</div>
          <span id="amz-open-settings-link" style="color:#0066c0; font-size:11px; cursor:pointer; text-decoration:underline;">Open Settings</span>
        </div>`
      : '';

  // Lock status message
  const lockStatusMessage = settings.interfaceLockEnabled
    ? `<div style="font-size:10px; color:#565959; text-align:center; border-top:1px solid #e7e7e7; padding-top:3px">Lock: ${settings.lockStartTime} - ${settings.lockEndTime}</div>`
    : `<div style="font-size:10px; color:#999; text-align:center; border-top:1px solid #e7e7e7; padding-top:3px">Lock not configured</div>`;

  popup.innerHTML = `
        <style>
            @keyframes amz-spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>Spendings</span>
            <div style="display:flex; align-items:center; gap:4px;">
                <svg id="amz-refresh-all" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Refresh all</title><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                <svg id="amz-settings" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Settings</title><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
        </div>
        <div style="padding:8px 8px 10px 8px; display:flex; flex-direction:column; gap:4px; font-size:12px;">
            ${thirtyDaysContent}
            ${threeMonthsContent}
            ${noRangesMessage}
            ${lockStatusMessage}
        </div>
    `;

  const isFirstAppearance = !existing;
  document.body.appendChild(popup);
  if (isFirstAppearance) popup.classList.add('amz-popup-enter');

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-settings').onclick = () => showSettingsView();
  document.getElementById('amz-refresh-all').onclick = () => {
    const refreshIcon = document.getElementById('amz-refresh-all');
    if (refreshIcon) refreshIcon.classList.add('amz-refresh-spinning');
    refreshAll();
  };
  const openSettingsLink = document.getElementById('amz-open-settings-link');
  if (openSettingsLink) {
    openSettingsLink.onclick = () => showSettingsView();
  }

  // Refresh handlers
  const refresh30Btn = document.getElementById('amz-refresh-30');
  if (refresh30Btn) {
    refresh30Btn.onclick = () => refreshRange('30');
  }
  const refresh3mBtn = document.getElementById('amz-refresh-3m');
  if (refresh3mBtn) {
    refresh3mBtn.onclick = () => refreshRange('3m');
  }

  // Use shared draggable setup
  setupDraggable(popup);
}

// Show error message in popup
function showErrorPopup(errorType) {
  injectGlobalStyles();
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const savedState = getPopupState();
  const rc = getResponsiveConfig();
  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: rc.popupWidth + 'px',
    minHeight: '130px',
    height: 'auto',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  if (rc.tier === 'mobile') {
    baseStyle.left = '10px';
    baseStyle.right = '10px';
    baseStyle.width = 'auto';
    baseStyle.bottom = '10px';
  } else {
    applyPosition(baseStyle, savedState.position, 130);
  }
  Object.assign(popup.style, baseStyle);

  let errorMessage;
  let showRetry = true;
  let extraButton = '';
  if (errorType === 'TAB_CREATE_FAILED') {
    errorMessage = "Couldn't read your orders. Try closing some browser tabs and click Retry.";
  } else if (errorType === 'CONTEXT_INVALIDATED') {
    errorMessage = 'Extension was updated, please refresh this page.';
    showRetry = false;
    extraButton = '<button id="amz-reload-page" style="background:#232f3e; color:white; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; min-height:32px;">Refresh Page</button>';
  } else if (errorType === 'AUTH_REQUIRED') {
    errorMessage = 'Please log into Amazon first, then refresh.';
    showRetry = false;
    extraButton = '<button id="amz-go-login" style="background:#FF9900; color:#0f1111; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; min-height:32px;">Go to Login</button>';
  } else {
    errorMessage = 'Error loading data. Please try again.';
  }

  popup.innerHTML = `
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>Spendings</span>
      <div style="display:flex; align-items:center; gap:4px;">
        <svg id="amz-settings" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Settings</title><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    </div>
    <div style="padding:12px 8px; font-size:12px; color:#B12704; text-align:center;">
      <div style="margin-bottom:10px; line-height:1.4;">${errorMessage}</div>
      <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        ${showRetry ? '<button id="amz-retry" style="background:#232f3e; color:white; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; min-height:32px;">Retry</button>' : ''}
        ${extraButton}
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-settings').onclick = () => showSettingsView();
  const retryBtn = document.getElementById('amz-retry');
  if (retryBtn) {
    retryBtn.onclick = () => {
      cachedSpendingData = {};
      loadData(true);
    };
  }
  const reloadBtn = document.getElementById('amz-reload-page');
  if (reloadBtn) {
    reloadBtn.onclick = () => location.reload();
  }
  const loginBtn = document.getElementById('amz-go-login');
  if (loginBtn) {
    loginBtn.onclick = () => { window.location.href = 'https://www.amazon.it/ap/signin'; };
  }

  setupDraggable(popup);
}

// Force refresh a specific range
function refreshRange(range) {
  if (range === '30') {
    // Prevent concurrent loading for 30 days
    if (isLoading30) return;
    isLoading30 = true;

    // Clear cached 30 days data and show loading state
    delete cachedSpendingData.total;
    delete cachedSpendingData.orderCount;
    delete cachedSpendingData.limitReached;
    delete cachedSpendingData.updatedAt30;
    injectPopup(cachedSpendingData);

    safeSendMessage({ action: 'GET_SPENDING_30', force: true }, response => {
      isLoading30 = false;
      if (response && response.error === 'TAB_CREATE_FAILED') {
        showErrorPopup('TAB_CREATE_FAILED');
      } else if (response && response.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
      } else if (response && !response.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response.total,
          orderCount: response.orderCount,
          limitReached: response.limitReached,
          updatedAt30: response.updatedAt,
        };
        injectPopup(cachedSpendingData);
      }
    });
  } else if (range === '3m') {
    // Prevent concurrent loading for 3 months
    if (isLoading3M) return;
    isLoading3M = true;

    // Clear cached 3 months data and show loading state
    delete cachedSpendingData.total3Months;
    delete cachedSpendingData.orderCount3Months;
    delete cachedSpendingData.limitReached3Months;
    delete cachedSpendingData.updatedAt3M;
    injectPopup(cachedSpendingData);

    safeSendMessage({ action: 'GET_SPENDING_3M', force: true }, response => {
      isLoading3M = false;
      if (response && response.error === 'TAB_CREATE_FAILED') {
        showErrorPopup('TAB_CREATE_FAILED');
      } else if (response && response.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
      } else if (response && !response.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response.total,
          orderCount3Months: response.orderCount,
          limitReached3Months: response.limitReached,
          updatedAt3M: response.updatedAt,
        };
        injectPopup(cachedSpendingData);
      }
    });
  }
}

// Force refresh all enabled ranges
function refreshAll() {
  const settings = getSettings();

  // Prevent concurrent loading - check if any loading is in progress
  const will30Load = settings.show30Days && !isLoading30;
  const will3MLoad = settings.show3Months && !isLoading3M;

  // If nothing can be loaded (either disabled or already loading), return
  if (!will30Load && !will3MLoad) return;

  // Clear cached data for ranges that will load and show loading state
  if (will30Load) {
    isLoading30 = true;
    delete cachedSpendingData.total;
    delete cachedSpendingData.orderCount;
    delete cachedSpendingData.limitReached;
    delete cachedSpendingData.updatedAt30;
  }
  if (will3MLoad) {
    isLoading3M = true;
    delete cachedSpendingData.total3Months;
    delete cachedSpendingData.orderCount3Months;
    delete cachedSpendingData.limitReached3Months;
    delete cachedSpendingData.updatedAt3M;
  }
  injectPopup(cachedSpendingData);

  // Load 30 days if enabled and not already loading
  if (will30Load) {
    safeSendMessage({ action: 'GET_SPENDING_30', force: true }, response30 => {
      isLoading30 = false;
      if (response30 && response30.error === 'TAB_CREATE_FAILED') {
        showErrorPopup('TAB_CREATE_FAILED');
        return;
      }
      if (response30 && response30.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
        return;
      }
      if (response30 && !response30.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response30.total,
          orderCount: response30.orderCount,
          limitReached: response30.limitReached,
          updatedAt30: response30.updatedAt,
        };
        injectPopup(cachedSpendingData);

        // Load 3 months if enabled and not already loading
        if (will3MLoad) {
          safeSendMessage(
            { action: 'GET_SPENDING_3M', force: true },
            response3M => {
              isLoading3M = false;
              if (response3M && response3M.error === 'TAB_CREATE_FAILED') {
                showErrorPopup('TAB_CREATE_FAILED');
                return;
              }
              if (response3M && response3M.error === 'AUTH_REQUIRED') {
                showErrorPopup('AUTH_REQUIRED');
                return;
              }
              if (response3M && !response3M.error) {
                cachedSpendingData = {
                  ...cachedSpendingData,
                  total3Months: response3M.total,
                  orderCount3Months: response3M.orderCount,
                  limitReached3Months: response3M.limitReached,
                  updatedAt3M: response3M.updatedAt,
                };
                injectPopup(cachedSpendingData);
              }
            },
          );
        }
      }
    });
  } else if (will3MLoad) {
    safeSendMessage({ action: 'GET_SPENDING_3M', force: true }, response3M => {
      isLoading3M = false;
      if (response3M && response3M.error === 'TAB_CREATE_FAILED') {
        showErrorPopup('TAB_CREATE_FAILED');
        return;
      }
      if (response3M && response3M.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
        return;
      }
      if (response3M && !response3M.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response3M.total,
          orderCount3Months: response3M.orderCount,
          limitReached3Months: response3M.limitReached,
          updatedAt3M: response3M.updatedAt,
        };
        injectPopup(cachedSpendingData);
      }
    });
  }
}

// Load data based on current settings, only fetching what's needed
function loadData(showLoading = true) {
  const settings = getSettings();
  const savedState = getPopupState();

  // If nothing is enabled, just show the popup with no data
  if (!settings.show30Days && !settings.show3Months) {
    if (savedState.isMinimized) {
      showMinimizedIcon();
    } else {
      injectPopup({});
    }
    return;
  }

  // Determine what data we need to load (also check if not already loading)
  const need30Days =
    settings.show30Days &&
    cachedSpendingData?.total === undefined &&
    !isLoading30;
  const need3Months =
    settings.show3Months &&
    cachedSpendingData?.total3Months === undefined &&
    !isLoading3M;

  // Check if we have any data to show already
  const hasData30 = cachedSpendingData?.total !== undefined;
  const hasData3M = cachedSpendingData?.total3Months !== undefined;
  const hasAnyData = hasData30 || hasData3M;

  // If we already have all the data we need (or it's loading), just show it
  if (!need30Days && !need3Months) {
    if (savedState.isMinimized) {
      showMinimizedIcon();
    } else {
      injectPopup(cachedSpendingData);
    }
    return;
  }

  // Set loading flags for ranges we're about to load
  if (need30Days) isLoading30 = true;
  if (need3Months) isLoading3M = true;

  // Show loading only if we have no data at all, otherwise show current data with loader for missing part
  if (showLoading) {
    if (savedState.isMinimized) {
      showMinimizedIcon(); // Show icon with loading state
    } else if (hasAnyData) {
      // Show existing data immediately - injectPopup handles showing loader for missing ranges
      injectPopup(cachedSpendingData);
    } else {
      showLoadingPopup();
    }
  }

  // Load 30 days if needed and enabled
  if (need30Days) {
    safeSendMessage({ action: 'GET_SPENDING_30' }, response30 => {
      isLoading30 = false;
      if (response30 && response30.error === 'TAB_CREATE_FAILED') {
        showErrorPopup('TAB_CREATE_FAILED');
        return;
      }
      if (response30 && !response30.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response30.total,
          orderCount: response30.orderCount,
          limitReached: response30.limitReached,
          updatedAt30: response30.updatedAt,
        };

        // Update popup or icon
        const currentState = getPopupState();
        if (currentState.isMinimized) {
          showMinimizedIcon();
        } else {
          injectPopup(cachedSpendingData);
        }

        // Load 3 months if needed (re-check the flag as it might have changed)
        if (need3Months && isLoading3M) {
          safeSendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
            isLoading3M = false;
            if (response3M && response3M.error === 'TAB_CREATE_FAILED') {
              showErrorPopup('TAB_CREATE_FAILED');
              return;
            }
            if (response3M && !response3M.error) {
              cachedSpendingData = {
                ...cachedSpendingData,
                total3Months: response3M.total,
                orderCount3Months: response3M.orderCount,
                limitReached3Months: response3M.limitReached,
                updatedAt3M: response3M.updatedAt,
              };

              const currentState3M = getPopupState();
              if (currentState3M.isMinimized) {
                showMinimizedIcon();
              } else {
                injectPopup(cachedSpendingData);
              }
            }
          });
        }
      } else if (response30 && response30.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
      }
    });
  } else if (need3Months) {
    // Only need 3 months (30 days already cached or disabled)
    safeSendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
      isLoading3M = false;
      if (response3M && response3M.error === 'TAB_CREATE_FAILED') {
        showErrorPopup('TAB_CREATE_FAILED');
        return;
      }
      if (response3M && !response3M.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response3M.total,
          orderCount3Months: response3M.orderCount,
          limitReached3Months: response3M.limitReached,
          updatedAt3M: response3M.updatedAt,
        };

        const currentStateOnly3M = getPopupState();
        if (currentStateOnly3M.isMinimized) {
          showMinimizedIcon();
        } else {
          injectPopup(cachedSpendingData);
        }
      } else if (response3M && response3M.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
      }
    });
  }
}

// Inject spending alert on checkout page
function injectCheckoutAlert(spendingAmount, rangeLabel) {
  // Don't inject if already exists
  if (document.getElementById('amz-spending-checkout-alert')) return;

  const subtotals = document.getElementById('subtotals');
  if (!subtotals) return;

  const alertDiv = document.createElement('div');
  alertDiv.id = 'amz-spending-checkout-alert';
  Object.assign(alertDiv.style, {
    backgroundColor: '#fff8e1',
    border: '1px solid #ff9800',
    borderRadius: '4px',
    padding: '12px',
    marginTop: '12px',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    fontSize: '14px',
    color: '#5d4037',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    position: 'relative',
  });

  alertDiv.innerHTML = `
    <span style="font-size: 20px; line-height: 1;">⚠️</span>
    <span style="flex: 1;">Are you sure you want to proceed? ${rangeLabel} you have already spent <strong>${Math.round(spendingAmount)}€</strong></span>
    <button id="amz-checkout-alert-close" style="background: none; border: none; cursor: pointer; padding: 0; margin: 0; line-height: 1; color: #5d4037; font-size: 18px; opacity: 0.7;" title="Close">×</button>
  `;

  subtotals.parentNode.insertBefore(alertDiv, subtotals.nextSibling);

  document.getElementById('amz-checkout-alert-close').onclick = () => {
    alertDiv.remove();
  };
}

// Handle checkout page - show spending alert
function handleCheckoutPage() {
  const settings = getSettings();

  // Helper to try 3 months data
  const tryThreeMonths = () => {
    if (!settings.show3Months) return;

    safeSendMessage(
      { action: 'GET_SPENDING_3M', cacheOnly: true },
      response3M => {
        if (
          response3M &&
          !response3M.error &&
          !response3M.noCache &&
          response3M.total !== undefined &&
          response3M.total > 0
        ) {
          injectCheckoutAlert(response3M.total, 'In the last 3 months');
        }
      },
    );
  };

  // First try 30 days if enabled in settings
  if (settings.show30Days) {
    safeSendMessage(
      { action: 'GET_SPENDING_30', cacheOnly: true },
      response30 => {
        if (
          response30 &&
          !response30.error &&
          !response30.noCache &&
          response30.total !== undefined &&
          response30.total > 0
        ) {
          injectCheckoutAlert(response30.total, 'This month');
          return;
        }
        // No 30 days data, try 3 months as fallback
        tryThreeMonths();
      },
    );
  } else {
    // 30 days disabled, try 3 months directly
    tryThreeMonths();
  }
}

// Interface Lock Functions
let lockTimerInterval = null;

// Check if current time is within the lock time range
function isInLockTimeRange(settings) {
  if (!settings.interfaceLockEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.lockStartTime.split(':').map(Number);
  const [endHour, endMin] = settings.lockEndTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight ranges (e.g., 22:00 to 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Calculate time remaining until unlock
function calculateTimeUntilUnlock(settings) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  const [endHour, endMin] = settings.lockEndTime.split(':').map(Number);
  const [startHour, startMin] = settings.lockStartTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let minutesUntilUnlock;

  // Handle overnight ranges
  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes) {
      // After start time, unlock tomorrow at end time
      minutesUntilUnlock = (24 * 60 - currentMinutes) + endMinutes;
    } else {
      // Before end time, unlock today
      minutesUntilUnlock = endMinutes - currentMinutes;
    }
  } else {
    minutesUntilUnlock = endMinutes - currentMinutes;
  }

  // Convert to hours, minutes, seconds
  const totalSeconds = minutesUntilUnlock * 60 - currentSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
}

// Format time for display
function formatLockTime(hours, minutes, seconds) {
  const pad = n => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

// Show the lock overlay
function showLockOverlay(settings, spendingData) {
  // Remove any existing overlay
  const existingOverlay = document.getElementById('amz-lock-overlay');
  if (existingOverlay) existingOverlay.remove();

  // Also remove spending popup if it exists
  const existingPopup = document.getElementById('amz-spending-popup');
  if (existingPopup) existingPopup.remove();

  const overlay = document.createElement('div');
  overlay.id = 'amz-lock-overlay';

  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(35, 47, 62, 0.97)',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    color: '#ffffff',
  });

  // Build spending info if available
  let spendingInfo = '';
  if (spendingData) {
    let amount = null;
    let rangeLabel = '';

    if (spendingData.total !== undefined) {
      amount = Math.round(spendingData.total);
      rangeLabel = 'in the last 30 days';
    } else if (spendingData.total3Months !== undefined) {
      amount = Math.round(spendingData.total3Months);
      rangeLabel = 'in the last 3 months';
    }

    if (amount !== null) {
      spendingInfo = `
        <div style="margin-top:50px; text-align:center;">
          <div style="font-size:clamp(12px, 2vw, 16px); color:#ff9900; margin-bottom:16px;">You have spent</div>
          <div style="font-size:clamp(28px, 7vw, 56px); font-weight:700; color:#ff9900; line-height:1;">${amount} €</div>
          <div style="font-size:clamp(12px, 2vw, 15px); color:#a0a0a0; margin-top:12px;">${rangeLabel}</div>
        </div>
      `;
    }
  }

  const timeLeft = calculateTimeUntilUnlock(settings);
  const formattedTime = formatLockTime(timeLeft.hours, timeLeft.minutes, timeLeft.seconds);

  overlay.innerHTML = `
    <style>
      @keyframes amz-lock-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
    </style>
    <div style="text-align:center;">
      <svg style="width:clamp(48px, 10vw, 80px); height:clamp(48px, 10vw, 80px); animation: amz-lock-pulse 2s ease-in-out infinite;" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <h1 style="font-size:clamp(18px, 4vw, 28px); font-weight:700; margin:20px 0 10px 0;">Amazon is Locked</h1>
      <p style="font-size:clamp(11px, 2vw, 14px); color:#a0a0a0; margin:0;">Time set: ${settings.lockStartTime} - ${settings.lockEndTime}</p>
    </div>
    <div style="margin-top:40px; text-align:center;">
      <div style="font-size:clamp(11px, 2vw, 14px); color:#a0a0a0; margin-bottom:25px;">Unlocks in</div>
      <div id="amz-lock-timer" style="font-size:clamp(32px, 8vw, 64px); font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:2px;">${formattedTime}</div>
    </div>
    ${spendingInfo}
    <div style="position:absolute; bottom:clamp(10px, 3vh, 30px); left:0; right:0; text-align:center;">
      <img src="${chrome.runtime.getURL('assets/images/icons/amz_icon.png')}" alt="Amazon Spending Tracker" style="width:24px; height:24px; margin-bottom:8px;">
      <p style="font-size:12px; color:#565959; margin:0;">Amazon Spending Tracker</p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Start the countdown timer
  startLockTimer(settings);
}

// Start the countdown timer
function startLockTimer(settings) {
  // Clear any existing timer
  if (lockTimerInterval) {
    clearInterval(lockTimerInterval);
  }

  lockTimerInterval = setInterval(() => {
    const timerElement = document.getElementById('amz-lock-timer');
    if (!timerElement) {
      clearInterval(lockTimerInterval);
      return;
    }

    // Check if we should still be locked
    if (!isInLockTimeRange(settings)) {
      clearInterval(lockTimerInterval);
      removeLockOverlay();
      // Re-initialize the normal popup
      loadData(true);
      return;
    }

    const timeLeft = calculateTimeUntilUnlock(settings);
    timerElement.textContent = formatLockTime(timeLeft.hours, timeLeft.minutes, timeLeft.seconds);
  }, 1000);
}

// Remove the lock overlay
function removeLockOverlay() {
  const overlay = document.getElementById('amz-lock-overlay');
  if (overlay) {
    overlay.remove();
  }
  if (lockTimerInterval) {
    clearInterval(lockTimerInterval);
    lockTimerInterval = null;
  }
}

// Observe DOM changes to inject alert when subtotals appears
function observeCheckoutPage() {
  // Try immediately first
  const subtotals = document.getElementById('subtotals');
  if (subtotals) {
    handleCheckoutPage();
    return;
  }

  // Otherwise observe for DOM changes
  const observer = new MutationObserver((mutations, obs) => {
    const subtotals = document.getElementById('subtotals');
    if (subtotals) {
      obs.disconnect();
      handleCheckoutPage();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Timeout after 10 seconds to avoid indefinite observation
  setTimeout(() => observer.disconnect(), 10000);
}

// Load spending data from cache for lock overlay
function loadSpendingDataForLock(callback) {
  const settings = getSettings();

  // Try to get cached data for display on lock screen
  if (settings.show30Days) {
    safeSendMessage({ action: 'GET_SPENDING_30', cacheOnly: true }, response30 => {
      if (response30 && !response30.error && !response30.noCache && response30.total !== undefined) {
        callback({ total: response30.total });
        return;
      }
      // Try 3 months as fallback
      if (settings.show3Months) {
        safeSendMessage({ action: 'GET_SPENDING_3M', cacheOnly: true }, response3M => {
          if (response3M && !response3M.error && !response3M.noCache && response3M.total !== undefined) {
            callback({ total3Months: response3M.total });
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    });
  } else if (settings.show3Months) {
    safeSendMessage({ action: 'GET_SPENDING_3M', cacheOnly: true }, response3M => {
      if (response3M && !response3M.error && !response3M.noCache && response3M.total !== undefined) {
        callback({ total3Months: response3M.total });
      } else {
        callback(null);
      }
    });
  } else {
    callback(null);
  }
}

checkOnboardingAndInit();
