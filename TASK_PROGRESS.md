# Task progress

## 2026-11-23

- Objective. Restore current Chrome compatibility, preserve domain matching, and clean up and document the blocklist.
- Inspected AGENTS.md, README.md, CHANGELOG.md, TASK_PROGRESS.md, manifest.json, script.js, blockedsites.js, the logo.PNG reference, and local branch history. Main matches cached origin/main. GitHub DNS failure prevented checking open pull requests.
- Converted the manifest and added rules.json. All 12,149 legacy entries matched the expected wildcard format. Nine duplicates and localhost were excluded, leaving 12,139 unique domains.
- Completed. Updated manifest.json and README.md, added rules.json and rules.test.js, deleted script.js and blockedsites.js, and updated CHANGELOG.md and TASK_PROGRESS.md. The static rule covers HTTP and HTTPS requests, including navigation, and removes per-request URL logging. Version 1.2 follows Chrome's version format.
- Tests added. Three Node tests cover manifest and ruleset wiring, scheme and resource filters, and blocklist integrity.
- Verification. Node v26.13.1 syntax check passed. Node reported 3 passed and 0 failed. Both JSON files parsed during the tests. A separate comparison with HEAD verified every retained domain in original order. Git flagged a mixed line ending in README.md. Normalizing changed text files to LF resolved it, and whitespace checks passed.
- Limitations. No Chrome or Chromium command was available on PATH. Unpacked installation, Chrome ruleset validation, and live matching remain unverified. The site pause popup was deferred to a follow-up. The legacy list has no identified upstream source.

## Page ad hiding

- Objective. Add a JavaScript content script that hides marked ad elements, including elements inserted after load.
- Inspected manifest.json, rules.json, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, and repository status and branches. GitHub DNS failure prevented checking open pull requests.
- Added page-ad-blocker.js. Updated manifest.json, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No files were deleted for this change.
- Chrome loads the content script at document start on HTTP and HTTPS pages. It adopts a stylesheet for explicit ad markers, so Chrome applies the same selectors to later DOM updates. The network rules were left intact.
- Added one Node test that exercises manifest registration and stylesheet adoption with mocked browser APIs, including preservation of existing stylesheets.
- Verification. Both JavaScript files passed node --check on Node v26.13.1. node --test rules.test.js reported 4 passed, 0 failed, including manifest and rules JSON parsing. Git diff --check and direct whitespace checks passed.
- Limits. Chrome and Chromium were unavailable on PATH. Live injection, selector matching, and page layout were not checked in a browser. Unmarked ads are outside the selectors.

## Saved and community filters

- Added picker and local filter application to page-ad-blocker.js. Added filter-popup.html, filter-popup.js, and community-filters.js, and registered them in manifest.json.
- Objective and status. Implemented local site-specific ad picking, removal, and GitHub proposals for a maintainer-curated bundled community list. The community list starts empty and ships with extension updates.
- Inspected manifest.json, page-ad-blocker.js, rules.json, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, git status, and local branches. GitHub DNS failure prevented checking remote pull requests.
- Also updated rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No files were removed in this task. Prior migration changes remain in the working tree.
- Tests. Updated the stylesheet test for site isolation, selector validation, and removal. Added picker save and write failure coverage and a test for the prefilled GitHub proposal. Initial mocks omitted the standard empty element ID and checked popup initialization too early. Corrected the mocks and all six tests passed.
- Verification. Node v26.13.1 syntax checks passed for the four edited JavaScript files. Node reported 6 passed, 0 failed. Manifest and rules JSON parsed, popup script reference matched, and whitespace checks passed.
- Limitations. Live Chrome interaction and the issue form were not verified. GitHub repository issue availability could not be confirmed. Position-based selectors can become stale after layout changes.

## Blocking counts

- Objective and status. Added a per-tab toolbar badge for blocked network requests and a popup count of elements currently matching page ad filters.
- Inspected AGENTS.md instructions, manifest.json, page-ad-blocker.js, filter-popup.html, filter-popup.js, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, and local branch and working tree status. GitHub DNS failure prevented checking remote pull requests. Existing generated _metadata was left alone.
- Created badge.js and updated manifest.json, page-ad-blocker.js, filter-popup.html, filter-popup.js, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No files were removed for this task.
- Tests. Added badge setup and failure coverage and expanded the page and popup tests for count queries, zero results, and selector failures.
- Verification. Node v26.13.1 syntax checks passed for all four edited JavaScript files. Node reported 7 passed, 0 failed, including JSON parsing and popup wiring. Git diff and direct whitespace checks passed.
- Limitations. Live Chrome behavior was not exercised. The page count is a snapshot when the popup opens, covers the top-level document, and is unavailable on tabs where the content script cannot run. Request and element counts can overlap.

## Unsolicited pop-ups

- Objective and status. Added a document-start wrapper for window.open to block unsolicited scripted tabs and windows on HTTP and HTTPS pages and frames.
- Inspected manifest.json, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, and local worktree and branches. Remote pull requests could not be checked due to GitHub DNS failure.
- Added popup-blocker.js and updated manifest.json, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. The main-world script raises the Chrome minimum to 111. No files were deleted in this task.
- Added a test for manifest wiring, suppressed automatic calls, unchanged forwarding with an active gesture or existing-context target, and native exception propagation. Node v26.13.1 reported 8 passed and 0 failed. Both edited JavaScript files passed node --check. JSON parsing and whitespace checks passed.
- Limitations. No live Chrome smoke test was performed. Calls during active gestures can still open windows. The wrapper covers window.open in matching frames, and these blocks do not contribute to the request or page counts.

## Click-triggered pop-ups

- Objective and status. User confirmed that clicks open unwanted tabs or windows. Added an opt-in per-hostname setting that blocks scripted new windows despite active user gestures, including from matching frames embedded on the site.
- Inspected manifest.json, popup-blocker.js, page-ad-blocker.js, filter-popup.js, filter-popup.html, rules.test.js, rules.json references, README.md, CHANGELOG.md, TASK_PROGRESS.md, and working tree status. Earlier GitHub DNS failure prevented remote pull request verification.
- Added popup-settings.js. Updated popup-blocker.js, page-ad-blocker.js, filter-popup.js, filter-popup.html, manifest.json, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No files removed.
- Tests. Updated existing popup and blocker tests for storing the setting, applying it in an embedded frame, and restoring native behavior when disabled. Node v26.13.1 reported 8 passed and 0 failed. JavaScript syntax, manifest and rules JSON parsing, and whitespace checks passed.
- Limitations. The site's URL and exact page behavior were not supplied. No live Chrome test was performed. The new option covers window.open in matching documents and can also suppress legitimate scripted windows.

## Learn from quickly closed pop-ups

- Objective and status. Implemented automatic, profile-local learning for scripted HTTP/HTTPS pop-ups closed within two seconds and a site-specific reset.
- Inspected manifest.json, badge.js, popup-blocker.js, popup-settings.js, filter-popup.js, filter-popup.html, page-ad-blocker.js response references, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, and local branches. GitHub DNS failure prevented checking remote pull requests.
- Added popup-learning.js and popup-url.js. Updated badge.js, manifest.json, popup-blocker.js, popup-settings.js, filter-popup.js, filter-popup.html, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No files were removed.
- Added one timing test for the two-second boundary, late closure, ordinary navigation, parent-window closure, event ordering, storage errors, and reset. Expanded tests for learned matching, query normalization, popup reset, and wiring.
- Verification. Node v26.13.1 syntax checks passed for all edited JavaScript. Node tests reported 9 passed and 0 failed, including JSON parsing. Git diff and direct whitespace checks passed.
- Limitations. Chrome does not identify who closed a tab, so a quickly self-closing pop-up can also be learned. Blank initial destinations and ordinary links are outside the algorithm. Live Chrome behavior was not verified.

## Default pop-up blocking without learning

- Objective and status. Enabled scripted pop-up blocking by default and removed the learning algorithm and its reset control. Explicit site exceptions still apply.
- Inspected manifest.json, badge.js, popup-blocker.js, popup-settings.js, popup-learning.js, popup-url.js, filter-popup.js, filter-popup.html, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, and repository status and branches. GitHub DNS failure prevented checking remote pull requests.
- Removed popup-learning.js and popup-url.js. Updated manifest.json, badge.js, popup-blocker.js, popup-settings.js, filter-popup.js, filter-popup.html, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. Removed the webNavigation permission.
- Tests. Removed the obsolete learning test and updated popup tests to cover default blocking before and after storage loads, the per-site exception, and reversion to the default. Node v26.13.1 reported 8 passed, 0 failed. JavaScript syntax, JSON parsing, and whitespace checks passed.
- Limitations. Live Chrome behavior was not verified. Previously learned values may remain in profile storage, but the extension no longer reads or applies them. Direct links that open new tabs continue to work.

## Chrome Web Store preparation and debugging

- Reviewed the manifest, popup, page content script, rules tests, icon, listing requirements, and package references.
- Updated page-ad-blocker.js to include the site preference key when counting fails. Updated rules.test.js, CHANGELOG.md, and TASK_PROGRESS.md. No files added or removed.
- The new regression assertion initially failed because the preference key was missing. After the fix, Node v26.13.1 reported 8 passed and 0 failed. All JavaScript passed syntax checks. A package inspection confirmed ten runtime files and a 100 by 100 PNG icon. Whitespace checks passed.
- Still pending. The store requires a 128 by 128 listing icon. The package was not uploaded, and live Chrome testing was not performed.

## Popup redesign and project review

- Objective and status. Completed the popup redesign and repository review. Updated filter-popup.html, filter-popup.js, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No files were added or deleted.
- Inspected the manifest, popup files and tests, background worker, network rules, page and pop-up filtering scripts, community filter list, docs, icon dimensions, and Git state. Main matches cached origin/main. GitHub DNS failure prevented checking open pull requests.
- Review findings. Fixed sharing so the hostname and selector are previewed and confirmed before GitHub receives them. The page-world pop-up preference still uses a page-visible event and should be treated as best effort. The listing icon is 100 by 100 and the legacy blocklist has no documented upstream source.
- Tests. Updated the popup test for the active hostname, page controls, confirmation, cancellation, and exact shared fields. Node v26.13.1 reported 8 passed, 0 failed. All project JavaScript passed node --check. Manifest and rule JSON parsed. Popup control IDs, packaged assets, and whitespace checks passed.
- Limitations. Live Chrome interaction and visual layout were not verified. Store assets and privacy documentation are still pending.

## Show the toolbar count in the popup

- Completed. The popup reads the active tab badge as its primary blocked-request count and keeps the page element count separately labeled.
- Inspected manifest.json, badge.js, filter-popup.html, filter-popup.js, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, local branches, and Chromium badge permission tests. GitHub DNS failure prevented checking pull requests.
- Updated manifest.json, filter-popup.html, filter-popup.js, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. Added activeTab to read badge text on user invocation. No files were added or removed.
- Updated the popup test for 14 blocked requests and 0 page matches. Added coverage for empty badge text, placeholder, and API errors. Node v26.13.1 reported 9 passed, 0 failed. Syntax, JSON, and whitespace checks passed.
- A PowerShell smart quote caused a documentation command to fail before writing files. Removed the smart quote and reran verification.
- The popup reads a snapshot when opened. Live Chrome behavior was not verified.

## Debug the blocked request count

- Completed. Request count initialization now runs independently of the content script response and falls back to matched blocking requests for the active tab when badge text cannot be read.
- Inspected manifest.json, badge.js, rules.json, filter-popup.js, rules.test.js, README.md, CHANGELOG.md, TASK_PROGRESS.md, and local branches. GitHub DNS failure prevented the remote pull request check.
- Updated filter-popup.js, rules.test.js, README.md, CHANGELOG.md, and TASK_PROGRESS.md. No permissions changed and no files were added or removed.
- Expanded the popup test for empty and unavailable badge text, fallback results and errors, and a delayed content script response. Node reported 9 passed and 0 failed. JavaScript syntax, JSON parsing, and whitespace checks passed.
- Limitation. No Chrome, Chromium, or Edge executable was found on PATH. The reported failure was not reproduced in a live browser. If both count APIs are unavailable, the popup can still show a dash.
