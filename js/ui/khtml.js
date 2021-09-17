function KHTML () {
    this.domNode = null
    this.kevent = new KEvent(this.domNode)
}

KHTML.init = function (template) {
    return new Promise((resolve, reject) => {
        const khtml = new KHTML()
        let domRequest = Promise.resolve(khtml.domNode)
        if (!khtml.domNode) {
            domRequest = new KTemplate().get(template)
        }
        domRequest
        .then(node => {
            khtml.domNode = node
            khtml.kevent.setTarget(node)
            resolve(khtml)
        })
    })
}

KHTML.prototype.set = function (name, value) {
    const node = this.domNode.querySelector(`*[name="${name}"]`)
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

KHTML.prototype.has = function (name) {
    return this.domNode.querySelector(`*[name="${name}"]`) !== null

}

KHTML.prototype.get = function (name) {
    return this.domNode.querySelector(`*[name="${name}"]`)
}

KHTML.prototype.addEventListener = function (event, listener, options) {
    return this.kevent.addEventListener(event, listener, options)
}

KHTML.prototype.removeEventListener = function (event, listener, options) {
    return this.kevent.removeEventListener(event, listener, options)
}

KHTML.prototype.setEventListener = function (name, event) {
    return this.kevent.setEventListener(name, event)
}