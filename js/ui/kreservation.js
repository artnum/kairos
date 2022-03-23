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
    this.domNode.id = this.object.get('uuid')
    this.domNode.addEventListener('dragstart', event => {
        event.dataTransfer.setDragImage(KAIROS.images.move, 8, 8)
        event.dataTransfer.setData('text/plain', `kid://${this.object.getType()}/${this.object.get('uid')}`)
        event.dataTransfer.dropEffect = 'move'
    })
    this.domNode.addEventListener('mousedown', (event) => {
        event.stopPropagation()
    }, {passive: true})
    this.domNode.addEventListener('drop', event => {
        event.preventDefault()
    })
    this.domNode.addEventListener('dragover', event => {
        event.preventDefault()
    })
    object.addEventListener('update', this.render.bind(this))
    const affaire = this.object.getRelation('kaffaire')
    if (affaire) {
        affaire.addEventListener('update', this.render.bind(this))
    }
    object.addEventListener('delete', this.deleteMe.bind(this))

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
            resolve(this.domNode)
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
        const affaire = this.object.getRelation('kaffaire')
        form.innerHTML = `
        <fieldset class="k-form-ui" name="reservation"><legend>Réservation</legend>
        </fieldset>
        <fieldset class="k-form-ui" name="affaire"><legend>Travail</legend>
        </fieldset>
        <button name="delete" class="mbutton">Supprimer</button>
        `

        const rform = new KFormUI(this.object)
        rform.render({
            id: {label: 'Numéro', readonly: true},
            version: {label: 'Version', readonly: true},
            _kproject_name: {label: 'Projet', readonly: true},
            begin: {label: 'Début', type: 'datehour'},
            end: {label: 'Fin', type: 'datehour'},
            time: {label: 'Durée', type: 'hour'},
            comment: {label: 'Remarque', type: 'multitext'},
            creator: {label: 'Responsable', type: 'kstore', storeType: 'kentry', query: {disabled: 0}},
            technician: {label: 'Chef projet', type: 'kstore', storeType: 'kentry', query: {disabled: 0}},
            status: {label: 'Type', type: 'kstore', storeType: 'kstatus', query: {type: 1}},

        })
        .then(domNode => {
            for (const fieldset of form.getElementsByTagName('FIELDSET')) {
                if (fieldset.getAttribute('name') === 'reservation') {
                    fieldset.appendChild(domNode)
                    break
                }
            }
        })
        
        rform.addEventListener('change', (event) => {
            const name = event.detail.name
            const value = event.detail.value
            const form = event.detail.target
            if (name === 'time') {
                // toooooo buggggyyyy
               /* const end = KVDays.getContinuousEnd(new Date(form.get('begin')), value / 3600,  KAIROS.days)
                form.set('end', end[0].toISOString())
                form.save() */
            }
        })

        const affaireUi = new KAffaireFormUI(affaire)
        affaireUi.render()
        .then(domNode => {
            for (const fieldset of form.getElementsByTagName('FIELDSET')) {
                if (fieldset.getAttribute('name') === 'affaire') {
                    fieldset.appendChild(domNode)
                    break
                }
            }
        })

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
        this.renderedForm = form
        resolve(form)
    })
}

KUIReservation.prototype.render = function () {
    this.rendered = new Promise((resolve, reject) => {

        if (this.object.isDestroyed()) {
            this.unrender()
            resolve()
            return
        }
        
        let changeDom = true
        if (!this.lastObjectChange) {
            this.lastObjectChange = this.object.get('last-change')
        } else {
            if (this,this.lastObjectChange === this.object.get('last-change')) { changeDom = false }
        }

        if (!this.domProduced) {
            changeDom = true
        }

        const kstore = new KStore('kstatus')
        kstore.get(this.object.get('status'))
        .then(status => {
            const color = status ? status.color || 'lightgray' : 'lightgray'
            const affaire = this.object.getRelation('kaffaire')
            if (!affaire) { resolve(null); return }
            const project = affaire.getRelation('kproject')
            if (!project) { resolve(null); return }

            let leftbox = this.Viewport.getRelativeColFromDate(new Date(this.object.get('begin')))
            let gap = null
            let virtualEnd = null
            if (leftbox < 0) {
                if (this.Viewport.get('date-origin').getTime() > new Date(this.object.get('end')).getTime()) {
                    this.removeDomNode();
                    resolve(null);
                    return
                }
                if (new Date(this.object.get('end')).getTime() > this.Viewport.get('date-end').getTime()) {
                    virtualEnd = this.Viewport.get('date-end')
                    virtualEnd = virtualEnd.getTime() + 86400000
                }
                const begin = new Date(this.object.get('begin'))
                gap = this.Viewport.get('date-origin').getTime()
                leftbox = 0
            }
            const left = leftbox * this.Viewport.get('day-width') + this.Viewport.get('margin-left')
            let deliveryBegin = null //new Date(this.object.get('deliveryBegin'))

            if (!deliveryBegin) { deliveryBegin = new Date(this.object.get('begin')).getTime() }
            let deliveryEnd = null //new Date(this.object.get('deliveryEnd'))
            if (!deliveryEnd) { deliveryEnd = new Date(this.object.get('end')).getTime() }
            const begin = new Date(this.object.get('begin')).getTime()
            const end = new Date(this.object.get('end')).getTime()

            const beginDate = new Date(this.object.get('begin'))
            let offset = (beginDate.getHours() * 60 + beginDate.getMinutes()) / 1.6667
            if (gap) { offset = 0 }

            this.props.set('left', left + (offset * 60 * this.Viewport.get('second-width')))
            this.props.set('min', gap === null ? (begin < deliveryBegin ? begin : deliveryBegin) : gap)
            this.props.set('max', virtualEnd !== null ? virtualEnd : (end > deliveryEnd ? end : deliveryEnd))
            let extend = (beginDate.getHours() * 3600 + beginDate.getMinutes() * 60) * 1000
            if (!gap) {
                extend = 0
            }
            this.props.set('length', this.props.get('max') - this.props.get('min') + extend)
            this.props.set('width', this.props.get('length') / 1000 * this.Viewport.get('second-width'))

            if (this.props.get('width') < 10) {
                this.props.set('width', this.Viewport.get('day-width') / 2)
            }
            this.object.bindUINode(this)
            window.requestAnimationFrame(() => {
                if (gap) { this.domNode.classList.add('k-left-open') }
                else { this.domNode.classList.remove('k-left-open') }
                if (virtualEnd) { this.domNode.classList.add('k-right-open') }
                else { this.domNode.classList.remove('k-right-open') }

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

                if (changeDom) {
                    this.domProduced = true
                    this.domNode.innerHTML = `<div class="content">
                            <span class="field uid">${project.getFirstTextValue('', 'reference')}</span>
                            <span class="field reference">${affaire.getFirstTextValue('', 'reference')}</span>
                            <span class="field description">${affaire.getFirstTextValue('', 'description')}</span>
                            <span class="field remark">${this.object.getFirstTextValue('', 'comment')}</span>
                        </div>
                        <div class="color-bar">&nbsp;</div>`
                        this.domNode.style.setProperty('--kreservation-project-color', `${color}`)
                }

                resolve(this.domNode)
            })
        })
    })
    return this.rendered
}   

KUIReservation.prototype.removeDomNode = function () {
    window.requestAnimationFrame(() => {
        if (this.domNode && this.domNode.parentNode) {
            this.domNode.parentNode.removeChild(this.domNode)
        }
    })
}

KUIReservation.prototype.deleteMe = function () {
    window.requestAnimationFrame(() => {
        if (this.renderedForm) {
            if (this.renderForm.parentNode) {
                this.renderForm.parentNode.removeChild(this.renderForm)
            }
        }
    })
    window.requestAnimationFrame(() => {
        if (this.domNode && this.domNode.parentNode) {
            this.domNode.parentNode.removeChild(this.domNode)
        }
    })
}