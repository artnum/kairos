function KUIReservation (object) {
    const uiNode = object.getUINode()
    if (uiNode) { return uiNode }

    this.object = object
    this.props = new Map()
    this.Viewport = new KView()
    this.parent = null
    this.id = object.get('uuid')
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('kreservation')
    this.domNode.setAttribute('draggable', true)
    this.domNode.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', this.object.toString())
        event.dataTransfer.setData('application/kairos', `${this.object.getType()}/${this.object.get('uid')}`)
        event.dataTransfer.dropEffect = 'move'
    })
    this.domNode.addEventListener('drop', event => {
        event.preventDefault()
    })
    this.domNode.addEventListener('dragover', event => {
        event.preventDefault()
    })
}

KUIReservation.prototype.setParent = function (parent) {
    return new Promise((resolve, reject) => {
        let p = Promise.resolve()
        if (this.parent) {
            p = this.parent.removeReservation(this)
        }
        p.then(() => {
            this.parent = parent
            resolve()
        })
    })
}

KUIReservation.prototype.reload = function (object) {

}

KUIReservation.prototype.setTop = function (top) {
    this.top = top
    window.requestAnimationFrame(() => { this.domNode.style.top = `${top}px` })
}

KUIReservation.prototype.setHeight = function (height) {
    this.height = height
    window.requestAnimationFrame(() => { 
        this.domNode.style.height = `${height}px`
        this.domNode.style.maxHeight = `${height}px`
    })
}

KUIReservation.prototype.render = function () {
    const kcolor = new KColor()
    return new Promise((resolve, reject) => {
        const affaire = this.object.getRelation('kaffaire')
        if (!affaire) { return }
        const project = affaire.getRelation('kproject')
        if (!project) { return }

        let color = kcolor.get(`kproject:${project.get('uid')}`)
        if (!color) {
            const gcolor = kcolor.generate('kproject')
            color = kcolor.set(`kproject:${project.get('uid')}`, `hsla(${gcolor.h}, ${gcolor.s}%, ${gcolor.l}%, 0.25)`)
        }
        let deliveryBegin = null //new Date(this.object.get('deliveryBegin'))

        if (!deliveryBegin) { deliveryBegin = new Date(this.object.get('begin')).getTime() }
        let deliveryEnd = null //new Date(this.object.get('deliveryEnd'))
        if (!deliveryEnd) { deliveryEnd = new Date(this.object.get('end')).getTime() }
        const begin = new Date(this.object.get('begin')).getTime()
        const end = new Date(this.object.get('end')).getTime()

        this.props.set('min', begin < deliveryBegin ? begin : deliveryBegin)
        this.props.set('max', end > deliveryEnd ? end : deliveryEnd)
        this.props.set('length', this.props.get('max') - this.props.get('min'))
        this.props.set('width', this.Viewport.get('second-width') * this.props.get('length'))

        window.requestAnimationFrame(() => {
            this.domNode.innerHTML = `${affaire.getCn()}`
            this.domNode.style.setProperty('--kreservation-project-color', `var(${color})`)
            this.domNode.style.width = `${this.props.get('width').toPrecision(2)}px`
            if (this.height !== undefined) {
                this.domNode.style.height = `${this.height}px`
            } else {
                this.domNode.style.height = `${this.Viewport.get('entry-inner-height').toPrecision(2)}px`
            }
            if (this.top !== undefined) {
                this.domNode.style.top = `${this.top}px`
            }
            this.domNode.setAttribute('draggable', true)
            this.domNode.id = this.object.get('uuid')
            this.domNode.addEventListener('mousedown', (event) => {
                event.stopPropagation()
            }, {passive: true})
            this.object.bindUINode(this)
            resolve(this.domNode)
        })
    })
}   