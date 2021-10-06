function KLateral () {
    if (window._KLateralInstance) {
        return window._KLateralInstance
    }
    window._KLateralInstance = this
    this.actions = new Map()
    this.tabIdx = 1
    this.tabOpen = 0
    this.tabCurrent = 0
    this.tabPrevSelected = 0
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('klateral')
    this.domNode.innerHTML = `
        <div class="khead"><div class="scroll left">&lt;</div><div class="ktab"></div><div class="scroll right">&gt;</div></div>
        <div class="kcontent"><div class="cwrapper"></div></div>
        <div class="kaction"><button data-action="__close">Fermer</button></div>
        `
    this.tab = this.domNode.firstElementChild.firstElementChild.nextElementSibling
    this.content = this.domNode.lastElementChild.previousElementSibling.firstElementChild
    this.action = this.domNode.lastElementChild
    this.tab.addEventListener('click', this.handleSelectTab.bind(this), {passive: true})
    this.domNode.firstElementChild.firstElementChild.addEventListener('click', this.handleSelectTab.bind(this))
    this.domNode.firstElementChild.lastElementChild.addEventListener('click', this.handleSelectTab.bind(this))
    this.domNode.addEventListener('wheel', this.handleScrollEvent.bind(this), {capture: true})
    this.action.addEventListener('click', this.handleActionEvent.bind(this), {passive: true, capture: true})
    document.body.appendChild(this.domNode)
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
    KAIROS.stackClosable(this.close.bind(this))
    return this
}

KLateral.prototype.close = function () {
    if (this.tabOpen > 0) {
        this.remove(this.tabCurrent)
        if(this.tabOpen > 0) {
            /* more tab to close, stack close again */
            KAIROS.stackClosable(this.close.bind(this))
            return true
        }
    }
    this.domNode.style.zIndex = -1
    this.domNode.style.display = 'none'
    return true
}

KLateral.prototype.add = function (content, opt = {}) {
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
    tabTitle.dataset.index = index
    tabContent.dataset.index = index

    this.tab.appendChild(tabTitle)
    this.content.appendChild(tabContent)

    this.showTab(index)
    this.tabOpen++
    return index
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
    const [tabTitle, tabContent] = this.getTab(idx)
    const sibling = tabTitle.nextElementSibling || tabTitle.previousElementSibling
    this.tab.removeChild(tabTitle)
    this.content.removeChild(tabContent)
    this.tabCurrent = 0
    this.tabOpen--
    if (this.tabPrevSelected !== 0) {
        this.showTab(this.tabPrevSelected)
        this.tabPrevSelected = 0
    } else {
        if (!sibling) { return }
        this.showTab(sibling.dataset.index)  
    }
}

KLateral.prototype.hideTab = function (idx) {
    const [tabTitle, tabContent] = this.getTab(idx)
    tabContent.style.display = 'none'
    tabTitle.classList.remove('selected')
    tabContent.classList.remove('selected')
}

KLateral.prototype.showTab = function (idx) {
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
    this.tabCurrent = idx
}