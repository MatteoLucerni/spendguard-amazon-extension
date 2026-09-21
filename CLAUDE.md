# SpendGuard for Amazon: Project Instructions

## Writing style (mandatory)

Never use em dashes anywhere in this repo: code, comments, commit messages, CHANGELOG entries, README, the `docs/` website, this file. Use a period, comma, or colon instead.

Everything in the repo is written in English: identifiers, UI strings, log messages, documentation. Do not add new code comments; leave existing ones in place.

This repository is public. Never commit machine-specific paths, credentials, personal account data, real order data, or HTML snapshots captured from a logged-in Amazon session (order pages contain names, addresses and order numbers).

## What this is

A Chrome MV3 extension that shows how much the user has spent on Amazon in the last 30 days and the last 3 months, read directly from their own order history in their authenticated session. It adds three things on top of Amazon's pages: a draggable floating widget with the totals, a warning box on the checkout page, and an optional scheduled Lock with two modes: Normal (the default) leaves Amazon usable but blocks every step that places an order, Hard covers Amazon with a full-screen overlay. Privacy-first: no external servers, no analytics, no telemetry; all data stays in `chrome.storage.local`.

Plain vanilla JS, no build tool, no bundler, no npm, zero dependencies. Every file must stay directly loadable as an unpacked extension as-is. `build.ps1` only packages files, it does not transform them.

## Supported domains

21 Amazon regional domains (`www.amazon.com`, `.co.uk`, `.de`, `.fr`, `.it`, `.es`, `.co.jp`, `.ca`, `.com.au`, `.in`, `.com.br`, `.nl`, `.se`, `.pl`, `.sg`, `.com.mx`, `.ae`, `.sa`, `.com.tr`, `.eg`, `.com.be`). The list lives in **four** places that must stay in sync by hand:

- `AMAZON_DOMAINS` in `src/constants.js` (currency, symbol, `totalPattern`, `priceFormat`).
- `host_permissions`, `content_scripts[].matches` and `web_accessible_resources[].matches` in `manifest.json`.

`getDomainFromSender` in `background.js` rejects any hostname missing from `AMAZON_DOMAINS` (`UNKNOWN_DOMAIN`), so a domain added only to the manifest silently does nothing. Adding a domain also widens `host_permissions`, which triggers a new Chrome Web Store review and a permission re-consent prompt for existing users: do it deliberately, not as a side effect.

Per-domain config fields:

- `totalPattern`: a case-insensitive regex source, alternatives joined by `|`, matched against the text of each `.order-header__header-list-item` to find the order-total cell. It has to cover the words Amazon uses for "total" in that domain's UI language(s), since users can switch the site language.
- `priceFormat`: `us` (`,` thousands, `.` decimal), `eu` (`.` thousands, `,` decimal, with a guard for strings like `1.234` that are thousands-only), `jp` (no decimals, `,` thousands). Never assume `.` is always the decimal separator.

## File layout

- `manifest.json`: MV3 manifest, single source of truth for permissions (`storage`, `tabs`, `scripting`), host permissions, and the content-script load order below.
- `background.js`: service worker. Loads `src/constants.js` via `importScripts`, sets the uninstall feedback URL, opens the website's features page on first install, and owns all scraping and caching (see **Data flow**).
- `src/`: isolated-world content scripts, one bundle injected at `document_end` on every supported domain.
- `assets/images/icons/amz_icon.png`: the only icon, used for every size and exposed as a web-accessible resource because the widget, error popup and lock overlay render it on Amazon's pages.
- `build.ps1`: reads `manifest.json` to decide exactly which files ship (manifest, service worker, icons, content scripts, web-accessible resources), validates they exist, and zips them to `dist/{short_name}-{version}-{timestamp}.zip`. Any new file the extension needs at runtime must be referenced from `manifest.json`, or it will be missing from the packaged build. `dist/` and `*.zip` are gitignored.
- `docs/`: static marketing site served by GitHub Pages on the custom domain in `docs/CNAME`. Plain HTML/CSS/JS (`index.html`, `404.html`, `css/style.css`, `js/main.js`), plus `sitemap.xml`, `robots.txt` and `site.webmanifest`. It is not part of the extension package.
- `CHANGELOG.md`: one section per released version, dated, with `Added` / `Changed` / `Fixed` subsections.

### Content scripts (load order is load-bearing)

These are classic scripts sharing one global scope, and later files reference symbols declared in earlier ones. Keep function and variable names unique across all of them.

1. `src/constants.js`: SVG icon strings, `POPUP_ID`, `AMAZON_DOMAINS`, `getAmazonDomainConfig`, `getCurrentDomainConfig`. Also loaded by the service worker, so its top level must never touch `window`, `document` or `localStorage` (functions that do, like `getCurrentDomainConfig`, are fine as long as the worker never calls them).
2. `src/utils.js`: `cachedSpendingData`, `contextInvalidated`, `formatAmountHtml` (multi-currency amount rendering), `getTotalOrders`, `getResponsiveConfig` (the `mobile` <= 480px / `tablet` <= 768px / `desktop` tiers every UI component sizes itself from), `formatRelativeTime`, `safeSendMessage`.
3. `src/styles.js`: `injectGlobalStyles`, the one `<style>` element holding every keyframe and shared class (`amz-` prefixed).
4. `src/settings.js`: settings defaults, in-memory cache, persistence and the `chrome.storage.onChanged` sync (see **Settings**).
5. `src/state.js`: loading flags (`isLoading30`, `isLoading3M`), `tourActive`, widget position/minimized state, viewport clamping, and the window resize handler.
6. `src/popup-ui.js`: the floating widget (`injectPopup`), minimized icon, loading skeleton, error popup, drag handling.
7. `src/settings-ui.js`: the settings view inside the widget (including the Normal / Hard lock mode selector) and the Hard lock confirmation dialog.
8. `src/data.js`: `loadData`, `refreshRange`, `refreshAll`, error routing to `showErrorPopup`.
9. `src/onboarding.js`: first-run welcome gate and guided tour over a demo widget.
10. `src/checkout.js`: checkout warning. `observeCheckoutPage(onReady)` waits for `#subtotals` and runs whichever callback `main.js` passes.
11. `src/lock.js`: lock window logic (`isInLockTimeRange`, `isHardLockActive`, `isPurchaseLockActive`), the Hard lock overlay and countdown, and `loadSpendingDataForLock`.
12. `src/purchase-lock.js`: the Normal lock (see **Lock**). Declarations only; `initPurchaseLock()` is called from `main.js`.
13. `src/main.js`: **entry point**, `checkOnboardingAndInit()`.

Keep new top-level execution in `src/main.js`. The only other top-level side effects are listener registrations (`chrome.storage.onChanged` in `settings.js`, `resize` in `state.js`); do not add more elsewhere.

## Data flow

1. `main.js` bails out immediately on pages whose URL contains `_scraping=1` (the extension's own scraping tabs) or `signin`. Otherwise it loads settings. If a Hard lock is active it shows the overlay and stops. Otherwise it calls `initPurchaseLock()` (always, so a Normal lock starting later on an open page still works), then shows the lock notice (Normal lock active) or the checkout warning if the URL contains `checkout`, otherwise the onboarding gate or the widget.
2. The widget asks the service worker for data through `safeSendMessage` with `GET_SPENDING_30` or `GET_SPENDING_3M`. Flags: `force: true` bypasses the cache and re-scrapes, `cacheOnly: true` never scrapes and answers `{ noCache: true }` when nothing is cached.
3. On a cache miss, `scrapeWithTab` opens the orders page (`/your-orders/orders?timeFilter=last30|months-3&_scraping=1&startIndex=N`) in an **inactive background tab**, waits for `status === 'complete'` plus 2 seconds, runs `chrome.scripting.executeScript`, closes the tab, and moves to the next page (`startIndex += 10`) while `.a-pagination .a-last a` exists, up to 20 pages (`limitReached` beyond that).
4. Per page: `.yohtmlc-order-id` counts orders (all of them, including cancelled and zero-total ones, to match Amazon's own count, fixed in 1.0.1), and the totals come from `.order-header__header-list-item` cells matching `totalPattern`, taking the last line of the cell as the price. A page containing `captcha` or a sign-in form is reported as blocked, which surfaces as `AUTH_REQUIRED`.
5. Results are cached per range and per domain in `chrome.storage.local` under `amz_spending_cache_{30|3m}_{hostname}` with a 24-hour TTL. `aggregateAllDomains` then sums every non-expired cache entry for that range grouped by **currency** (not by domain), prunes expired entries, and returns `allCurrencies`, which is what the UI renders.

Things that are easy to get wrong here:

- **The `func` passed to `executeScript` is serialized and run in the Amazon tab.** It cannot reference anything from `background.js` or `constants.js`: every input goes through `args`, and the price-parsing logic inside it is intentionally self-contained.
- **Scraping requests are chained, never parallel.** `loadData` and `refreshAll` only request the 3-month range after the 30-day one has answered, so at most one scraping tab is open at a time. Keep it that way: parallel background tabs hit Amazon's bot detection and the user's tab strip.
- **The `GET_SPENDING_30` and `GET_SPENDING_3M` handlers in `background.js` are near-identical copies**, as are the per-range branches in `src/data.js`. A fix applied to one range almost always has to be applied to the other.
- **The checkout warning, the Hard lock overlay and the Normal lock notices only ever use `cacheOnly`.** They must never trigger a scrape: opening background tabs while the user is paying or while Amazon is locked is exactly the wrong moment.
- Errors reaching the UI: `TAB_CREATE_FAILED` (tab creation failed after 3 retries with exponential backoff), `AUTH_REQUIRED`, and `CONTEXT_INVALIDATED` (the extension was reloaded or updated while the page stayed open; `safeSendMessage` detects it and shows a "Refresh Page" prompt instead of throwing).

## UI conventions

- There is no shadow DOM: every element is injected straight into Amazon's page, styled with inline styles (`Object.assign(el.style, ...)` or inline `style` attributes in template strings) plus the shared classes from `injectGlobalStyles`. Prefix every id, class and keyframe with `amz-` to avoid collisions with Amazon's own CSS.
- Top-level overlays use `z-index: 2147483647` (the tour spotlight uses `2147483646`, one below its tooltip).
- Every new piece of UI must size itself from `getResponsiveConfig()` and work at the `mobile` tier (full-width widget, no dragging, 44px minimum touch targets, bottom-sheet tour tooltip).
- Widget position (`left`/`right` side) and minimized state live in the page's `localStorage` under `amz-popup-state`, so they are per Amazon domain by design.
- Visual language follows Amazon's own palette: header `#232f3e`, accent `#FF9900`, text `#0f1111`, secondary text `#565959`, borders `#d5d9d9`.
- Logs are prefixed `[SpendGuard]`. There is no dev-mode flag: keep logging minimal and never log order contents or anything personal.

## Settings

Stored as one object in `chrome.storage.local` under `amz-spending-settings` (nothing uses `chrome.storage.sync`). `SETTINGS_DEFAULTS` in `src/settings.js`:

- `show30Days` (default `true`), `show3Months` (default `true`): which ranges the widget shows and scrapes. With both off, the widget renders without data and nothing is scraped.
- `interfaceLockEnabled` (default `false`), `lockStartTime` (default `'09:00'`), `lockEndTime` (default `'17:00'`): the lock window, local time, `HH:MM`, shared by both modes. `isInLockTimeRange` supports windows crossing midnight (start later than end); any change to the time logic must keep that case working, and `calculateTimeUntilUnlock` must agree with it.
- `lockMode` (`'normal'` or `'hard'`, default `'normal'`). `resolveLockMode` fills it for settings saved before the field existed: `'hard'` if `interfaceLockEnabled` was already on, since that was the only lock there was, `'normal'` otherwise. Never let an existing user's lock be silently downgraded.

`initSettings` also migrates a legacy copy of the same key from the page's `localStorage` into `chrome.storage.local` once, then deletes it. Keep that migration: users updating from old versions may still carry it. When adding a setting, add it to `SETTINGS_DEFAULTS` **and** to both explicit field lists in `initSettings` (the stored-settings branch and the legacy branch), since they copy fields one by one rather than spreading the stored object.

Other keys: `amz-onboarding-completed` in `chrome.storage.local` (the settings view can reset it to replay the tour), and the per-domain cache keys described above.

## Lock

**The Hard lock is a commitment device, treat it as such.** Enabling it, or switching to it while the lock is on, requires the 3-second countdown in `showLockConfirmDialog`, and while it is active the overlay replaces the widget, so settings cannot be reached from the page. Do not add an escape hatch (a hidden unlock button, a keyboard shortcut, a bypass query parameter) without an explicit request. It is evaluated once at page load.

**The Normal lock is deliberately soft**: Amazon stays usable, it activates without confirmation, and settings stay reachable. What it blocks is every step that places an order: Buy Now, 1-Click, Proceed to checkout, Place your order, and Kindle "Buy as a gift". Add to cart, cart edits, and the address/payment links inside checkout stay free. How `src/purchase-lock.js` does it:

- **Detection is language-independent, always.** Buttons are matched by Amazon's own `name`/`id`/`data-feature-id` attributes (`PURCHASE_BUTTON_SELECTOR`), links by path (`PURCHASE_LINK_PATTERN`), form submissions by the submitter or the form's `action` path (`PURCHASE_FORM_PATTERN`). Never match on button text. New selectors must come from real DOM evidence gathered with the throwaway-script technique under **Testing**, not from guesses.
- **Blocking happens in capture phase on `window`** (`click` and `submit`), with `preventDefault` plus `stopImmediatePropagation`, so Amazon's delegated handlers on `document` never see the event. The lock window is checked at event time, not at load.
- **Never disable or hide the buttons.** They keep their look and receive a small lock badge (a CSS `::after` scoped under `html.amz-purchase-lock-active`, toggled by `syncPurchaseLockState` every 15 seconds and on settings changes). Clicking one opens a callout explaining that SpendGuard is blocking checkout, with the unlock time and the amount already spent. On checkout pages the same content is shown as a fixed notice after `#subtotals`, replacing the spending warning.
- The turbo checkout modal (an iframe) opens from the Buy Now button, which is already blocked, so the content scripts deliberately do not run in frames.

## Testing

There is no automated test suite and no Node tooling. Do not add DOM-fixture tests built from saved Amazon order pages: they would require committing personal order data to a public repo, and Amazon's markup differs by domain, language and account, so a frozen snapshot proves little.

Changes to selectors, price parsing or scraping require manual verification by the user in a real, logged-in session on the affected domain(s), since only they can access their own order history. Checklist to hand over:

- Load the unpacked extension (`chrome://extensions`, Developer mode, "Load unpacked" on the repo root), then reload any open Amazon tab.
- Force a refresh from the widget and compare the order count and total against the orders page itself, for both ranges.
- For pagination changes, use an account or range with more than 10 orders.
- For checkout or lock changes, verify with an empty cache as well as a populated one.
- For Normal lock changes, check a product page (Buy Now blocked, Add to cart free), a Kindle ebook page (1-Click and gift blocked), the cart (Proceed to checkout blocked, quantity edits free) and the checkout page (both Place your order buttons blocked, notice shown), with the lock window starting both before and after the page load.

For ad hoc live-DOM debugging (checking a selector or a price string on a real orders page), never create a script file in the project. Write the throwaway script in the chat, in a code block, with instructions on which page to open and to paste it in the DevTools console, ending with `copy(JSON.stringify(...))` when the output is useful to paste back. Ask for only the minimal non-personal output needed (counts, matched labels, raw price strings), never full order HTML.

## Git and releases

- `main` is the released branch, `develop` the integration branch. Work goes on `feature/*` or `fix/*` branches merged into `develop`.
- Commit messages use conventional prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `assets:`.
- A release bumps `version` in `manifest.json` and adds a dated `CHANGELOG.md` section in the same change, then `build.ps1` produces the zip uploaded to the Chrome Web Store.
- Permission changes (`permissions`, `host_permissions`) force a Web Store review and a user re-consent prompt. Never add one as a convenience.
