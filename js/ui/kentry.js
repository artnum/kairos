function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.data = new KField(this.opts, dataObject)
    this.html = KHTML.init(this.opts.template)
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

KUIEntry.prototype.handleEvent = function (event) {
    const reservationStore = new KStore(KAIROS.URL(KAIROS.kreservation.store))
    this.data.get('id')
    .then(id => {
        const now = new Date()
        reservationStore.set({
            begin: now.toISOString(),
            end: new Date(now.getTime() + 86400).toISOString(),
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