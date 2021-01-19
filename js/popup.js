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

    if (opts.content) {
        this.setContent(opts.content)
    }
    if (opts.reference) {
        this.setReference(opts.reference)
    }
    if (opts.placement) {
        this.placement = opts.placement
    } else {
        this.placement = 'bottom'
    }

    this.closeIcon.addEventListener('click', event => {
        this.close()
    })

    this.opened = null
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
    if (!this.popper) {
        this.popper = Popper.createPopper(this.reference, this.popup, {
            placement: this.placement
        })
    } else {
        this.popper.update()
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