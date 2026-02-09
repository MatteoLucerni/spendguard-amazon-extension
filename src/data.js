function handleDataError(response) {
  if (response && response.error === 'TAB_CREATE_FAILED') {
    showErrorPopup('TAB_CREATE_FAILED');
    return true;
  }
  if (response && response.error === 'AUTH_REQUIRED') {
    showErrorPopup('AUTH_REQUIRED');
    return true;
  }
  return false;
}

function refreshRange(range) {
  if (range === '30') {
    if (isLoading30) return;
    isLoading30 = true;

    delete cachedSpendingData.total;
    delete cachedSpendingData.orderCount;
    delete cachedSpendingData.limitReached;
    delete cachedSpendingData.updatedAt30;
    injectPopup(cachedSpendingData);

    safeSendMessage({ action: 'GET_SPENDING_30', force: true }, response => {
      isLoading30 = false;
      if (handleDataError(response)) return;
      if (response && !response.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response.total,
          orderCount: response.orderCount,
          limitReached: response.limitReached,
          updatedAt30: response.updatedAt,
        };
        injectPopup(cachedSpendingData);
      }
    });
  } else if (range === '3m') {
    if (isLoading3M) return;
    isLoading3M = true;

    delete cachedSpendingData.total3Months;
    delete cachedSpendingData.orderCount3Months;
    delete cachedSpendingData.limitReached3Months;
    delete cachedSpendingData.updatedAt3M;
    injectPopup(cachedSpendingData);

    safeSendMessage({ action: 'GET_SPENDING_3M', force: true }, response => {
      isLoading3M = false;
      if (handleDataError(response)) return;
      if (response && !response.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response.total,
          orderCount3Months: response.orderCount,
          limitReached3Months: response.limitReached,
          updatedAt3M: response.updatedAt,
        };
        injectPopup(cachedSpendingData);
      }
    });
  }
}

function refreshAll() {
  const settings = getSettings();

  const will30Load = settings.show30Days && !isLoading30;
  const will3MLoad = settings.show3Months && !isLoading3M;

  if (!will30Load && !will3MLoad) return;

  if (will30Load) {
    isLoading30 = true;
    delete cachedSpendingData.total;
    delete cachedSpendingData.orderCount;
    delete cachedSpendingData.limitReached;
    delete cachedSpendingData.updatedAt30;
  }
  if (will3MLoad) {
    isLoading3M = true;
    delete cachedSpendingData.total3Months;
    delete cachedSpendingData.orderCount3Months;
    delete cachedSpendingData.limitReached3Months;
    delete cachedSpendingData.updatedAt3M;
  }
  injectPopup(cachedSpendingData);

  if (will30Load) {
    safeSendMessage({ action: 'GET_SPENDING_30', force: true }, response30 => {
      isLoading30 = false;
      if (handleDataError(response30)) return;
      if (response30 && !response30.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response30.total,
          orderCount: response30.orderCount,
          limitReached: response30.limitReached,
          updatedAt30: response30.updatedAt,
        };
        injectPopup(cachedSpendingData);

        if (will3MLoad) {
          safeSendMessage(
            { action: 'GET_SPENDING_3M', force: true },
            response3M => {
              isLoading3M = false;
              if (handleDataError(response3M)) return;
              if (response3M && !response3M.error) {
                cachedSpendingData = {
                  ...cachedSpendingData,
                  total3Months: response3M.total,
                  orderCount3Months: response3M.orderCount,
                  limitReached3Months: response3M.limitReached,
                  updatedAt3M: response3M.updatedAt,
                };
                injectPopup(cachedSpendingData);
              }
            },
          );
        }
      }
    });
  } else if (will3MLoad) {
    safeSendMessage({ action: 'GET_SPENDING_3M', force: true }, response3M => {
      isLoading3M = false;
      if (handleDataError(response3M)) return;
      if (response3M && !response3M.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response3M.total,
          orderCount3Months: response3M.orderCount,
          limitReached3Months: response3M.limitReached,
          updatedAt3M: response3M.updatedAt,
        };
        injectPopup(cachedSpendingData);
      }
    });
  }
}

function updatePopupOrIcon() {
  const currentState = getPopupState();
  if (currentState.isMinimized) {
    showMinimizedIcon();
  } else {
    injectPopup(cachedSpendingData);
  }
}

function loadData(showLoading = true) {
  const settings = getSettings();
  const savedState = getPopupState();

  if (!settings.show30Days && !settings.show3Months) {
    if (savedState.isMinimized) {
      showMinimizedIcon();
    } else {
      injectPopup({});
    }
    return;
  }

  const need30Days =
    settings.show30Days &&
    cachedSpendingData?.total === undefined &&
    !isLoading30;
  const need3Months =
    settings.show3Months &&
    cachedSpendingData?.total3Months === undefined &&
    !isLoading3M;

  const hasData30 = cachedSpendingData?.total !== undefined;
  const hasData3M = cachedSpendingData?.total3Months !== undefined;
  const hasAnyData = hasData30 || hasData3M;

  if (!need30Days && !need3Months) {
    if (savedState.isMinimized) {
      showMinimizedIcon();
    } else {
      injectPopup(cachedSpendingData);
    }
    return;
  }

  if (need30Days) isLoading30 = true;
  if (need3Months) isLoading3M = true;

  if (showLoading) {
    if (savedState.isMinimized) {
      showMinimizedIcon();
    } else if (hasAnyData) {
      injectPopup(cachedSpendingData);
    } else {
      showLoadingPopup();
    }
  }

  if (need30Days) {
    safeSendMessage({ action: 'GET_SPENDING_30' }, response30 => {
      isLoading30 = false;
      if (handleDataError(response30)) return;
      if (response30 && !response30.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total: response30.total,
          orderCount: response30.orderCount,
          limitReached: response30.limitReached,
          updatedAt30: response30.updatedAt,
        };

        updatePopupOrIcon();

        if (need3Months && isLoading3M) {
          safeSendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
            isLoading3M = false;
            if (handleDataError(response3M)) return;
            if (response3M && !response3M.error) {
              cachedSpendingData = {
                ...cachedSpendingData,
                total3Months: response3M.total,
                orderCount3Months: response3M.orderCount,
                limitReached3Months: response3M.limitReached,
                updatedAt3M: response3M.updatedAt,
              };

              updatePopupOrIcon();
            }
          });
        }
      } else if (response30 && response30.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
      }
    });
  } else if (need3Months) {
    safeSendMessage({ action: 'GET_SPENDING_3M' }, response3M => {
      isLoading3M = false;
      if (handleDataError(response3M)) return;
      if (response3M && !response3M.error) {
        cachedSpendingData = {
          ...cachedSpendingData,
          total3Months: response3M.total,
          orderCount3Months: response3M.orderCount,
          limitReached3Months: response3M.limitReached,
          updatedAt3M: response3M.updatedAt,
        };

        updatePopupOrIcon();
      } else if (response3M && response3M.error === 'AUTH_REQUIRED') {
        showErrorPopup('AUTH_REQUIRED');
      }
    });
  }
}
