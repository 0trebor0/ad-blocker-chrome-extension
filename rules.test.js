const assert = require('node:assert/strict')
const {readFileSync} = require('node:fs')
const {test} = require('node:test')
const {runInNewContext} = require('node:vm')

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'))
const [ruleset] = manifest.declarative_net_request.rule_resources
const rules = JSON.parse(readFileSync(ruleset.path, 'utf8'))

test('manifest enables the packaged blocking ruleset', () => {
    assert.equal(manifest.manifest_version, 3)
    assert.match(manifest.version, /^(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,3}$/)
    assert.deepEqual(manifest.permissions, ['declarativeNetRequest', 'storage', 'activeTab'])
    assert.equal(ruleset.enabled, true)
    assert.equal(rules.length, 1)
    assert.equal(rules[0].id, 1)
    assert.deepEqual(rules[0].action, {type: 'block'})
    assert.ok(readFileSync(manifest.icons[128]).length > 0)
})

test('blocking rule is limited to HTTP and HTTPS and includes top-level navigation', () => {
    const {regexFilter, excludedResourceTypes} = rules[0].condition
    const protocolFilter = new RegExp(regexFilter)
    assert.ok(protocolFilter.test('http://ads.youtube.com:8080/'))
    assert.ok(protocolFilter.test('https://ads.youtube.com/'))
    assert.ok(!protocolFilter.test('wss://ads.youtube.com/'))
    assert.ok(!protocolFilter.test('ftp://ads.youtube.com/'))
    // An explicit exclusion prevents Chrome from defaulting to subresources only.
    assert.deepEqual(excludedResourceTypes, ['websocket'])
})

test('blocklist contains unique plain domains and keeps localhost available', () => {
    const {requestDomains} = rules[0].condition
    const domains = new Set(requestDomains)
    assert.equal(domains.size, requestDomains.length)
    for (const domain of domains) {
        assert.match(domain, /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/)
    }
    assert.ok(domains.has('ads.youtube.com'))
    assert.ok(!domains.has('youtube.com'))
    assert.ok(!domains.has('localhost'))
})


test('page ad blocker applies site-scoped community and local filters', async () => {
    const [contentScript] = manifest.content_scripts
    assert.deepEqual(contentScript.matches, ['http://*/*', 'https://*/*'])
    assert.equal(contentScript.run_at, 'document_start')
    assert.deepEqual(contentScript.js, ['community-filters.js', 'page-ad-blocker.js'])

    const existingSheet = {}
    let matchedElements = 2
    let queriedSelectors
    const document = {
        adoptedStyleSheets: [existingSheet],
        querySelectorAll(selectors) {
            queriedSelectors = selectors
            return {length: matchedElements}
        }
    }
    const CSSStyleSheet = class {
        replaceSync(css) {
            this.css = css
            this.cssRules = css ? [{selectorText: css.split('{')[0].trim()}] : []
        }
    }
    let storageChanged
    let receiveMessage
    const chrome = {
        runtime: {onMessage: {addListener(listener) { receiveMessage = listener }}},
        storage: {
            local: {get: async () => ({
                'ad-filter:example.com:#personal': {hostname: 'example.com', selector: '#personal'},
                'ad-filter:other.example:#other': {hostname: 'other.example', selector: '#other'}
            })},
            onChanged: {addListener(listener) { storageChanged = listener }}
        }
    }
    const community = readFileSync(contentScript.js[0], 'utf8')
    assert.match(community, /const communityFilters = \[/)
    const context = {
        document, CSSStyleSheet, chrome, location: {hostname: 'example.com'},
        communityFilters: [
            {hostname: 'example.com', selector: '#community'},
            {hostname: 'example.com', selector: 'body'},
            {hostname: 'example.com', selector: '#bad, main'}
        ]
    }
    runInNewContext(readFileSync(contentScript.js[1], 'utf8'), context)
    await Promise.resolve()
    assert.equal(document.adoptedStyleSheets.length, 3)
    const savedStyles = document.adoptedStyleSheets[2]
    assert.equal(savedStyles.css, '#community,\n#personal { display: none !important; }')
    receiveMessage({type: 'count-page-ads'}, {}, response => assert.equal(response.count, 2))
    assert.match(queriedSelectors, /ins\.adsbygoogle/)
    assert.match(queriedSelectors, /#community,\s*#personal$/)
    storageChanged({
        'ad-filter:example.com:#personal': {oldValue: {hostname: 'example.com'}}
    }, 'local')
    assert.equal(savedStyles.css, '#community { display: none !important; }')
    matchedElements = 0
    receiveMessage({type: 'count-page-ads'}, {}, response => assert.equal(response.count, 0))
    assert.doesNotMatch(queriedSelectors, /#personal/)
    const logs = []
    context.console = {error(message) { logs.push(message) }}
    document.querySelectorAll = () => { throw new SyntaxError('Invalid selector') }
    receiveMessage({type: 'count-page-ads'}, {}, response => {
        assert.equal(response.count, null)
        assert.equal(response.popupSettingKey, 'ad-popup-setting:example.com')
    })
    assert.deepEqual(logs, ['Could not count page ad elements'])
    assert.equal(document.adoptedStyleSheets[0], existingSheet)
    const adStyles = document.adoptedStyleSheets[1]
    assert.match(adStyles.css, /^\s*ins\.adsbygoogle,\s*\[data-ad-slot\],\s*iframe\[title="Advertisement" i\]\s*\{\s*display: none !important;\s*\}\s*$/)
})

test('picker saves the selected element under its hostname and handles write failures', async () => {
    const body = {}
    class Element {
        constructor(localName, parentElement, previousElementSibling) {
            Object.assign(this, {id: '', localName, parentElement, previousElementSibling})
        }
    }
    const ad = new Element('div', body, new Element('div', body))
    const overlays = []
    const document = {
        body: Object.assign(body, {contains: element => element === ad}),
        documentElement: {append() {}},
        adoptedStyleSheets: [],
        elementsFromPoint: () => [...overlays.filter(element => !element.removed), ad],
        createElement() {
            const element = {style: {}, removed: false}
            element.addEventListener = (event, listener) => { element[event] = listener }
            element.remove = () => { element.removed = true }
            overlays.push(element)
            return element
        }
    }
    let activate
    let saved
    let rejectWrite = false
    const errors = []
    const alerts = []
    const chrome = {
        runtime: {onMessage: {addListener(listener) { activate = listener }}},
        storage: {
            local: {
                get: async () => ({}),
                async set(value) {
                    if (rejectWrite) throw new Error('Storage unavailable')
                    saved = value
                }
            },
            onChanged: {addListener() {}}
        }
    }
    runInNewContext(readFileSync('page-ad-blocker.js', 'utf8'), {
        document, chrome, Element, AbortController, location: {hostname: 'example.com'},
        communityFilters: [],
        window: {addEventListener() {}, alert(message) { alerts.push(message) }},
        console: {error(message) { errors.push(message) }},
        CSSStyleSheet: class { replaceSync() {} }
    })

    const click = {preventDefault() {}, stopImmediatePropagation() {}}
    activate({type: 'pick-ad'}, {}, response => assert.equal(response.active, true))
    await overlays[1].click(click)
    const key = 'ad-filter:example.com:body > div:nth-of-type(2)'
    assert.deepEqual(JSON.parse(JSON.stringify(saved)), {
        [key]: {hostname: 'example.com', selector: 'body > div:nth-of-type(2)'}
    })
    assert.ok(overlays.every(element => element.removed))

    rejectWrite = true
    activate({type: 'pick-ad'}, {}, () => {})
    await overlays[3].click(click)
    assert.deepEqual(errors, ['Could not save ad filter'])
    assert.deepEqual(alerts, ['The ad filter could not be saved.'])
})

test('popup previews a filter and opens GitHub only after confirmation', async () => {
    const key = 'ad-filter:example.com:#ad'
    const filter = {hostname: 'example.com', selector: '#ad'}
    const controls = Object.fromEntries(['filters', 'pick', 'share', 'remove', 'status', 'blocked-request-count', 'page-ad-count', 'block-click-popups', 'site-name', 'share-dialog', 'share-preview', 'confirm-share'].map(id => [
        '#' + id, {addEventListener(event, listener) { this[event] = listener }}
    ]))
    const select = controls['#filters']
    Object.assign(select, {
        value: key, length: 0,
        replaceChildren() { this.length = 0 },
        add() { this.length++ }
    })
    let proposal
    const dialog = controls['#share-dialog']
    dialog.showModal = () => { dialog.open = true }
    const popupSettingKey = 'ad-popup-setting:example.com'
    let storedPopupSetting
    const popup = readFileSync(manifest.action.default_popup, 'utf8')
    assert.match(popup, /<script src="filter-popup\.js" defer><\/script>/)
    runInNewContext(readFileSync('filter-popup.js', 'utf8'), {
        document: {querySelector: id => controls[id]},
        Option: class {},
        URL,
        chrome: {
            storage: {local: {
                get: async () => ({[key]: filter}),
                set: async value => { storedPopupSetting = value[popupSettingKey] }
            }},
            action: {async getBadgeText({tabId}) { assert.equal(tabId, 42); return '14' }},
            tabs: {
                async create({url}) { proposal = new URL(url) },
                async query() { return [{id: 42}] },
                async sendMessage(tabId, message) {
                    assert.equal(tabId, 42)
                    assert.equal(message.type, 'count-page-ads')
                    return {count: 0, popupSettingKey}
                }
            }
        }
    })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(controls['#blocked-request-count'].textContent, '14')
    assert.equal(controls['#page-ad-count'].textContent, 0)
    assert.equal(controls['#site-name'].textContent, 'example.com')
    assert.equal(controls['#pick'].disabled, false)
    const popupToggle = controls['#block-click-popups']
    assert.equal(popupToggle.disabled, false)
    assert.equal(popupToggle.checked, true)
    popupToggle.checked = false
    await popupToggle.change()
    assert.equal(storedPopupSetting, false)
    assert.equal(controls['#share'].disabled, false)
    const handleClose = dialog.close
    dialog.close = () => { dialog.open = false; handleClose() }
    await controls['#share'].click()
    assert.equal(dialog.open, true)
    assert.deepEqual(JSON.parse(controls['#share-preview'].textContent), filter)
    assert.equal(proposal, undefined)
    dialog.close()
    await controls['#confirm-share'].click()
    assert.equal(proposal, undefined)
    await controls['#share'].click()
    await controls['#confirm-share'].click()
    assert.equal(dialog.open, false)
    assert.equal(proposal.origin, 'https://github.com')
    assert.equal(proposal.pathname, '/0trebor0/ad-blocker-chrome-extension/issues/new')
    assert.equal(proposal.searchParams.get('title'), 'Community ad filter for example.com')
    assert.match(proposal.searchParams.get('body'), /"selector": "#ad"/)
})

test('service worker enables Chrome request count badge and reports setup errors', async () => {
    let onInstalled
    let options
    let rejectUpdates = false
    const errors = []
    const chrome = {
        runtime: {onInstalled: {addListener(listener) { onInstalled = listener }}},
        declarativeNetRequest: {
            async setExtensionActionOptions(value) {
                if (rejectUpdates) throw new Error('Badge unavailable')
                options = value
            }
        }
    }
    runInNewContext(readFileSync(manifest.background.service_worker, 'utf8'), {
        chrome,
        console: {error(message) { errors.push(message) }}
    })
    await onInstalled()
    assert.equal(options.displayActionCountAsBadgeText, true)
    rejectUpdates = true
    await onInstalled()
    assert.deepEqual(errors, ['Could not enable the blocked request badge'])
})

test('pop-ups are blocked by default and a site exception permits click-triggered windows', async () => {
    const [pageScript, settingsScript, popupScript] = manifest.content_scripts
    assert.equal(settingsScript.all_frames, true)
    assert.equal(settingsScript.run_at, 'document_start')
    assert.deepEqual(popupScript.matches, pageScript.matches)
    assert.equal(popupScript.run_at, 'document_start')
    assert.equal(popupScript.all_frames, true)
    assert.equal(popupScript.world, 'MAIN')

    const calls = []
    const result = {}
    const nativeError = new TypeError('Native open failed')
    const window = {
        open(...args) {
            if (args[0] === 'error') throw nativeError
            calls.push({receiver: this, args})
            return result
        }
    }
    const navigator = {userActivation: {isActive: false}}
    const document = new EventTarget()
    const key = 'ad-popup-setting:example.com'
    let storageChanged
    let loadedKey
    let completeLoad
    const storedSettings = new Promise(resolve => { completeLoad = resolve })
    const chrome = {
        storage: {
            local: {get(setting) { loadedKey = setting; return storedSettings }},
            onChanged: {addListener(listener) { storageChanged = listener }}
        }
    }
    const location = {origin: 'https://third-party.example', ancestorOrigins: ['https://example.com']}
    runInNewContext(readFileSync(settingsScript.js[0], 'utf8'), {chrome, document, location, CustomEvent, URL})
    assert.deepEqual(popupScript.js, ['popup-blocker.js'])
    runInNewContext(readFileSync(popupScript.js[0], 'utf8'), {window, navigator, document, Event})
    assert.equal(loadedKey, key)

    assert.equal(window.open(), null)
    assert.equal(window.open('/ad', '_blank'), null)
    assert.equal(window.open('/ad', 'advertisement'), null)
    assert.equal(calls.length, 0)
    for (const target of ['_SELF', '_parent', '_top', '_unfencedTop']) {
        assert.equal(window.open('/next', target), result)
    }

    navigator.userActivation.isActive = true
    assert.equal(window.open('/ad', '_blank'), null)
    completeLoad({})
    await storedSettings
    assert.equal(window.open('/ad', '_blank'), null)
    assert.equal(window.open('/navigate', '_self'), result)

    storageChanged({[key]: {newValue: false}}, 'local')
    assert.equal(window.open('/login', '_blank', 'popup'), result)
    assert.deepEqual(calls.at(-1), {receiver: window, args: ['/login', '_blank', 'popup']})
    assert.throws(() => window.open('error'), error => error === nativeError)
    navigator.userActivation.isActive = false
    assert.equal(window.open('/ad', '_blank'), null)

    navigator.userActivation.isActive = true
    storageChanged({[key]: {}}, 'local')
    assert.equal(window.open('/ad', '_blank'), null)
})

test('popup counts matching requests when badge text is unavailable', async () => {
    const source = readFileSync('filter-popup.js', 'utf8')
    for (const {badgeText, matches, expected} of [
        {badgeText: '', matches: 0, expected: 0},
        {badgeText: '?', matches: 5, expected: 5},
        {badgeText: new Error('Badge unavailable'), matches: 7, expected: 7},
        {badgeText: '?', matches: new Error('Rules unavailable'), expected: '—'}
    ]) {
        const controls = new Map()
        const document = {
            querySelector(selector) {
                const control = {
                    textContent: '—',
                    addEventListener() {},
                    replaceChildren() {},
                    add() {},
                    length: 0
                }
                controls.set(selector, control)
                return control
            }
        }
        let resolvePage
        const pageResponse = new Promise(resolve => { resolvePage = resolve })
        const errors = []
        const chrome = {
            action: {
                async getBadgeText() {
                    if (badgeText instanceof Error) throw badgeText
                    return badgeText
                }
            },
            declarativeNetRequest: {
                async getMatchedRules({tabId}) {
                    assert.equal(tabId, 42)
                    if (matches instanceof Error) throw matches
                    return {rulesMatchedInfo: Array(matches).fill({rule: {ruleId: 1}})}
                }
            },
            tabs: {
                async query() { return [{id: 42}] },
                async sendMessage() {
                    return pageResponse
                }
            },
            storage: {local: {async get() { return {} }}}
        }
        runInNewContext(source, {
            document, chrome, Option: class {},
            console: {error(message) { errors.push(message) }}
        })
        await new Promise(resolve => setImmediate(resolve))
        assert.equal(controls.get('#blocked-request-count').textContent, expected)
        assert.equal(controls.get('#page-ad-count').textContent, '—')
        assert.deepEqual(errors, matches instanceof Error ? ['Could not read the blocked request count'] : [])

        resolvePage({count: 3, popupSettingKey: 'ad-popup-setting:example.com'})
        await new Promise(resolve => setImmediate(resolve))
        assert.equal(controls.get('#page-ad-count').textContent, 3)
        assert.equal(controls.get('#block-click-popups').disabled, false)
    }
})
