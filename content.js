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
    const constrained = constrainToViewport(position.left, position.top);
    styleObj.left = constrained.left + 'px';
    styleObj.top = constrained.top + 'px';
  } else {
    styleObj.bottom = '10px';
    styleObj.right = '10px';
  }
}

// Constrain position to viewport bounds
function constrainToViewport(left, top) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const margin = 10;
  const popupWidth = 200;
  const popupHeight = 130;

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
    width: '200px',
    height: '130px',
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
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>Amazon Spending Tracker</span>
            <span id="amz-close" style="cursor:pointer; padding:0 4px; font-size:16px; line-height:1;">×</span>
        </div>
        <div style="padding:8px; font-size:12px; color:#565959; line-height:1.3;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <div style="width:12px; height:12px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
                <span>Loading spending data...</span>
            </div>
            <div style="font-size:11px; color:#767676; margin-bottom:2px;">Analyzing last 30 days...</div>
            <div style="font-size:11px; color:#767676;">Tabs may open automatically (max 20 pages).</div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();

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

  const dragStart = (e) => {
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      if (e.target.id === 'amz-close') return; // Don't drag when clicking close
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

  const drag = (e) => {
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
    width: '200px',
    height: '130px',
    border: '1px solid #d5d9d9',
    boxSizing: 'border-box',
    userSelect: 'none',
    overflow: 'hidden',
  };

  applyPosition(baseStyle, savedState.position);
  Object.assign(popup.style, baseStyle);

  const warning30 = data.limitReached
    ? `<div style="font-size:10px; color:#ff9900;">⚠ Max 20 pages</div>`
    : '';

  const is3MonthsLoading = data.total3Months === undefined;
  const warning3Months = !is3MonthsLoading && data.limitReached3Months
    ? `<div style="font-size:10px; color:#ff9900;">⚠ Max 20 pages</div>`
    : '';

  const threeMonthsContent = is3MonthsLoading
    ? `<div style="display:flex; align-items:center; gap:6px;">
                    <div style="width:12px; height:12px; border:2px solid #e7e7e7; border-top:2px solid #232f3e; border-radius:50%; animation:amz-spinner 0.8s linear infinite;"></div>
                    <span style="color:#565959;">Loading 3 months...</span>
                </div>`
    : `<div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#565959;">Last 3 months:</span>
                    <b style="color:#B12704; font-size:16px;">EUR ${data.total3Months.toFixed(2)}</b>
                </div>
                <div style="font-size:10px; color:#767676;">${data.orderCount3Months} order${data.orderCount3Months !== 1 ? 's' : ''} ${warning3Months}</div>`;

  popup.innerHTML = `
        <style>
            @keyframes amz-spinner {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:6px 8px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>Amazon Spending Tracker</span>
            <span id="amz-close" style="cursor:pointer; padding:0 4px; font-size:16px; line-height:1;">×</span>
        </div>
        <div style="padding:6px 8px; display:flex; flex-direction:column; gap:4px; font-size:12px;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#565959;">Last 30 days:</span>
                    <b style="color:#B12704; font-size:16px;">EUR ${data.total.toFixed(2)}</b>
                </div>
                <div style="font-size:10px; color:#767676;">${data.orderCount} order${data.orderCount !== 1 ? 's' : ''} ${warning30}</div>
            </div>
            <div style="border-top:1px solid #e7e7e7; padding-top:4px;">
                ${threeMonthsContent}
            </div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();

  // Use shared draggable setup
  setupDraggable(popup);
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
