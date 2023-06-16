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
    this.boxes = new Array(this.kview.get('day-count'))
    for (let i = 0; i < this.boxes.length; i++) {
        this.boxes[i] = []
    }
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
        return
        const begin = uireservation.object.get('begin')
        const end = uireservation.object.get('end')
        console.log(begin, end)
        if (begin === '') {resolve(); return }
        if (end === '') { resolve() ; return }
        const kview = new KView()
        let leftbox = kview.getRelativeColFromDate(new Date(begin))
        let rightbox =  kview.getRelativeColFromDate(new Date(end))
        /*this.kview.setObjectAt(leftbox, rightbox, 0, reservation.get('id'), reservation)
        uireservation.render()*/
        if (!isFinite(leftbox)) { uireservation.removeDomNode(); resolve(); return } // begin is far away on right sid
        if (leftbox < 0) { 

            if (rightbox < 0) { uireservation.removeDomNode(); resolve(); return }
            leftbox = 0
        }
        console.log('place reservaiton 3')
        if (!isFinite(rightbox)) { rightbox = kview.get('day-count') }
        console.log('place reservaiton 4')
        console.log('boxes left', leftbox, 'right', rightbox)
        for (let i = leftbox; i <= rightbox; i++) {
            console.log('box ', i)
            if (!this.boxes[i]) { this.boxes[i] = [] }
            let isIn = false
            for (let j = 0; j < this.boxes[i].length; j++) {
                if (this.boxes[i][j].id === uireservation.id) {
                    isIn = true
                    break
                }
            }
            if (!isIn) { 
                console.log('push in box', this.boxes[i], uireservation)
                this.boxes[i].push(uireservation) 
            }
            //if (max < this.boxes[i].length) { max = this.boxes[i].length }
        }
        return resolve()
            /*
            const entryHeight = this.kview.get('entry-inner-height') / max
            for (const box of boxes) {
                if (!box) { continue }
                // sorting by id allow stable positionning over time
                box.sort((a, b) => String(a.id).localeCompare(b.id))
                for (let i = 0; i < max; i++) {
                    if (box[i]) {
                        box[i].setOrder(i)
                        box[i].setHeight(entryHeight)
                    }
                }
            }
            uireservation.render()
            .then(domNode => {
                if (!domNode) { return resolve() }
                if (!domNode.parentNode) {
                    window.requestAnimationFrame(() => {
                        parentNode.appendChild(domNode)
                    })
                }
                resolve()
            })*/
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