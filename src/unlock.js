// A password here is a deliberate speed bump, not a security control. Anyone
// with access to the browser can disable the extension from chrome://extensions
// or clear its storage, and nothing a content script does can prevent that. It
// exists to make unlocking a decision rather than a reflex, so the password is
// still never stored in the clear: only a salted SHA-256 digest is kept.
const UNLOCK_PASSWORD_KEY = 'amz-unlock-password';
const UNLOCK_UNTIL_KEY = 'amz-unlock-until';
const UNLOCK_DURATION_MS = 15 * 60 * 1000;

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password, saltHex) {
  const data = new TextEncoder().encode(`${saltHex}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(digest);
}

function getStoredUnlockPassword(callback) {
  chrome.storage.local.get(UNLOCK_PASSWORD_KEY, result => {
    callback(result[UNLOCK_PASSWORD_KEY] || null);
  });
}

function hasUnlockPassword(callback) {
  getStoredUnlockPassword(stored => callback(!!(stored && stored.hash)));
}

async function setUnlockPassword(password, callback) {
  const saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, saltHex);
  chrome.storage.local.set({ [UNLOCK_PASSWORD_KEY]: { salt: saltHex, hash } }, () =>
    callback(true),
  );
}

function clearUnlockPassword(callback) {
  chrome.storage.local.remove(UNLOCK_PASSWORD_KEY, () => callback(true));
}

function verifyUnlockPassword(password, callback) {
  getStoredUnlockPassword(async stored => {
    if (!stored || !stored.hash) {
      callback(false);
      return;
    }
    const hash = await hashPassword(password, stored.salt);
    callback(hash === stored.hash);
  });
}

function grantTemporaryUnlock(callback) {
  chrome.storage.local.set(
    { [UNLOCK_UNTIL_KEY]: Date.now() + UNLOCK_DURATION_MS },
    () => callback && callback(),
  );
}

function isTemporarilyUnlocked(callback) {
  chrome.storage.local.get(UNLOCK_UNTIL_KEY, result => {
    const until = result[UNLOCK_UNTIL_KEY];
    callback(typeof until === 'number' && until > Date.now());
  });
}

function endTemporaryUnlock(callback) {
  chrome.storage.local.remove(UNLOCK_UNTIL_KEY, () => callback && callback());
}

// Injected into the lock overlay only when a password has been set.
function attachUnlockControl(overlay, onUnlocked) {
  hasUnlockPassword(exists => {
    if (!exists) return;

    const wrap = document.createElement('div');
    wrap.style.marginTop = '32px';
    wrap.style.textAlign = 'center';
    wrap.innerHTML = `
      <button id="amz-unlock-open" style="background:none; border:1px solid #565959; border-radius:4px; color:#a0a0a0; font-size:12px; padding:6px 14px; cursor:pointer; font-family:inherit;">Unlock with password</button>
      <div id="amz-unlock-form" style="display:none; margin-top:10px;">
        <input id="amz-unlock-input" type="password" autocomplete="off" placeholder="Password" style="padding:6px 8px; border:1px solid #565959; border-radius:4px; background:#1a2330; color:#fff; font-size:13px; width:170px;">
        <button id="amz-unlock-submit" style="margin-left:6px; padding:6px 14px; border:none; border-radius:4px; background:#ff9900; color:#0f1111; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit;">Unlock</button>
        <div id="amz-unlock-error" style="color:#ff6b6b; font-size:11px; margin-top:8px; min-height:14px;"></div>
        <div style="color:#565959; font-size:10px; margin-top:4px;">Unlocks for 15 minutes</div>
      </div>
    `;
    overlay.appendChild(wrap);

    const form = wrap.querySelector('#amz-unlock-form');
    const input = wrap.querySelector('#amz-unlock-input');
    const error = wrap.querySelector('#amz-unlock-error');

    wrap.querySelector('#amz-unlock-open').onclick = () => {
      wrap.querySelector('#amz-unlock-open').style.display = 'none';
      form.style.display = 'block';
      input.focus();
    };

    const attempt = () => {
      const value = input.value;
      if (!value) return;
      verifyUnlockPassword(value, ok => {
        input.value = '';
        if (!ok) {
          error.textContent = 'Incorrect password';
          return;
        }
        error.textContent = '';
        grantTemporaryUnlock(() => onUnlocked());
      });
    };

    wrap.querySelector('#amz-unlock-submit').onclick = attempt;
    input.onkeydown = e => {
      if (e.key === 'Enter') attempt();
    };
  });
}

// Modal password prompt, used before a lock can be switched off from settings.
function promptForPassword(title, onConfirm, onCancel) {
  hasUnlockPassword(exists => {
    if (!exists) {
      onConfirm();
      return;
    }

    const existing = document.getElementById('amz-password-prompt');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'amz-password-prompt';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: '2147483647',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Amazon Ember, Arial, sans-serif',
    });

    overlay.innerHTML = `
      <div style="background:#fff; border-radius:8px; padding:20px; max-width:min(320px, calc(100vw - 40px)); box-shadow:0 4px 12px rgba(0,0,0,0.3); text-align:center;">
        <div style="font-size:16px; font-weight:600; color:#0f1111; margin-bottom:12px;">${title}</div>
        <input id="amz-password-prompt-input" type="password" autocomplete="off" placeholder="Password" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #d5d9d9; border-radius:4px; font-size:13px;">
        <div id="amz-password-prompt-error" style="color:#b12704; font-size:11px; margin-top:6px; min-height:14px;"></div>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:12px;">
          <button id="amz-password-prompt-cancel" style="padding:8px 16px; border:1px solid #d5d9d9; border-radius:4px; background:#fff; color:#0f1111; font-size:13px; cursor:pointer;">Cancel</button>
          <button id="amz-password-prompt-ok" style="padding:8px 16px; border:none; border-radius:4px; background:#232f3e; color:#fff; font-size:13px; cursor:pointer;">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#amz-password-prompt-input');
    const error = overlay.querySelector('#amz-password-prompt-error');
    input.focus();

    const close = () => overlay.remove();
    const cancel = () => {
      close();
      if (onCancel) onCancel();
    };

    const attempt = () => {
      verifyUnlockPassword(input.value, ok => {
        if (!ok) {
          input.value = '';
          error.textContent = 'Incorrect password';
          return;
        }
        close();
        onConfirm();
      });
    };

    overlay.querySelector('#amz-password-prompt-cancel').onclick = cancel;
    overlay.querySelector('#amz-password-prompt-ok').onclick = attempt;
    input.onkeydown = e => {
      if (e.key === 'Enter') attempt();
      if (e.key === 'Escape') cancel();
    };
  });
}
