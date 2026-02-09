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
  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  const rc = getResponsiveConfig();
  const popup = document.createElement('div');
  popup.id = POPUP_ID;

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
    width: 'auto',
    minWidth: rc.popupMinWidth + 'px',
    maxWidth: rc.popupMaxWidth + 'px',
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

  popup.innerHTML = `
    ${SPINNER_STYLE}
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>Spendings</span>
      <div id="amz-header-buttons" style="display:flex; align-items:center; gap:4px;">
        ${REFRESH_ICON_HEADER_SVG}
        ${GEAR_ICON_SVG.replace('<svg ', '<svg id="amz-settings" ')}
        ${CLOSE_ICON_SVG}
      </div>
    </div>
    <div id="amz-popup-body" style="padding:8px 8px 10px 8px; display:flex; flex-direction:column; gap:4px; font-size:12px;">
      <div id="amz-range-30">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#565959;">Last 30 days:</span>
          <b style="color:#B12704; font-size:14px;">-- ${getCurrentDomainConfig().symbol}</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#767676;">- orders</span>
          <span id="amz-refresh-30">${REFRESH_ICON_SVG}</span>
        </div>
      </div>
      <div id="amz-range-3m" style="border-top:1px solid #e7e7e7; padding-top:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#565959;">Last 3 months:</span>
          <b style="color:#B12704; font-size:14px;">-- ${getCurrentDomainConfig().symbol}</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#767676;">- orders</span>
          <span id="amz-refresh-3m">${REFRESH_ICON_SVG}</span>
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

    const popup = document.getElementById(POPUP_ID);
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
    const demoPopup = document.getElementById(POPUP_ID);
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
