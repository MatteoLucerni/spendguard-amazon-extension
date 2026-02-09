function injectGlobalStyles() {
  if (document.getElementById('amz-tracker-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'amz-tracker-global-styles';
  style.textContent = `
    @keyframes amz-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes amz-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes amz-flash { 0% { background-color: rgba(255,153,0,0.3); } 100% { background-color: transparent; } }
    @keyframes amz-slideIn { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
    @keyframes amz-slideOut { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(12px); } }
    @keyframes amz-bounce { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } 60% { transform: translateY(-3px); } }
    @keyframes amz-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes amz-countdown-ring { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 113; } }
    @keyframes amz-fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes amz-fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
    .amz-refresh-spinning { animation: amz-spin 0.6s linear infinite; }
    .amz-toggle-pulse { animation: amz-pulse 0.3s ease; }
    .amz-data-flash { animation: amz-flash 0.8s ease; }
    .amz-popup-enter { animation: amz-slideIn 0.25s ease-out; }
    .amz-popup-exit { animation: amz-slideOut 0.2s ease-in forwards; }
    .amz-icon-bounce { animation: amz-bounce 0.5s ease; }
    .amz-skeleton-bar { height: 14px; border-radius: 3px; background: linear-gradient(90deg, #e7e7e7 25%, #f0f0f0 50%, #e7e7e7 75%); background-size: 200px 100%; animation: amz-shimmer 1.5s infinite; }

    .amz-tour-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483646; pointer-events: none; }
    .amz-tour-spotlight { position: fixed; z-index: 2147483646; border-radius: 6px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.7); pointer-events: none; transition: all 0.35s ease; }
    .amz-tour-tooltip { position: fixed; z-index: 2147483647; background: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); font-family: Amazon Ember, Arial, sans-serif; pointer-events: auto; animation: amz-fadeIn 0.3s ease; }
    .amz-tour-tooltip-mobile { position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647; background: #fff; border-radius: 16px 16px 0 0; box-shadow: 0 -4px 20px rgba(0,0,0,0.25); font-family: Amazon Ember, Arial, sans-serif; pointer-events: auto; animation: amz-slideIn 0.3s ease-out; }

    .amz-welcome-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; justify-content: center; align-items: center; font-family: Amazon Ember, Arial, sans-serif; animation: amz-fadeIn 0.3s ease; }
    .amz-welcome-card { background: #fff; border-radius: 12px; padding: 28px 24px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .amz-btn-primary { display: inline-block; padding: 10px 24px; border: none; border-radius: 6px; background: #FF9900; color: #0f1111; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.2s; }
    .amz-btn-primary:hover { background: #e68a00; }
    .amz-btn-secondary { display: inline-block; padding: 10px 24px; border: 1px solid #d5d9d9; border-radius: 6px; background: #fff; color: #565959; font-size: 14px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .amz-btn-secondary:hover:not(:disabled) { background: #f7f7f7; }
    .amz-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    .amz-tour-dots { display: flex; gap: 6px; justify-content: center; }
    .amz-tour-dot { width: 8px; height: 8px; border-radius: 50%; background: #d5d9d9; transition: background 0.2s; }
    .amz-tour-dot-active { background: #FF9900; }

    @media (max-width: 480px) {
      .amz-welcome-card { padding: 20px 16px; margin: 0 16px; }
      .amz-btn-primary, .amz-btn-secondary { padding: 12px 20px; min-height: 44px; font-size: 14px; }
    }
  `;
  document.head.appendChild(style);
}
