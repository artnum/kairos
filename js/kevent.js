function KEvent (eventTarget) {
    this.target = eventTarget
    this.events = new Map()
}

KEvent.prototype.setTarget = function (eventTarget) {
    this.target = eventTarget
}

KEvent.prototype.addEventListener = function (event, listener, options) {
    this.target.addEventListener(event, listener, options)
}

KEvent.prototype.removeEventListener = function (event, listener, options) {
    this.target.removeEventListener(event, listener, options)
}

KEvent.prototype.setEventListener = function (name, event) {
    if (this.events.has(name)) {
        const prevEvent = this.events.get(name)
        this.removeEventListener(prevEvent.type, prevEvent.listener, prevEvent.options)
    }
    this.events.set(name, event)
    this.addEventListener(event.type, event.listener, event.options)
}