function showLoadingPopup() {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';
  Object.assign(popup.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    minWidth: '200px',
    border: '1px solid #d5d9d9',
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
            <div style="font-size:11px; color:#767676; margin-bottom:4px;">Estimated time: ~5-10 seconds</div>
            <div style="font-size:11px; color:#767676;">Tabs may open automatically to fetch your orders.</div>
        </div>
    `;

  document.body.appendChild(popup);
}

function injectPopup(data) {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';
  Object.assign(popup.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#0f1111',
    padding: '0',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(15,17,17,0.15)',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    minWidth: '200px',
    border: '1px solid #d5d9d9',
    cursor: 'move',
    userSelect: 'none',
  });

  popup.innerHTML = `
        <div id="amz-drag-handle" style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:8px 10px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>Amazon Spending Tracker</span>
            <span id="amz-close" style="cursor:pointer; padding:0 5px; font-size:18px; line-height:1;">×</span>
        </div>
        <div style="padding:10px; display:flex; flex-direction:column; gap:8px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#565959;">Last 30 days:</span>
                <b style="color:#B12704; font-size:13px;">EUR ${data.last30.toFixed(2)}</b>
            </div>
            <div style="height:1px; background:#e7e7e7; margin:2px 0;"></div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#565959;">Past 3 months:</span>
                <b style="color:#B12704; font-size:14px;">EUR ${data.months3.toFixed(2)}</b>
            </div>
        </div>
    `;

  document.body.appendChild(popup);

  document.getElementById('amz-close').onclick = () => popup.remove();

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
      const maxX = window.innerWidth - rect.width - margin;
      const maxY = window.innerHeight - rect.height - margin;

      newX = Math.max(margin, Math.min(newX, maxX));
      newY = Math.max(margin, Math.min(newY, maxY));

      popup.style.left = newX + 'px';
      popup.style.top = newY + 'px';
    }
  }

  function dragEnd(e) {
    isDragging = false;
  }
}

async function init() {
  if (
    window.location.href.includes('signin') ||
    window.location.href.includes('checkout')
  )
    return;

  showLoadingPopup();

  chrome.runtime.sendMessage({ action: 'GET_SPENDING' }, response => {
    if (response && !response.error) {
      injectPopup(response);
    } else if (response && response.error === 'AUTH_REQUIRED') {
      console.log('Tracker: Authentication required to fetch orders.');
    }
  });
}

init();
