/* Timeline app -> key code */
/* eslint-env amd, browser */
/* global APPConf */
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
      window.addEventListener('keydown', async function (event) {
        if (event.key === APPConf.CommandWindow.escapeKey) {
          this.switchCommandMode()
        } else {
          if (this.CommandMode) {
            switch (event.key) {
              case 'Enter':
                event.preventDefault()
                if (this.func) {
                  var r = this.func(document.getElementById('commandSearchBox').value)
                  if (r) {
                    this.switchCommandMode()
                  }
                }
                break
              default:
                if (event.target.nodeName !== 'INPUT') {
                  event.preventDefault()
                  if (this.commandKeys(event)) {
                    this.switchCommandMode()
                  }
                }
                break
            }
          }
        }
      }.bind(this), {capture: true})
    },

    goToSearchBox: function () {
      document.getElementById('commandSearchBox').focus()
    },

    switchCommandMode: function () {
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
      var done = false
      switch (event.key) {
        case 'a':
          this.today()
          done = true
          break
        case 'j':
          this.goToSearchBox()
          this.func = this.gotoDay
          break
        case 'm':
          this.goToSearchBox()
          this.func = this.gotoMachine
          break
        case 'r':
          this.goToSearchBox()
          this.func = this.gotoReservation
          break
      }
      return done
    },

    gotoDay: async function (val) {
      var elements = val.split(/(?:\/|\.|-|\s)/)
      var date = new Date()
      console.log(elements)
      var y = date.getFullYear()
      var m = date.getMonth()
      switch (elements.length) {
        default: return false
        case 3:
          if (isNaN(parseInt(elements[2]))) {
            return false
          }
          y = parseInt(elements[2])
          if (y < 100) { y += ((Math.round(date.getFullYear() / 100)) * 100) }
          /* fall through */
        case 2:
          if (isNaN(parseInt(elements[1]))) {
            return false
          }
          m = parseInt(elements[1]) - 1
          /* fall through */
        case 1:
          if (isNaN(parseInt(elements[0]))) {
            return false
          }
          var d = parseInt(elements[0])
          console.log(y, m, d)
          date.setFullYear(y, m, d)
          break
      }
      if (Boolean(+date) && date.getDate() === d) {
        this.set('center', date)
        this.update()
        return true
      }
      return false
    },
    gotoMachine: async function (val) {
      var top = -1
      for (var n = this.domEntries.firstChild; n; n = n.nextElementSibling) {
        if (n.dataset.reference === val) {
          top = 0
          var e = n
          do {
            top += e.offsetTop || 0
            e = e.offsetParent
          } while (e)
          break
        }
      }
      if (top !== -1) {
        var hh = Math.round(window.innerHeight / 3)
        console.log(hh, top)
        window.scrollTo(0, top - hh)
        return true
      }

      return false
    },
    gotoReservation: async function (val) {
      this.doSearchLocation(val).then(() => { return true }, () => { return false })
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
