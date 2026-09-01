function continueAfterLockChecks() {
  if (window.location.href.includes('checkout')) {
    observeCheckoutPage();
    return;
  }

  chrome.storage.local.get('amz-onboarding-completed', result => {
    if (result['amz-onboarding-completed']) {
      loadData(true);
    } else {
      injectGlobalStyles();
      showWelcomeGate(
        () => startTour(),
        () => {
          chrome.storage.local.set({ 'amz-onboarding-completed': true });
          loadData(true);
        }
      );
    }
  });
}

function checkOnboardingAndInit() {
  if (window.location.href.includes('_scraping=1')) return;
  if (window.location.href.includes('signin')) return;

  initSettings(() => {
    const settings = getSettings();

    if (isInLockTimeRange(settings)) {
      loadSpendingDataForLock(spendingData => {
        showLockOverlay(settings, spendingData);
      });
      return;
    }

    if (settings.spendingLimitEnabled) {
      loadSpendingDataForLimit(spendingData => {
        if (isOverSpendingLimit(settings, spendingData)) {
          showLockOverlay(settings, spendingData, 'limit');
          return;
        }
        continueAfterLockChecks();
      });
      return;
    }

    continueAfterLockChecks();
  });
}

checkOnboardingAndInit();
