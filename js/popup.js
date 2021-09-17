function KTaskBar () {
    if (!KTaskBar._taskBar) {
        KTaskBar._id = 0
        KTaskBar._tasks = new Map()
        KTaskBar._lists = new Map()
        KTaskBar._taskBar = document.createElement('DIV')
        KTaskBar._taskBar.id = 'KTaskBar'
        KTaskBar._taskBar.style.setProperty('z-index', KAIROS.zMax())
        KAIROS.keepAtTop(KTaskBar._taskBar)
        KAIROSAnim.push(() => {
            document.body.appendChild(KTaskBar._taskBar)
        })
    }
    this.taskbar = KTaskBar._taskBar
    this.tasks = KTaskBar._tasks
    this.lists = KTaskBar._lists
}

KTaskBar.prototype.dispose = function () {
    let j = 0
    let i = 0
    const offset = this.lists.size * 152
    for (let n = this.taskbar.firstElementChild; n; n = n.nextElementSibling) {
        if (n.classList.contains('klist')) {
            const y = j * 154
            KAIROSAnim.push(() => { n.style.left = `${y}px` })
            j++
            continue
        }
        const y = offset + i * 302
        KAIROSAnim.push(() => { n.style.left = `${y}px` })
        i++
    }
}

KTaskBar.prototype.minimize = function (titleNode, maximizeCallback) {
    const tid = `ktask-t-${++KTaskBar._id}`
    const task = document.createElement('DIV')
    task.id = tid
    task.classList.add('ktask')
    task.appendChild(titleNode)
    task.addEventListener('click', maximizeCallback)
    KAIROSAnim.push(() => { this.taskbar.appendChild(task) })
    .then(() => {
        this.dispose()
    })
    this.tasks.set(tid, task)
    return tid
}

KTaskBar.prototype.maximize = function (tid) {
    const node = this.tasks.get(tid)
    if (!node) { return }
    this.tasks.delete(tid)
    KAIROSAnim.push(() => { 
        if (!node.parentNode) { return }
        node.parentNode.removeChild(node)
    })
    .then(() => {
        this.dispose()
    })
}

KTaskBar.prototype.addListItem = function (listId, item) {
    const list = this.lists.get(listId)
    if (!list) { return }
    list.items.push(item)
    this.lists.set(listId, list)
}

KTaskBar.prototype.list = function (titleNode, items, actions = []) {
    const lid = `ktask-l-${++KTaskBar._id}`
    const list = document.createElement('DIV')
    list.classList.add('klist')
    list.id = lid
    list.dataset.popped = '0'
    list.appendChild(titleNode)
    list.style.setProperty('left', 0)
    list.addEventListener('click', (event) => {
        if (list.dataset.popped === '0') {
            this.popList(event)
            list.dataset.popped = '1'
        } else {
            this.unpopList(event)
            list.dataset.popped = '0'
        }
    }, {capture: true})

    KAIROSAnim.push(() => { this.taskbar.appendChild(list) })
    .then(() => { this.dispose() })

    this.lists.set(lid, {node: list, items: items, actions: actions, popped: null})

    return lid
}

KTaskBar.prototype.unpopList = function (event) {
    let node = event.target
    while (node && !node.classList.contains('klist')) { node = node.parentNode }
    const list = this.lists.get(node.id)
    KAIROSAnim.push(() => { list.popped.parentNode.removeChild(list.popped) })
}

KTaskBar.prototype.popList = function (event) {
    let node = event.target
    while (node && !node.classList.contains('klist')) { node = node.parentNode }
    const listNode = document.createElement('DIV')
    listNode.classList.add('klist', 'pop')
    KAIROS.setAtTop(listNode)
    const list = this.lists.get(node.id)
    if (!list) { return }
    console.log(list)
    for (const action of list.actions) {
        listNode.innerHTML += `<span class="kaction">${action.label}</span>`
    }
    listNode.innerHTML += `<span class="kseparator"> </span>`
    for (const [id, item] of list.items) {
        let label = ''
        for (const prop of [ 'label', 'getLabel', 'title', 'getTitle' ]) {
            if (prop in item) {
                if (typeof item[prop] === 'function') {
                    label = item[prop]()
                } else {
                    label = item[prop]
                }
                break
            }
        }
        listNode.innerHTML += `<span class="kitem">${label}</span>`
    }
    list.popped = listNode
    KAIROSAnim.push(() => {
        document.body.appendChild(listNode)
    })
}

function KPopup (title, opts = {}) {
    this.taskbar = new KTaskBar()
    this.evttarget = new EventTarget()
    this.popup = document.createElement('DIV')
    this.popup.classList.add('kpopup')
    this.title = document.createElement('DIV')
    this.title.classList.add('title')
    this.titleContent = document.createElement('SPAN')
    this.titleContent.innerHTML = title
    this.title.appendChild(this.titleContent)
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('content')
    this.popup.appendChild(this.title)
    this.popup.appendChild(this.domNode)
    this.closeIcon = document.createElement('DIV')
    this.closeIcon.classList.add('close')
    this.closeIcon.innerHTML = `<i class="fas fa-window-close" aria-hidden="true"> </i>`
        
    this.title.appendChild(this.closeIcon)
    
    this.minimizedTab
    this.domNode.startLoading = this.startLoading.bind(this)
    this.domNode.stopLoading = this.stopLoading.bind(this)

    if (opts.minWidth) {
        this.popup.style.minWidth = opts.minWidth
    }
    if (opts.minHeigt) {
        this.popup.style.minHeight = opts.minHeight
    }

    if (opts.content) {
        this.setContent(opts.content)
    }
    this.isWindow = false
    if (opts.isWindow) {
        this.isWindow = true
        this.setReference(document.body)
        
        this.minimizeIcon = document.createElement('DIV')
        this.minimizeIcon.classList.add('minimize')
        this.minimizeIcon.innerHTML = `<i class="fas fa-window-minimize" aria-hidden="true"> </i>`
        this.title.appendChild(this.minimizeIcon)
        this.minimizeIcon.addEventListener('click', event => {
            this.minimize()
        })
    } else {
        if (opts.reference) {
            this.setReference(opts.reference)
        }
        if (opts.placement) {
            this.placement = opts.placement
        } else {
            this.placement = 'bottom'
        }
    }

    this.closeIcon.addEventListener('click', event => {
        this.close()
    })


    this.popup.addEventListener('mousedown', event => {
        this.focus()
    }, {capture: true})

    /* if placed at special position, don't move window */
    if (!opts.reference) {
        this.title.addEventListener('mousedown', event => {
            const bounding = this.popup.getClientRects()
            this.deltaX =  event.clientX - bounding[0].x
            this.deltaY = event.clientY - bounding[0].y
            this.follow = true
            this.followMouse()
            window.addEventListener('mouseup', event => {
                this.follow = false
            })
        })
    }

    this.opened = null
}

KPopup.prototype.addEventListener = function (type, callback, options = {}) {
    this.evttarget.addEventListener(type, callback, options)
}

KPopup.prototype.removeEventListener = function (type, callback, options = {}) {
    this.evttarget.removeEventListener(type, callback, options)
}

KPopup.prototype.focus = function (event) {
    const zmax = KAIROS.zMax()
    return KAIROSAnim.push(() => {
        this.popup.style.setProperty('z-index', zmax)
    })
}

KPopup.prototype.followMouse = function () {
    if (!this.follow) { return }
    KAIROS.clearSelection()
    const left = KAIROS.mouse.clientX - this.deltaX
    const top = KAIROS.mouse.clientY - this.deltaY
    /* follow runs regulary */
    window.requestAnimationFrame(() => {
        if (left > 0) { this.popup.style.left = `${left}px` }
        if (top > 0) { this.popup.style.top = `${top}px` }
    })
    setTimeout(this.followMouse.bind(this), 16)
}

KPopup.prototype.stopLoading = function () {
    if (this.wait) {
        this.domNode.removeChild(this.domNode.firstElementChild)
    }
    this.wait = false
}

KPopup.prototype.startLoading = function () {
    this.wait = true
    let div = document.createElement('DIV')
    div.innerHTML = '<i class="fas fa-spinner fa-5x fa-pulse fa-fw"></i>'
    this.domNode.insertBefore(div, this.domNode.firstElementChild)
}

KPopup.prototype.minimize = function () {
    this.originalParent = this.popup.parentNode
    this.popup.parentNode.removeChild(this.popup)
    this.minimizedTab = this.taskbar.minimize(this.title.cloneNode(true), this.maximize.bind(this))
}

KPopup.prototype.maximize = function () {
    this.taskbar.maximize(this.minimizedTab)
    KAIROSAnim.push(() => {
        this.originalParent.appendChild(this.popup)
    })
    .then(() => {
        return this.focus()
    })
}

KPopup.prototype.addEventListener = function (type, callback, opts) {
    this.domNode.addEventListener(type, callback, opts)
}

KPopup.prototype.setReference = function (htmlNode) {
    if (htmlNode instanceof HTMLElement) {
        this.reference = htmlNode
    } else if (htmlNode.domNode && htmlNode.domNode instanceof HTMLElement) {
        this.reference = htmlNode.domNode
    }
    this.popup.style.setProperty('z-index', KAIROS.zMax())
    this.popup.style.setProperty('position', 'fixed')
}

KPopup.prototype.place = function () {
    if (!this.isWindow) {
        if (!this.popper) {
            this.popper = Popper.createPopper(this.reference, this.popup, {
                placement: this.placement
            })
        } else {
            this.popper.update()
        }
    } else {
        this.popup.classList.add('win')
        this.position()
    }
}

KPopup.prototype.position = function () {
    if (!this.isWindow) { return; }
    
    let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const popup = this.popup.getClientRects()

    if ((vw / 2) - 680 > 10) {
        vw = vw - 680;
    }

    KAIROSAnim.push(() => {
        this.popup.style.setProperty('top', `${vh / 2 - popup[0].height / 2}px`)
        this.popup.style.setProperty('left', `${vw / 2 - popup[0].width / 2}px`)
    })
}

KPopup.prototype.open = function () {
    return new Promise ((resolve, reject) => {
        if (this.opened) { resolve(); return }
        this.opened = KAIROS.stackClosable(this.close.bind(this))
        KAIROSAnim.push(() => {
            if (!this.popup.parentNode) {
                if (this.reference) {
                    this.reference.parentNode.appendChild(this.popup)
                } else {
                    document.body.appendChild(this.popup)
                }
            }
            this.place()
        })
        .then(() => {
            resolve(this.domNode)
        })
    })
}

KPopup.prototype.close = function () {
    return new Promise((resolve, reject) => {
        if (this.opened === null) { resolve(); return }
        if (this.popper) { this.popper.destroy() }
        KAIROS.removeClosableFromStack(this.close.bind(this))
        this.opened = null
        this.evttarget.dispatchEvent(new CustomEvent('close'))
        KAIROSAnim.push(() => {
            if (this.popup.parentNode) {
                this.popup.parentNode.removeChild(this.popup)
            }
        })
        .then(() => {
            resolve()
        })
    })
}

KPopup.prototype.setContent = function (html) {
    return KAIROSAnim.push(() => {
        this.domNode.innerHTML = html
    })
}

KPopup.prototype.setContentDiv = function (div) {
    let oldPopup = this.domNode
    this.domNode = div
    this.domNode.classList.add('content')
    return KAIROSAnim.push(() => {
        oldPopup.parentNode.replaceChild(this.domNode, oldPopup)
    })
}