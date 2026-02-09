const SETTINGS_DEFAULTS = {
  show30Days: true,
  show3Months: true,
  interfaceLockEnabled: false,
  lockStartTime: '09:00',
  lockEndTime: '17:00',
};

const SETTINGS_KEY = 'amz-spending-settings';
let _settingsCache = { ...SETTINGS_DEFAULTS };

function getSettings() {
  return { ..._settingsCache };
}

function saveSettings(settings) {
  _settingsCache = { ...settings };
  chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

function initSettings(callback) {
  const legacySaved = localStorage.getItem(SETTINGS_KEY);

  chrome.storage.local.get(SETTINGS_KEY, result => {
    if (result[SETTINGS_KEY]) {
      const parsed = result[SETTINGS_KEY];
      _settingsCache = {
        show30Days: parsed.show30Days !== undefined ? parsed.show30Days : SETTINGS_DEFAULTS.show30Days,
        show3Months: parsed.show3Months !== undefined ? parsed.show3Months : SETTINGS_DEFAULTS.show3Months,
        interfaceLockEnabled: parsed.interfaceLockEnabled || SETTINGS_DEFAULTS.interfaceLockEnabled,
        lockStartTime: parsed.lockStartTime || SETTINGS_DEFAULTS.lockStartTime,
        lockEndTime: parsed.lockEndTime || SETTINGS_DEFAULTS.lockEndTime,
      };
    } else if (legacySaved) {
      try {
        const parsed = JSON.parse(legacySaved);
        _settingsCache = {
          show30Days: parsed.show30Days !== undefined ? parsed.show30Days : SETTINGS_DEFAULTS.show30Days,
          show3Months: parsed.show3Months !== undefined ? parsed.show3Months : SETTINGS_DEFAULTS.show3Months,
          interfaceLockEnabled: parsed.interfaceLockEnabled || SETTINGS_DEFAULTS.interfaceLockEnabled,
          lockStartTime: parsed.lockStartTime || SETTINGS_DEFAULTS.lockStartTime,
          lockEndTime: parsed.lockEndTime || SETTINGS_DEFAULTS.lockEndTime,
        };
        chrome.storage.local.set({ [SETTINGS_KEY]: _settingsCache });
        localStorage.removeItem(SETTINGS_KEY);
      } catch (e) {
        console.error('Tracker: Error migrating legacy settings', e);
      }
    }
    if (callback) callback();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY]) {
    const newVal = changes[SETTINGS_KEY].newValue;
    if (newVal) {
      _settingsCache = { ...newVal };
    }
  }
});
