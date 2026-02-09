function showLockConfirmDialog(onConfirm, onCancel) {
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
  const mainPopup = document.getElementById(POPUP_ID);
  let mainRect = null;
  if (mainPopup) {
    mainRect = mainPopup.getBoundingClientRect();
  }

  const currentPosition = getCurrentPopupPosition();
  if (currentPosition) {
    savePopupState(false, currentPosition);
  }

  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  const savedState = getPopupState();
  const settings = getSettings();
  const popup = document.createElement('div');
  popup.id = POPUP_ID;

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
    overflow: 'visible',
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
      .amz-help-tooltip { position:fixed; background:#232f3e; color:#fff; padding:6px 8px; border-radius:4px; font-size:11px; line-height:1.3; max-width:140px; white-space:normal; opacity:0; visibility:hidden; transition:opacity .2s, visibility .2s; z-index:2147483647; pointer-events:none; }
      .amz-settings-content { overflow:visible; }
    </style>
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>Settings</span>
      <div style="display:flex; align-items:center; gap:4px;">
        ${BACK_ICON_SVG}
        ${CLOSE_ICON_SVG}
      </div>
    </div>
    <div class="amz-settings-content" style="padding:10px 8px; font-size:12px; display:flex; flex-direction:column; gap:8px;">
      <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span style="display:flex; align-items:center;">Last 30 days<span class="amz-help-icon" onclick="event.preventDefault();">${HELP_ICON_SVG}<span class="amz-help-tooltip">Shows total spent in the last 30 days</span></span></span>
        <div class="amz-toggle">
          <input type="checkbox" id="amz-setting-30days" ${settings.show30Days ? 'checked' : ''}>
          <span class="slider"></span>
        </div>
      </label>
      <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span style="display:flex; align-items:center;">Last 3 months<span class="amz-help-icon" onclick="event.preventDefault();">${HELP_ICON_SVG}<span class="amz-help-tooltip">Shows total spent in the last 3 months</span></span></span>
        <div class="amz-toggle">
          <input type="checkbox" id="amz-setting-3months" ${settings.show3Months ? 'checked' : ''}>
          <span class="slider"></span>
        </div>
      </label>

      <div class="amz-section-divider">
        <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
          <span style="display:flex; align-items:center; font-weight:600;">Interface Lock<span class="amz-help-icon" onclick="event.preventDefault();">${HELP_ICON_SVG}<span class="amz-help-tooltip">Blocks access during set hours to prevent impulse purchases</span></span></span>
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
          ${HELP_ICON_SVG.replace('width="14" height="14"', 'width="12" height="12"')}
          Replay Tutorial
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const actualHeight = popup.offsetHeight;
  const viewportHeight = document.documentElement.clientHeight;
  const viewportWidth = document.documentElement.clientWidth;
  const margin = 10;

  if (mainRect) {
    const viewportCenter = viewportWidth / 2;
    const popupCenter = (mainRect.left + mainRect.right) / 2;
    let newLeft = popupCenter < viewportCenter ? mainRect.left : mainRect.right - settingsWidth;
    let newTop = mainRect.bottom - actualHeight;
    newLeft = Math.max(margin, Math.min(newLeft, viewportWidth - settingsWidth - margin));
    newTop = Math.max(margin, Math.min(newTop, viewportHeight - actualHeight - margin));
    popup.style.left = newLeft + 'px';
    popup.style.top = newTop + 'px';
    popup.style.bottom = '';
    popup.style.right = '';
  } else if (popup.style.top) {
    let currentTop = parseFloat(popup.style.top);
    const maxTop = viewportHeight - actualHeight - margin;
    if (currentTop > maxTop) {
      popup.style.top = Math.max(margin, maxTop) + 'px';
    }
  }

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

    const settingsPopup = document.getElementById(POPUP_ID);
    if (settingsPopup) {
      const settingsRect = settingsPopup.getBoundingClientRect();
      const rc = getResponsiveConfig();
      const enabledCount = (newSettings.show30Days ? 1 : 0) + (newSettings.show3Months ? 1 : 0);
      const mainHeight = (enabledCount === 2 ? 140 : enabledCount === 1 ? 90 : 85) + 24;
      const mainWidth = rc.popupMinWidth;
      const viewportCenter = document.documentElement.clientWidth / 2;
      const popupCenter = (settingsRect.left + settingsRect.right) / 2;
      const adjustedLeft = popupCenter < viewportCenter
        ? settingsRect.left
        : settingsRect.right - mainWidth;
      const adjustedTop = settingsRect.bottom - mainHeight;
      settingsPopup.remove();
      savePopupState(false, { left: adjustedLeft, top: adjustedTop });
    }

    loadData(true);
  };

  function getCurrentSettingsFromForm() {
    return {
      show30Days: document.getElementById('amz-setting-30days').checked,
      show3Months: document.getElementById('amz-setting-3months').checked,
      interfaceLockEnabled: document.getElementById('amz-setting-lock').checked,
      lockStartTime: document.getElementById('amz-lock-start').value,
      lockEndTime: document.getElementById('amz-lock-end').value,
    };
  }

  const saveCurrentSettings = () => {
    saveSettings(getCurrentSettingsFromForm());
  };

  document.getElementById('amz-setting-30days').onchange = saveCurrentSettings;
  document.getElementById('amz-setting-3months').onchange = saveCurrentSettings;

  document.getElementById('amz-setting-lock').onchange = () => {
    const lockCheckbox = document.getElementById('amz-setting-lock');
    const lockTimes = document.getElementById('amz-lock-times');

    if (lockCheckbox.checked) {
      showLockConfirmDialog(
        () => {
          lockTimes.style.display = 'flex';
          saveCurrentSettings();
          const popup = document.getElementById(POPUP_ID);
          if (popup && popup.style.top) {
            const rect = popup.getBoundingClientRect();
            const corrected = constrainToViewport(rect.left, rect.top, popup.offsetHeight, popup.offsetWidth);
            popup.style.top = corrected.top + 'px';
            popup.style.left = corrected.left + 'px';
          }
        },
        () => {
          lockCheckbox.checked = false;
        }
      );
    } else {
      lockTimes.style.display = 'none';
      saveCurrentSettings();
    }
  };

  document.getElementById('amz-lock-start').onchange = saveCurrentSettings;
  document.getElementById('amz-lock-end').onchange = saveCurrentSettings;

  popup.querySelectorAll('.amz-help-icon').forEach(icon => {
    const tooltip = icon.querySelector('.amz-help-tooltip');
    if (!tooltip) return;

    icon.addEventListener('mouseenter', () => {
      const iconRect = icon.getBoundingClientRect();
      const tooltipWidth = 152;
      const tooltipGap = 6;
      const vw = document.documentElement.clientWidth;

      if (iconRect.left - tooltipWidth - tooltipGap >= 0) {
        tooltip.style.left = (iconRect.left - tooltipWidth - tooltipGap) + 'px';
      } else {
        tooltip.style.left = (iconRect.right + tooltipGap) + 'px';
      }

      tooltip.style.top = (iconRect.top + iconRect.height / 2) + 'px';
      tooltip.style.transform = 'translateY(-50%)';
      tooltip.style.opacity = '1';
      tooltip.style.visibility = 'visible';
    });

    icon.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      tooltip.style.visibility = 'hidden';
    });
  });

  setupDraggable(popup);
}
