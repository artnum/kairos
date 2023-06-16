function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.parentNode = null
    this.hidden = false
    this.dataObject = dataObject
    this.data = new KField(this.opts, dataObject)
    this.html = KHTML.init(this.opts.template)
    this.kview = new KView()
    this.hidden = false
    this.order = 0
    this.content = new Map()
    this.getDomNode()
    .then(domNode => {
        dataObject.get('id')
        .then(uid => {
            domNode.id = uid
        })
    })
    this.object = dataObject
}

KUIEntry.prototype.removeDomNode = function () {
    return new Promise(resolve => {
        this.getDomNode()
        .then(domNode => {
            if (!domNode.parentNode) { return resolve() }
            window.requestAnimationFrame(() => {
                this.parentNode.removeChild(domNode)
                return resolve()
            })
        })
    })
}

KUIEntry.prototype.addDomNode = function () {
    if (!this.parentNode) { return Promise.resolve() }
    return new Promise(resolve => {
        this.getDomNode()
        .then(domNode => {
            if (domNode.parentNode) { return resolve() }
            window.requestAnimationFrame(() => {
                this.parentNode.appendChild(domNode)
                return resolve()
            })
        })
    })
}

KUIEntry.prototype.setHidden = function (hidden = true) {
    this.hidden = hidden
}

KUIEntry.prototype.applyState = function () {
    return new Promise(resolve => {
        if (this.hidden) {
            this.removeDomNode()
            .then(() => {
                this.hideContent()
                return resolve()
            })
        } else {
            this.addDomNode()
            .then(() => {
                this.showContent()
                return resolve()
            })
        }
    })
}

KUIEntry.prototype.setOrder = function (order) {
    this.order = order
}

KUIEntry.prototype.hideContent = function () {
    this.hidden = true
    this.content.forEach(uireservation => {
        uireservation.unrender()
    })
}

KUIEntry.prototype.showContent = function () {
    this.hidden = false
    this.content.forEach(uireservation => {
        uireservation.render()
    })
}

KUIEntry.prototype.render = function (parentNode = null) {
    if (parentNode !== null) { this.parentNode = parentNode}
    return new Promise ((resolve, reject) => {
        this.html
        .then(khtml => {
            khtml.domNode.classList.add('kentry')
            khtml.domNode.style.order = this.order
            this.data.gets(khtml.getProperties())
            .then(fields => {
                for (const [k, v] of fields) {
                    khtml.set(k, v)
                }
                if (this.parentNode) {
                    window.requestAnimationFrame(() => {
                        this.parentNode.appendChild(khtml.domNode)
                    })
                }
                resolve(khtml.domNode)
            })
        })
    })
}

KUIEntry.prototype.removeReservation = function (reservation) {
    return new Promise((resolve, reject) => {
        const uireservation = this.content.get(reservation.id)
        this.content.delete(reservation.id)
        uireservation.unrender()
        .then(_ => resolve())
        .catch(cause => reject(cause))
    })
}

KUIEntry.prototype.placeReservation = function (reservation) {
    return new Promise((resolve, reject) => {
        if (this.hidden) { return resolve() }
        const uireservation = new KUIReservation(reservation)
        this.content.set(reservation.id, uireservation)
        uireservation.setRow(this.dataObject.id)
        uireservation.render()
        .then(_ => resolve())
        .catch(cause => reject(cause))
    })
}

KUIEntry.prototype.handleEvent = function (event) {
    const reservationStore = new KStore('kreservation')
    this.data.get('id')
    .then(id => {
        const now = new Date()
        reservationStore.set({
            begin: now.toISOString(),
            end: new Date(now.getTime() + KAIROS.defaults.reservation.duration * 3600).toISOString(),
            target: id
        })
    })
}

KUIEntry.prototype.getContainerDomNode = function () {
    return new Promise(resolve => {
        this.getDomNode()
        .then(domNode => {
            resolve(domNode.querySelector('[data-dompart="container"]'))
        })
    })
}

KUIEntry.prototype.getDomNode = function () {
    return new Promise(resolve => {
        this.html
        .then(uientry => {
            resolve(uientry.domNode)
        })
    })
}

KUIEntry.prototype.resize = function () {
}

KUIEntry.prototype.moveOrigin = function (newOrigin, oldOrigin) {}