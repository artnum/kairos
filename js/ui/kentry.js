function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.data = new KField(this.opts, dataObject)
    this.html = KHTML.init(this.opts.template)
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
    console.log(event, this)
}