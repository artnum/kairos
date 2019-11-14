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

  'artnum/dojo/Request',
  'artnum/Query',
  'artnum/Path'

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

  Req,
  Query,
  Path
) {
  return djDeclare('location.timeline.keys', [ djEvented ], {
    constructor: function () {
      this.commandLetters = [ 'j', 'm', 'r', 'd' ]
      window.addEventListener('click', function (event) {
        if (this.CommandMode) {
          let node = event.target
          while (node) {
            if (node.id === 'commandModeOverlay') { return }
            node = node.parentNode
          }
          this.switchCommandMode()
        }
      }.bind(this))
      window.addEventListener('keydown', async function (event) {
        if (this.commandLetters.indexOf(event.key) !== -1 && event.ctrlKey) {
          event.preventDefault()
          this.switchCommandMode().then(() => {
            if (this.commandKeys(event)) {
              this.switchCommandMode()
            }
          })
          return
        }
        if (event.key === APPConf.CommandWindow.escapeKey) {
          this.switchCommandMode()
        } else {
          if (this.CommandMode) {
            switch (event.key) {
              case APPConf.exitKey:
                if (this.CommandOverlay) {
                  if (this.func) {
                    this.func = null
                    document.activeElement.blur()
                    for (let n = this.CommandOverlay.firstChild; n; n = n.nextElementSibling) {
                      if (n.firstChild && n.firstChild.innerHTML) {
                        window.requestAnimationFrame(() => n.firstChild.removeAttribute('style'))
                      }
                    }
                  } else {
                    this.switchCommandMode()
                  }
                }
                break
              case APPConf.enterKey:
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

    mouseInteraction: function (event) {
      let node = event.target
      while (node && node.classList && !node.classList.contains('entry')) { node = node.parentNode }
      if (!node) { return }
      if (node.firstElementChild && !node.firstElementChild.classList.contains('key')) { return }
      let key = node.firstElementChild.textContent
      if (key) {
        event.key = key.toLowerCase()
        if (this.commandKeys(event)) {
          this.switchCommandMode()
        }
      }
    },

    switchCommandMode: function (mouse = false) {
      return new Promise((resolve, reject) => {
        this.Mouse = mouse
        this.CommandMode = !this.CommandMode
        if (!this.CommandMode) {
          this.CommandOverlay = null
          window.requestAnimationFrame(() => { document.body.removeChild(document.getElementById('commandModeOverlay')); resolve() })
        } else {
          var o = document.createElement('DIV')
          o.setAttribute('id', 'commandModeOverlay')
          if (mouse) {
            o.classList.add('mouse')
          }
          o.innerHTML = innerHtmlOverlay
          o.addEventListener('click', this.mouseInteraction.bind(this))
          this.CommandOverlay = o
          window.requestAnimationFrame(() => { document.body.appendChild(o); resolve() })
        }
      })
    },

    commandKeys: function (event) {
      var done = false
      if (this.CommandOverlay) {
        for (let n = this.CommandOverlay.firstChild; n; n = n.nextElementSibling) {
          if (n.firstChild && n.firstChild.innerHTML) {
            if (n.firstChild.innerHTML.toLowerCase() === event.key) {
              window.requestAnimationFrame(() => n.firstChild.setAttribute('style', 'background-color: hsla(126, 100%, 56%, 0.6)'))
            } else {
              window.requestAnimationFrame(() => n.firstChild.removeAttribute('style'))
            }
          }
        }
      }
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
        case 'd':
          this.goToSearchBox()
          this.func = this.gotoCount
          break
      }
      return done
    },
    gotoDay: async function (val) {
      var elements = val.split(/(?:\/|\.|-|\s)/)
      var date = new Date()
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
    gotoCount: async function (val) {
      Query.exec(Path.url(`store/Count/${val}`)).then(function (result) {
        if (result.success && result.length === 1) {
          window.GEvent('count.open', {id: val})
        }
      })
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
        window.scrollTo(0, top - hh)
        return true
      }

      return false
    },
    gotoReservation: async function (val) {
      this.doSearchLocation(val, true).then(() => { return true }, () => { return false })
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
