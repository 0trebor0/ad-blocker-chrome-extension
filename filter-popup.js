const filters = document.querySelector('#filters')
const pick = document.querySelector('#pick')
const share = document.querySelector('#share')
const remove = document.querySelector('#remove')
const status = document.querySelector('#status')
const blockedRequestCount = document.querySelector('#blocked-request-count')
const pageAdCount = document.querySelector('#page-ad-count')
const blockClickPopups = document.querySelector('#block-click-popups')
const siteName = document.querySelector('#site-name')
const shareDialog = document.querySelector('#share-dialog')
const sharePreview = document.querySelector('#share-preview')
const confirmShare = document.querySelector('#confirm-share')
let popupSettingKey
let pendingShare

async function showBlockedRequestCount(tabId) {
    let badgeText
    try {
        badgeText = await chrome.action.getBadgeText({tabId})
        if (/^\d+\+?$/.test(badgeText)) {
            blockedRequestCount.textContent = badgeText
            return
        }
    } catch {
        // Some browsers do not expose the automatic action badge.
    }

    try {
        // Every rule in the bundled ruleset blocks its matching request.
        const {rulesMatchedInfo} = await chrome.declarativeNetRequest.getMatchedRules({tabId})
        blockedRequestCount.textContent = rulesMatchedInfo.length
    } catch (error) {
        if (badgeText === '') blockedRequestCount.textContent = '0'
        else console.error('Could not read the blocked request count', error)
    }
}

async function showTabStats() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
        if (tab?.id == null) {
            siteName.textContent = 'Unavailable on this tab'
            return
        }
        showBlockedRequestCount(tab.id)
        const response = await chrome.tabs.sendMessage(tab.id, {type: 'count-page-ads'})
        pageAdCount.textContent = response?.count ?? '—'
        popupSettingKey = response?.popupSettingKey
        siteName.textContent = popupSettingKey ? popupSettingKey.slice('ad-popup-setting:'.length) : 'Unavailable on this tab'
        pick.disabled = !popupSettingKey
        if (popupSettingKey) {
            const settings = await chrome.storage.local.get(popupSettingKey)
            blockClickPopups.checked = settings[popupSettingKey] !== false
            blockClickPopups.disabled = false
        }
    } catch {
        // Chrome does not allow content scripts on every tab.
        if (!popupSettingKey) siteName.textContent = 'Unavailable on this tab'
    }
}

async function showFilters() {
    try {
        const previouslySelected = filters.value
        const items = await chrome.storage.local.get(null)
        filters.replaceChildren()
        for (const [key, filter] of Object.entries(items)) {
            if (!key.startsWith('ad-filter:')) continue
            filters.add(new Option(filter.hostname + ' — ' + filter.selector, key))
        }
        if (Object.hasOwn(items, previouslySelected)) filters.value = previouslySelected
        const hasFilters = filters.length > 0
        filters.disabled = share.disabled = remove.disabled = !hasFilters
        if (!hasFilters) filters.add(new Option('No saved filters', ''))
    } catch (error) {
        console.error('Could not read ad filters', error)
        filters.replaceChildren(new Option('Filters unavailable', ''))
        filters.disabled = share.disabled = remove.disabled = true
        status.textContent = 'Could not read saved filters.'
    }
}

pick.addEventListener('click', async () => {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
        const response = await chrome.tabs.sendMessage(tab.id, {type: 'pick-ad'})
        if (!response?.active) throw new Error('Picker did not activate')
        window.close()
    } catch (error) {
        console.error('Could not start ad picker', error)
        status.textContent = 'Refresh the page and try again on an HTTP or HTTPS tab.'
    }
})

remove.addEventListener('click', async () => {
    try {
        await chrome.storage.local.remove(filters.value)
        await showFilters()
    } catch (error) {
        console.error('Could not remove ad filter', error)
        status.textContent = 'Could not remove the selected filter.'
    }
})

share.addEventListener('click', async () => {
    share.disabled = true
    status.textContent = ''
    try {
        const key = filters.value
        const {[key]: filter} = await chrome.storage.local.get(key)
        if (!filter) throw new Error('Filter no longer exists')
        pendingShare = {hostname: filter.hostname, selector: filter.selector}
        sharePreview.textContent = JSON.stringify(pendingShare, null, 2)
        shareDialog.showModal()
    } catch (error) {
        console.error('Could not preview community filter', error)
        status.textContent = 'Could not preview the selected filter.'
    } finally {
        share.disabled = !filters.value
    }
})

confirmShare.addEventListener('click', async () => {
    if (!pendingShare) return
    confirmShare.disabled = true
    try {
        const issue = new URL('https://github.com/0trebor0/ad-blocker-chrome-extension/issues/new')
        issue.searchParams.set('title', 'Community ad filter for ' + pendingShare.hostname)
        issue.searchParams.set('body', 'Proposed cosmetic filter\n\n```json\n' +
            JSON.stringify(pendingShare, null, 2) + '\n```\n\nWhat does this filter hide?\n')
        await chrome.tabs.create({url: issue.href})
        shareDialog.close()
    } catch (error) {
        console.error('Could not open community filter draft', error)
        shareDialog.close()
        status.textContent = 'Could not open the GitHub draft.'
    } finally {
        confirmShare.disabled = false
    }
})

shareDialog.addEventListener('close', () => {
    pendingShare = undefined
})

blockClickPopups.addEventListener('change', async () => {
    const enabled = blockClickPopups.checked
    blockClickPopups.disabled = true
    try {
        await chrome.storage.local.set({[popupSettingKey]: enabled})
        status.textContent = ''
    } catch (error) {
        console.error('Could not update pop-up blocking', error)
        blockClickPopups.checked = !enabled
        status.textContent = 'Could not update pop-up blocking.'
    } finally {
        blockClickPopups.disabled = false
    }
})

showTabStats()
showFilters()
