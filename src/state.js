let isLoading30 = false;
let isLoading3M = false;
let tourActive = false;
let resizeDebounceTimer = null;
let dragAbortController = null;

function savePopupState(isMinimized, side = null) {
  const currentState = getPopupState();
  const state = {
    isMinimized,
    side: side !== null ? side : currentState.side,
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
        side: parsed.side === 'left' ? 'left' : 'right',
      };
    }
  } catch (e) {
    console.error('SpendGuard: Error reading popup state', e);
  }
  return { isMinimized: false, side: 'right' };
}

function getPopupSide() {
  const popup = document.getElementById(POPUP_ID);
  if (popup) {
    const rect = popup.getBoundingClientRect();
    const viewportCenter = document.documentElement.clientWidth / 2;
    const popupCenter = (rect.left + rect.right) / 2;
    return popupCenter < viewportCenter ? 'left' : 'right';
  }
  return null;
}

function applyPosition(styleObj, side) {
  styleObj.bottom = '10px';
  if (side === 'left') {
    styleObj.left = '10px';
  } else {
    styleObj.right = '10px';
  }
}

function constrainToViewport(left, top, height = null, width = null) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const margin = 10;

  let popupWidth = width;
  let popupHeight = height;
  if (!popupWidth || !popupHeight) {
    const popup = document.getElementById(POPUP_ID);
    if (!popupWidth) popupWidth = popup ? popup.offsetWidth : 320;
    if (!popupHeight) popupHeight = popup ? popup.offsetHeight : 130;
  }

  const maxLeft = Math.max(margin, viewportWidth - popupWidth - margin);
  const maxTop = Math.max(margin, viewportHeight - popupHeight - margin);

  left = Math.max(margin, Math.min(left, maxLeft));
  top = Math.max(margin, Math.min(top, maxTop));

  return { left, top };
}

function resetPopupPosition() {
  const popup = document.getElementById(POPUP_ID);
  if (!popup) return;

  const side = getPopupState().side;
  popup.style.left = '';
  popup.style.top = '';
  popup.style.right = '';
  popup.style.bottom = '10px';
  if (side === 'left') {
    popup.style.left = '10px';
  } else {
    popup.style.right = '10px';
  }
}

window.addEventListener('resize', () => {
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    resetPopupPosition();
  }, 300);
});
