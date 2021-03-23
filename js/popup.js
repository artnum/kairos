function KPopup (title, opts = {}) {
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


    this.popup.addEventListener('mousedown', this.focus.bind(this))

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

    this.opened = null
}

KPopup.prototype.focus = function () {
    const zmax = KAIROS.zMax()
    window.requestAnimationFrame(() => {
        this.popup.style.zIndex = zmax
    })
}

KPopup.prototype.followMouse = function () {
    if (!this.follow) { return }
    const left = KAIROS.mouse.clientX - this.deltaX
    const top = KAIROS.mouse.clientY - this.deltaY
    window.requestAnimationFrame(() => {
        if (left > 0) { this.popup.style.left = `${left}px` }
        if (top > 0) { this.popup.style.top = `${top}px` }
        this.followMouse()
    })
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
    this.minimizedTab = document.createElement('DIV')
    this.minimizedTab.classList.add('kpopupMin')
    this.minimizedTab.appendChild(this.title.cloneNode(true))
    this.minimizedTab.style.left = `${document.querySelectorAll('div.kpopupMin').length * 300 + 4}px`
    this.minimizedTab.style.zIndex = KAIROS.zMax()
    this.minimizedTab.addEventListener('click', event => {
        this.maximize()
    })
    document.body.appendChild(this.minimizedTab)
}

KPopup.prototype.maximize = function () {
    this.originalParent.appendChild(this.popup)
    this.minimizedTab.parentNode.removeChild(this.minimizedTab)
    this.focus()
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
    this.popup.style.setProperty('z-index', KAIROS.zMax(this.reference))
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
    }
}

KPopup.prototype.open = function () {
    return new Promise ((resolve, reject) => {
        if (this.opened) { resolve(); return }
        this.opened = KAIROS.stackClosable(this.close.bind(this))
        window.requestAnimationFrame(() => {
            if (!this.popup.parentNode) {
                document.body.appendChild(this.popup)
            }
            this.place()
            resolve(this.domNode)
        })
    })
}

KPopup.prototype.close = function () {
    window.removeEventListener('mousemove', this.followMouse, {capture: true})
    return new Promise((resolve, reject) => {
        if (!this.opened) { resolve(); return }
        KAIROS.removeClosableByIdx(this.opened)
        this.opened = null
        window.requestAnimationFrame(() => {
            if (this.popup.parentNode) {
                this.popup.parentNode.removeChild(this.popup)
            }
            resolve()
        })
    })
}

KPopup.prototype.setContent = function (html) {
    window.requestAnimationFrame(() => {
        this.domNode.innerHTML = html
    })
}

KPopup.prototype.setContentDiv = function (div) {
    let oldPopup = this.domNode
    this.domNode = div
    this.domNode.classList.add('content')
    window.requestAnimationFrame(() => {
        oldPopup.parentNode.replaceChild(this.domNode, oldPopup)
    })
}