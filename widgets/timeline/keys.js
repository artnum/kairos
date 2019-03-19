/* Timeline app -> key code */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dojo/text!../templates/commandOverlay.html',

  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-attr',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/dom-geometry',
  'dojo/throttle',
  'dojo/request/xhr',
  'dojo/window',
  'dijit/registry',

  'artnum/dojo/Request'

], function (
  djDeclare,
  djLang,
  djEvented,
  djDeferred,

  innerHtmlOverlay,

  djDomConstruct,
  djOn,
  djDomAttr,
  djDomClass,
  djDomStyle,
  djDomGeo,
  djThrottle,
  djXhr,
  djWindow,
  dtRegistry,

  Req
) {
  return djDeclare('location.timeline.keys', [ djEvented ], {
    constructor: function () {
      window.addEventListener('keypress', function (event) {
        if (event.key === 'Escape') {
          this.switchToCommandMode()
        } else {
          if (this.CommandMode) {
            event.preventDefault()
            this.commandKeys(event)
            this.switchToCommandMode()
          }
        }
      }.bind(this), {capture: true})
    },

    switchToCommandMode: function () {
      this.CommandMode = !this.CommandMode
      if (!this.CommandMode) {
        window.requestAnimationFrame(() => document.body.removeChild(document.getElementById('commandModeOverlay')))
      } else {
        var o = document.createElement('DIV')
        o.setAttribute('id', 'commandModeOverlay')
        o.innerHTML = innerHtmlOverlay
        window.requestAnimationFrame(() => document.body.appendChild(o))
      }
    },

    commandKeys: function (event) {
      switch (event.key) {
        case 'a':
          this.today()
          break
      }
    },

    keys: function (event) {
      if (!event.ctrlKey) {
        switch (event.key) {
        }
      } else {
        switch (event.key) {
          case 'L': event.preventDefault(); this.searchLoc(); break
          case 'ArrowLeft':
            this.moveLeft()
            break
          case 'ArrowRight':
            this.moveRight()
            break
          case 'ArrowUp':
            event.preventDefault()
            this.zoomOut()
            break
          case 'ArrowDown':
            event.preventDefault()
            this.zoomIn()
            break
          case 'Escape':
            event.preventDefault()
            this.emit('cancel-reservation')
            break
        }
      }
    }

  })
})
