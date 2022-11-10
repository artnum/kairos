function KLateralTab (id, klateral) {
    this.tabIdx = id
    this.klateral = klateral
    this.destroyed = false
    this.scroll = 0
    this.evtTarget = new EventTarget()
    this.buttons = new Map()
}

KLateralTab.prototype.addEventListener = function (event, listener, options) {
    console.log(event)
    this.evtTarget.addEventListener(event, listener, options)
}

KLateralTab.prototype.dispatchEvent = function (event) {
    this.evtTarget.dispatchEvent(event)
}

KLateralTab.prototype.destroy = function () {
    this.destroyed = true
    this.evtTarget.dispatchEvent(new CustomEvent('destroy'))
}

KLateralTab.prototype.close = function () {
    this.klateral.remove(this.tabIdx)
    this.destroy()
}

KLateralTab.prototype.getScroll = function () {
    return this.scroll
}

KLateralTab.prototype.setScroll = function(scroll) {
    this.scroll = scroll
    return scroll
}

KLateralTab.prototype.focus = function () {
    return this.evtTarget.dispatchEvent(new CustomEvent('focus'))
}

KLateralTab.prototype.blur = function () {
    return this.evtTarget.dispatchEvent(new CustomEvent('blur'))
}

KLateralTab.prototype.addButton = function (type, button) {
    return this.buttons.set(type, button)
}

KLateralTab.prototype.removeButton = function (type) {
    return this.buttons.delete(type)
}

KLateralTab.prototype.getButton = function (type) {
    return this.buttons.get(type)
}

KLateralTab.prototype.getButtons = function() {
    return this.buttons
}

function KLateral () {
    if (KLateral.instance) {
        return KLateral.instance
    }
    KLateral.instance = this
    this.isOpen = false
    this.tabs = new Map()
    this.actions = new Map()
    this.idMap = new Map()
    this.evtTarget = new EventTarget()
    this.tabIdx = 1
    this.tabCurrent = 0
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('klateral')
    this.domNode.style.zIndex = KAIROS.zMax()
    this.domNode.innerHTML = `
        <div class="khead"><div class="scroll left">&lt;</div><div class="ktab"></div><div class="scroll right">&gt;</div></div>
        <div class="kcontent"><div class="cwrapper"></div></div>
        <div class="kaction"><button class="mbutton" data-action="__close">Fermer</button></div>
        `
    MButton.parse(this.domNode)
    this.tab = this.domNode.firstElementChild.firstElementChild.nextElementSibling
    this.content = this.domNode.lastElementChild.previousElementSibling.firstElementChild
    this.action = this.domNode.lastElementChild
    
    this.tab.addEventListener('click', this.handleSelectTab.bind(this), {passive: true})
    this.domNode.firstElementChild.firstElementChild.addEventListener('click', this.handleSelectTab.bind(this))
    this.domNode.firstElementChild.lastElementChild.addEventListener('click', this.handleSelectTab.bind(this))
    this.domNode.addEventListener('wheel', this.handleScrollEvent.bind(this), {capture: true})
    this.action.addEventListener('click', this.handleActionEvent.bind(this), {passive: true, capture: true})

    // intercept all click on bubble phase and stop propagation to avoid action underneath
    this.domNode.addEventListener('click', event => { event.stopPropagation() })     
    this.domNode.addEventListener('dblclick', event => { event.stopPropagation() })     

    document.body.appendChild(this.domNode)
}

KLateral.prototype.addEventListener = function (type, listener, options) {
    return this.evtTarget.addEventListener(type, listener, options)
}

KLateral.prototype.removeEventListener = function (type, listener, options) {
    return this.evtTarget.removeEventListener(type, listener, options)
}

/* 
 * As follow : scroll mouse (wheel up and down) is available only on tab head,
 * left and right navigation (wheel left and right when available) is available
 * everywhere allowing to switch tab quickly whith mouse over the lateral bar
 */
KLateral.prototype.handleScrollEvent = function (event) {
    const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY
    if (event.deltaY !== 0) {
        let node = event.target
        while (node && !node.classList?.contains('ktab')) { node = node.parentNode }
        if (!node) { return }
        event.preventDefault()
        this.tab.scroll({left: this.tab.scrollLeft + (delta < 0 ? -24 : 24)})
        return
    }
    if (delta < 0) {
        this.toLeftTab()
    } else {
        this.toRightTab()
    }
}

KLateral.prototype.handleActionEvent = function (event) {
    if (!(event.target instanceof HTMLButtonElement)) { return }
    const button = event.target

    if (button.dataset.action === '__close') { return this.close() }
    const action = button.dataset.action
    if (!this.actions.has(action)) { return }
    return this.actions.get(action)(event)
}

KLateral.prototype.handleSelectTab = function (event) {
    let node = event.target
    while (node && !node.dataset?.index) { node = node.parentNode }
    if (!node) { 
        /* might use scroll button */
        node = event.target
        while(node && !node.classList?.contains('scroll')) { node = node.parentNode }
        if (!node) { return }   
        if (node.classList.contains('left')) {
            this.toLeftTab()
        } else {
            this.toRightTab()
        }
        return 
    }
    this.showTab(node.dataset.index)
}

KLateral.prototype.open = function () {
    this.domNode.style.zIndex = KAIROS.zMax()
    this.domNode.style.display = 'block'
    this.isOpen = true
    KAIROS.stackClosable(this.close.bind(this))
    return this
}

KLateral.prototype.close = function () {
    if (this.tabs.size > 0) {
        this.remove(this.tabCurrent)
        if(this.tabs.size > 0) {
            /* more tab to close, stack close again */
            KAIROS.stackClosable(this.close.bind(this))
            return true
        }
    }
    this.isOpen = false
    this.domNode.style.zIndex = -1
    this.domNode.style.display = 'none'
    return true
}

KLateral.prototype.add = function (content, opt = {}) {
    if (opt.id) {
        const tabId = this.idMap.get(opt.id)
        if (tabId) {
            const tabEntry = this.tabs.get(String(tabId))
            this.showTab(tabId)
            this.open()
            this.evtTarget.dispatchEvent(new CustomEvent(`show-tab-${tabId}`, {detail: {tabEntry}}))
            return 
        }
    }

    const tabContent = document.createElement('DIV')
    if (content instanceof HTMLElement) {
        tabContent.appendChild(content)
    } else {
        tabContent.innerHTML = content
    }
    tabContent.style.position = 'absolute'
    tabContent.style.inset = '8px'

    const tabTitle = document.createElement('DIV')
    if (opt.title) {
        if (opt.title instanceof HTMLElement) {
            tabTitle.appendChild(opt.title)
        } else {
            tabTitle.innerHTML = opt.title
        }
    }

    const index = this.tabIdx++
    if (opt.id) {
        this.idMap.set(opt.id, index)
    }
    tabTitle.dataset.index = index
    tabContent.dataset.index = index

    this.tab.appendChild(tabTitle)
    this.content.appendChild(tabContent)

    const tab = new KLateralTab(index, this)
    this.tabs.set(String(index), tab)

    if (opt.action && Array.isArray(opt.action)) {
        opt.action.forEach(action => {
            const type = action.type !== undefined ? action.type : 'normal'
            const button = new MButton(action.label)
            button.addEventListener('click', (event) => {
                tab.dispatchEvent(new CustomEvent('k-action', {
                    detail: 
                    {
                        tab: tab,
                        action: action.name,
                        target: button.getDomNode()
                    }
                })) 
            })
            switch(type) {
                case 'normal':
                default: break
                case 'danger': button.setColorFlavor('red'); break
                case 'risk': button.setColorFlavor('yellow'); break
            }
            const domNode = button.getDomNode()
            domNode.dataset.tabIndex = index
            this.domNode.querySelector('div.kaction').appendChild(domNode)

            button.place()
            tab.addButton(action.name, button)
        })
    }

    this.showTab(index)
    if (this.tabs.size > 0 && !this.isOpen) {
        this.open()
    }

    this.evtTarget.dispatchEvent(new CustomEvent(`show-tab-${index}`, {detail: {tab}}))
    return tab
}

KLateral.prototype.toLeftTab = function () {
    const [tabTitle, tabContent] = this.getTab(this.tabCurrent)
    if (!tabTitle) { return }
    const sibling = tabTitle.previousElementSibling
    if (!sibling) { return }
    if (!sibling.dataset?.index) { return }
    this.showTab(sibling.dataset.index)
}

KLateral.prototype.toRightTab = function () {
    const [tabTitle, tabContent] = this.getTab(this.tabCurrent)
    if (!tabTitle) { return }
    const sibling = tabTitle.nextElementSibling
    if (!sibling) { return }
    if (!sibling.dataset?.index) { return }
    this.showTab(sibling.dataset.index)
}

KLateral.prototype.getTab = function (idx) {
    const tabTitle = this.tab.querySelector(`div[data-index="${idx}"]`)
    const tabContent = this.content.querySelector(`div[data-index="${idx}"]`)

    return [tabTitle, tabContent]
}

KLateral.prototype.remove = function (idx) {
    const tab = this.tabs.get(String(idx))
    if (tab) { tab.blur() }
    tab.getButtons().forEach(button => {
        const node = button.getDomNode()
        if (node) {
            window.requestAnimationFrame(() => { node.parentNode.removeChild(node) })
        }
    })
    if (!this.evtTarget.dispatchEvent(new CustomEvent(`destroy-tab-${idx}`, {detail: {tab}}))) {
        return
    }
    const [tabTitle, tabContent] = this.getTab(idx)
    this.tabs.delete(String(idx))
    for (const [k, v] of this.idMap) {
        if (String(v) === String(idx)) {
            this.idMap.delete(k)
        }
    }
    if (tabTitle) { this.tab.removeChild(tabTitle) }
    if (tab) { tab.destroy() }
    if (!this.content) { return }
    this.content.removeChild(tabContent)
    this.tabCurrent = 0
    if (this.tabs.size > 0) {
        this.showTab()  
    } else {
        this.close()
    }
}

KLateral.prototype.hideTab = function (idx) {
    const tab = this.tabs.get(String(idx))
    tab.getButtons().forEach(button => {
        const node = button.getDomNode()
        if (node) {
            window.requestAnimationFrame(() => { node.parentNode.removeChild(node) })
        }
    })
    this.evtTarget.dispatchEvent(new CustomEvent(`hide-tab-${idx}`, {detail: {tab}}))
    tab.blur()
    const [tabTitle, tabContent] = this.getTab(idx)
    tab.setScroll(this.content.scrollTop)
    tabContent.style.display = 'none'
    tabTitle.classList.remove('selected')
    tabContent.classList.remove('selected')
}

KLateral.prototype.showTab = function (idx) {
    if (idx === undefined) {
        // find first tabs
        for (const [k, v] of this.tabs) {
            idx = k
            break
        }
    }
    const tab = this.tabs.get(String(idx))
    const parent = this.domNode.querySelector('div.kaction')
    tab.getButtons().forEach(button => {
        const node = button.getDomNode()
        if (node) {
            window.requestAnimationFrame(() => { parent.appendChild(node) })
        }
    })
    if (this.tabCurrent !== 0) {
        this.tabPrevSelected = this.tabCurrent
        this.hideTab(this.tabCurrent)
    }
    const [tabTitle, tabContent] = this.getTab(idx)
    if (!tabTitle) { return }

    tabContent.style.display = 'block'
    tabContent.classList.add('selected')
    tabTitle.classList.add('selected')
    tabTitle.scrollIntoView({behavior: 'smooth'})
    this.content.scrollTo({left: 0, top: tab.getScroll(), behavior: 'instant'})
    this.tabCurrent = idx
    this.evtTarget.dispatchEvent(new CustomEvent(`show-tab-${idx}`, {detail: {tab}}))
    tab.focus()
}