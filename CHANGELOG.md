# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Spending limit lock (#15): a configurable 30-day spending limit that locks Amazon behind the existing full-screen overlay once the limit is reached, blocking checkout as well as browsing. Disabled by default, and inactive until an amount above zero is set. Enabling it requires the same countdown confirmation as the interface lock.
- Spending limit modes: over the limit, buying is blocked by default - buy controls are disabled while browsing and spend tracking keep working - and this can be escalated to blocking Amazon entirely. Checkout is locked outright in either mode.
- Spending limit window: the limit can be measured over the rolling last 30 days (default) or over the current calendar month, which resets on the 1st. Month to date is computed during the existing 30 day scrape, so only aggregate totals are stored and no per-order data is kept. Order dates are read from the rendered text, since Amazon exposes no machine readable date; month names come from Intl, and a purely numeric date is read using the locale's own field order so that 3/4 and 4.3 resolve correctly per region.

### Fixed

- The widget status footer reported "Lock not configured" even when a spending limit was configured; it now lists whichever of the two are set.
- The checkout banner labelled the 30 day figure as "This month", which is wrong and now collides with the real calendar month option.

## [1.0.1] - 2026-03-07

### Fixed

- Pagination now correctly iterates through all order pages by detecting Amazon's next-page button in the DOM, instead of relying on the heuristic `orderCount < 10` that caused premature termination. This was the root cause of both the 30-day and 3-month ranges showing identical (truncated) data.
- Order count now includes cancelled orders and orders with a €0.00 total, matching Amazon's own order count. Previously, only orders with a parsed price greater than zero were counted.

## [1.0.0] - 2026-02-09

### Added

- Initial release.
