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

KHTML.prototype.getProperties = function () {
    const propsNode = this.domNode.querySelectorAll('*[data-name]')
    const properties = []
    for (const node of propsNode) {
        if (properties.indexOf(node.dataset.name) !== -1) { continue }
        properties.push(node.dataset.name)
    }
    return properties
}

KHTML.prototype.set = function (name, value) {
    const nodes = this.domNode.querySelectorAll(`*[data-name="${name}"]`)
    if (!nodes) { return }
    for (const node of nodes) {
        if (!value) { node.style.display = 'none'; break }
        switch (typeof value) {
            case 'string': node.innerHTML = value.sanitize(); break
            case 'boolean': node.innerHTML = value ? 'Oui' : 'Non'; break 
            case 'number': node.innerHTML = String(value); break
            case 'object': 
                if (Array.isArray(value)) {
                    node.innerHTML = value.join(', ').sanitize()
                }
                break
            default: return
        }
    }
}

KHTML.prototype.has = function (name) {
    return this.domNode.querySelector(`*[data-name="${name}"]`) !== null
}

KHTML.prototype.get = function (name) {
    return this.domNode.querySelector(`*[data-name="${name}"]`)
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