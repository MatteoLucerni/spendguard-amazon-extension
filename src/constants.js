const POPUP_ID = 'amz-spending-popup';

const GEAR_ICON_SVG = `<svg style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Settings</title><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

const GEAR_ICON_INLINE_SVG = `<svg style="vertical-align: middle; margin: 0 2px;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

const REFRESH_ICON_SVG = `<svg style="cursor:pointer; flex-shrink:0;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#767676" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Refresh</title><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;

const REFRESH_ICON_HEADER_SVG = `<svg id="amz-refresh-all" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Refresh all</title><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;

const CLOSE_ICON_SVG = `<svg id="amz-close" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Close</title><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const BACK_ICON_SVG = `<svg id="amz-back" style="cursor:pointer; padding:0 2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Back</title><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

const SPINNER_STYLE = `<style>@keyframes amz-spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;

const HELP_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="600">?</text></svg>`;

const AMAZON_DOMAINS = {
  'www.amazon.com': { currency: 'USD', symbol: '$', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.co.uk': { currency: 'GBP', symbol: '£', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.de': { currency: 'EUR', symbol: '€', totalPattern: 'total|gesamtbetrag|summe', priceFormat: 'eu' },
  'www.amazon.fr': { currency: 'EUR', symbol: '€', totalPattern: 'total|montant', priceFormat: 'eu' },
  'www.amazon.it': { currency: 'EUR', symbol: '€', totalPattern: 'total|totale', priceFormat: 'eu' },
  'www.amazon.es': { currency: 'EUR', symbol: '€', totalPattern: 'total|importe', priceFormat: 'eu' },
  'www.amazon.co.jp': { currency: 'JPY', symbol: '¥', totalPattern: '合計|total', priceFormat: 'jp' },
  'www.amazon.ca': { currency: 'CAD', symbol: 'CA$', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.com.au': { currency: 'AUD', symbol: 'A$', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.in': { currency: 'INR', symbol: '₹', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.com.br': { currency: 'BRL', symbol: 'R$', totalPattern: 'total', priceFormat: 'eu' },
  'www.amazon.nl': { currency: 'EUR', symbol: '€', totalPattern: 'total|totaal', priceFormat: 'eu' },
  'www.amazon.se': { currency: 'SEK', symbol: 'kr', totalPattern: 'total|summa', priceFormat: 'eu' },
  'www.amazon.pl': { currency: 'PLN', symbol: 'zł', totalPattern: 'total|suma|łącznie', priceFormat: 'eu' },
  'www.amazon.sg': { currency: 'SGD', symbol: 'S$', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.com.mx': { currency: 'MXN', symbol: 'MX$', totalPattern: 'total|importe', priceFormat: 'us' },
  'www.amazon.ae': { currency: 'AED', symbol: 'AED', totalPattern: 'total', priceFormat: 'us' },
  'www.amazon.sa': { currency: 'SAR', symbol: 'SAR', totalPattern: 'total|الإجمالي', priceFormat: 'us' },
  'www.amazon.com.tr': { currency: 'TRY', symbol: '₺', totalPattern: 'total|toplam', priceFormat: 'eu' },
  'www.amazon.eg': { currency: 'EGP', symbol: 'EGP', totalPattern: 'total|الإجمالي', priceFormat: 'us' },
  'www.amazon.com.be': { currency: 'EUR', symbol: '€', totalPattern: 'total|totaal|totale', priceFormat: 'eu' },
};

// Controls that start a purchase. The first five were confirmed against a live
// amazon.com product and cart page; the rest are best effort. This list does not
// have to be exhaustive - checkout pages get the full lock overlay regardless,
// so anything missed here is still stopped one step later.
const PURCHASE_CONTROL_SELECTORS = [
  '#add-to-cart-button',
  '#buy-now-button',
  'input[name="submit.add-to-cart"]',
  'input[name="submit.addToCart"]',
  'input[name="submit.buy-now"]',
  '#one-click-button',
  'input[name="proceedToRetailCheckout"]',
  '#sc-buy-box-ptc-button',
].join(', ');

const AMAZON_MATCH_PATTERNS = Object.keys(AMAZON_DOMAINS).map(d => `https://${d}/*`);

function getAmazonDomainConfig(hostname) {
  return AMAZON_DOMAINS[hostname] || AMAZON_DOMAINS['www.amazon.com'];
}

function getCurrentDomainConfig() {
  return getAmazonDomainConfig(window.location.hostname);
}
