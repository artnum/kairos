/* eslint-env browser */
if (typeof window.GEvent === 'undefined') {
  window.GEvent = function (type, value) {
    /* send to other context */
    window.GEvent.GEventBC.postMessage({type: type, value: value})
    /* dispatch into the context we are in */
    window.GEvent.GEventTarget.dispatchEvent(new CustomEvent(type, {detail: value}))
  }
  window.GEvent.GEventTarget = new EventTarget()
  window.GEvent.GEventBC = new BroadcastChannel(window.GEventChannelName ? window.GEventChannelName : 'gevent')
  window.GEvent.GEventBC.onmessage = function (message) {
    if (message && message.data && message.data.type && message.data.value) {
      window.GEvent.GEventTarget.dispatchEvent(new CustomEvent(message.data.type, {detail: message.data.value}))
    }
  }
  window.GEvent.listen = function (type, callback, once = false) {
    if (Array.isArray(type)) {
      type.forEach((t) => window.GEvent.GEventTarget.addEventListener(t, callback, {once: once}))
    } else {
      window.GEvent.GEventTarget.addEventListener(type, callback, {once: once})
    }
  }
}
