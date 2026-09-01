# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Spending limit lock (#15): a configurable 30-day spending limit that locks Amazon behind the existing full-screen overlay once the limit is reached, blocking checkout as well as browsing. Disabled by default, and inactive until an amount above zero is set. Enabling it requires the same countdown confirmation as the interface lock.

## [1.0.1] - 2026-03-07

### Fixed

- Pagination now correctly iterates through all order pages by detecting Amazon's next-page button in the DOM, instead of relying on the heuristic `orderCount < 10` that caused premature termination. This was the root cause of both the 30-day and 3-month ranges showing identical (truncated) data.
- Order count now includes cancelled orders and orders with a €0.00 total, matching Amazon's own order count. Previously, only orders with a parsed price greater than zero were counted.

## [1.0.0] - 2026-02-09

### Added

- Initial release.
