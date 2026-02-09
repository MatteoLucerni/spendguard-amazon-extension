function getSettings() {
  try {
    const saved = localStorage.getItem('amz-spending-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        show30Days: parsed.show30Days !== undefined ? parsed.show30Days : true,
        show3Months: parsed.show3Months !== undefined ? parsed.show3Months : true,
        interfaceLockEnabled: parsed.interfaceLockEnabled || false,
        lockStartTime: parsed.lockStartTime || '09:00',
        lockEndTime: parsed.lockEndTime || '17:00',
      };
    }
  } catch (e) {
    console.error('Tracker: Error reading settings', e);
  }
  return {
    show30Days: true,
    show3Months: true,
    interfaceLockEnabled: false,
    lockStartTime: '09:00',
    lockEndTime: '17:00',
  };
}

function saveSettings(settings) {
  localStorage.setItem('amz-spending-settings', JSON.stringify(settings));
}
