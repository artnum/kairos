function KUIReservation (object, options = {readonly: false, copy: false}) {
    if (options.copy) { 
        this.copy = true
        options.readonly = true
    }
    const uiNode = object.getUINode()
    if (uiNode) { return uiNode }
    this.EvtTarget = new EventTarget()
    this.object = object
    this.props = new Map()
    this.Viewport = new KView()
    this.parent = null
    this.copy = false
    this.original = null
    this.copyCount = 0
    this.smallView = false
    if (options.copy) { 
        this.original = options.copy
        this.original.copyCount++
        this.copy = true
    }
    this.eventInstalled = []
    this.id = object.get('uuid')
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('kreservation')
    this.positionFixed = false
    if (!options.readonly) { this.domNode.setAttribute('draggable', true) }

    if (!this.copy) { this.domNode.id = this.object.get('uuid') }
    else { this.domNode.id = `${this.object.get('uuid')}-copy-${this.original.copyCount}`}

    this.kaffaire = object.getRelation('kaffaire')
    if (this.kaffaire) {
        this.kproject = this.kaffaire.getRelation('kproject')
    }
    if (this.kproject) {
        this.domNode.dataset.kproject = this.kproject.get('uid')
    }
    if (!options.readonly) {
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
    }
    this.relations = new Map()
    this.shownRelations = []
    this.loadRelation()
    if (!options.readonly) {
        this.domNode.addEventListener('mouseenter', event => {
            const other = JSON.parse(this.object.get('other'))
            if (other) {
                (() => {
                    this.setUpOtherLeaderLine = new Promise(resolve => {                   
                        if (!other.link) { return }
                        if (!other.link.to) { return }
                        const store = new KStore('kreservation')
                        store.get(other.link.to)
                        .then(otherNode => {
                            if (!otherNode) { return }
                            const otherDom = document.getElementById(otherNode.get('uuid'))
                            if (!otherDom) { return }
                            if (this.otherLeaderLine) { this.otherLeaderLine.remove() }
                            if (other.link.direction === 'left') {
                                this.otherLeaderLine = new LeaderLine(this.domNode, otherDom, {dash: {animation: true}})
                            } else {
                                this.otherLeaderLine = new LeaderLine(otherDom, this.domNode, {dash: {animation: true}})
                            }
                            resolve()
                        })
                    })
                })()
            }
            if (KAIROS.getState('lockShowHideRelation')) { return }
            if (!this.hoverTime) {
                this.hoverTime = setTimeout(() => {
                    const affaire = this.object.getRelation('kaffaire')
                    if (!affaire) { return }
                    const project = affaire.getRelation('kproject')
                    if (!project) { return }            
                    const node = document.createElement('DIV')
                    node.innerHTML = `
                        <div class="k-content">
                            <div class="k-field uid"><span class="k-value">${project.getFirstTextValue('', 'reference')}</span> <span class="k-value">${project.getFirstTextValue('', 'name')}</span></div>
                            <div class="k-field reference"><span class="k-value">${affaire.getFirstTextValue('', 'reference')}</span> <span class="k-value">${affaire.getFirstTextValue('', 'description')}</span></div>
                        </div>
                    `
                    KMouse(node)
                }, 800)
            }
            this.showRelation()
        })
    }
    if (!options.readonly) {
        this.domNode.addEventListener('mouseleave', event => {
            if (this.setUpOtherLeaderLine) {
                this.setUpOtherLeaderLine
                .then(() => {
                    this.otherLeaderLine.remove()
                    this.otherLeaderLine = null
                    this.setUpOtherLeaderLine = null
                })
            }
            if (KAIROS.getState('lockShowHideRelation')) { return }
            if (this.hoverTime) { window.clearTimeout(this.hoverTime); this.hoverTime = undefined}
            KMouse.end()
            this.hideRelation()
        })
    }
    this.domNode.addEventListener('click', (event) => {
        if (KAIROS.getState('cutToolActive')) { return }
        
        this.popDetails()
    })
    this.domNode.addEventListener('dblclick', (event) => {
        event.stopPropagation()
        if (this.poptimeout) { clearTimeout(this.poptimeout) }
        this.renderForm()
        .then(domNode => {
            const other = JSON.parse(this.object.get('other'))
            let waitOther = Promise.resolve(false)
            if (other) {
                if (other.link && other.link.to) {
                    waitOther = new Promise((resolve) => {
                        const kstore = new KStore('kreservation')
                        kstore.get(other.link.to)
                        .then(kobject => {
                            if (kobject.get('deleted') === null) { return resolve(true) }
                            resolve(false)
                        })
                        .catch(_ => {
                            resolve(false)
                        })
                    })
                }
            }
            waitOther.then(replan => {
                const action = [                       
                    {name: 'delete', label: 'Supprimer', type: 'danger'}
                ]
                if ((other && other.link && other.link.direction === 'left') || !other) {
                    action.unshift({name: 'duplicate-at-end', label: replan ? 'Replanifier la fin' : 'Créer la fin'})
                }
                const klateral = new KLateral()
                const ktab = klateral.add(domNode, { 
                    title: `Réservation ${this.object.get('uid')}:${this.object.get('version')}`,
                    id: this.object.get('uid'),
                    action: action
                })
                if (ktab) {
                    ktab.addEventListener('k-action', event => {
                        this.dispatchEvent(new CustomEvent(event.detail.action, {detail: {tab: event.detail.tab, target: event.detail.target}}))
                    })
                    ktab.addEventListener('focus', () => {
                        this.select()
                        this.showRelation()
                    })
                    ktab.addEventListener('blur', () => {
                        this.unselect()
                        this.hideRelation()
                    })
                    this.addEventListener('close', event => {
                        ktab.close()
                    })
                }
                this.select()
                this.showRelation()
            })
        })
    })

    this.domNode.addEventListener('mousedown', (event) => {
        event.stopPropagation()
    }, {passive: true})
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
    if (this.smallView) { return }
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
                    if (!displayedRelation.source.domNode || displayedRelation.closure.domNode) { continue }
                    const leaderline = this.newLeaderLine({
                        start: displayedRelation.source.domNode,
                        end: displayedRelation.closure.domNode, 
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
                if (!ui.domNode) { continue }
                if (ui.domNode.parentNode) {
                    let color = ((new Date(this.object.get('end'))).getTime() - (new Date(object.get('begin'))).getTime() > 0) ? 'red' : 'green'
                    if ((new KDate(this.object.get('begin'))).dateStamp() === (new KDate(object.get('begin'))).dateStamp()) {
                        color = 'blue';
                    }
                    const leaderline = this.newLeaderLine({
                        start: this.domNode,
                        end: ui.domNode,
                        middleLabel: relation.name,
                        color: color
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
                    let color = ((new Date(this.object.get('end'))).getTime() - (new Date(object.get('begin'))).getTime() > 0) ? 'red' : 'green'
                    if ((new KDate(this.object.get('begin'))).dateStamp() === (new KDate(object.get('begin'))).dateStamp()) {
                        color = 'blue';
                    }
                    let relative = 'right'
                    if (color === 'red') { relative = 'left' }
                    if (color === 'blue') {
                        relative = 'top'
                    }
                    const node = document.getElementById(object.get('target'))
                    if (!node) { continue }
                    const leaderline = this.newLeaderLine({
                        start: this.domNode,
                        end: node,
                        middleLabel: relation.name,
                        color: color,
                        _relative: relative
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
                if (!ui) { continue }
                if (ui.domNode.parentNode) {
                    ui.showRelation(from)
                    this.shownRelations.push(ui)
                } else {
                    let color = ((new Date(this.object.get('begin'))).getTime() - (new Date(object.get('end'))).getTime() < 0) ? 'red' : 'green'
                    if ((new KDate(this.object.get('begin'))).dateStamp() === (new KDate(object.get('begin'))).dateStamp()) {
                        color = 'blue';
                    }
                    let relative = 'right'
                    if (color === 'red') { relative = 'left' }
                    if (color === 'blue') {
                        relative = 'top'
                    }
                    const node = document.getElementById(object.get('target'))
                    if (!node) { continue }
                    const leaderline = this.newLeaderLine({
                        start: node,
                        end: this.domNode,
                        middleLabel: relation.name,
                        color: color,
                        _relative: relative,
                        _reverse: true
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
    options.size = 5
    options.startPlug = 'disc'
    options.endPlug = 'arrow3'

    if (options._reverse) {
        options.end = LeaderLine.pointAnchor(options.end, {x: '50%', y: '50%'})
        if (options._relative) {
            switch (options._relative) {
                case 'left':
                    options.start = LeaderLine.pointAnchor(options.start, {x: '0%'})
                    break;
                case 'right':
                    options.start = LeaderLine.pointAnchor(options.start, {x: '100%'})
                    break
            }
        } else {
            switch(options.color) {
                case 'green':
                    options.start = LeaderLine.pointAnchor(options.start, {x: '0%', y: '50%'})
                    break
                case 'red':
                    options.start = LeaderLine.pointAnchor(options.start, {x: '100%', y: '50%'})
                    break
                case 'blue':
                    options.start = LeaderLine.pointAnchor(options.start, {x: '50%', y: '50%'})
                    break

            }
        }
    } else {
        options.start = LeaderLine.pointAnchor(options.start, {x: '50%', y: '50%'})
        if (options._relative) {
            switch (options._relative) {
                case 'left':
                    options.end = LeaderLine.pointAnchor(options.end, {x: '0%'})
                    break;
                case 'right':
                    options.end = LeaderLine.pointAnchor(options.end, {x: '100%'})
                    break
            }
        } else {
            switch(options.color) {
                case 'green':
                    options.end = LeaderLine.pointAnchor(options.end, {x: '0%', y: '50%'})
                    break
                case 'red':
                    options.end = LeaderLine.pointAnchor(options.end, {x: '100%', y: '50%'})
                    break
                case 'blue':
                    options.end = LeaderLine.pointAnchor(options.end, {x: '50%', y: '50%'})
                    break

            }
        }
    }
    delete options._reverse
    delete options._relative

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

KUIReservation.prototype.highlight = function () {
    const kstate = KState(this)
    if (kstate.get()) { const x = kstate.get().lowlight() }
    kstate.set(this)

    const affaire = this.object.getRelation('kaffaire')
    if (!affaire) { return }
    const project = affaire.getRelation('kproject')
    if (!project) { return }
    const color = `hsla(0, 100%, 50%, 1)`
    const nodes = document.querySelectorAll(`[data-kproject="${project.get('uid')}"]`)
    for (const node of nodes ){
        window.requestAnimationFrame(() => { 
            if (!node) { return }
            node.style.setProperty('--selected-color', color)
            node.classList.add('selected')
        })
    }
    (new KView()).addRunOnMove(this.highlight.bind(this), `prj-${project.get('uid')}`)
}

KUIReservation.prototype.lowlight = function () {
    const kstate = KState(this)
    if (kstate.get()) { kstate.unset() }

    const affaire = this.object.getRelation('kaffaire')
    if (!affaire) { return }
    const project = affaire.getRelation('kproject')
    if (!project) { return }
    (new KView()).delRunOnMove(`prj-${project.get('uid')}`)
    const nodes = document.querySelectorAll(`[data-kproject="${project.get('uid')}"]`)
    for (const node of nodes ) {
        window.requestAnimationFrame(() => {
            if (!node) { return }
            node.style.removeProperty('--selected-color')
            node.classList.remove('selected')
        })
    }
}

KUIReservation.prototype.popDetails = function () {
    const affaire = this.object.getRelation('kaffaire')
    if (!affaire) { return }
    const project = affaire.getRelation('kproject')
    if (!project) { return }

    if (this.domNode.classList.contains('selected')) {
        this.lowlight()
    } else {
        this.highlight()
    }

    this.select()
    if (this.detailsPopped) { return this.unpopDetails() }

    const div = document.createElement('DIV')
    div.classList.add('k-reservation-details')
    //const step = new KStepProgressUI()

    if (this.smallView) {
        div.classList.add('small-view')
        div.innerHTML = `
        <div class="k-content">
            <div class="k-field uid"><span class="k-label">Référence projet</span><span class="k-value">${project.getFirstTextValue('', 'reference')}</span></div>
            <div class="k-field uid"><span class="k-label">Nom projet</span><span class="k-value">${project.getFirstTextValue('', 'name')}</span></div>

            <div class="k-field reference"><span class="k-label">Référence travail</span><span class="k-value">${affaire.getFirstTextValue('', 'reference')}</span></div>
            <div class="k-field description"><span class="k-label">Description travail</span><span class="k-value">${affaire.getFirstTextValue('', 'description')}</span></div>
            <div class="k-field remark"><span class="k-label">Remarque</span><span class="k-value">${this.object.getFirstTextValue('', 'comment')}</span></div>
        </div>`
        div.style.setProperty('z-index', KAIROS.zMax())
        div.style.setProperty('position', 'fixed')
        div.style.setProperty('top', '0px')
        div.style.setProperty('left', `${this.Viewport.get('margin-left')}px`)
        document.body.appendChild(div)
        this.detailsPopped = [{destroy: function () { return} }, div]
    } else {
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
        </div>
        <div class="k-command">
            <button data-action="print-affaire" class="ui k-small">Imprimer</button>
        </div>`
        for (const kcomm of div.querySelectorAll('.k-command')) {
            kcomm.addEventListener('click', this.doCommand.bind(this))
        }
        document.body.appendChild(div)
        this.detailsPopped = [Popper.createPopper(this.domNode, div), div]
    }
    const closable = new KClosable()
    closable.add(div, {function: this.unpopDetails.bind(this), mouse: true, parent: this.domNode})
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
        case 'print-affaire':
            (() => {
                const kaffaire = this.object.getRelation('kaffaire')
                if (!kaffaire) { return }
                const kproject = kaffaire.getRelation('kproject')
                if (!kproject) { return }
                window.open(KAIROS.URL(`${KAIROS.kaalURL}/admin/exec/export/bon.php?pid=${kproject.id}&travail=${kaffaire.id}`), '_blank')
            })()
            break
    }
}

KUIReservation.prototype.reload = function (object) { }

KUIReservation.prototype.fixPosition = function () {
    this.positionFixed = true
}

KUIReservation.prototype.setOrder = function (order) {
    this.object.set('displayOrder', order)
    window.requestAnimationFrame(() => { this.domNode.style.setProperty('order', order) })
    if (!this.copy) {
        const kstore = new KObjectGStore()
        const duplicates = kstore.getDuplicate(this.object.getType(), this.object.get('uid'))
        if (duplicates) {
            duplicates.forEach(o => o.getUINode().setOrder(order))
        }
    }
}

KUIReservation.prototype.getOrder = function () {
    if (!this.object.has('displayOrder')) { return null }
    return this.object.get('displayOrder')
}

KUIReservation.prototype.setTop = function (top) {
    if (this.positionFixed) { return }
    this.top = top
    window.requestAnimationFrame(() => { this.domNode.style.top = `${top}px` })
}

KUIReservation.prototype.setHeight = function (height) {
    if (this.positionFixed) { return }
    this.height = height
    window.requestAnimationFrame(() => { 
        this.domNode.style.height = `${height}px`
        this.domNode.style.maxHeight = `${height}px`
    })
}

KUIReservation.prototype.setWidth = function (width) {
    if (this.positionFixed) { return }
    this.width = width
    window.requestAnimationFrame(() => { 
        this.domNode.style.height = `${width}px`
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
        `

        const rform = new KFormUI(this.object)
        rform.render({
            id: {label: 'Numéro', readonly: true},
            version: {label: 'Version', readonly: true},
            locked: {label: 'Verrouillée', type: 'on-off'},
            closed: {label: 'Terminé', type: 'on-off'},
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
        if (!this.eventInstalled.includes('delete')) {
            this.addEventListener('delete', event => {
                console.log(event.detail)
                KConfirm(`Supprimer la réservation ${reservation.get('uid')} ?`, event.detail.target)
                .then(confirmed => {
                    if (!confirmed) { return }
                    const kstore = new KStore('kreservation')
                    kstore.delete(reservation.get('uid')) 
                    .then(result => {
                        if (!result) { KAIROS.error('ERR:Server'); return; }
                        reservation.getUINode().unrender()
                        reservation.destroy()
                        this.dispatchEvent(new CustomEvent('close', {detail: this}))
                    })
                })
            })
            this.eventInstalled.push('delete')
        }
        if (!this.eventInstalled.includes('duplicate-at-end')) {
            this.addEventListener('duplicate-at-end', event => {
                const other = JSON.parse(reservation.get('other'))
                if (other) {
                    if (other.link && other.link.to) {
                        const travail = reservation.getRelation('kaffaire')
                        if (travail.get('end')) {
                            const kstore = new KStore('kreservation')
                            kstore.get(other.link.to)
                            .then(clone => {
                                if (clone.get('deleted') !== null) {
                                    clone = reservation.clone()
                                }
                                const begin = new Date(travail.get('end'))
                                const end = new Date(travail.get('end'))
                                const beginHour = KVDays.dec2HM(KVDays.getDayBeginEnd(begin, KAIROS)[0])
                                const endHour = KVDays.dec2HM(KVDays.getDayBeginEnd(begin, KAIROS)[1])
                                begin.setHours(beginHour[0], beginHour[1], 0, 0)
                                end.setHours(endHour[0], endHour[1], 0, 0)
                                clone.set('begin', begin)
                                clone.set('end', end)
                                clone.set('other', JSON.stringify({
                                    link: {
                                        to: reservation.get('uid'),
                                        direction: 'right'
                                    }
                                }))
                                KStore.save(clone)
                                .then(clone => {
                                    reservation.set('other', JSON.stringify({
                                        link: {
                                            to: clone.get('uid'),
                                            direction: 'left'
                                        }
                                    }))
                                    KStore.save(reservation)
                                })
                            })
                        }
                    }
                    return                    
                }
                const travail = reservation.getRelation('kaffaire')
                if (travail.get('end')) {
                    const clone = reservation.clone()
                    const begin = new Date(travail.get('end'))
                    const end = new Date(travail.get('end'))
                    const beginHour = KVDays.dec2HM(KVDays.getDayBeginEnd(begin, KAIROS)[0])
                    const endHour = KVDays.dec2HM(KVDays.getDayBeginEnd(begin, KAIROS)[1])
                    begin.setHours(beginHour[0], beginHour[1], 0, 0)
                    end.setHours(endHour[0], endHour[1], 0, 0)
                    clone.set('begin', begin)
                    clone.set('end', end)
                    clone.set('other', JSON.stringify({
                        link: {
                            to: reservation.get('uid'),
                            direction: 'right'
                        }
                    }))
                    KStore.save(clone)
                    .then(clone => {
                        reservation.set('other', JSON.stringify({
                            link: {
                                to: clone.get('uid'),
                                direction: 'left'
                            }
                        }))
                        KStore.save(reservation)
                    })
                }
            })
            this.eventInstalled.push('duplicate-at-end')
        }
        /*const buttons = MButton.parse(form)
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
        }*/
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
        if (!this.copy) {
            if (!this.lastObjectChange) {
                this.lastObjectChange = this.object.get('last-change')
            } else {
                if (this,this.lastObjectChange === this.object.get('last-change')) { changeDom = false }
            }

            if (!this.domProduced) {
                changeDom = true
            }
        }

        const kstore = new KStore('kstatus')
        kstore.get(this.object.get('status'))
        .then(status => {
            const kview = new KView()
            const color = status ? status.color || 'lightgray' : 'lightgray'
            const affaire = this.object.getRelation('kaffaire')
            if (!affaire) { resolve(null); return }
            const project = affaire.getRelation('kproject')
            if (!project) { resolve(null); return }

            let direction = ''
            if (this.object.get('other')) {
                const other = JSON.parse(this.object.get('other'))
                if (other.link && other.link.direction) {
                    direction = other.link.direction !== 'right' ? '<i class="fas fa-long-arrow-alt-right"></i>' : '<i class="fas fa-long-arrow-alt-left"></i>'
                }
            }
            const ended = (affaire.get('closed') !== '0') || (this.object.get('closed') !== null && this.object.get('closed') !== '0')
            const folder = affaire.get('folder') !== '0'
            const locked = parseInt(this.object.get('locked'))

            const options = (locked || folder || direction !== '')

            let gap = null
            let virtualEnd = null
            let width = 40
            let left = 0
            let offset = 0
            if (this.width) { width = this.width }
            if (!this.copy) {
                const beginDate = new KDate(this.object.get('begin'))
                const endDate = new KDate(this.object.get('end'))
                let leftbox = this.Viewport.getRelativeColFromDate(beginDate)
                let rightbox = this.Viewport.getRelativeColFromDate(endDate)
                if (leftbox === Infinity) { this.removeDomNode(); resolve(null); return }
                if (leftbox < 0) {
                    if (rightbox < 0) {
                        this.removeDomNode();
                        resolve(null);
                        return
                    }
                    leftbox = 0
                }
                if (!isFinite(rightbox)) { rightbox = kview.get('day-count') }

                left = leftbox * this.Viewport.get('day-width') + this.Viewport.get('margin-left')
                offset = KVDays.getVirtualSeconds(beginDate.getHours(), beginDate.getMinutes(), KAIROS, beginDate) * this.Viewport.get('second-width')
                if (rightbox === Infinity) { width = this.Viewport.get('viewport-width') - (left + offset) }
                else {
                    width = Math.abs(leftbox-rightbox) * this.Viewport.get('day-width') + KVDays.getVirtualSeconds(endDate.getHours(), endDate.getMinutes(), KAIROS, endDate) * this.Viewport.get('second-width') - offset
                }
            }
 
            this.props.set('left', left + offset )          
            this.props.set('width', width)
            this.object.bindUINode(this)

            if (this.Viewport.get('day-width') <= 15) {
                this.smallView = true
                window.requestAnimationFrame(() => {
                    this.domNode.style.width = `${width.toPrecision(2)}px`
                    this.domNode.style.left = `${this.props.get('left')}px`
                    if (this.height !== undefined) {
                        this.domNode.style.height = `${this.height}px`
                    } else {
                        this.domNode.style.height = `${this.Viewport.get('entry-inner-height').toPrecision(2)}px`
                    }
    
                    if (this.top !== undefined) {
                        this.domNode.style.top = `${this.top}px`
                    }

                    this.domNode.innerHTML = `<div class="full-height color-bar"> </div>`
                    this.domNode.style.setProperty('--kreservation-project-color', `${color}`)
                    resolve(this.domNode)
                })
            } else {
                this.smallView = false
                window.requestAnimationFrame(() => {
                    if (ended) { this.domNode.classList.add('k-closed') }
                    else { this.domNode.classList.remove('k-closed') }
                    if (folder) { this.domNode.classList.add('k-folder') }
                    else { this.domNode.classList.remove('k-folder') }
                    if (locked) { this.domNode.classList.add('k-locked') }
                    else { this.domNode.classList.remove('k-locked') }
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
                                <span class="field options ${options ? 'shown' : 'hidden'}">${direction}<i class="fas fa-folder"></i><i class="fa fa-lock"></i></span>
                                <span class="field uid">${project.getFirstTextValue('', 'reference')}</span>
                                <span class="field reference">${project.getFirstTextValue('', 'name')}</span><br>
                                <span class="field description">${affaire.getFirstTextValue('', 'reference')}</span><br>
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
            }
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
    if (!this.copy) {
        const viewport = new KView()
        viewport.removeObject(`${this.object.getType()}:${this.object.get('uid')}`)
        this.parent.removeReservation(this)
    }
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