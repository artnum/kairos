function KExchange (resource = null) {
    if (!KExchange._genCount) { KExchange._genCount = 0 }
    this.data = new Map()
    if (resource) { this.data.set('kid', `kid://${resource.getType()}/${resource.id}`) }
}

KExchange.parse = function (data) {
    const object = JSON.parse(data)
    const kex = new KExchange()

    for (const key of Object.keys(object)) {
        kex.set(key, object[key])
    }

    return kex
}

KExchange.prototype.toString = function () {
    const object = {}
    for (const [k, v] of this.data) {
        object[k] = v
    }

    return JSON.stringify(object)
}

KExchange.prototype.get = function (name) {
    if (name === 'src') {
        const id = this.data.get('src') 
        return document.getElementById(id)
    }
    return this.data.get(name)
}

KExchange.prototype.has = function (name) {
    return this.data.has(name)
}

KExchange.prototype.getDomId = function () {
    const randomArray = crypto.getRandomValues(new Uint8Array(8))
    return `${++KExchange._genCount}${btoa(String.fromCharCode.apply(null, randomArray))}`.replace('/', '-').replace('+', '_')
}

KExchange.prototype.set = function (name, value) {
    if (name === 'src' && value instanceof HTMLElement) {
        if (!value.id || value.id === '') { value.id =this.getDomId() }
        return this.data.set('src', value.id)
    }
    return this.data.set(name, value)
}
