function KGlobal() {
    if (KGlobal._instance) { return KGlobal._instance}
    this.data = new Map()
    this.observer = new Map()
    KGlobal._instance = this
}

KGlobal.prototype.watch = function (on, name, callback) {
    if (!this.observer.has(on)) {
        this.observer.set(on, new Map())
    }

    return this.observer.get(on).set(name, callback)
}

KGlobal.prototype.unwatch = function (on, name) {
    if (!this.observer.has(on)) { return true }
    return this.observer.get(on).delete(name)
}

KGlobal.prototype.set = function(name, value) {
    if (this.observer.has(name)) {
        const old = this.data.get(name)
        this.observer.get(name).forEach((cb, key, map) => {
            cb(key, old, value)
        })
    }
    return this.data.set(name, value)
}

KGlobal.prototype.get = function (name) {
    return this.data.get(name)
}

KGlobal.prototype.has = function (name) {
    return this.data.has(name)
}

KGlobal.prototype.delete = function (name) {
    if (this.observer.has(name)) {
        const old = this.data.get(name)
        this.observer.get(name).forEach((cb, key, map) => {
            cb(key, old, null)
        })
    }
    return this.data.delete(name)
}