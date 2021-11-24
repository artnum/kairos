function GEvent () {
  if (GEvent._instance) { return GEvent._instance }
  this.GEventTarget = new EventTarget()
  this.GEventBC = new BroadcastChannel(`${KAIROS.getBase()}/GlobalEvent`)
  this.GEventBC.onmessage = this.handleMessage.bind(this)
  this.srcId = KAIROS.getClientId()
  GEvent._instance = this
}

GEvent.prototype.send = function (type, value) {
  this.srcId
  .then(clientid => {
    this.GEventTarget.dispatchEvent(new CustomEvent(type, {detail: value}))
    this.GEventBC.postMessage({type, value: JSON.stringify(value), srcId: clientid})
  })
}

GEvent.prototype.handleMessage = function (message) {
  if (!message.data) { return }
  this.srcId
  .then(clientid => {
    const event = message.data
    if (event.srcId === clientid) { return }
    this.GEventTarget.dispatchEvent(new CustomEvent(event.type, {detail: JSON.parse(event.value)}))
  })
}

GEvent.prototype.listen = function (types, callback, once = false) {
  if (!Array.isArray(types)) { types = [types] }
  for (const type of types) {
    this.GEventTarget.addEventListener(type, callback, {once})
  }
}

GEvent.prototype.listenAll = function (listeners) {
  if (!Array.isArray(listeners)) { listeners = [listeners] }
  for (const listener of listeners) {
    this.listen(listener[0], listener[1], listener[2] || false)
  }
}