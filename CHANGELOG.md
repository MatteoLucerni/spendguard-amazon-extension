# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-09-21

### Added

- Normal lock mode: during the lock hours Amazon stays fully usable, but Buy Now, 1-Click, Proceed to checkout, Place your order and Kindle gift purchases are blocked. Buttons stay visible with a lock badge, and clicking one shows a SpendGuard notice with the unlock time and the amount already spent. Detection relies on Amazon's element names and form actions, so it works in every language.
- Lock mode selector (Normal / Hard) in the settings, with an always-visible description of the difference between the two modes. Normal is the default and activates without confirmation; Hard keeps the 3-second confirmation countdown.
- "Allow turning off while locked" switch, on by default, for both modes. When on, the lock can be changed or turned off during the lock hours; with a Hard lock the overlay stays but the SpendGuard widget remains available above it. When off, the lock settings are frozen until the lock ends. Turning it off requires the 3-second confirmation countdown.

### Changed

- The previous Interface Lock is now the Hard lock mode. Users who already had it enabled keep it, and like everyone else they can now turn it off during the lock hours unless they disable the new switch.
- While a Normal lock is active, checkout pages show the lock notice instead of the spending warning.
- The loading message now reads "Calculating expenses..." instead of "Reading your orders...".
- The tutorial has a new step that opens the settings panel and explains the time ranges, the Normal and Hard lock modes, and the option to turn the lock off early (7 steps instead of 6). It also describes the spending calculation without the "reading your orders" wording.
- The website's demo video is replaced by generated screenshots of every feature. `screenshots.ps1` regenerates them with headless Chrome from the real UI code, sample data and a neutral mock page, and also produces the 5 Chrome Web Store screenshots (1280x800, 24-bit PNG) in `store/screenshots/`.
- The settings panel is 50% wider on tablet and desktop (300px instead of 200px) so its controls are no longer cramped. The main widget keeps its size.

## [1.0.1] - 2026-03-07

### Fixed

- Pagination now correctly iterates through all order pages by detecting Amazon's next-page button in the DOM, instead of relying on the heuristic `orderCount < 10` that caused premature termination. This was the root cause of both the 30-day and 3-month ranges showing identical (truncated) data.
- Order count now includes cancelled orders and orders with a €0.00 total, matching Amazon's own order count. Previously, only orders with a parsed price greater than zero were counted.

## [1.0.0] - 2026-02-09

### Added

- Initial release.
