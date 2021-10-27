/* Timeline app -> key code */
/* eslint-env amd, browser */
/* global KAIROS */
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
      this.func = null
      this.suggest = null
      this.commandLetters = [ 'j', 'm', 'r', 'd', 'c', 'p' , 'k' ]

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
      window.addEventListener('keydown', event => {
        if (event.ctrlKey) { return }
        if (event.key === KAIROS.CommandWindow.escapeKey) {
          let cMode = this.switchCommandMode()
          if (event.shiftKey) {
            cMode.then(() => {
              this.goToSearchBox()
              this.func = this.cmdProcessor
            })
          }
        } else {
          if (this.CommandMode) {
            switch (event.key) {
              case KAIROS.exitKey:
                if (this.CommandOverlay) {
                  this.suggest = null
                  if (this.func) {
                    this.func = null
                    document.activeElement.blur()
                    if (this.resultBox && this.resultBox.parentNode) {
                      this.resultBox.parentNode.removeChild(this.resultBox)
                    }
                    for (let n = this.CommandOverlay.firstChild; n; n = n.nextElementSibling) {
                      if (n.firstChild && n.firstChild.innerHTML) {
                        window.requestAnimationFrame(() => n.dataset.selected = '0')                      }
                    }
                  }
                }
                break
              case KAIROS.enterKey:
                event.preventDefault()
                if (this.func) {
                  this.func(document.getElementById('commandSearchBox').value).then(result => {
                    if (result) {
                      this.switchCommandMode()
                    } else {
                      KAIROS.warn(`La commande n'a pas pu être interprétée`)
                    }
                  })
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
      }, {capture: true})
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
      const closeCommandMode = () => {
        if (!document.getElementById('commandModeOverlay')) { return false }
        this.CommandOverlay = null
        window.requestAnimationFrame(() => { 
          if (document.getElementById('commandModeOverlay')) {
            document.body.removeChild(document.getElementById('commandModeOverlay'))
          }
        })
        return true
      }
      return new Promise((resolve, reject) => {
        this.Mouse = mouse
        this.CommandMode = !this.CommandMode
        if (!this.CommandMode) {
          closeCommandMode()
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
          KAIROS.stackClosable(closeCommandMode)
        }
      })
    },

    commandKeys: function (event) {
      var done = false
      if (this.CommandOverlay) {
        for (let n = this.CommandOverlay.firstChild; n; n = n.nextElementSibling) {
          if (n.firstChild && n.firstChild.innerHTML) {
            if (n.firstChild.innerHTML.toLowerCase() === event.key) {
              window.requestAnimationFrame(() => n.dataset.selected = '1')
            } else {
              window.requestAnimationFrame(() => n.dataset.selected = '0')
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
        case 'c':
          this.goToSearchBox()
          this.func = this.searchByClient
          break
        case ':':
          this.goToSearchBox()
          this.func = this.cmdProcessor
          break
        case 'p':
          const kstore = new KStore('kproject')
          kstore.query({closed: '--'})
          .then(results => {
            const klateral = new KLateral().open()
            
            const container = document.createElement('DIV')
            for (const project of results) {
              const div = document.createElement('DIV')
              const affaire = project.getRelation('kaffaire')
              div.id = project.get('uid')
              div.innerHTML = `
                <h1>${project.getCn()}</h1>
                <div><span class="klabel">Client</span> ${project.getRelation('kcontact')?.getCn() || ''}</div>
                <div><span class="klabel">Travaux</span> ${affaire?.length || '0' }</div>
              `
              if (affaire) {
                for (const aff of Array.isArray(affaire) ? affaire : [affaire]) {
                  div.innerHTML = `<div>AFFAIRE : ${aff.getCn()}</div>`
                }
              }
              container.appendChild(div)
            /*div.addEventListener('click', event => {
                KAffaire.load(event.target.dataset.id)
                .then(kaffaire => {
                  return new KAffaireUI(kaffaire)
                })
                .then(kaffaireui => {

                })
                .catch(reason => {
                  KAIROS.error(reason)
                })
              })*/
            }
            klateral.add(container, {title: 'Projet'})
          })
          .catch(reason => {
            console.log(reason)
            KAIROS.error(reason)
          })
          done = true;
          break
        case 'k':
          const klateral2 = new KLateral().open()
          klateral2.add('<iframe style="border: none; width: 100%; height: 100%; min-height: 100%; min-width: 100%;" src="https://localhost/keditor/app/html/"></iframe>', {title: 'Wiki'})
          done = true
      }
      return done
    },

    gotoDay: function (val) {
      return new Promise((resolve, reject) => {
        var elements = val.split(/(?:\/|\.|-|\s)/)
        var date = new Date()
        var y = date.getFullYear()
        var m = date.getMonth()
        switch (elements.length) {
          default: 
            resolve(false)
            return
          case 3:
            if (isNaN(parseInt(elements[2]))) {
              resolve(false)
              return
            }
            y = parseInt(elements[2])
            if (y < 100) { y += ((Math.round(date.getFullYear() / 100)) * 100) }
            /* fall through */
          case 2:
            if (isNaN(parseInt(elements[1]))) {
              resolve(false)
              return
            }
            m = parseInt(elements[1]) - 1
            /* fall through */
          case 1:
            if (isNaN(parseInt(elements[0]))) {
              resolve(false)
              return
            }
            var d = parseInt(elements[0])
            date.setFullYear(y, m, d)
            break
        }
        if (Boolean(+date) && date.getDate() === d) {
          this.set('center', date)
          this.update()
          resolve(true)
          return
        }
        resolve(false)
      })
    },

    gotoCount: function (val) {
      return new Promise((reject, resolve) => {
        fetch(new URL(`store/Count/${val}`, KAIROS.getBase())).then(response => {
          if (!response.ok) { resolve(false); return }
          response.json().then(results => {
            if (results.length !== 1) {
              resolve(false)
              return
            }
            window.GEvent('count.open', {id: val})
            resolve(true)
          })
        })
      })
    },
    gotoMachine: function (val) {
      return new Promise((resolve, reject) => {
        var top = -1
        for (var n = this.domEntries.firstChild; n; n = n.nextElementSibling) {
          let details = JSON.parse(n.dataset.details)
          if (details.uid === val || (Array.isArray(details.oldid) ? details.oldid.indexOf(val) !== -1 : details.oldid === val)) {
            window.requestAnimationFrame(() => {
              n.classList.add('highlight')
            })
            setTimeout(() => {
              window.requestAnimationFrame(() => {
                n.classList.remove('highlight')
              })
            }, KAIROS.ui.highlightTime)
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
          resolve(true)
          return
        }

        resolve(false)
        return
      })
    },
    gotoReservation: function (val) {
      return new Promise((resolve, reject) => {
        this.doSearchLocation(val, true).then(r => { resolve(r) }, () => { resolve(false) })
      })
    },

    searchByClient: function (val) {
      return new Promise((resolve, reject) => {
        let search = new ClientSearch()
        search.search(val)
        resolve(true)
      })
    },

    setResultBox: function () {
      if (!this.resultBox) {
        this.resultBox = document.createElement('DIV')
        this.resultBox.classList.add('results')
        let list = document.createElement('DIV')
        list.classList.add('list')
        list.id = 'commandModeOverlayList'
        this.resultBox.appendChild(list)
      }
      if (this.resultBox.parentNode) {
        window.requestAnimationFrame(() => this.resultBox.innerHTML = '')
      } else {
        window.requestAnimationFrame(() => document.getElementById('commandModeOverlay').appendChild(this.resultBox))
      }
    },

    keys: function (event) {
      if (!event.ctrlKey) {
        switch (event.key) {
          case 'Escape':
            break
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
    },

    cmdProcessor: function (val) {
      return new Promise ((resolve, reject) => {
        let argv = val.split(/\s+/)
        for (let i = 0; i < argv.length; i++) {
          argv[i] = argv[i].toLowerCase()
        }
        switch (argv[0]) {
          default:
            resolve(false)
            return
          case 'set':
            if (argv[1].substring(0, 7) === 'kairos.') {
              switch(argv[1].substring(7)) {
                case 'highlighttime': 
                  if (isNaN(parseInt(argv[2]))) {
                    KAIROS.ui.highlightTime = 1500
                  } else {
                    KAIROS.ui.highlightTime = parseInt(argv[2]) 
                  }
                break
              }
            }
            resolve(true)
            return
          case 'show':
            let loadEntries
            switch(argv[1]){
              default:
              case 'default':
                loadEntries = this.loadEntries({state: 'SOLD'})
                break
              case 'all':
                loadEntries = this.loadEntries()
                break
            }
            loadEntries.then(() => {
              this.sortAndDisplayEntries()
            })
            resolve(true)
            return
          case 'sort':
            switch (argv[1]) {
              default:
              case 'default':
                this.sortEntries(this._sort_default())
                break
              case 'warehouse':
                this.sortEntries(this._sort_warehouse(), true)
                break
            }
            resolve(true)
            return
        }
      })
    }
  })
})
