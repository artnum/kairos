function KMouseIndicator () {
    if (KMouseIndicator._instance) { return KMouseIndicator._instance }
    KAIROS.addFollowMouse(this.move.bind(this))
    this.hasContent = false
    this.enabled = true
    this.rect = {width: 0}
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('k-mouse-indicator')
    this.domNode.style.setProperty('z-index', KAIROS.zMax())
    this.domNode.style.setProperty('left', '0px')
    this.domNode.style.setProperty('top', '0px')
    this.domNode.style.setProperty('position', 'absolute')
    window.requestAnimationFrame(() => { document.body.appendChild(this.domNode) })
    KMouseIndicator._instance = this
}

KMouseIndicator.prototype.move = function (mouse) {
    if (!this.hasContent) { return }
    let x = mouse.clientX + 15
    let y = mouse.clientY + window.scrollY
    if (this.rect.width + x > window.innerWidth) {
        x = mouse.clientX - (5 + this.rect.width)
    }
    window.requestAnimationFrame(() => {
        this.domNode.style.setProperty('transform', `translate(${x}px, ${y}px)`)
    })
}

KMouseIndicator.prototype.setContent = function (content) {
    if (!this.enabled) { return }
    this.hasContent = true
    new Promise(resolve => {
        window.requestAnimationFrame(() => {
            this.domNode.innerHTML = content
            if (!this.domNode.parentNode) { document.body.appendChild(this.domNode) }
            resolve()
        })
    })
    .then(_ => {
        this.rect = this.domNode.getClientRects()[0]
        KAIROS.keepAtTop(this.domNode)
    })
}

KMouseIndicator.prototype.clearContent = function () {
    this.hasContent = false
    window.requestAnimationFrame(() => {
        this.domNode.innerHTML = ''
        if (this.domNode.parentNode) { document.body.removeChild(this.domNode) }
    })
}

KMouseIndicator.prototype.disable = function () {
    this.enabled = false
    window.requestAnimationFrame(() => {
        if (this.domNode.parentNode) { document.body.removeChild(this.domNode) }
    })
}

KMouseIndicator.prototype.enable = function () {
    this.enabled = true
}

