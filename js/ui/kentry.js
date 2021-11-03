function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.data = new KField(this.opts, dataObject)
    this.html = KHTML.init(this.opts.template)
    this.kview = new KView()
    this.kview.addEventListener('move', this.handleMove.bind(this))
    this.boxes = new Array(this.kview.get('day-count'))
    for (let i = 0; i < this.boxes.length; i++) {
        this.boxes[i] = new Array()
    }
    /*this.html
    .then(khtml => {
        khtml.domNode.setAttribute('draggable', true)
        khtml.domNode.addEventListener('dragstart', (event) => {
            event.target.classList.add('kdragged')
        })
        khtml.domNode.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragend')
        })
    })*/
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
                khtml.setEventListener('CreateReservation', 
                {
                    type: 'dblclick',
                    listener: this.handleEvent.bind(this)
                })
                resolve(khtml.domNode)
            })
        })
    })
}

KUIEntry.prototype.placeReservation = function (reservation) {
    const uireservation = new KUIReservation(reservation)
    Promise.all([
        uireservation.render(),
        this.getContainerDomNode(),
        this.getDomNode(),
        this.object.get('origin')
    ])
    .then(([domNode, parentNode, refNode, origin]) => {
        const sec = Math.round(Math.abs(origin.getTime() - new Date(reservation.get('begin')).getTime()) / 1000)
        domNode.style.position = 'absolute'
        domNode.style.top = `${refNode.getBoundingClientRect().top + window.scrollY}px`
        const left = this.kview.get('second-width') * sec + this.kview.get('margin-left')
        domNode.style.left = `${left}px`
        let max = 1
        let boxes = []
        for (let i = this.kview.computeXBox(left); i < this.kview.computeXBox(left + uireservation.props.get('width')); i++) {
            boxes.push(this.boxes[i])
            this.boxes[i].push(domNode)
            if (max < this.boxes[i].length) { max = this.boxes[i].length }
        }
        const entryHeight = this.kview.get('entry-height') / max
        domNode.style.top = `${refNode.getBoundingClientRect().top + window.scrollY + (entryHeight * (max - 1))}px`
        domNode.style.maxHeight = `${entryHeight}px`
        for (const box of boxes) {
            for (let i = 0; i < max; i++) {
                if (box[i]) {
                    box[i].style.top = `${refNode.getBoundingClientRect().top + window.scrollY + (entryHeight * i)}px`
                    box[i].style.maxHeight = `${entryHeight}px`
                }
            }
        }
        parentNode.appendChild(domNode)
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
            console.log(result)
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