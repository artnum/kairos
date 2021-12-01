function KUIReservation (object) {
    const uiNode = object.getUINode()
    if (uiNode) { return uiNode }
    this.EvtTarget = new EventTarget()
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
    object.bindUINode(this)
}

KUIReservation.prototype.dispatchEvent = function (event) {
    this.EvtTarget.dispatchEvent(event)
}

KUIReservation.prototype.addEventListener = function (type, listener, options) {
    this.EvtTarget.addEventListener(type, listener, options)
}

 KUIReservation.prototype.removeEventListener = function (type, listener, options) {
     this.EvtTarget.removeEventListener(type, listener, options)
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

KUIReservation.prototype.getDomNode = function () {
    return new Promise((resolve, reject) => {
        this.rendered
        .then(domNode => {
            resolve(domNode)
        })
    })
}

KUIReservation.prototype.unrender = function () {
    this.getDomNode()
    .then(domNode => {
        window.requestAnimationFrame(() => {
            if (domNode.parentNode) { domNode.parentNode.removeChild(domNode) }
        })
    })
}

KUIReservation.prototype.renderForm = function () {
    return new Promise((resolve, reject) => {
        const reservation = this.object
        const form = document.createElement('DIV')
        form.classList.add('kreservationForm')
        form.innerHTML = `
        <fieldset><legend>Date</legend>
        <label>Début : <input type="text" value="${reservation.get('begin')}"></input></label>
        <label>Fin : <input type="text" value="${reservation.get('end')}"></input></label>
        </fieldset>
        <button name="delete" class="mbutton">Supprimer</button>
        `
        const buttons = MButton.parse(form)
        for (const button of buttons) {
            switch(button.name) {
                case 'delete': button.addEventListener('click', () => { 
                    const kstore = new KStore('kreservation')
                    kstore.delete(reservation.get('uid')) 
                    .then(result => {
                        if (!result) { KAIROS.error('ERR:Server'); return; }
                        reservation.getUINode().unrender()
                        reservation.destroy()
                        this.dispatchEvent(new CustomEvent('close', {detail: this}))
                    })
                }); break
            }
        }
        resolve(form)
    })
}

KUIReservation.prototype.render = function () {
    const kcolor = new KColor()
    this.rendered = new Promise((resolve, reject) => {
        const affaire = this.object.getRelation('kaffaire')
        if (!affaire) { return }
        const project = affaire.getRelation('kproject')
        if (!project) { return }
        const leftbox = this.Viewport.getRelativeColFromDate(new Date(this.object.get('begin')))
        if (leftbox < 0) { return  }
        const left = leftbox * this.Viewport.get('day-width') + this.Viewport.get('margin-left')

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

        const beginDate = new Date(this.object.get('begin'))
        let offset = beginDate.getHours() * 60 + beginDate.getMinutes()

        this.props.set('left', left + (offset * 60 * this.Viewport.get('second-width')))
        this.props.set('min', begin < deliveryBegin ? begin : deliveryBegin)
        this.props.set('max', end > deliveryEnd ? end : deliveryEnd)
        this.props.set('length', this.props.get('max') - this.props.get('min'))
        this.props.set('width', this.props.get('length') / 1000 * this.Viewport.get('second-width'))

        if (this.props.get('width') < 10) {
            this.props.set('width', this.Viewport.get('day-width') / 2)
        }
        this.object.bindUINode(this)
        window.requestAnimationFrame(() => {
            this.domNode.innerHTML = `${affaire.getFirstTextValue('???', 'reference', 'description', 'cn')}`
            this.domNode.style.setProperty('--kreservation-project-color', `var(${color})`)
            this.domNode.style.width = `${this.props.get('width').toPrecision(2)}px`
            this.domNode.style.left = `${this.props.get('left')}px`
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
            resolve(this.domNode)
        })
    })
    return this.rendered
}   