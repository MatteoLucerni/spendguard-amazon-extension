let lockTimerInterval = null;

function isInLockTimeRange(settings) {
  if (!settings.interfaceLockEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.lockStartTime.split(':').map(Number);
  const [endHour, endMin] = settings.lockEndTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function calculateTimeUntilUnlock(settings) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  const [endHour, endMin] = settings.lockEndTime.split(':').map(Number);
  const [startHour, startMin] = settings.lockStartTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let minutesUntilUnlock;

  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes) {
      minutesUntilUnlock = (24 * 60 - currentMinutes) + endMinutes;
    } else {
      minutesUntilUnlock = endMinutes - currentMinutes;
    }
  } else {
    minutesUntilUnlock = endMinutes - currentMinutes;
  }

  const totalSeconds = minutesUntilUnlock * 60 - currentSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
}

function formatLockTime(hours, minutes, seconds) {
  const pad = n => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

function showLockOverlay(settings, spendingData) {
  const existingOverlay = document.getElementById('amz-lock-overlay');
  if (existingOverlay) existingOverlay.remove();

  const existingPopup = document.getElementById(POPUP_ID);
  if (existingPopup) existingPopup.remove();

  const overlay = document.createElement('div');
  overlay.id = 'amz-lock-overlay';

  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(35, 47, 62, 0.97)',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Amazon Ember, Arial, sans-serif',
    color: '#ffffff',
  });

  let spendingInfo = '';
  if (spendingData) {
    let amount = null;
    let rangeLabel = '';
    let allCurrencies = null;

    if (spendingData.total !== undefined) {
      amount = Math.round(spendingData.total);
      rangeLabel = 'in the last 30 days';
      allCurrencies = spendingData.allCurrencies;
    } else if (spendingData.total3Months !== undefined) {
      amount = Math.round(spendingData.total3Months);
      rangeLabel = 'in the last 3 months';
      allCurrencies = spendingData.allCurrencies;
    }

    if (amount !== null) {
      const displayAmount = formatAmountHtml(allCurrencies, amount, getCurrentDomainConfig().symbol);
      spendingInfo = `
        <div style="margin-top:50px; text-align:center;">
          <div style="font-size:clamp(12px, 2vw, 16px); color:#ff9900; margin-bottom:16px;">You have spent</div>
          <div style="font-size:clamp(28px, 7vw, 56px); font-weight:700; color:#ff9900; line-height:1;">${displayAmount}</div>
          <div style="font-size:clamp(12px, 2vw, 15px); color:#a0a0a0; margin-top:12px;">${rangeLabel}</div>
        </div>
      `;
    }
  }

  const timeLeft = calculateTimeUntilUnlock(settings);
  const formattedTime = formatLockTime(timeLeft.hours, timeLeft.minutes, timeLeft.seconds);

  overlay.innerHTML = `
    <style>
      @keyframes amz-lock-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
    </style>
    <div style="text-align:center;">
      <svg style="width:clamp(48px, 10vw, 80px); height:clamp(48px, 10vw, 80px); animation: amz-lock-pulse 2s ease-in-out infinite;" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <h1 style="font-size:clamp(18px, 4vw, 28px); font-weight:700; margin:20px 0 10px 0;">Amazon is Locked</h1>
      <p style="font-size:clamp(11px, 2vw, 14px); color:#a0a0a0; margin:0;">Time set: ${settings.lockStartTime} - ${settings.lockEndTime}</p>
    </div>
    <div style="margin-top:40px; text-align:center;">
      <div style="font-size:clamp(11px, 2vw, 14px); color:#a0a0a0; margin-bottom:25px;">Unlocks in</div>
      <div id="amz-lock-timer" style="font-size:clamp(32px, 8vw, 64px); font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:2px;">${formattedTime}</div>
    </div>
    ${spendingInfo}
    <div style="position:absolute; bottom:clamp(10px, 3vh, 30px); left:0; right:0; text-align:center;">
      <img src="${chrome.runtime.getURL('assets/images/icons/amz_icon.png')}" alt="Amazon Spending Tracker" style="width:24px; height:24px; margin-bottom:8px;">
      <p style="font-size:12px; color:#565959; margin:0;">Amazon Spending Tracker</p>
    </div>
  `;

  document.body.appendChild(overlay);

  startLockTimer(settings);
}

function startLockTimer(settings) {
  if (lockTimerInterval) {
    clearInterval(lockTimerInterval);
  }

  lockTimerInterval = setInterval(() => {
    const timerElement = document.getElementById('amz-lock-timer');
    if (!timerElement) {
      clearInterval(lockTimerInterval);
      return;
    }

    if (!isInLockTimeRange(settings)) {
      clearInterval(lockTimerInterval);
      removeLockOverlay();
      loadData(true);
      return;
    }

    const timeLeft = calculateTimeUntilUnlock(settings);
    timerElement.textContent = formatLockTime(timeLeft.hours, timeLeft.minutes, timeLeft.seconds);
  }, 1000);
}

function removeLockOverlay() {
  const overlay = document.getElementById('amz-lock-overlay');
  if (overlay) {
    overlay.remove();
  }
  if (lockTimerInterval) {
    clearInterval(lockTimerInterval);
    lockTimerInterval = null;
  }
}

function loadSpendingDataForLock(callback) {
  const settings = getSettings();

  if (settings.show30Days) {
    safeSendMessage({ action: 'GET_SPENDING_30', cacheOnly: true }, response30 => {
      if (response30 && !response30.error && !response30.noCache && response30.total !== undefined) {
        callback({ total: response30.total, allCurrencies: response30.allCurrencies });
        return;
      }
      if (settings.show3Months) {
        safeSendMessage({ action: 'GET_SPENDING_3M', cacheOnly: true }, response3M => {
          if (response3M && !response3M.error && !response3M.noCache && response3M.total !== undefined) {
            callback({ total3Months: response3M.total, allCurrencies: response3M.allCurrencies });
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    });
  } else if (settings.show3Months) {
    safeSendMessage({ action: 'GET_SPENDING_3M', cacheOnly: true }, response3M => {
      if (response3M && !response3M.error && !response3M.noCache && response3M.total !== undefined) {
        callback({ total3Months: response3M.total, allCurrencies: response3M.allCurrencies });
      } else {
        callback(null);
      }
    });
  } else {
    callback(null);
  }
}
