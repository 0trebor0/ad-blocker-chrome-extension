# Changelog

## Unreleased

### Added

- Block scripted pop-ups triggered by clicks by default, with a per-site exception for sites that need them.

- Block scripted pop-up tabs and windows from web pages without an active user gesture. Requires Chrome 111 or later.

- Show blocked requests on the toolbar badge and matching page elements in the popup.

- Pick elements to hide per site, manage saved filters, and propose filters for the curated community list through GitHub.

- Hide explicitly marked ad elements on web pages, including ads inserted after the page loads.

### Changed

- Redesigned the popup to show the active site, ad matches, controls, and saved filters more clearly.

- Migrated request blocking to Manifest V3 so the extension can load on current Chrome.
- Removed duplicate blocklist entries and stopped blocking localhost so local development sites remain accessible.
- Replaced the legacy request listener with a bundled ruleset, removing per-request URL logging.
- Updated the installation and blocklist maintenance instructions.

### Fixed

- Fall back to the matched request count when the browser cannot expose the toolbar badge text.

- Show the toolbar badge’s blocked request count in the popup alongside page ad matches.

- Preview and confirm community filter data before opening its GitHub draft.

- Keep the site pop-up setting available if counting page ad elements fails.
