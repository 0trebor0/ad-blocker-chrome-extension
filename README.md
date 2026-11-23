# Ad Blocker for Chrome

Ad Blocker blocks HTTP and HTTPS requests to the domains bundled in `rules.json` and their subdomains. This includes requests for page resources and direct navigation to a listed domain. On HTTP and HTTPS pages, the content script also hides elements marked as Google ads, ad slots, or iframes titled Advertisement. The same selectors apply to elements added after load. Unmarked ads served from unlisted domains can still appear.

## Install from source

1. Download the repository as a ZIP file and extract it, or clone it.
2. Open `chrome://extensions` in Chrome 111 or later.
3. Enable **Developer mode**, click **Load unpacked**, and select the folder containing `manifest.json`.

If a site stops working, you can temporarily disable the extension from `chrome://extensions`.

## Block scripted pop-ups

On HTTP and HTTPS pages and frames, the extension blocks scripted attempts to open new tabs or windows by default, including attempts triggered by a click. Turn off **Block scripted pop-ups after clicks on this site** in the extension popup if you need a scripted sign-in or payment window. Existing site exceptions are preserved. Direct links that open a new tab still work. Pick an ad to hide an overlay inside the page.

## See blocking counts

Pin the extension to see the number of blocked network requests for the active tab on its toolbar badge. Open the popup to see how many page elements currently match an ad filter. Each matching element is counted once, even when several filters match it. An ad can involve multiple requests and elements. Scripted pop-ups blocked before a request starts do not contribute to either count.

## Pick and share an ad filter

1. On the page with the ad, open the extension and click **Pick an ad**.
2. Hover to see the target outline, then click the element to hide it. Press Esc to cancel. The filter applies to the same hostname on this Chrome profile and survives reloads. Use **Remove** in the popup if it hides the wrong element.
3. To propose a filter for the community list, select it in the popup and click **Share to community**. GitHub opens a draft with the hostname and selector. Check both for personal information before opening the draft and again before submitting it.

Maintainers can test proposals and add approved entries to `community-filters.js`. The list ships with the extension, so users receive approved filters when they update. Layout changes can make filters based on element position stop matching or hide a different element.

## Maintain the blocklist

The initial Manifest V3 list was migrated from the repository's previous `blockedsites.js`. The repository does not identify an upstream source. To update the list, edit the `requestDomains` array in `rules.json`. Use lowercase domain names without schemes, paths, or wildcards. A parent domain also covers its subdomains. Keep localhost available for local development.

Run `node --test rules.test.js` from the repository root, then reload the unpacked extension and check Chrome's extension page for errors. To see page hiding, refresh an HTTP or HTTPS tab, then insert an element with a `data-ad-slot` attribute in DevTools and check that its computed display is `none`.
