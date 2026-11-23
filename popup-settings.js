{
    const ancestorOrigins = location.ancestorOrigins
    const topOrigin = ancestorOrigins[ancestorOrigins.length - 1] || location.origin
    if (/^https?:\/\//.test(topOrigin)) {
        const site = new URL(topOrigin).hostname
        const key = 'ad-popup-setting:' + site
        let enabled = true
        let changedWhileLoading = false

        function publishSetting() {
            document.dispatchEvent(new CustomEvent('ad-blocker-popup-setting', {detail: enabled}))
        }

        document.addEventListener('ad-blocker-popup-ready', publishSetting)
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !Object.hasOwn(changes, key)) return
            changedWhileLoading = true
            enabled = changes[key].newValue !== false
            publishSetting()
        })

        chrome.storage.local.get(key).then(settings => {
            if (changedWhileLoading) return
            enabled = settings[key] !== false
            publishSetting()
        }).catch(error => console.error('Could not load pop-up blocking preferences', error))
    }
}
