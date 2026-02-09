function showMinimizedIcon() {
  const side = getPopupSide() || getPopupState().side;
  savePopupState(true, side);

  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  const icon = document.createElement('div');
  icon.id = POPUP_ID;

  const settings = getSettings();
  const isLoading = isLoading30 || isLoading3M;

  let spendingLabel = null;
  if (settings.show30Days && cachedSpendingData.total !== undefined) {
    spendingLabel = formatAmountHtml(
      cachedSpendingData.allCurrencies30,
      cachedSpendingData.total,
      cachedSpendingData.symbol,
    );
  } else if (
    settings.show3Months &&
    cachedSpendingData.total3Months !== undefined
  ) {
    spendingLabel = formatAmountHtml(
      cachedSpendingData.allCurrencies3M,
      cachedSpendingData.total3Months,
      cachedSpendingData.symbol,
    );
  }

  const showAmount = !isLoading && spendingLabel !== null;

  Object.assign(icon.style, {
    position: 'fixed',
    bottom: '10px',
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

  const savedSide = getPopupState().side;
  if (savedSide === 'left') {
    icon.style.left = '10px';
  } else {
    icon.style.right = '10px';
  }

  const noRangesEnabled = !settings.show30Days && !settings.show3Months;

  if (showAmount) {
    icon.style.width = 'auto';
    icon.style.minWidth = '36px';
    icon.style.padding = '0 10px';
    icon.style.borderRadius = '18px';
    icon.style.whiteSpace = 'nowrap';
    icon.innerHTML = spendingLabel;
  } else if (isLoading) {
    icon.style.width = '36px';
    icon.style.borderRadius = '50%';
    icon.innerHTML = `
      <style>
        @keyframes amz-icon-spinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <span style="animation: amz-icon-spinner 1s linear infinite; display: inline-block;">${getCurrentDomainConfig().symbol}</span>
    `;
  } else if (noRangesEnabled) {
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
    icon.style.width = '36px';
    icon.style.borderRadius = '50%';
    icon.innerHTML = getCurrentDomainConfig().symbol;
  }

  icon.onclick = () => {
    injectPopup(cachedSpendingData || {});
  };

  document.body.appendChild(icon);
}

function showLoadingPopup() {
  injectGlobalStyles();
  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  const savedState = getPopupState();
  const rc = getResponsiveConfig();
  const popup = document.createElement('div');
  popup.id = POPUP_ID;

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: 'auto',
    minWidth: rc.popupMinWidth + 'px',
    maxWidth: rc.popupMaxWidth + 'px',
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
    applyPosition(baseStyle, savedState.side);
  }
  Object.assign(popup.style, baseStyle);

  popup.innerHTML = `
        ${SPINNER_STYLE}
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>SpendGuard</span>
            <div style="display:flex; align-items:center; gap:4px;">
                ${GEAR_ICON_SVG.replace('<svg ', '<svg id="amz-settings" ')}
                ${CLOSE_ICON_SVG}
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

  const headerBtnIds = [
    'amz-close',
    'amz-settings',
    'amz-back',
    'amz-refresh-all',
  ];
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
      const viewportCenter = document.documentElement.clientWidth / 2;
      const popupCenter = (rect.left + rect.right) / 2;
      const side = popupCenter < viewportCenter ? 'left' : 'right';
      savePopupState(false, side);
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

  const side = getPopupSide();
  if (side) {
    savePopupState(false, side);
  }

  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  const savedState = getPopupState();
  const settings = getSettings();
  const popup = document.createElement('div');
  popup.id = POPUP_ID;

  const enabledCount =
    (settings.show30Days ? 1 : 0) + (settings.show3Months ? 1 : 0);
  const rc = getResponsiveConfig();

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: 'auto',
    minWidth: rc.popupMinWidth + 'px',
    maxWidth: rc.popupMaxWidth + 'px',
    height: 'auto',
    minHeight: '85px',
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
    applyPosition(baseStyle, savedState.side);
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

  let thirtyDaysContent = '';
  if (settings.show30Days) {
    const time30 = data.updatedAt30 ? formatRelativeTime(data.updatedAt30) : '';
    thirtyDaysContent = is30DaysLoading
      ? `<div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:8px;">
            <span style="color:#565959; white-space:nowrap;">Last 30 days:</span>
            <div class="amz-skeleton-bar" style="width:50px; height:14px; flex-shrink:0;"></div>
          </div>
          <div style="margin-top:4px;"><div class="amz-skeleton-bar" style="width:80px; height:10px;"></div></div>
        </div>`
      : `<div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:8px;">
            <span style="color:#565959; white-space:nowrap;">Last 30 days:</span>
            <b style="color:#B12704; font-size:14px; white-space:nowrap; flex-shrink:0;">${formatAmountHtml(data.allCurrencies30, data.total, data.symbol)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap;">
            <span style="font-size:11px; color:#767676; white-space:nowrap;">${getTotalOrders(data.allCurrencies30, data.orderCount)} order${getTotalOrders(data.allCurrencies30, data.orderCount) !== 1 ? 's' : ''}${time30 ? ` · ${time30}` : ''} ${warning30}</span>
            <span id="amz-refresh-30">${REFRESH_ICON_SVG}</span>
          </div>
        </div>`;
  }

  let threeMonthsContent = '';
  if (settings.show3Months) {
    const time3M = data.updatedAt3M ? formatRelativeTime(data.updatedAt3M) : '';
    const separator = settings.show30Days
      ? 'border-top:1px solid #e7e7e7; padding-top:4px;'
      : '';
    const innerContent = is3MonthsLoading
      ? `<div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:8px;">
            <span style="color:#565959; white-space:nowrap;">Last 3 months:</span>
            <div class="amz-skeleton-bar" style="width:50px; height:14px; flex-shrink:0;"></div>
          </div>
          <div style="margin-top:4px;"><div class="amz-skeleton-bar" style="width:80px; height:10px;"></div></div>
        </div>`
      : `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:8px;">
          <span style="color:#565959; white-space:nowrap;">Last 3 months:</span>
          <b style="color:#B12704; font-size:14px; white-space:nowrap; flex-shrink:0;">${formatAmountHtml(data.allCurrencies3M, data.total3Months, data.symbol)}</b>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap;">
          <span style="font-size:11px; color:#767676; white-space:nowrap;">${getTotalOrders(data.allCurrencies3M, data.orderCount3Months)} order${getTotalOrders(data.allCurrencies3M, data.orderCount3Months) !== 1 ? 's' : ''}${time3M ? ` · ${time3M}` : ''} ${warning3Months}</span>
          <span id="amz-refresh-3m">${REFRESH_ICON_SVG}</span>
        </div>`;
    threeMonthsContent = `<div style="${separator}">${innerContent}</div>`;
  }

  const noRangesMessage =
    enabledCount === 0
      ? `<div style="color:#565959; text-align:center; line-height: 1.4;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d5d9d9" stroke-width="1.5" style="margin-bottom:4px;"><path d="M3 3l18 18M21 12a9 9 0 0 1-1.5 5M3.6 15A9 9 0 0 1 12 3a9 9 0 0 1 5 1.5"/></svg>
          <div style="font-size:12px; margin-bottom:4px;">No spending ranges selected</div>
          <span id="amz-open-settings-link" style="color:#0066c0; font-size:11px; cursor:pointer; text-decoration:underline;">Open Settings</span>
        </div>`
      : '';

  const lockStatusMessage = settings.interfaceLockEnabled
    ? `<div style="font-size:10px; color:#565959; text-align:center; border-top:1px solid #e7e7e7; padding-top:3px">Lock: ${settings.lockStartTime} - ${settings.lockEndTime}</div>`
    : `<div style="font-size:10px; color:#999; text-align:center; border-top:1px solid #e7e7e7; padding-top:3px">Lock not configured</div>`;

  popup.innerHTML = `
        ${SPINNER_STYLE}
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>SpendGuard</span>
            <div style="display:flex; align-items:center; gap:4px;">
                ${REFRESH_ICON_HEADER_SVG}
                ${GEAR_ICON_SVG.replace('<svg ', '<svg id="amz-settings" ')}
                ${CLOSE_ICON_SVG}
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

  const refresh30Btn = document.getElementById('amz-refresh-30');
  if (refresh30Btn) {
    refresh30Btn.onclick = () => refreshRange('30');
  }
  const refresh3mBtn = document.getElementById('amz-refresh-3m');
  if (refresh3mBtn) {
    refresh3mBtn.onclick = () => refreshRange('3m');
  }

  setupDraggable(popup);
}

function showErrorPopup(errorType) {
  injectGlobalStyles();
  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  const savedState = getPopupState();
  const rc = getResponsiveConfig();
  const popup = document.createElement('div');
  popup.id = POPUP_ID;

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: 'auto',
    minWidth: rc.popupMinWidth + 'px',
    maxWidth: rc.popupMaxWidth + 'px',
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
    applyPosition(baseStyle, savedState.side);
  }
  Object.assign(popup.style, baseStyle);

  let errorMessage;
  let showRetry = true;
  let extraButton = '';
  if (errorType === 'TAB_CREATE_FAILED') {
    errorMessage =
      "Couldn't read your orders. Try closing some browser tabs and click Retry.";
  } else if (errorType === 'CONTEXT_INVALIDATED') {
    errorMessage = 'Extension was updated, please refresh this page.';
    showRetry = false;
    extraButton =
      '<button id="amz-reload-page" style="background:#232f3e; color:white; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; min-height:32px;">Refresh Page</button>';
  } else if (errorType === 'AUTH_REQUIRED') {
    errorMessage = 'Please log into Amazon first, then refresh.';
    showRetry = false;
    extraButton =
      '<button id="amz-go-login" style="background:#FF9900; color:#0f1111; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; min-height:32px;">Go to Login</button>';
  } else {
    errorMessage = 'Error loading data. Please try again.';
  }

  popup.innerHTML = `
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>SpendGuard</span>
      <div style="display:flex; align-items:center; gap:4px;">
        ${GEAR_ICON_SVG.replace('<svg ', '<svg id="amz-settings" ')}
        ${CLOSE_ICON_SVG}
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
    loginBtn.onclick = () => {
      window.location.href =
        'https://' + window.location.hostname + '/ap/signin';
    };
  }

  setupDraggable(popup);
}
