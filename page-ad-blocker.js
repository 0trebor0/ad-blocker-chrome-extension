// A stylesheet also matches ads added after load without rescanning the page.
const adStyles = new CSSStyleSheet()
adStyles.replaceSync(`
    ins.adsbygoogle,
    [data-ad-slot],
    iframe[title="Advertisement" i] {
        display: none !important;
    }
`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, adStyles]

const savedAdStyles = new CSSStyleSheet()
document.adoptedStyleSheets = [...document.adoptedStyleSheets, savedAdStyles]

const filterKeyPrefix = 'ad-filter:'
const popupSettingKey = 'ad-popup-setting:' + location.hostname
const validSelector = /^(?:body|#[A-Za-z][\w-]*)(?: > [a-z][a-z0-9-]*:nth-of-type\([1-9][0-9]*\))*$/
const localFilters = new Map()
let changedWhileLoading = new Set()
const communitySelectors = communityFilters
    .filter(filter => filter.hostname === location.hostname)
    .map(filter => filter.selector)

function applySavedFilters() {
    const selectors = [...new Set([...communitySelectors, ...localFilters.values()])]
        .filter(selector => selector !== 'body' && validSelector.test(selector))
    savedAdStyles.replaceSync(selectors.length ? selectors.join(',\n') + ' { display: none !important; }' : '')
}

function loadSavedFilters() {
    chrome.storage.local.get(null).then(items => {
        for (const [key, filter] of Object.entries(items)) {
            if (key.startsWith(filterKeyPrefix) && !changedWhileLoading.has(key) && filter.hostname === location.hostname) {
                localFilters.set(key, filter.selector)
            }
        }
        applySavedFilters()
    }).catch(error => {
        console.error('Could not load saved ad filters', error)
    }).finally(() => {
        changedWhileLoading = null
    })
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return

    for (const [key, {oldValue, newValue}] of Object.entries(changes)) {
        if (!key.startsWith(filterKeyPrefix)) continue
        changedWhileLoading?.add(key)
        if (oldValue?.hostname === location.hostname) localFilters.delete(key)
        if (newValue?.hostname === location.hostname) localFilters.set(key, newValue.selector)
    }
    applySavedFilters()
})
applySavedFilters()
loadSavedFilters()

function selectorFor(element) {
    const segments = []
    while (element && element !== document.body) {
        if (/^[A-Za-z][\w-]*$/.test(element.id)) {
            const idSelector = '#' + element.id
            if (document.querySelectorAll(idSelector).length === 1) {
                return [idSelector, ...segments].join(' > ')
            }
        }

        const tag = element.localName
        if (!/^[a-z][a-z0-9-]*$/.test(tag)) return null
        let position = 1
        for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            if (sibling.localName === tag) position++
        }
        segments.unshift(tag + ':nth-of-type(' + position + ')')
        element = element.parentElement
    }
    return element === document.body && segments.length ? ['body', ...segments].join(' > ') : null
}

let picker
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === 'count-page-ads') {
        try {
            const selectors = [...adStyles.cssRules, ...savedAdStyles.cssRules]
                .map(rule => rule.selectorText)
                .join(', ')
            respond({count: document.querySelectorAll(selectors).length, popupSettingKey})
        } catch (error) {
            console.error('Could not count page ad elements', error)
            respond({count: null, popupSettingKey})
        }
        return
    }

    if (message.type !== 'pick-ad') return
    picker?.abort()
    picker = new AbortController()
    const {signal} = picker
    const outline = document.createElement('div')
    outline.style.cssText = 'position: fixed !important; pointer-events: none !important; z-index: 2147483647 !important; outline: 2px solid #d62828 !important; background: #d6282820 !important; display: none;'
    const surface = document.createElement('div')
    surface.style.cssText = 'position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; cursor: crosshair !important; background: transparent !important;'
    document.documentElement.append(surface, outline)
    signal.addEventListener('abort', () => {
        outline.remove()
        surface.remove()
    }, {once: true})

    function targetAt(event) {
        return document.elementsFromPoint(event.clientX, event.clientY)
            .find(element => element !== surface && element !== outline)
    }

    surface.addEventListener('pointermove', event => {
        const target = targetAt(event)
        if (!(target instanceof Element) || target === document.body || target === document.documentElement) {
            outline.style.display = 'none'
            return
        }
        const bounds = target.getBoundingClientRect()
        outline.style.display = 'block'
        outline.style.left = bounds.left + 'px'
        outline.style.top = bounds.top + 'px'
        outline.style.width = bounds.width + 'px'
        outline.style.height = bounds.height + 'px'
    }, {capture: true, signal})

    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') picker.abort()
    }, {capture: true, signal})

    surface.addEventListener('click', async event => {
        event.preventDefault()
        event.stopImmediatePropagation()
        const target = targetAt(event)
        picker.abort()
        if (!(target instanceof Element) || !document.body?.contains(target) || target === document.body) return
        const selector = selectorFor(target)
        if (!selector || selector.length > 1000) {
            window.alert('This element does not have a shareable selector.')
            return
        }

        const hostname = location.hostname
        const key = filterKeyPrefix + hostname + ':' + selector
        try {
            await chrome.storage.local.set({[key]: {hostname, selector}})
        } catch (error) {
            console.error('Could not save ad filter', error)
            window.alert('The ad filter could not be saved.')
        }
    }, {capture: true, signal})

    respond({active: true})
})
