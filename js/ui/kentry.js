function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.dataObject = dataObject
    this.data = new KField(this.opts, dataObject)
    this.html = KHTML.init(this.opts.template)
    this.kview = new KView()
    this.boxes = new Array(this.kview.get('day-count'))
    for (let i = 0; i < this.boxes.length; i++) {
        this.boxes[i] = []
    }
    this.getDomNode()
    .then(domNode => {
        domNode.addEventListener('dnd-drop', event => {
            console.log(event)
            const kident = `kreservation/${event.detail.element.dataset.remoteId}`
            console.log(event.detail, kident)
            kGStore = new KObjectGStore()
            let object = event.detail.ctrlKey ? kGStore.get(kident).clone() : kGStore.get(kident)
            const kstore = new KStore(object.getType())
            const [begin, end] = [new Date(object.get('begin')), new Date(object.get('end'))]
            const diff = end.getTime() - begin.getTime()
            const kview = new KView()
            const originalX = kview.getXFromDate(begin)
            const originalY = kview.getObjectRowById(object.get('target'))
            const newOrigin = new Date()
            newOrigin.setTime(kview.get('date-origin').getTime() + kview.computeXBox(event.detail.x) * 86400000)
            KVDays.initDayStartTime(newOrigin, KAIROS.days)
            begin.setTime(newOrigin.getTime())
            end.setTime(begin.getTime() + diff)
            object.set('begin', begin.toISOString())
            object.set('end', end.toISOString())
            object.set('target', domNode.id)
            kstore.set(object)
        })
        dataObject.get('id')
        .then(uid => {
            domNode.id = uid
        })
    })
    this.object = dataObject
}

KUIEntry.prototype.render = function () {
    return new Promise ((resolve, reject) => {
        this.html
        .then(khtml => {
            khtml.domNode.classList.add('kentry')
            this.data.gets(khtml.getProperties())
            .then(fields => {
                for (const [k, v] of fields) {
                    khtml.set(k, v)
                }
                resolve(khtml.domNode)
            })
        })
    })
}

KUIEntry.prototype.removeReservation = function (reservation) {
    return new Promise((resolve, reject) => {
        let boxes = []
        let max = 1
        for (let i = 0; i < this.boxes.length; i++) {
            if (!this.boxes[i]) { continue }
            for (let j = 0; j < this.boxes[i].length; j++) {
                if (this.boxes[i][j].id === reservation.id) {
                    boxes.push(this.boxes[i])
                    this.boxes[i].splice(j, 1)
                    if (this.boxes[i].length > max) { max = this.boxes[i].length }
                }
            }
        }
        this.getDomNode()
        .then(refNode => {
            const entryHeight = this.kview.get('entry-inner-height') / max
            for (const box of boxes) {
                for (let i = 0; i < box.length; i++) {
                    if (box[i]) {
                        box[i].setTop(refNode.getBoundingClientRect().top + window.scrollY + (entryHeight * i))
                        box[i].setHeight(entryHeight)
                    }
                }
            }
            resolve()
        })
    })
}

KUIEntry.prototype.placeReservation = function (reservation) {
    return new Promise((resolve, reject) => {
        const uireservation = new KUIReservation(reservation)
        Promise.all([
            uireservation.render(),
            this.getContainerDomNode(),
            this.getDomNode(),
            this.object.get('origin'),
            uireservation.setParent(this),
        ])
        .then(([domNode, parentNode, refNode, origin]) => {
            const begin = uireservation.object.get('begin')
            const end = uireservation.object.get('end')
            if (begin === '') {resolve(); return }
            if (end === '') { resolve() ; return }
            if (!domNode) { resolve(); return }
            const kview = new KView()
            let leftbox = kview.getRelativeColFromDate(new Date(begin))
            let rightbox =  kview.getRelativeColFromDate(new Date(end))
            if (!isFinite(leftbox)) { uireservation.removeDomNode(); resolve(); return } // begin is far away on right sid
            if (leftbox < 0) { 
                if (rightbox < 0) { uireservation.removeDomNode(); resolve(); return }
                leftbox = 0
            }
            if (!isFinite(rightbox)) { rightbox = kview.get('day-count') }

            domNode.style.top = `${refNode.getBoundingClientRect().top + window.scrollY}px`
            const left = leftbox * kview.get('day-width') + kview.get('margin-left')
            let max = 1
            let boxes = []
            for (let i = leftbox; i <= rightbox; i++) {
                if (!this.boxes[i]) { this.boxes[i] = [] }
                boxes.push(this.boxes[i])
                let isIn = false
                for (let j = 0; j < this.boxes[i].length; j++) {
                    if (this.boxes[i][j].id === uireservation.id) {
                        isIn = true
                        break
                    }
                }
                if (!isIn) { this.boxes[i].push(uireservation) }
                if (max < this.boxes[i].length) { max = this.boxes[i].length }
            }
            
            const entryHeight = this.kview.get('entry-inner-height') / max
            for (const box of boxes) {
                if (!box) { continue }
                for (let i = 0; i < max; i++) {
                    if (box[i]) {
                        box[i].setTop(refNode.getBoundingClientRect().top + window.scrollY + (entryHeight * i))
                        box[i].setHeight(entryHeight - 4)
                    }
                }
            }
            if (!domNode.parentNode) {
                window.requestAnimationFrame(() => {
                    parentNode.appendChild(domNode)
                })
            }
            resolve()
        })
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
        .then(result => {
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

KUIEntry.prototype.moveOrigin = function (newOrigin, oldOrigin) {
    if (!oldOrigin) { return }
    const diff = Math.floor((newOrigin.getTime() - oldOrigin.getTime()) / 86400000)
    for (i = 0; i < Math.abs(diff); i++) {
        if (diff < 0) {
            this.boxes.pop()
            this.boxes.unshift([])
        } else {
            this.boxes.shift()
            this.boxes.push([])
        }
    }
}