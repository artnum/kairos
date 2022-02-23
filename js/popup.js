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

KTaskBar.prototype.remove = function (tid) {
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

KTaskBar.prototype.list = function (titleNode, items) {
    const lid = `ktask-l-${++KTaskBar._id}`
    const list = document.createElement('DIV')
    list.classList.add('klist')
    list.id = lid
    list.appendChild(titleNode)
    list.style.setProperty('left', 0)
    list.addEventListener('click', this.popList.bind(this), {capture: true})

    KAIROSAnim.push(() => { this.taskbar.appendChild(list) })
    .then(() => { this.dispose() })

    this.lists.set(lid, {node: list, items: items})

    return lid
}

KTaskBar.prototype.popList = function (event) {
    let node = event.target
    while (node && !node.classList.contains('klist')) { node = node.parentNode }
}

function KPopup (title, opts = {}) {
    this.binded = []
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
    this.state = {
        resize: false,
        doResize: false,
        mouseX: 0,
        mouseY: 0
    }
    this.title.appendChild(this.closeIcon)
    
    this.minimizedTab
    this.domNode.startLoading = this.startLoading.bind(this)
    this.domNode.stopLoading = this.stopLoading.bind(this)

    if (opts.fitContent) {
        this.popup.style.minHeight = 'min-content'
        this.popup.style.maxHeight = 'min-content'
        this.popup.style.minWidth = 'min-content'
        this.popup.style.maxWidth = 'min-content'
    } else {
        if (opts.minWidth) {
            this.popup.style.minWidth = opts.minWidth
            this.popup.style.maxWidth = opts.minWidth
        } else {
            this.popup.style.minWidth = '800px'
            this.popup.style.maxWidth = '800px'
        }
        if (opts.minHeight) {
            this.popup.style.minHeight = opts.minHeight
            this.popup.style.maxHeight = opts.minHeight
        } else {
            this.popup.style.minHeight = '600px'
            this.popup.style.maxHeight = '600px'
        }
    }
    if (opts.posX) {
        this.posX = opts.posX
    }
    if (opts.posY) {
        this.posY = opts.posY
    }

    if (opts.content) {
        this.setContent(opts.content)
    }
    this.isWindow = false
    if (opts.isWindow || !opts.reference) {
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

    this.popup.addEventListener('mouseup', event => {
        this.state.doResize = false
    })

    this.popup.addEventListener('mousedown', event => {
        this.focus()
        if (this.state.resize) {
            this.state.doResize = true
        }
    }, {capture: true})

    this.followIdx = KAIROS.addFollowMouse(this.mouseMove.bind(this))

    /* if placed at special position, don't move window */
    if (!opts.reference) {
        this.title.addEventListener('mousedown', event => {
            const bounding = this.popup.getClientRects()
            this.deltaX =  event.clientX - bounding[0].x
            this.deltaY = event.clientY - bounding[0].y
            this.follow = true
            this.popup.style.opacity = '0.5';
            this.followMouse()
            window.addEventListener('mouseup', event => {
                this.follow = false
                this.popup.style.opacity = '1';
            })
        })
    }

    this.opened = null
}

KPopup.prototype.mouseMove = function(event) {
    const bounding = this.popup.getClientRects()[0]
    if (!bounding) { return }
    if (this.state.doResize) {
        if (this.state.resize === 'bottom') {
            const deltaY = event.clientY - (bounding.top + bounding.height)
            this.popup.style.setProperty('min-height', `${bounding.height + deltaY}px`)
            this.popup.style.setProperty('max-height', `${bounding.height + deltaY}px`)
        } else if (this.state.resize === 'right') {
            const deltaX = event.clientX - (bounding.left + bounding.width)
            this.popup.style.setProperty('min-width', `${bounding.width + deltaX}px`)
            this.popup.style.setProperty('max-width', `${bounding.width + deltaX}px`)
        }
        
        this.state.mouseX = event.clientX
        this.state.mouseY = event.clientY
        return
    }

    const borderBottom = bounding.bottom - event.clientY
    const borderRight = bounding.right - event.clientX
    const borderTop = event.clientY - bounding.top
    const borderLeft = event.clientX - bounding.left

    if (borderRight <= 20 && borderRight >= 0) {
        this.popup.style.setProperty('cursor', 'ew-resize', 'important')
        this.state.resize = 'right'
        this.state.mouseX = event.clientX
        this.state.mouseY = event.clientY
    } else if (borderBottom <= 20 && borderBottom >= 0) {
        this.popup.style.setProperty('cursor', 'ns-resize', 'important')
        this.state.resize = 'bottom'
        this.state.mouseX = event.clientX
        this.state.mouseY = event.clientY
    } else {
        this.popup.style.removeProperty('cursor')
        this.state.resize = false
    }
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

KPopup.prototype.minimize = function (frombind = false) {
    if (!this.opened) { return }
    if (!frombind) {
        for(const binded of this.binded) {
            binded.minimize(true)
        }
    }
    if (this.minimizedTab) { return }
    this.originalParent = this.popup.parentNode
    this.popup.parentNode.removeChild(this.popup)
    this.minimizedTab = this.taskbar.minimize(this.title.cloneNode(true), this.maximize.bind(this))
}

KPopup.prototype.maximize = function (event, frombind = false) {
    if (!this.opened) { return }
    if (!frombind) {
        for(const binded of this.binded) {
            binded.maximize(event, true)
        }
    }
    if (!this.minimizedTab) { return }
    this.taskbar.maximize(this.minimizedTab)
    this.minimizedTab = null
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
    
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const popup = this.popup.getClientRects()
    KAIROSAnim.push(() => {
        if (this.posY) {
            this.popup.style.setProperty('top', `${this.posY}px`)
        } else {
            this.popup.style.setProperty('top', `${vh / 2 - popup[0].height / 2}px`)
        }
        if (this.posX) {
            this.popup.style.setProperty('left', `${this.posX}px`)
        } else {
            this.popup.style.setProperty('left', `${vw / 2 - popup[0].width / 2}px`)
        }
    })
}

KPopup.prototype.open = function (frombind = false) {
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

KPopup.prototype.close = function (frombind = false) {
    return new Promise((resolve, reject) => {
        if (this.opened === null) { resolve(); return }
        KAIROS.removeFollowMouse(this.followIdx)
        if (this.popper) { this.popper.destroy() }
        KAIROS.removeClosableFromStack(this.close.bind(this))
        this.opened = null
        this.evttarget.dispatchEvent(new CustomEvent('close'))
        if (this.minimizedTab) { 
            this.taskbar.remove(this.minimizedTab)
            resolve()
        } else {
            KAIROSAnim.push(() => {
                if (this.popup.parentNode) {
                    this.popup.parentNode.removeChild(this.popup)
                }
            })
            .then(() => {
                resolve()
            })
        }
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

/* bind popups to act in sync */
KPopup.prototype.bindWith = function (kpopup) {
    this.binded.push(kpopup)
    kpopup.binded.push(this)
}