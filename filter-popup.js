const filters = document.querySelector('#filters')
const pick = document.querySelector('#pick')
const share = document.querySelector('#share')
const remove = document.querySelector('#remove')
const status = document.querySelector('#status')
const pageAdCount = document.querySelector('#page-ad-count')
const blockClickPopups = document.querySelector('#block-click-popups')
let popupSettingKey

async function showPageAdCount() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
        const response = await chrome.tabs.sendMessage(tab.id, {type: 'count-page-ads'})
        pageAdCount.textContent = response?.count ?? 'Unavailable'
        popupSettingKey = response?.popupSettingKey
        if (popupSettingKey) {
            const settings = await chrome.storage.local.get(popupSettingKey)
            blockClickPopups.checked = settings[popupSettingKey] !== false
            blockClickPopups.disabled = false
        }
    } catch {
        // Chrome does not allow content scripts on every tab.
        pageAdCount.textContent = 'Unavailable'
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
        filters.disabled = share.disabled = remove.disabled = !filters.length
    } catch (error) {
        console.error('Could not read ad filters', error)
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
    try {
        const key = filters.value
        const {[key]: filter} = await chrome.storage.local.get(key)
        if (!filter) throw new Error('Filter no longer exists')
        const issue = new URL('https://github.com/0trebor0/ad-blocker-chrome-extension/issues/new')
        issue.searchParams.set('title', 'Community ad filter for ' + filter.hostname)
        issue.searchParams.set('body', 'Proposed cosmetic filter\n\n```json\n' +
            JSON.stringify(filter, null, 2) + '\n```\n\nWhat does this filter hide?\n')
        await chrome.tabs.create({url: issue.href})
    } catch (error) {
        console.error('Could not open community filter draft', error)
        status.textContent = 'Could not open the GitHub draft.'
    }
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

showPageAdCount()
showFilters()
