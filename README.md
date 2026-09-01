<p align="center">
  <img src="assets/images/icons/amz_icon.png" alt="SpendGuard for Amazon™" width="128" height="128">
</p>

<h1 align="center">SpendGuard for Amazon™</h1>

<p align="center">
  A privacy-first Chrome extension that tracks your Amazon™ spending across 21 regional domains, directly from your browser, with zero external servers.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/amazon-spending-tracker/jkdbmbhaikmkjkkjcppobcljbmofifbo">
    <img src="https://img.shields.io/chrome-web-store/v/jkdbmbhaikmkjkkjcppobcljbmofifbo?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white&color=4285F4" alt="Chrome Web Store">
  </a>
  <a href="https://chromewebstore.google.com/detail/amazon-spending-tracker/jkdbmbhaikmkjkkjcppobcljbmofifbo">
    <img src="https://img.shields.io/chrome-web-store/users/jkdbmbhaikmkjkkjcppobcljbmofifbo?label=Users&logo=googlechrome&logoColor=white&color=34A853" alt="Chrome Web Store Users">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT">
  </a>
  <img src="https://img.shields.io/badge/manifest-v3-blueviolet" alt="Manifest V3">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero Dependencies">
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Amazon Domains](#supported-amazon-domains)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Settings](#settings)
- [Privacy](#privacy)
- [Tech Stack](#tech-stack)
- [Chrome APIs Used](#chrome-apis-used)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Overview

**SpendGuard for Amazon™** is an open-source Chrome extension that helps you stay aware of your Amazon™ spending habits. It reads your order history directly from your authenticated Amazon session and displays spending summaries in a sleek, draggable floating widget, right on any Amazon page.

All data is processed and stored locally in your browser. There are no external servers, no analytics, and no telemetry. Your spending data never leaves your machine.

---

## Features

### Spending Tracking

- **30-day and 3-month spending totals** scraped from your Amazon order history
- **Multi-currency aggregation**: shopping across different Amazon regions is grouped by currency
- **Smart caching** with 24-hour TTL, per-domain and per-range granularity
- **Manual refresh** per individual range or all at once

### Floating Popup Widget

- **Draggable popup** that snaps to left/right sides of the viewport
- **Minimize to icon**: compact pill showing your spending total at a glance, with a setting for which range it shows
- **Responsive design**: three layout tiers: mobile (≤480px), tablet (≤768px), desktop
- **Relative timestamps**: "5 min ago", "2 hours ago" for last refresh time

### Checkout Warning

- **Spending banner on checkout pages**: a yellow ⚠️ warning showing how much you've already spent, injected directly on Amazon's checkout flow

### Interface Lock

- **Time-based Amazon blocking**: configure a daily time window (e.g. 09:00-17:00) to block Amazon access
- **Full-screen lock overlay** with live countdown timer until unlock
- **Confirmation dialog with countdown** to prevent accidental activation
- **Spending summary visible** on the lock screen

### Spending Limit

- **Spend-based blocking**: set a 30-day spending limit; once you cross it, Amazon is blocked
- **Two windows**: measure the limit over a rolling **last 30 days**, or over the **current calendar month**, which resets on the 1st
- **Two modes**: *Block buying* (default) leaves browsing and tracking working but disables the controls that start a purchase; *Block Amazon* escalates to locking the whole site behind the full-screen overlay
- **Month to date is also a display range**, so the widget can show what you have spent since the 1st alongside the other totals
- **Checkout is always locked** in either mode, so a missed buy button can't slip a purchase through
- **Confirmation dialog with countdown** to prevent accidental activation
- **Off by default**, and inert until you set an amount above zero

### Onboarding

- **Welcome gate** for first-time users with a 4-second skip countdown
- **6-step interactive spotlight tour** with keyboard navigation (arrow keys, Escape)
- **Replay tutorial** available anytime from settings

### Error Handling

- **Auth detection**: prompts login when Amazon session has expired
- **Tab limit handling**: graceful error when too many tabs are open
- **Context invalidation**: detects extension updates and offers page refresh

---

## Supported Amazon Domains

The extension supports **21 Amazon regional domains** with localized price parsing and total label matching:

| Domain        | Currency | Symbol | Price Format |
| ------------- | -------- | ------ | ------------ |
| amazon.com    | USD      | $      | US           |
| amazon.co.uk  | GBP      | £      | US           |
| amazon.de     | EUR      | €      | EU           |
| amazon.fr     | EUR      | €      | EU           |
| amazon.it     | EUR      | €      | EU           |
| amazon.es     | EUR      | €      | EU           |
| amazon.co.jp  | JPY      | ¥      | JP           |
| amazon.ca     | CAD      | CA$    | US           |
| amazon.com.au | AUD      | A$     | US           |
| amazon.in     | INR      | ₹      | US           |
| amazon.com.br | BRL      | R$     | EU           |
| amazon.nl     | EUR      | €      | EU           |
| amazon.se     | SEK      | kr     | EU           |
| amazon.pl     | PLN      | zł     | EU           |
| amazon.sg     | SGD      | S$     | US           |
| amazon.com.mx | MXN      | MX$    | US           |
| amazon.ae     | AED      | AED    | US           |
| amazon.sa     | SAR      | SAR    | US           |
| amazon.com.tr | TRY      | ₺      | EU           |
| amazon.eg     | EGP      | EGP    | US           |
| amazon.com.be | EUR      | €      | EU           |

**Price format legend:**

- **US**: `1,234.56` (comma thousands, dot decimal)
- **EU**: `1.234,56` (dot thousands, comma decimal)
- **JP**: `1,234` (no decimal, comma thousands)

---

## Installation

### From the Chrome Web Store

1. Visit the [Chrome Web Store listing](https://chromewebstore.google.com/detail/amazon-spending-tracker/jkdbmbhaikmkjkkjcppobcljbmofifbo)
2. Click **"Add to Chrome"**
3. Navigate to any Amazon page. The spending widget appears automatically

### From Source (Developer Mode)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/MatteoLucerni/amazon-spending-tracker-extension.git
   ```

2. **Open Chrome Extensions page:**

   ```
   chrome://extensions
   ```

3. **Enable "Developer mode"** (toggle in the top-right corner)

4. **Click "Load unpacked"** and select the cloned repository folder

5. **Navigate to any Amazon page**. The extension activates automatically

> **Note:** No build step is required. The extension uses plain JavaScript with zero dependencies.

---

## How It Works

1. **Content scripts** are injected on every Amazon page ([`src/main.js`](src/main.js) is the entry point)
2. On load, the extension checks for lock mode, checkout pages, and onboarding status
3. In normal mode, it sends a message to the **background service worker** ([`background.js`](background.js)) requesting spending data
4. The service worker checks its **24-hour cache**. If fresh data exists, it returns immediately
5. If cache is stale or a force-refresh is requested, the service worker:
   - Opens a **hidden background tab** to your Amazon order history page
   - Waits for the page to fully load (+ 2s buffer for dynamic content)
   - Executes a **content script** that parses order totals from the DOM
   - **Paginates** through order pages (10 orders/page, max 200 orders)
   - Stores the result in `chrome.storage.local` with a 24-hour TTL
6. The spending data is sent back to the content script, which renders the **floating popup widget**
7. On checkout pages, a **spending warning banner** is injected near the subtotal

The scraping tab URL includes a `_scraping=1` parameter so the extension's content scripts skip initialization on scraping pages, avoiding recursive injection.

---

## Project Structure

```
amazon-spending-tracker-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker: scraping, caching, message routing
├── build.ps1                  # PowerShell packaging script for Chrome Web Store
├── .gitignore                 # Git ignore rules (dist/, *.zip, OS files)
├── src/
│   ├── main.js                # Entry point: init, routing (lock/checkout/normal)
│   ├── constants.js           # Shared constants, SVG icons, domain configs
│   ├── utils.js               # Formatting helpers, safe message passing
│   ├── state.js               # Popup position, drag state, viewport logic
│   ├── styles.js              # Global CSS injection (animations, components)
│   ├── popup-ui.js            # Main floating popup widget rendering
│   ├── settings-ui.js         # In-popup settings panel with toggles
│   ├── settings.js            # Settings persistence (chrome.storage.local)
│   ├── data.js                # Data loading, refresh orchestration, caching
│   ├── checkout.js            # Checkout page spending warning banner
│   ├── lock.js                # Interface lock overlay with countdown
│   ├── purchase-block.js      # Disables buy controls when over the spending limit
│   └── onboarding.js          # Welcome gate and 6-step spotlight tour
├── assets/
│   └── images/
│       └── icons/
│           └── amz_icon.png   # Extension icon (16/48/128px)
├── dist/                      # Build output (git-ignored)
│   └── *.zip                  # Packaged extension zips for Chrome Web Store
└── docs/
    ├── index.html             # GitHub Pages landing page
    ├── css/
    │   └── style.css          # Landing page styles
    ├── js/
    │   └── main.js            # Landing page interactivity
    └── images/
        └── icon.png           # Landing page icon
```

---

## Settings

The extension provides the following user-configurable options, accessible via the gear icon in the popup:

| Setting            | Default     | Description                       |
| ------------------ | ----------- | --------------------------------- |
| Show Last 30 Days  | ✅ Enabled  | Display 30-day spending total     |
| Show This Month    | ❌ Disabled | Display spending since the 1st (from the 30-day range) |
| Show Last 3 Months | ✅ Enabled  | Display 3-month spending total    |
| Minimized Total    | Last 30 days | Which figure the collapsed pill shows |
| Interface Lock     | ❌ Disabled | Enable time-based Amazon blocking |
| Lock Start Time    | 09:00       | Start of the lock window          |
| Lock End Time      | 17:00       | End of the lock window            |
| Spending Limit     | ❌ Disabled | Block Amazon once the 30-day total reaches the limit |
| Limit Amount       | 0           | The 30-day limit, in the current domain's currency |
| Limit Window       | Last 30 days | Measure the limit over the last 30 days, or the current calendar month |
| Limit Mode         | Block buying | What happens over the limit: block buying, or escalate to the whole site |

The interface lock supports overnight ranges (e.g. 22:00-06:00). Enabling the lock requires explicit confirmation through a dialog with a 3-second countdown.

---

## Privacy

**SpendGuard for Amazon™ is designed with privacy as the top priority.**

- **Zero external network calls**: the extension never contacts any external server
- **No analytics or telemetry**: no tracking pixels, no usage data collection, no crash reporting
- **All data stored locally**: everything lives in `chrome.storage.local`, inside your browser
- **No personal data stored**: only aggregate spending totals and order counts; no order details, product names, or personal information
- **Scraping is read-only**: the extension reads your order page DOM to extract totals, never modifying anything
- **Open source**: every line of code is publicly auditable in this repository

Your spending data never leaves your machine. Period.

---

## Tech Stack

| Technology        | Details                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **Language**      | Vanilla JavaScript (ES6+)                                                                               |
| **Extension API** | Chrome Extension Manifest V3                                                                            |
| **Build Process** | No bundler or transpiler. PowerShell packaging script (`build.ps1`) for Chrome Web Store zip            |
| **Dependencies**  | Zero. No `node_modules`, no `package.json`                                                              |
| **CSS**           | Injected programmatically via JavaScript                                                                |
| **Hosting**       | GitHub Pages for the [landing page](https://matteolucerni.github.io/amazon-spending-tracker-extension/) |

---

## Chrome APIs Used

| API                              | Usage                                                  |
| -------------------------------- | ------------------------------------------------------ |
| `chrome.storage.local`           | Persist settings, spending cache, and onboarding state |
| `chrome.storage.onChanged`       | Sync settings across tabs in real-time                 |
| `chrome.runtime.sendMessage`     | Content script to service worker communication         |
| `chrome.runtime.onMessage`       | Service worker message handler                         |
| `chrome.runtime.getURL`          | Load extension assets (icon) in content scripts        |
| `chrome.tabs.create`             | Open hidden tabs for order page scraping               |
| `chrome.tabs.remove`             | Clean up scraping tabs after data extraction           |
| `chrome.tabs.onUpdated`          | Detect when scraping tabs finish loading               |
| `chrome.scripting.executeScript` | Inject parsing scripts into order pages                |

---

## Packaging for Chrome Web Store

To create a `.zip` ready for upload to the Chrome Web Store:

```powershell
.\build.ps1
```

The script:

- Reads `short_name` and `version` from `manifest.json`
- Collects all extension files dynamically (service worker, content scripts, icons, web accessible resources)
- Creates a zip in `dist/` named `{short_name}-{version}-{timestamp}.zip` (e.g. `SpendGuard-1.0.0-20260209-153045.zip`)
- Excludes non-extension files (`docs/`, `README.md`, `.git/`, `build.ps1`)

> **Requirements:** PowerShell 5.1+ (built into Windows). No additional dependencies needed.

---

## Contributing

Contributions are welcome! Here's how to get started:

### Getting Started

1. **Fork** this repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/amazon-spending-tracker-extension.git
   ```
3. **Load the extension** in Chrome (see [Installation from Source](#from-source-developer-mode))
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/my-feature
   ```

### Development Workflow

- No build step needed. Edit any `.js` file and reload the extension in `chrome://extensions`
- The entire source is vanilla JavaScript; no tooling or environment setup required
- Test on at least one Amazon domain after making changes
- For domain-specific changes (price parsing, total patterns), test on the affected regional domain

### Submitting Changes

1. **Commit** your changes with a clear message
2. **Push** to your fork
3. **Open a Pull Request** against the `main` branch
4. In the PR description:
   - Describe what the change does and why
   - List which Amazon domains you tested on
   - Include screenshots for UI changes

### Reporting Issues

When opening an issue, please include:

- Your Chrome version
- The Amazon domain you were on (e.g. amazon.de)
- Steps to reproduce
- Expected vs. actual behavior
- Console errors (if any) from `chrome://extensions` > "Inspect views: service worker"

### Areas for Contribution

- 🌍 **New Amazon domain support**: add new regional domains in [`src/constants.js`](src/constants.js)
- 🌐 **Localization improvements**: refine total label patterns for better regional matching
- 🎨 **UI/UX enhancements**: improve the popup design, animations, or responsive behavior
- 🐛 **Bug fixes**: resolve parsing edge cases, error handling gaps
- 📝 **Documentation**: improve this README, add inline docs, or expand the landing page
- ✅ **Testing**: help validate the extension across different Amazon domains and browsers

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Author

**Matteo Lucerni**

- GitHub: [@MatteoLucerni](https://github.com/MatteoLucerni)
- LinkedIn: [Matteo Lucerni](https://www.linkedin.com/in/matteo-lucerni-0725a526b)
- Landing Page: [matteolucerni.github.io/amazon-spending-tracker-extension](https://matteolucerni.github.io/amazon-spending-tracker-extension/)

---

<p align="center">
  <sub>Built with ☕ and vanilla JavaScript. No frameworks were harmed in the making of this extension.</sub>
</p>
