function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.dataObject = dataObject
    this.data = new KField(this.opts, dataObject)
    this.html = KHTML.init(this.opts.template)
    this.kview = new KView()
    this.kview.addEventListener('move', this.handleMove.bind(this))
    this.boxes = new Array(this.kview.get('day-count'))
    for (let i = 0; i < this.boxes.length; i++) {
        this.boxes[i] = new Array()
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

KUIEntry.prototype.handleMove = function (event) {
    this.getContainerDomNode()
    .then(domNode => {
        window.requestAnimationFrame(() => {
            for (let child = domNode.firstElementChild; child; child = child.nextElementSibling) {
                const left = child.getBoundingClientRect().left
                if (left + event.detail.left < this.kview.get('margin-left')) {
                    domNode.removeChild(child)
                } else {
                    child.style.left = `${left + event.detail.left}px`
                }
            }
        })
    })
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
            const entryHeight = this.kview.get('entry-height') / max
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
            uireservation.setParent(this)
        ])
        .then(([domNode, parentNode, refNode, origin]) => {
            const sec = Math.abs(origin.getTime() - new Date(reservation.get('begin')).getTime()) / 1000
            domNode.style.position = 'absolute'
            domNode.style.top = `${refNode.getBoundingClientRect().top + window.scrollY}px`
            const left = Math.round((this.kview.get('second-width') * sec) + this.kview.get('margin-left'))
            domNode.style.left = `${left}px`
            let max = 1
            let boxes = []
            let i = this.kview.computeXBox(left)
            do {
                boxes.push(this.boxes[i])
                this.boxes[i].push(uireservation)
                if (max < this.boxes[i].length) { max = this.boxes[i].length }
                i++
            } while (i < this.kview.computeXBox(left + uireservation.props.get('width')));
            
            const entryHeight = this.kview.get('entry-height') / max
            for (const box of boxes) {
                for (let i = 0; i < max; i++) {
                    if (box[i]) {
                        box[i].setTop(refNode.getBoundingClientRect().top + window.scrollY + (entryHeight * i))
                        box[i].setHeight(entryHeight)
                    }
                }
            }
            window.requestAnimationFrame(() => {
                if (domNode.parentNode) { domNode.parentNode.removeChild(domNode) }
                parentNode.appendChild(domNode)
            })
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
    const kview = new KView()
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