function KMultiSelect () {
    if (KMultiSelect._instance) { return KMultiSelect._instance }
    this.active = false
    this.elements = new Map()
    KMultiSelect._instance = this
}


KMultiSelect.prototype.clear = function () {
    this.active = false
    this.elements.forEach((value, _) => {
        if (value[1]) { value[1]() }
    })
    return this.elements.clear()
}

KMultiSelect.prototype.add = function (id, element, unset = null) {
    if (this.elements.has(id)) { return }
    if (!this.active) { 
        this.clear() 
        new KClosable().add(null, {function: () => { this.clear() }})
    }
    this.active = true
    return this.elements.set(id, [element, unset])
}

KMultiSelect.prototype.delete = function (id) {
    const element = this.elements.get(id)
    if (!element) { return }
    this.elements.delete(id)
    if (this.elements.size <= 0) { this.active = false }
    return element[0]
}

KMultiSelect.prototype.remove = function (id) {
    const element = this.elements.get(id)
    if (!element) { return }
    if (element[1]) { element[1]() }
    return this.delete(id)
}

KMultiSelect.prototype.get = function () {
    return Array.from(this.elements.values()).map((value) => { return value[0] })
}

KMultiSelect.prototype.size = function () {
    return this.elements.size
}