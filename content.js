let cachedSpendingData = null;

function savePopupState(isMinimized, position = null) {
  const currentState = getPopupState();
  const state = {
    isMinimized,
    // Only update position if explicitly provided, otherwise keep existing
    position: position !== null ? position : currentState.position
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
        position: parsed.position && typeof parsed.position.left === 'number' && typeof parsed.position.top === 'number'
          ? parsed.position
          : null
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
function applyPosition(styleObj, position) {
  if (position && typeof position.left === 'number' && typeof position.top === 'number') {
    // Validate position is within viewport
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const margin = 10;

    let left = position.left;
    let top = position.top;

    // Ensure popup is visible (at least partially)
    if (left < margin) left = margin;
    if (top < margin) top = margin;
    if (left > viewportWidth - 50) left = viewportWidth - 230; // 220px width + margin
    if (top > viewportHeight - 50) top = viewportHeight - 100;

    styleObj.left = left + 'px';
    styleObj.top = top + 'px';
  } else {
    styleObj.bottom = '10px';
    styleObj.right = '10px';
  }
}

function showMinimizedIcon() {
  // Save current position before removing the popup
  const currentPosition = getCurrentPopupPosition();
  if (currentPosition) {
    savePopupState(true, currentPosition);
  }

  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const savedState = getPopupState();
  const icon = document.createElement('div');
  icon.id = 'amz-spending-popup';

  const baseStyle = {
    position: 'fixed',
    zIndex: '2147483647',
    backgroundColor: '#232f3e',
    color: '#ffffff',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '24px',
    fontWeight: 'bold',
    border: '2px solid #ffffff',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  applyPosition(baseStyle, savedState.position);
  Object.assign(icon.style, baseStyle);

  icon.innerHTML = '$';
  icon.onclick = () => {
    if (cachedSpendingData) {
      injectPopup(cachedSpendingData);
    }
  };

  document.body.appendChild(icon);
  // Don't call savePopupState here - we already saved it above
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
    width: '220px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  applyPosition(baseStyle, savedState.position);
  Object.assign(popup.style, baseStyle);

  popup.innerHTML = `
        <style>
            @keyframes amz-spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        <div style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:8px 10px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
            <span>Amazon Spending Tracker</span>
        </div>
        <div style="padding:10px; font-size:12px; color:#565959; line-height:1.4;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <div style="width:14px; height:14px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
                <span>Loading spending data...</span>
            </div>
            <div style="font-size:11px; color:#767676; margin-bottom:4px;">Analyzing last 30 days...</div>
            <div style="font-size:11px; color:#767676;">Tabs may open automatically (max 20 pages).</div>
        </div>
    `;

  document.body.appendChild(popup);
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
    width: '220px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  applyPosition(baseStyle, savedState.position);
  Object.assign(popup.style, baseStyle);

  const warning30 = data.limitReached
    ? `<div style="font-size:10px; color:#ff9900; margin-top:4px;">⚠ Limite raggiunto (max 20 pagine)</div>`
    : '';

  const is3MonthsLoading = data.total3Months === undefined;
  const warning3Months = !is3MonthsLoading && data.limitReached3Months
    ? `<div style="font-size:10px; color:#ff9900; margin-top:4px;">⚠ Limite raggiunto (max 20 pagine)</div>`
    : '';

  const threeMonthsContent = is3MonthsLoading
    ? `<div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:12px; height:12px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
                    <span style="color:#565959;">Loading 3 months...</span>
                </div>`
    : `<div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#565959;">Last 3 months:</span>
                    <b style="color:#B12704; font-size:16px;">EUR ${data.total3Months.toFixed(2)}</b>
                </div>
                <div style="font-size:10px; color:#767676; margin-top:4px;">${data.orderCount3Months} order${data.orderCount3Months !== 1 ? 's' : ''} analyzed</div>
                ${warning3Months}`;

  popup.innerHTML = `
        <style>
            @keyframes amz-spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:8px 10px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>Amazon Spending Tracker</span>
            <span id="amz-close" style="cursor:pointer; padding:0 5px; font-size:18px; line-height:1;">×</span>
        </div>
        <div style="padding:10px; display:flex; flex-direction:column; gap:8px; font-size:12px;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#565959;">Last 30 days:</span>
                    <b style="color:#B12704; font-size:16px;">EUR ${data.total.toFixed(2)}</b>
                </div>
                <div style="font-size:10px; color:#767676; margin-top:4px;">${data.orderCount} order${data.orderCount !== 1 ? 's' : ''} analyzed</div>
                ${warning30}
            </div>
            <div style="border-top:1px solid #e7e7e7; padding-top:8px;">
                ${threeMonthsContent}
            </div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();

  // Note: We don't call savePopupState here anymore - position is saved on drag end or when minimizing

  let isDragging = false;
  let hasDragged = false; // Track if actual drag occurred
  let offsetX = 0;
  let offsetY = 0;

  const dragHandle = document.getElementById('amz-drag-handle');

  dragHandle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      isDragging = true;
      hasDragged = false; // Reset drag tracking
      const rect = popup.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      popup.style.bottom = 'auto';
      popup.style.right = 'auto';
      popup.style.left = rect.left + 'px';
      popup.style.top = rect.top + 'px';
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      hasDragged = true; // Mark that actual dragging occurred

      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;

      const rect = popup.getBoundingClientRect();
      const margin = 10;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const maxX = viewportWidth - rect.width - margin;
      const maxY = viewportHeight - rect.height - margin;

      newX = Math.max(margin, Math.min(newX, maxX));
      newY = Math.max(margin, Math.min(newY, maxY));

      popup.style.left = newX + 'px';
      popup.style.top = newY + 'px';
    }
  }

  function dragEnd(e) {
    if (isDragging && hasDragged) {
      // Only save position if actual dragging occurred
      const rect = popup.getBoundingClientRect();
      savePopupState(false, { left: rect.left, top: rect.top });
    }
    isDragging = false;
    hasDragged = false;
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

  const savedState = getPopupState();

  if (!savedState.isMinimized) {
    showLoadingPopup();
  }

  // First load: 30 days
  chrome.runtime.sendMessage({ action: 'GET_SPENDING_30' }, response30 => {
    if (response30 && !response30.error) {
      const partialData = {
        total: response30.total,
        orderCount: response30.orderCount,
        limitReached: response30.limitReached
        // total3Months is undefined, will show loader
      };

      if (savedState.isMinimized) {
        cachedSpendingData = partialData;
        showMinimizedIcon();
      } else {
        injectPopup(partialData);
      }

      // Second load: 3 months
      chrome.runtime.sendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
        if (response3M && !response3M.error) {
          const fullData = {
            total: response30.total,
            orderCount: response30.orderCount,
            limitReached: response30.limitReached,
            total3Months: response3M.total,
            orderCount3Months: response3M.orderCount,
            limitReached3Months: response3M.limitReached
          };

          cachedSpendingData = fullData;

          // Update popup if not minimized
          const currentPopup = document.getElementById('amz-spending-popup');
          if (currentPopup && currentPopup.querySelector('#amz-drag-handle')) {
            injectPopup(fullData);
          }
        }
      });
    } else if (response30 && response30.error === 'AUTH_REQUIRED') {
      console.log('Tracker: Authentication required to fetch orders.');
    }
  });
}

init();
