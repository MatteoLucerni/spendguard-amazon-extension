function continueAfterLockChecks() {
  if (isAmazonCheckoutPage()) {
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
          // checkout pages always get the overlay: the only thing to do there
          // is buy, and blocking it by button selector is far more brittle
          if (
            settings.spendingLimitMode === 'purchase' &&
            !isAmazonCheckoutPage()
          ) {
            applyPurchaseBlock(settings, spendingData);
            continueAfterLockChecks();
            return;
          }
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
