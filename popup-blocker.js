// The page and its scripts must use the same window.open wrapper.
{
    let blockClickPopups = true
    document.addEventListener('ad-blocker-popup-setting', event => {
        blockClickPopups = event.detail !== false
    })
    document.dispatchEvent(new Event('ad-blocker-popup-ready'))
    window.open = new Proxy(window.open, {
        apply(open, receiver, args) {
            const target = typeof args[1] === 'string' ? args[1].toLowerCase() : ''
            // These targets navigate an existing browsing context.
            if (['_self', '_parent', '_top', '_unfencedtop'].includes(target)) {
                return Reflect.apply(open, receiver, args)
            }
            if (blockClickPopups || !navigator.userActivation.isActive) return null

            return Reflect.apply(open, receiver, args)
        }
    })
}
