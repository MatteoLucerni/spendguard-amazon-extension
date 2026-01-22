let cachedSpendingData = {};

// Settings management
function getSettings() {
  try {
    const saved = localStorage.getItem('amz-spending-settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Tracker: Error reading settings', e);
  }
  return { show30Days: true, show3Months: true };
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

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: '160px',
    height: '130px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
    overflow: 'hidden',
  };

  applyPosition(baseStyle, savedState.position, 130);
  Object.assign(popup.style, baseStyle);

  popup.innerHTML = `
    <style>
      .amz-toggle { position:relative; width:28px; height:16px; flex-shrink:0; }
      .amz-toggle input { opacity:0; width:0; height:0; }
      .amz-toggle .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.2s; border-radius:16px; }
      .amz-toggle .slider:before { position:absolute; content:""; height:12px; width:12px; left:2px; bottom:2px; background-color:white; transition:.2s; border-radius:50%; }
      .amz-toggle input:checked + .slider { background-color:#4caf50; }
      .amz-toggle input:checked + .slider:before { transform:translateX(12px); }
    </style>
    <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
      <span>Settings</span>
      <div style="display:flex; align-items:center; gap:4px;">
        <svg id="amz-back" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Back</title><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    </div>
    <div style="padding:10px 8px; font-size:12px; display:flex; flex-direction:column; gap:10px;">
      <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span>Last 30 days</span>
        <div class="amz-toggle">
          <input type="checkbox" id="amz-setting-30days" ${settings.show30Days ? 'checked' : ''}>
          <span class="slider"></span>
        </div>
      </label>
      <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span>Last 3 months</span>
        <div class="amz-toggle">
          <input type="checkbox" id="amz-setting-3months" ${settings.show3Months ? 'checked' : ''}>
          <span class="slider"></span>
        </div>
      </label>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-back').onclick = () => {
    // Save settings before going back
    const newSettings = {
      show30Days: document.getElementById('amz-setting-30days').checked,
      show3Months: document.getElementById('amz-setting-3months').checked,
    };
    saveSettings(newSettings);
    // Load data (will fetch missing ranges if newly enabled)
    loadData(true);
  };

  // Auto-save on checkbox change
  document.getElementById('amz-setting-30days').onchange = () => {
    const newSettings = {
      show30Days: document.getElementById('amz-setting-30days').checked,
      show3Months: document.getElementById('amz-setting-3months').checked,
    };
    saveSettings(newSettings);
  };
  document.getElementById('amz-setting-3months').onchange = () => {
    const newSettings = {
      show30Days: document.getElementById('amz-setting-30days').checked,
      show3Months: document.getElementById('amz-setting-3months').checked,
    };
    saveSettings(newSettings);
  };

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
function applyPosition(styleObj, position, height = null) {
  if (
    position &&
    typeof position.left === 'number' &&
    typeof position.top === 'number'
  ) {
    const constrained = constrainToViewport(position.left, position.top, height);
    styleObj.left = constrained.left + 'px';
    styleObj.top = constrained.top + 'px';
  } else {
    styleObj.bottom = '10px';
    styleObj.right = '10px';
  }
}

// Constrain position to viewport bounds
function constrainToViewport(left, top, height = null) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const margin = 10;
  const popupWidth = 160;
  // Use actual popup height if available, otherwise get from DOM or use default
  let popupHeight = height;
  if (!popupHeight) {
    const popup = document.getElementById('amz-spending-popup');
    popupHeight = popup ? popup.offsetHeight : 130;
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

// Listen for viewport resize
window.addEventListener('resize', resetPopupPosition);

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

  // Icon always goes to bottom-right corner
  Object.assign(icon.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: '2147483647',
    backgroundColor: '#232f3e',
    color: '#ffffff',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '2px solid #ffffff',
    boxSizing: 'border-box',
    userSelect: 'none',
  });

  icon.innerHTML = '$';
  icon.onclick = () => {
    if (cachedSpendingData) {
      injectPopup(cachedSpendingData);
    }
  };

  document.body.appendChild(icon);
}

function showLoadingPopup() {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const savedState = getPopupState();
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
    width: '160px',
    height: '130px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  applyPosition(baseStyle, savedState.position, 130);
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
                <span>Loading spending data...</span>
            </div>
            <div style="font-size:12px; color:#767676;">Tabs may open automatically</div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-settings').onclick = () => showSettingsView();

  // Make loading popup draggable
  setupDraggable(popup);
}

function setupDraggable(popup) {
  let isDragging = false;
  let hasDragged = false;
  let offsetX = 0;
  let offsetY = 0;

  const dragHandle = document.getElementById('amz-drag-handle');
  if (!dragHandle) return;

  const dragStart = e => {
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      if (e.target.id === 'amz-close' || e.target.id === 'amz-settings' || e.target.id === 'amz-back') return; // Don't drag when clicking buttons
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

  dragHandle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
}

function injectPopup(data) {
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

  // Calculate height based on enabled ranges
  const enabledCount = (settings.show30Days ? 1 : 0) + (settings.show3Months ? 1 : 0);
  const popupHeight = enabledCount === 2 ? 130 : enabledCount === 1 ? 85 : 60;

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    width: '160px',
    height: popupHeight + 'px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
    overflow: 'hidden',
  };

  applyPosition(baseStyle, savedState.position, popupHeight);
  Object.assign(popup.style, baseStyle);

  const is30DaysLoading = data.total === undefined;
  const warning30 = !is30DaysLoading && data.limitReached
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
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:12px; height:12px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
            <span style="color:#565959;">Loading 30 days...</span>
          </div>
          <div style="font-size:10px; color:#999; margin-left:18px;">Tabs may auto-open</div>
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
    const separator = settings.show30Days ? 'border-top:1px solid #e7e7e7; padding-top:4px;' : '';
    const innerContent = is3MonthsLoading
      ? `<div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:12px; height:12px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
            <span style="color:#565959;">Loading 3 months...</span>
          </div>
          <div style="font-size:10px; color:#999; margin-left:18px;">Tabs may auto-open</div>
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
  const noRangesMessage = enabledCount === 0
    ? `<div style="color:#565959; text-align:center;">No ranges enabled</div>`
    : '';

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
        <div style="padding:6px 8px; display:flex; flex-direction:column; gap:4px; font-size:12px;">
            ${thirtyDaysContent}
            ${threeMonthsContent}
            ${noRangesMessage}
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();
  document.getElementById('amz-settings').onclick = () => showSettingsView();
  document.getElementById('amz-refresh-all').onclick = () => refreshAll();

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

// Force refresh a specific range
function refreshRange(range) {
  if (range === '30') {
    // Clear cached 30 days data and show loading state
    delete cachedSpendingData.total;
    delete cachedSpendingData.orderCount;
    delete cachedSpendingData.limitReached;
    delete cachedSpendingData.updatedAt30;
    injectPopup(cachedSpendingData);

    chrome.runtime.sendMessage({ action: 'GET_SPENDING_30', force: true }, response => {
      if (response && !response.error) {
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
    // Clear cached 3 months data and show loading state
    delete cachedSpendingData.total3Months;
    delete cachedSpendingData.orderCount3Months;
    delete cachedSpendingData.limitReached3Months;
    delete cachedSpendingData.updatedAt3M;
    injectPopup(cachedSpendingData);

    chrome.runtime.sendMessage({ action: 'GET_SPENDING_3M', force: true }, response => {
      if (response && !response.error) {
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

  // Clear all cached data and show loading state
  cachedSpendingData = {};
  injectPopup(cachedSpendingData);

  // Load 30 days if enabled
  if (settings.show30Days) {
    chrome.runtime.sendMessage({ action: 'GET_SPENDING_30', force: true }, response30 => {
      if (response30 && !response30.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response30.total,
          orderCount: response30.orderCount,
          limitReached: response30.limitReached,
          updatedAt30: response30.updatedAt,
        };
        injectPopup(cachedSpendingData);

        // Load 3 months if enabled
        if (settings.show3Months) {
          chrome.runtime.sendMessage({ action: 'GET_SPENDING_3M', force: true }, response3M => {
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
    });
  } else if (settings.show3Months) {
    // Only 3 months enabled
    chrome.runtime.sendMessage({ action: 'GET_SPENDING_3M', force: true }, response3M => {
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

  // Determine what data we need to load
  const need30Days = settings.show30Days && cachedSpendingData?.total === undefined;
  const need3Months = settings.show3Months && cachedSpendingData?.total3Months === undefined;

  // Check if we have any data to show already
  const hasData30 = cachedSpendingData?.total !== undefined;
  const hasData3M = cachedSpendingData?.total3Months !== undefined;
  const hasAnyData = hasData30 || hasData3M;

  // If we already have all the data we need, just show it
  if (!need30Days && !need3Months) {
    if (savedState.isMinimized) {
      showMinimizedIcon();
    } else {
      injectPopup(cachedSpendingData);
    }
    return;
  }

  // Show loading only if we have no data at all, otherwise show current data with loader for missing part
  if (showLoading && !savedState.isMinimized) {
    if (hasAnyData) {
      // Show existing data immediately - injectPopup handles showing loader for missing ranges
      injectPopup(cachedSpendingData);
    } else {
      showLoadingPopup();
    }
  }

  // Load 30 days if needed and enabled
  if (need30Days) {
    chrome.runtime.sendMessage({ action: 'GET_SPENDING_30' }, response30 => {
      if (response30 && !response30.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response30.total,
          orderCount: response30.orderCount,
          limitReached: response30.limitReached,
          updatedAt30: response30.updatedAt,
        };

        // Update popup
        if (!savedState.isMinimized) {
          injectPopup(cachedSpendingData);
        }

        // Load 3 months if needed
        if (need3Months) {
          chrome.runtime.sendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
            if (response3M && !response3M.error) {
              cachedSpendingData = {
                ...cachedSpendingData,
                total3Months: response3M.total,
                orderCount3Months: response3M.orderCount,
                limitReached3Months: response3M.limitReached,
                updatedAt3M: response3M.updatedAt,
              };

              const currentPopup = document.getElementById('amz-spending-popup');
              if (currentPopup && currentPopup.querySelector('#amz-drag-handle')) {
                injectPopup(cachedSpendingData);
              }
            }
          });
        }
      } else if (response30 && response30.error === 'AUTH_REQUIRED') {
        console.log('Tracker: Authentication required to fetch orders.');
      }
    });
  } else if (need3Months) {
    // Only need 3 months (30 days already cached or disabled)
    chrome.runtime.sendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
      if (response3M && !response3M.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response3M.total,
          orderCount3Months: response3M.orderCount,
          limitReached3Months: response3M.limitReached,
          updatedAt3M: response3M.updatedAt,
        };

        if (!savedState.isMinimized) {
          injectPopup(cachedSpendingData);
        }
      } else if (response3M && response3M.error === 'AUTH_REQUIRED') {
        console.log('Tracker: Authentication required to fetch orders.');
      }
    });
  }
}

async function init() {
  // Skip if this is a scraping tab opened by background.js
  if (window.location.href.includes('_scraping=1')) return;

  if (
    window.location.href.includes('signin') ||
    window.location.href.includes('checkout')
  )
    return;

  loadData(true);
}

init();
