chrome.runtime.onInstalled.addListener(async () => {
    try {
        await chrome.declarativeNetRequest.setExtensionActionOptions({
            displayActionCountAsBadgeText: true
        })
    } catch (error) {
        console.error('Could not enable the blocked request badge', error)
    }
})
