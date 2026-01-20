let cachedSpendingData = null;

function savePopupState(isMinimized, position = null) {
  const state = {
    isMinimized,
    position: position || JSON.parse(localStorage.getItem('amz-popup-state'))?.position || null
  };
  localStorage.setItem('amz-popup-state', JSON.stringify(state));
}

function getPopupState() {
  const saved = localStorage.getItem('amz-popup-state');
  return saved ? JSON.parse(saved) : { isMinimized: false, position: null };
}

function showMinimizedIcon() {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const icon = document.createElement('div');
  icon.id = 'amz-spending-popup';
  Object.assign(icon.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
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
  });

  icon.innerHTML = '$';
  icon.onclick = () => {
    if (cachedSpendingData) {
      injectPopup(cachedSpendingData);
    }
  };

  document.body.appendChild(icon);
  savePopupState(true);
}

function showLoadingPopup() {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';
  Object.assign(popup.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
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
  });

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
            <div style="font-size:11px; color:#767676;">Tabs may open automatically (max 5 pages).</div>
        </div>
    `;

  document.body.appendChild(popup);
}

function injectPopup(data) {
  cachedSpendingData = data;

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

  if (savedState.position) {
    baseStyle.left = savedState.position.left + 'px';
    baseStyle.top = savedState.position.top + 'px';
  } else {
    baseStyle.bottom = '10px';
    baseStyle.right = '10px';
  }

  Object.assign(popup.style, baseStyle);

  const warning = data.limitReached
    ? `<div style="font-size:10px; color:#ff9900; margin-top:4px;">⚠ Limite raggiunto: ${data.orderCount} ordini analizzati (max 50)</div>`
    : '';

  popup.innerHTML = `
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
                ${warning}
            </div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => showMinimizedIcon();

  savePopupState(false);

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const dragHandle = document.getElementById('amz-drag-handle');

  dragHandle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      isDragging = true;
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
    isDragging = false;
    const rect = popup.getBoundingClientRect();
    savePopupState(false, { left: rect.left, top: rect.top });
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

  chrome.runtime.sendMessage({ action: 'GET_SPENDING' }, response => {
    if (response && !response.error) {
      if (savedState.isMinimized) {
        cachedSpendingData = response;
        showMinimizedIcon();
      } else {
        injectPopup(response);
      }
    } else if (response && response.error === 'AUTH_REQUIRED') {
      console.log('Tracker: Authentication required to fetch orders.');
    }
  });
}

init();
