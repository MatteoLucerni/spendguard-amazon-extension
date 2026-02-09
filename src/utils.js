let cachedSpendingData = {};
let contextInvalidated = false;

function formatAmountHtml(allCurrencies, singleTotal, defaultSymbol) {
  if (allCurrencies && allCurrencies.length > 1) {
    const nonZero = allCurrencies.filter(c => Math.round(c.total) !== 0);
    if (nonZero.length === 0) {
      const symbol = defaultSymbol || getCurrentDomainConfig().symbol;
      return `0 ${symbol}`;
    }
    return nonZero.map(c => `${Math.round(c.total)} ${c.symbol}`).join(' · ');
  }
  if (allCurrencies && allCurrencies.length === 1) {
    return `${Math.round(allCurrencies[0].total)} ${allCurrencies[0].symbol}`;
  }
  const symbol = defaultSymbol || getCurrentDomainConfig().symbol;
  return `${Math.round(singleTotal)} ${symbol}`;
}

function getTotalOrders(allCurrencies, singleOrderCount) {
  if (allCurrencies && allCurrencies.length > 0) {
    return allCurrencies.reduce((sum, c) => sum + c.orderCount, 0);
  }
  return singleOrderCount;
}

function getResponsiveConfig() {
  const vw = document.documentElement.clientWidth;
  if (vw <= 480)
    return {
      tier: 'mobile',
      popupMinWidth: vw - 20,
      popupMaxWidth: vw - 20,
      settingsWidth: vw - 20,
      maxSettingsHeight: '70vh',
      draggable: false,
      tourTooltipMode: 'bottom-sheet',
      tourTooltipMaxWidth: vw - 32,
      welcomeMaxWidth: vw - 32,
      minIconSize: 44,
    };
  if (vw <= 768)
    return {
      tier: 'tablet',
      popupMinWidth: 140,
      popupMaxWidth: 280,
      settingsWidth: 200,
      maxSettingsHeight: 'none',
      draggable: true,
      tourTooltipMode: 'positioned',
      tourTooltipMaxWidth: 280,
      welcomeMaxWidth: 400,
      minIconSize: 36,
    };
  return {
    tier: 'desktop',
    popupMinWidth: 160,
    popupMaxWidth: 320,
    settingsWidth: 200,
    maxSettingsHeight: 'none',
    draggable: true,
    tourTooltipMode: 'positioned',
    tourTooltipMaxWidth: 320,
    welcomeMaxWidth: 400,
    minIconSize: 36,
  };
}

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

function safeSendMessage(message, callback) {
  if (contextInvalidated) {
    showErrorPopup('CONTEXT_INVALIDATED');
    return;
  }

  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || '';
        if (errorMessage.includes('Extension context invalidated')) {
          contextInvalidated = true;
          showErrorPopup('CONTEXT_INVALIDATED');
          return;
        }
        if (errorMessage.includes('message channel closed')) {
          console.warn('[SpendGuard] sendMessage warning:', errorMessage);
          if (callback) callback(null);
          return;
        }
        console.error('[SpendGuard] sendMessage error:', errorMessage);
      }
      if (callback) callback(response);
    });
  } catch (err) {
    if (err.message && err.message.includes('Extension context invalidated')) {
      contextInvalidated = true;
      showErrorPopup('CONTEXT_INVALIDATED');
      return;
    }
    console.error('[SpendGuard] sendMessage error:', err);
  }
}
