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
        <div style="font-size:13px; font-weight:700; background:#232f3e; color:#ffffff; padding:8px 10px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
            <span>Spending Tracker</span>
        </div>
        <div style="padding:10px; font-size:12px; color:#565959; line-height:1.4;">
            <div style="margin-bottom:6px;">Loading spending data...</div>
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
            <span>Spending Tracker</span>
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
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  const dragHandle = document.getElementById('amz-drag-handle');

  dragHandle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();

      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      const rect = popup.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, popup);
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
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
