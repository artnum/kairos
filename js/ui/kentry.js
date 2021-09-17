function KUIEntry (dataObject, opts = {}) {
    this.opts = Object.assign({
        'reference': {remote: 'id'},
        'name': {remote: 'name'}
    }, opts)
    this.data = new KField(this.opts, dataObject)
    this.domNode = null
}

KUIEntry.prototype.set = function (name, value) {
    const node = this.domNode.querySelector(`span[name="${name}"]`)
    console.log(node)
    if (!node) { return }
    if (!value) { node.style.display = 'none'; return }
    switch (typeof value) {
        case 'string': node.innerHTML = value.sanitize(); return
        case 'boolean': node.innerHTML = value ? 'Oui' : 'Non'; return 
        case 'number': node.innerHTML = String(value); return
        case 'object': 
            if (Array.isArray(value)) {
                node.innerHTML = value.join(', ').sanitize()
            }
            break
        default: return
    }
}

KUIEntry.prototype.render = function () {
    return new Promise ((resolve, reject) => {
        let domRequest = Promise.resolve(this.domNode)
        if (!this.domNode) {
            domRequest = KTemplate.get(this.opts.template)
        }

        domRequest
        .then(domNode => {
            this.domNode = domNode
            this.domNode.classList.add('kentry')
            this.data.gets(['reference', 'name'])
            .then(fields => {

                console.log(fields)
                for (const [k, v] of fields) {
                    console.log(k, v)
                    this.set(k, v)
                }
                resolve(this.domNode)
            })
        })
    })
}