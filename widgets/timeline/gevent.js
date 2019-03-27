/* eslint-env amd, browser */
define([
  'dojo/_base/declare'
], function (
  djDeclare
) {
  return djDeclare('location.timeline.gevent', [], {
    constructor: function () {
      if (typeof window.GEvent === 'undefined') {
        window.GEvent = function (type, value) {
          /* send to other context */
          window.GEvent.GEventBC.postMessage({type: type, value: value})
          /* dispatch into the context we are in */
          window.GEvent.GEventTarget.dispatchEvent(new CustomEvent(type, {detail: value}))
        }
        window.GEvent.GEventTarget = new EventTarget()
        window.GEvent.GEventBC = new BroadcastChannel('gevent')
        window.GEvent.GEventBC.onmessage = function (message) {
          if (message && message.data && message.data.type && message.data.value) {
            window.GEvent.GEventTarget.dispatchEvent(new CustomEvent(message.data.type, {detail: message.data.value}))
          }
        }
        window.GEvent.listen = function (type, callback) {
          window.GEvent.GEventTarget.addEventListener(type, callback)
        }
      }
    }
  })
})
