function injectPopup(data) {
  const existing = document.getElementById('amz-spending-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'amz-spending-popup';
  Object.assign(popup.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647',
    backgroundColor: '#ffffff',
    color: '#333333',
    padding: '0',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minWidth: '280px',
    border: '1px solid #e0e0e0',
    cursor: 'move',
    userSelect: 'none',
  });

  popup.innerHTML = `
        <div id="amz-drag-handle" style="font-weight:600; font-size:14px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:12px 15px; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center; cursor:move;">
            <span>💰 Spending Tracker</span>
            <span id="amz-close" style="cursor:pointer; padding:0 8px; font-size:20px; line-height:1; opacity:0.9; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">×</span>
        </div>
        <div style="padding:15px; display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8f9fa; border-radius:8px;">
                <span style="color:#555; font-size:14px; font-weight:500;">Last 30 days:</span>
                <b style="color:#dc3545; font-size:16px;">EUR ${data.last30.toFixed(2)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8f9fa; border-radius:8px;">
                <span style="color:#555; font-size:14px; font-weight:600;">Past 3 months:</span>
                <b style="color:#dc3545; font-size:18px;">EUR ${data.months3.toFixed(2)}</b>
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

  chrome.runtime.sendMessage({ action: 'GET_SPENDING' }, response => {
    if (response && !response.error) {
      injectPopup(response);
    } else if (response && response.error === 'AUTH_REQUIRED') {
      console.log('Tracker: Authentication required to fetch orders.');
    }
  });
}

init();
