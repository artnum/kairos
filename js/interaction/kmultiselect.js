function KMultiSelect () {
    if (KMultiSelect._instance) { return KMultiSelect._instance }
    this.active = false
    this.elements = new Map()
    KMultiSelect._instance = this
}


KMultiSelect.prototype.clear = function () {
    this.active = false
    return this.elements.clear()
}

KMultiSelect.prototype.add = function (id, element) {
    if (this.elements.has(id)) { return }
    this.active = true
    return this.elements.set(id, element)
}

KMultiSelect.prototype.remove = function (id) {
    const element = this.elements.get(id)
    this.elements.delete(id)
    if (this.elements.size <= 0) { this.active = false }
    return element
}

KMultiSelect.prototype.get = function () {
    return this.elements.values()
}