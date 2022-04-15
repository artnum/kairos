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
        
        if (!event.ctrlKey) { if (this.object.get('locked') === '1') { event.preventDefault(); event.stopPropagation(); return false } }
        //event.dataTransfer.setDragImage(KAIROS.images.move, 8, 8)
        event.dataTransfer.setData('text/plain', `kid://${this.object.getType()}/${this.object.get('uid')}`)
        if (event.ctrlKey) {
            event.dataTransfer.dropEffect = 'copy'
        } else {
            event.dataTransfer.dropEffect = 'move'
        }
    }, {capture: true})
    this.domNode.addEventListener('mousedown', (event) => {
        event.stopPropagation()
    }, {passive: true})
    this.domNode.addEventListener('drop', event => {
        event.preventDefault()
    })
    this.domNode.addEventListener('dragover', event => {
        event.preventDefault()
    })
    this.domNode.addEventListener('contextmenu', event => {
        event.preventDefault()
        if (KAIROS.getState('startSetRelation')) {
            const source = KAIROS.getState('startSetRelation')
            this.setRelation(source, this)
            .then(() => {
                source.hideRelation()
                KAIROS.setState('lockShowHideRelation', !KAIROS.getState('lockShowHideRelation'))
            })
            KAIROS.unsetState('startSetRelation')
            return
        }

        if (KAIROS.getState('lockShowHideRelation')) {
            this.hideRelation()
        } else {
            this.select()
            this.showRelation()
            KAIROS.setState('startSetRelation', this)
        }
        KAIROS.setState('lockShowHideRelation', !KAIROS.getState('lockShowHideRelation'))
    })
    this.relations = new Map()
    this.shownRelations = []
    this.loadRelation()
    this.domNode.addEventListener('mouseenter', event => {
        if (KAIROS.getState('lockShowHideRelation')) { return }
        this.showRelation()
    })
    this.domNode.addEventListener('mouseleave', event => {
        if (KAIROS.getState('lockShowHideRelation')) { return }
        this.hideRelation()
    })
    this.domNode.addEventListener('click', (event) => {
        if (KAIROS.getState('cutToolActive')) { return }
        this.popDetails()
    })
    this.domNode.addEventListener('dblclick', (event) => {
        event.stopPropagation()
        if (this.poptimeout) { clearTimeout(this.poptimeout) }
        this.renderForm()
        .then(domNode => {
            const klateral = new KLateral()
            const ktab = klateral.add(domNode, { 
              title: `Réservation ${this.object.get('uid')}:${this.object.get('version')}`,
              id: this.object.get('uid')
            })
            this.addEventListener('close', event => {
                ktab.close()
            })
        })
    })
    object.addEventListener('update', this.render.bind(this))
    const affaire = this.object.getRelation('kaffaire')
    if (affaire) {
        affaire.addEventListener('update', this.render.bind(this))
    }
    object.addEventListener('delete', this.deleteMe.bind(this))

    object.bindUINode(this)
}

KUIReservation.prototype.setRelation = function (source, closure) {
    return new Promise(resolve => {
        fetch(`${KAIROS.getBase()}/store/Relation/_query`, {
            method: 'POST',
            body: JSON.stringify({'#and': {
                source: source.object.get('id'),
                closure: closure.object.get('id')
            }})
        })
        .then(response => {
            if (!response.ok) { resolve();  return }
            return response.json()
        })
        .then(result => {
            if (result.length > 0) {
                return fetch(`${KAIROS.getBase()}/store/Relation/${result.data[0].id}`, {method: 'DELETE', body: JSON.stringify({id: result.data[0].id})})
            } else {
                return fetch(`${KAIROS.getBase()}/store/Relation`, {method: 'POST', body: JSON.stringify({source: source.object.get('id'), closure: closure.object.get('id')})})
            }
        })
        .then(result => {
            source.unselect()
            Promise.allSettled(([
                source.loadRelation(),
                closure.loadRelation()
            ]))
            .then(_ => {
                source.showRelation()
            })
            resolve()
        })
    })
}

KUIReservation.prototype.showRelation = function (from = []) {
    if (from.indexOf(this.object.get('id')) !== -1) { return }
    from.push(this.object.get('id'))
    this.relationPromise
    .then(relations => {
        const ostore = new KObjectGStore()
        for (const relation of relations) {
            if (this.relations.has(`${relation.source},${relation.closure}`)) {
                const displayedRelation = this.relations.get(`${relation.source},${relation.closure}`)
                if(displayedRelation.leaderline) {
                    if (!displayedRelation.source.domNode.parentNode || !displayedRelation.closure.domNode.parentNode) {
                        displayedRelation.source.hideRelation([this.object.get('id')])
                        displayedRelation.closure.hideRelation([this.object.get('id')])
                        displayedRelation.leaderline.remove()
                        this.relations.delete(`${relation.source},${relation.closure}`)
                    } else {
                        displayedRelation.leaderline.position()
                    }
                } else {
                    if (!displayedRelation.source.domNode.parentNode ||
                        !displayedRelation.closure.domNode.parentNode) 
                    {
                        continue
                    }
                    const end1 = displayedRelation.source.object.get('end')
                    const end2 = displayedRelation.closure.object.get('end')
                    const leaderline = this.newLeaderLine({
                        source: displayedRelation.source.domNode,
                        closure: displayedRelation.closure.domNode, 
                        middleLabel: displayedRelation.entry.name,
                        color: end1.getTime() - end2.getTime() < 0 ? 'red' : 'green'
                    })
                    if (!leaderline) { continue }
                    displayedRelation.leaderline = leaderline
                    this.relations.set(`${relation.source},${relation.closure}`, displayedRelation)
                }
                continue
            }

            if (relation.source === this.object.get('id')) {
                const object = ostore.search('kreservation', 'id', relation.closure)
                if (!object) { continue }
                const ui = object.getUINode()
                if (!ui) { continue }
                if (ui.domNode.parentNode) {
                    const leaderline = this.newLeaderLine({
                        start: this.domNode,
                        end: ui.domNode,
                        middleLabel: relation.name,
                        color: ((new Date(this.object.get('end'))).getTime() - (new Date(object.get('begin'))).getTime() > 0) ? 'red' : 'green'
                    })
                    if (!leaderline) { continue }
                    this.relations.set(`${relation.source},${relation.closure}`, {
                        leaderline: leaderline,
                        source: this,
                        closure: ui,
                        entry: relation
                    })
                    ui.showRelation(from)
                    this.shownRelations.push(ui)
                } else {
                    const color = ((new Date(this.object.get('end'))).getTime() - (new Date(object.get('begin'))).getTime() > 0) ? 'red' : 'green'
                    const node = document.getElementById(object.get('target'))
                    const leaderline = this.newLeaderLine({
                        start: this.domNode,
                        end: node,
                        middleLabel: relation.name,
                        color: color,
                        endSocket: color === 'red' ? 'left' : 'right'
                    })
                    if (!leaderline) { continue }
                    this.relations.set(`${relation.source},${relation.closure}`, {
                        leaderline: leaderline,
                        source: this,
                        closure: {domNode: node},
                        entry: relation,
                    })
                }
            } else {
                const object = ostore.search('kreservation', 'id', relation.source)
                if (!object) { continue }
                const ui = object.getUINode()
                if (ui.domNode.parentNode) {
                    ui.showRelation(from)
                    this.shownRelations.push(ui)
                } else {
                    const color = ((new Date(this.object.get('begin'))).getTime() - (new Date(object.get('end'))).getTime() < 0) ? 'red' : 'green'
                    const node = document.getElementById(object.get('target'))
                    const leaderline = this.newLeaderLine({
                        start: node,
                        end: this.domNode,
                        middleLabel: relation.name,
                        color: color,
                        endSocket: color === 'red' ? 'left' : 'right'
                    })
                    if (!leaderline) { continue }
                    this.relations.set(`${relation.source},${relation.closure}`, {
                        leaderline: leaderline,
                        source: this,
                        closure: {domNode: node},
                        entry: relation,
                    })
                }
            }
        }
    })
}

KUIReservation.prototype.hideRelation = function (from = []) {
    if (from.indexOf(this.object.get('id')) !== -1) { return }
    from.push(this.object.get('id'))
    for (const others of this.shownRelations) {
        others.hideRelation(from)
    }
    this.shownRelations = []
    for (const [k, o] of this.relations) {
        this.relations.delete(k)
        o.leaderline.remove()
    }
}


KUIReservation.prototype.loadRelation = function () {
    this.relationPromise = new Promise(resolve => {
        fetch(`${KAIROS.getBase()}/store/Relation/_query`, {
            method: 'POST',
            body: JSON.stringify({
                '#or': {
                    source: this.object.get('id'),
                    closure: this.object.get('id')
                }
            })
        })
        .then(response => {
            if (!response.ok) { resolve([]); return }
            return response.json()
        })
        .then(result => {
            if (result.length <= 0) { resolve([]); return }
            resolve(result.data)
        })
    })
}

KUIReservation.prototype.newLeaderLine = function (options = {}) {
    options.path = 'fluid'
    options.size = 6
    options.startPlug = 'square'
    options.endPlug = 'arrow2'
    try {
        return new LeaderLine(options)
    } catch(e) {
        return null
    }
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

KUIReservation.prototype.popDetails = function () {
    this.select()
    if (this.detailsPopped) {
        this.unpopDetails()
    } else {
        const div = document.createElement('DIV')

        div.classList.add('k-reservation-details')
        const affaire = this.object.getRelation('kaffaire')
        if (!affaire) { resolve(null); return }
        const project = affaire.getRelation('kproject')
        if (!project) { resolve(null); return }
        //const step = new KStepProgressUI()

        div.innerHTML = `
        <div class="k-command">
            <button data-action="begin-am" class="ui k-small">Commence le matin</button><button data-action="begin-pm" class="ui k-small">Commence l'après-midi</button>
            <button data-action="end-am" class="ui k-small">Termine le matin</button><button data-action="end-pm" class="ui k-small">Termine l'après-midi</button>
        </div>
        <div class="k-progress"></div>
        <div class="k-content">
            <div class="k-field uid"><span class="k-label">Référence projet</span><span class="k-value">${project.getFirstTextValue('', 'reference')}</span></div>
            <div class="k-field uid"><span class="k-label">Nom projet</span><span class="k-value">${project.getFirstTextValue('', 'name')}</span></div>

            <div class="k-field reference"><span class="k-label">Référence travail</span><span class="k-value">${affaire.getFirstTextValue('', 'reference')}</span></div>
            <div class="k-field description"><span class="k-label">Description travail</span><span class="k-value">${affaire.getFirstTextValue('', 'description')}</span></div>
            <div class="k-field remark"><span class="k-label">Remarque</span><span class="k-value">${this.object.getFirstTextValue('', 'comment')}</span></div>
        </div>`
        //div.querySelector('.k-progress').appendChild(step.domNode)
        div.querySelector('.k-command').addEventListener('click', this.doCommand.bind(this))
        document.body.appendChild(div)
        this.detailsPopped = [Popper.createPopper(this.domNode, div), div]
        KClosable.new(div, {function: this.unpopDetails.bind(this), mouse: true, parent: this.domNode})
    }
}

KUIReservation.prototype.unpopDetails = function () {
    if (!this.detailsPopped) { return false }
    this.unselect()
    const node = this.detailsPopped[1]
    window.requestAnimationFrame(() => {
        node.parentNode.removeChild(node)
    })
    this.detailsPopped[0].destroy()
    this.detailsPopped = undefined
    return true
}

KUIReservation.prototype.doCommand = function (event) {
    const action = event.target.dataset.action


    switch(action) {
        case 'begin-am':
            (() => {
                const day = new KDate(this.object.get('begin'))
                const hours = KVDays.getAM(day, KAIROS)
                if (hours.length > 0) {
                    const hour = hours.shift()
                    const [h, m] = KVDays.dec2HM(hour.shift())
                    day.setHours(h, m, 0, 0)
                    const store = new KStore('kreservation')
                    this.object.set('begin', day)
                    store.set(this.object)
                }
            })()
            break
        case 'begin-pm':
            (() => {
                const day = new KDate(this.object.get('begin'))
                const hours = KVDays.getPM(day, KAIROS)
                if (hours.length > 0) {
                    const hour = hours.shift()
                    const [h, m] = KVDays.dec2HM(hour.shift())
                    day.setHours(h, m, 0, 0)
                    const store = new KStore('kreservation')
                    this.object.set('begin', day)
                    store.set(this.object)
                }
            })()
            break
        case 'end-am':
            (() => {
                const day = new KDate(this.object.get('end'))
                const hours = KVDays.getAM(day, KAIROS)
                if (hours.length > 0) {
                    const hour = hours.pop()
                    const [h, m] = KVDays.dec2HM(hour.pop())
                    day.setHours(h, m, 0, 0)
                    const store = new KStore('kreservation')
                    this.object.set('end', day)
                    store.set(this.object)
                }
            })()
            break
        case 'end-pm':
            (() => {
                const day = new KDate(this.object.get('end'))
                const hours = KVDays.getPM(day, KAIROS)
                if (hours.length > 0) {
                    const hour = hours.pop()
                    const [h, m] = KVDays.dec2HM(hour.pop())
                    day.setHours(h, m, 0, 0)
                    const store = new KStore('kreservation')
                    this.object.set('end', day)
                    store.set(this.object)
                }
            })()
            break
    }
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
    if (this.detailsPopped) { this.unpopDetails() }
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
            locked: {label: 'Verrouillée', type: 'on-off'},
            _kproject_name: {label: 'Projet', readonly: true},
            begin: {label: 'Début', type: 'datehour', readonly: this.object.get('locked') === '1'},
            end: {label: 'Fin', type: 'datehour', readonly: this.object.get('locked') === '1'},
            time: {label: 'Durée', type: 'hour', readonly: this.object.get('locked') === '1'},
            comment: {label: 'Remarque', type: 'multitext', readonly: this.object.get('locked') === '1'},
            creator: {label: 'Responsable', type: 'kstore', storeType: 'kentry', query: {disabled: 0}, readonly: this.object.get('locked') === '1'},
            technician: {label: 'Chef projet', type: 'kstore', storeType: 'kentry', query: {disabled: 0}, readonly: this.object.get('locked') === '1'},
            status: {label: 'Type', type: 'kstore', storeType: 'kstatus', query: {type: 1}, readonly: this.object.get('locked') === '1'},

        })
        .then(domNode => {
            for (const fieldset of form.getElementsByTagName('FIELDSET')) {
                if (fieldset.getAttribute('name') === 'reservation') {
                    fieldset.appendChild(domNode)
                    break
                }
            }
        })

        rform.addReadonlySwitch('locked', (name) => {
            switch (name) {
                default: return null
                case 'begin': 
                case 'end':
                case 'time':
                case 'comment':
                case 'creator':
                case 'techican':
                case 'status':
                    return this.object.get('locked') === '1'

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

KUIReservation.prototype.select = function () {
    if (!this.selected) {
        this.selected = true
        this.domNode.classList.add('k-selected')
    } else {
        this.selected = false
        this.domNode.classList.remove('k-selected')
    }
}

KUIReservation.prototype.unselect = function () {
    if (this.selected) {
        this.selected = false
        this.domNode.classList.remove('k-selected')
    }
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

            const beginDate = new KDate(this.object.get('begin'))
            const endDate = new KDate(this.object.get('end'))
            let leftbox = this.Viewport.getRelativeColFromDate(beginDate)
            let rightbox = this.Viewport.getRelativeColFromDate(endDate)
            let gap = null
            let virtualEnd = null
            if (leftbox === Infinity) { this.removeDomNode(); resolve(null); return }
            if (leftbox < 0) {
                if (rightbox < 0) {
                    this.removeDomNode();
                    resolve(null);
                    return
                }

            }

            let width = 0
            const left = leftbox * this.Viewport.get('day-width') + this.Viewport.get('margin-left')
            let offset = KVDays.getVirtualSeconds(beginDate.getHours(), beginDate.getMinutes(), KAIROS) * this.Viewport.get('second-width')
            if (rightbox === Infinity) { width = this.Viewport.get('viewport-width') - (left + offset) }
            else {
                width = Math.abs(leftbox-rightbox) * this.Viewport.get('day-width') + KVDays.getVirtualSeconds(endDate.getHours(), endDate.getMinutes(), KAIROS) * this.Viewport.get('second-width') - offset
            }

            if (width < 10) { width = 10}
 
            this.props.set('left', left + offset )          
            this.props.set('width', width)

 
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
                        <div class="color-bar"><div class="k-progress k-progress-${String(Math.ceil(parseInt(affaire.getFirstTextValue('0', 'progress')) / 5) * 5)}"></div></div>`
                        this.domNode.style.setProperty('--kreservation-project-color', `${color}`)
                }
                if (this.detailsPopped) { this.detailsPopped[0].update() }
                if (this.shownRelations.length > 0) { this.showRelation() }
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
    if (this.detailsPopped) { this.unpopDetails() }
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
    if (this.detailsPopped) { this.unpopDetails() }
}