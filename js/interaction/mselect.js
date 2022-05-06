function MultiSelect () {
    if (MultiSelect._instance) { return MultiSelect._instance }
    this.selected = new Map()
    MultiSelect._instance = this
}

MultiSelect.active = function () {
    if (MultiSelect._instance) {
        if (MultiSelect._instance.clearing) { return false }
        if (this.selected.size > 0) { return true }
    }
    return false
}

MultiSelect.prototype.getId = function (objectOrId) {
    let id
    if (typeof objectOrId === 'function' || typeof objectOrId === 'object') {
        if (objectOrId.get && typeof objectOrId.get === 'function' ) {
            id = objectOrId.get('id')
            if (!id) { id = objectOrId.get('uid') }
            if (!id) { id = objectOrId.get('IDent') }
        }
        if (!id && objectOrId.getId && typeof objectOrId.getId === 'function') {
            id = objectOrId.getId()
        }
        if (!id && objectOrId.id) {
            switch(typeof objectOrId.id) {
                case 'function': id = objectOrId.id(); break
                case 'number':
                case 'string':
                    id = objectOrId.id; break
            }
        }
    } else {
        id = objectOrId
    }
    return id
}

MultiSelect.prototype.dispatchEventToObject = function (id, event) {
    const getDispatchFunction = function (object) {
        if (object.dispatchEvent && typeof object.dispatchEvent === 'function') { return object.dispatchEvent.bind(object) }
        return function () { return true }
    }
    if (!id) {
        for (const [k, v] of this.selected) {
            if (v[1]) {
                getDispatchFunction(v[0])(event)
            }
        }
    } else {
        const [object, isObject] = this.selected.get(id)
        if (!isObject) { return }
        getDispatchFunction(object)(event)
    }
}

MultiSelect.prototype.add = function (objectOrId) {
    if (!this.closableSet) {
        const klosable = new KClosable()
        klosable.add(null, {function: this.clear.bind(this)})
        this.closableSet = true
    }

    const id = this.getId(objectOrId)
    if (!this.selected.has(id)) { this.selected.set(id, [objectOrId, (typeof objectOrId === 'function' || typeof objectOrId === 'object')]) }
    this.dispatchEventToObject(id, new CustomEvent('select'))
}

MultiSelect.prototype.remove = function (objectOrId) {
    const id = this.getId(objectOrId)
    this.dispatchEventToObject(id, new CustomEvent('unselect'))
    if (this.selected.has(id)) { this.selected.delete(id) }
}

MultiSelect.prototype.has = function (objectOrId) {
    const id = this.getId(objectOrId)
    return this.selected.has(id)
}

MultiSelect.prototype.toggle = function (objectOrId) {
    if (this.has(objectOrId)) { this.remove(objectOrId) }
    else { this.add(objectOrId) }
}

MultiSelect.prototype.clear = function () {
    let doneClear = true
    this.clearing = true
    this.closableSet = false
    this.dispatchEventToObject(null, new CustomEvent('unselect'))
    if (this.selected.size < 1) { doneClear = false }
    this.selected.clear()
    this.clearing = false
    return doneClear
}

MultiSelect.prototype.getAll = function () {
    const all = []
    for (const [k, v] of this.selected) {
        all.push(v[0])
    }
    return all
}

MultiSelect.prototype.destroy = function () {
    this.clear()
}