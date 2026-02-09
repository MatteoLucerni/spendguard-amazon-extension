let isLoading30 = false;
let isLoading3M = false;
let tourActive = false;
let resizeDebounceTimer = null;
let dragAbortController = null;

function savePopupState(isMinimized, position = null) {
  const currentState = getPopupState();
  const state = {
    isMinimized,
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

function getCurrentPopupPosition() {
  const popup = document.getElementById(POPUP_ID);
  if (popup) {
    const rect = popup.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }
  return null;
}

function applyPosition(styleObj, position, height = null, width = null) {
  if (
    position &&
    typeof position.left === 'number' &&
    typeof position.top === 'number'
  ) {
    const constrained = constrainToViewport(
      position.left,
      position.top,
      height,
      width,
    );
    styleObj.left = constrained.left + 'px';
    styleObj.top = constrained.top + 'px';
  } else {
    styleObj.bottom = '10px';
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
    if (!popupWidth) popupWidth = popup ? popup.offsetWidth : 160;
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

  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '10px';
  popup.style.right = '10px';
  savePopupState(false, null);
}

window.addEventListener('resize', () => {
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    resetPopupPosition();
  }, 300);
});
