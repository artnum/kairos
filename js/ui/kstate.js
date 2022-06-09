const KState = (from) => {
    const type = from.constructor.name

    if (!_KState._instance) { _KState._instance = new Map() }
    if (_KState._instance.has(type)) { return _KState._instance.get(type) }
    const instance = new _KState()
    _KState._instance.set(type, instance)
    return instance
}

function _KState() {
    this.object = undefined
}

_KState.prototype.set = function (object) {
    this.object = object
}

_KState.prototype.unset = function () {
    this.object = undefined
}

_KState.prototype.get = function () {
    return this.object
}