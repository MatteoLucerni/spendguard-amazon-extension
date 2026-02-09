function injectCheckoutAlert(spendingAmount, rangeLabel, allCurrencies) {
  if (document.getElementById('amz-spending-checkout-alert')) return;

  const subtotals = document.getElementById('subtotals');
  if (!subtotals) return;

  const alertDiv = document.createElement('div');
  alertDiv.id = 'amz-spending-checkout-alert';
  Object.assign(alertDiv.style, {
    backgroundColor: '#fff8e1',
    border: '1px solid #ff9800',
    borderRadius: '4px',
    padding: '12px',
    marginTop: '12px',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    fontSize: '14px',
    color: '#5d4037',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    position: 'relative',
  });

  alertDiv.innerHTML = `
    <span style="font-size: 20px; line-height: 1;">⚠️</span>
    <span style="flex: 1;">Are you sure you want to proceed? ${rangeLabel} you have already spent <strong>${formatAmountHtml(allCurrencies, spendingAmount, getCurrentDomainConfig().symbol)}</strong></span>
    <button id="amz-checkout-alert-close" style="background: none; border: none; cursor: pointer; padding: 0; margin: 0; line-height: 1; color: #5d4037; font-size: 18px; opacity: 0.7;" title="Close">×</button>
  `;

  subtotals.parentNode.insertBefore(alertDiv, subtotals.nextSibling);

  document.getElementById('amz-checkout-alert-close').onclick = () => {
    alertDiv.remove();
  };
}

function handleCheckoutPage() {
  const settings = getSettings();

  const tryThreeMonths = () => {
    if (!settings.show3Months) return;

    safeSendMessage(
      { action: 'GET_SPENDING_3M', cacheOnly: true },
      response3M => {
        if (
          response3M &&
          !response3M.error &&
          !response3M.noCache &&
          response3M.total !== undefined &&
          response3M.total > 0
        ) {
          injectCheckoutAlert(response3M.total, 'In the last 3 months', response3M.allCurrencies);
        }
      },
    );
  };

  if (settings.show30Days) {
    safeSendMessage(
      { action: 'GET_SPENDING_30', cacheOnly: true },
      response30 => {
        if (
          response30 &&
          !response30.error &&
          !response30.noCache &&
          response30.total !== undefined &&
          response30.total > 0
        ) {
          injectCheckoutAlert(response30.total, 'This month', response30.allCurrencies, response30.allCurrencies);
          return;
        }
        tryThreeMonths();
      },
    );
  } else {
    tryThreeMonths();
  }
}

function observeCheckoutPage() {
  const subtotals = document.getElementById('subtotals');
  if (subtotals) {
    handleCheckoutPage();
    return;
  }

  const observer = new MutationObserver((mutations, obs) => {
    const subtotals = document.getElementById('subtotals');
    if (subtotals) {
      obs.disconnect();
      handleCheckoutPage();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(() => observer.disconnect(), 10000);
}
