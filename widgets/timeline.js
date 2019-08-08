/* eslint-env browser, amd */
/* global getPageRect, getElementRect,fastdom, APPConf, DoWait, Holiday, Tooltip */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/layout/ContentPane',

  'dojo/text!./templates/timeline.html',

  'dojo/aspect',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-attr',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/dom-geometry',
  'dojo/throttle',
  'dojo/debounce',
  'dojo/request/xhr',
  'dojo/window',
  'dojo/promise/all',
  'dijit/registry',
  'dijit/form/DateTextBox',
  'dijit/form/NumberTextBox',
  'dijit/form/Button',
  'dijit/MenuBar',
  'dijit/MenuBarItem',
  'dijit/PopupMenuBarItem',
  'dijit/DropDownMenu',
  'dijit/MenuItem',
  'dijit/MenuSeparator',
  'dijit/CheckedMenuItem',
  'dijit/RadioMenuItem',
  'dijit/PopupMenuItem',
  'dijit/Calendar',
  'dijit/Dialog',

  'location/entry',
  'location/timeline/popup',
  'location/timeline/keys',
  'location/timeline/filters',
  'location/update',
  'location/count',
  'location/countList',

  'artnum/dojo/Request',
  'artnum/Path',
  'artnum/Query',
  'artnum/Doc'

], function (
  djDeclare,
  djLang,
  djEvented,
  DjDeferred,
  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,
  dtContentPane,

  _template,
  djAspect,
  djDate,
  djDateStamp,
  djDom,
  djDomConstruct,
  djOn,
  djDomAttr,
  djDomClass,
  djDomStyle,
  djDomGeo,
  djThrottle,
  djDebounce,
  djXhr,
  djWindow,
  djAll,
  dtRegistry,
  DtDateTextBox,
  dtNumberTextBox,
  dtButton,
  dtMenuBar,
  dtMenuBarItem,
  dtPopupMenuBarItem,
  DtDropDownMenu,
  DtMenuItem,
  DtMenuSeparator,
  dtCheckedMenuItem,
  DtRadioMenuItem,
  DtPopupMenuItem,
  DtCalendar,
  Dialog,

  Entry,

  tlPopup, tlKeys, update, Filters,

  Count,
  CountList,
  Req,
  Path,
  Query,
  Doc
) {
  return djDeclare('location.timeline', [
    dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented,
    tlPopup, tlKeys, update, Filters, GEvent ], {
    OpenAtCreation: {},
    center: null,
    offset: 260,
    blockSize: 42,
    baseClass: 'timeline',
    templateString: _template,
    zoomCss: null,
    lines: null,
    moveQueue: null,
    timeout: null,
    lastDay: null,
    firstDay: null,
    verticals: null,
    lastClientXY: [0, 0],
    logs: null,
    lockEvents: null,
    lastId: 0,
    lastMod: 0,
    inputString: '',
    eventStarted: null,
    daysZoom: 0,
    compact: false,
    currentVerticalLine: 0,

    constructor: function (args) {
      djLang.mixin(this, arguments)
      this.lastId = 0
      this.verticals = []
      this.days = []
      this.weekNumber = []
      this.entries = []
      this.Entries = {}
      this.lines = null
      this.todayOffset = -1
      this.months = []
      this.moveQueue = []
      this.timeout = null
      this.lastDay = null
      this.firstDay = null
      this.odd = true
      this.center = new Date()
      this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0)
      this.lastClientXY = []
      this.logs = []
      this.inputString = ''
      this.lastMod = ''
      this.lastId = ''
      this.xDiff = 0
      this.daysZoom = 30
      this.compact = false
      this.currentVerticalLine = 0
      this.displayOrder = []
      this.runningRequest = []
      this.extension = false
      this.LocalReservations = {}
      this.timelineMoving = false
      this.FirstLoad = true
      this.Holidays = null
      this.Tooltips = {}

      this.zoomCss = document.createElement('style')
      this.Updater = new Worker(Path.url('/js/ww/updater.js'))
      this.Updater.onmessage = djLang.hitch(this, function (e) {
        if (!e || !e.data || !e.data.type) { return }
        switch (e.data.type) {
          case 'entry':
            if (this.Entries[e.data.content]) {
              this.Entries[e.data.content].update()
            }
            break
          case 'entries':
            for (var i = 0; i < e.data.content.length; i++) {
              if (this.Entries[e.data.content[i]]) {
                this.Entries[e.data.content[i]].update()
              }
            }
            break
        }
      })

      this.Filter = new Worker(Path.url('/js/ww/filter.js'))
      this.Filter.onmessage = djLang.hitch(this, function (event) {
        this.searchMenu.filterNone.set('disabled', false)
        if (event.data) {
          for (var k in this.Entries) {
            if (event.data[k]) {
              this.Entries[k].set('active', true)
            } else {
              this.Entries[k].set('active', false)
            }
          }
        }
        this.resize()
        this.unwait()
      })

      document.body.appendChild(this.zoomCss)

      var sStore = window.sessionStorage
      djXhr.get(String(Path.url('store/Status/')), {handleAs: 'json', query: {'search.type': 0}}).then(function (results) {
        if (results && results.type === 'results') {
          for (var i = 0; i < results.data.length; i++) {
            sStore.setItem('/Status/' + results.data[i].id, JSON.stringify(results.data[i]))
          }
        }
      })

      if (typeof window.Rent === 'undefined') {
        window.Rent = {}
      }
      if (typeof window.Rent.Days === 'undefined') {
        window.Rent.Days = {}
      }

      window.UnloadCall = {}

      window.GEvent.listen('reservation.open', function (event) {
        if (event.detail.id) {
          this.doSearchLocation(event.detail.id).then(() => {
            let n = new Notification(`Réservation ${event.detail.id} ouverte`, {body: 'La réservation a été ouverte avec succès', tag: `reservationOpen${event.detail.id}`})
          })
        }
      }.bind(this))
      window.GEvent.listen('reservation.attribute-click', function (event) {
        if (!event.detail) {
          return
        }

        if (event.detail.attribute === 'id') {
          this.doSearchLocation(event.detail.value)
        }
      }.bind(this))
      window.GEvent.listen('count.attribute-click', function (event) {
        if (!event.detail) {
          return
        }

        if (event.detail.attribute === 'id') {
          window.location.hash = `#DEC${event.detail.value}`
        }
      })
      window.GEvent.listen('count.open', function (event) {
        if (!event.detail) { return }
        if (event.detail.id) {
          new Count({'data-id': event.detail.id}) // eslint-disable-line
        }
      })
    },

    createWindow: function () {
      this.Window = document.createElement('div')
      this.Window.setAttribute('class', 'topWin')
      this.Window.setAttribute('style', 'display: none')

      this.Window.appendChild(document.createElement('div'))

      this.Window.firstChild.appendChild(document.createElement('span'))

      var li = document.createElement('li')
      li.setAttribute('class', 'fas fa-external-link-alt ')
      this.Window.firstChild.appendChild(li)
      li.addEventListener('click', function (event) {
        window.open(this.Window.currentUrl, '_blank')
      }.bind(this))

      li = document.createElement('li')
      li.setAttribute('class', 'fas fa-window-close')
      this.Window.firstChild.appendChild(li)
      li.addEventListener('click', function (event) {
        this.closeWindow()
      }.bind(this))

      var iframe = document.createElement('iframe')
      iframe.addEventListener('load', function (event) {
        var doc = event.target.contentDocument
        this.Window.firstChild.firstChild.innerHTML = doc.title
      }.bind(this))
      this.Window.appendChild(iframe)

      this.Window.firstChild.setAttribute('class', 'windowToolbar')

      document.body.appendChild(this.Window)
    },

    openWindow: function (url, real = false) {
      if (!real) {
        if (!this.Window) {
          this.createWindow()
        }

        url += (url.indexOf('?') > -1 ? '&' : '?') + '_timestamp=' + Date.now()
        this.Window.lastChild.setAttribute('src', url)
        this.Window.currentUrl = url

        this.Window.setAttribute('style', '')
      } else {
        window.open(url + (url.indexOf('?') > -1 ? '&' : '?') + '_timestamp=' + Date.now(), url.split('.')[0])
      }
    },

    closeWindow: function () {
      if (!this.Window) {
        return
      }
      this.Window.lastChild.setAttribute('src', '')
      this.Window.currentUrl = ''
      this.Window.setAttribute('style', 'display: none')
    },

    defaultStatus: function () {
      var def = new DjDeferred()
      var url = Path.url('store/Status')
      url.searchParams.set('search.default', 1)
      url.searchParams.set('search.type', 0)
      Query.exec(url).then(function (result) {
        if (result.length > 0) {
          def.resolve(result.data[0].id)
        } else {
          def.resolve('0')
        }
      })

      return def.promise
    },

    info: function (txt, code) {
      this.log('info', txt, code)
    },
    warn: function (txt, code) {
      this.log('warning', txt, code)
    },
    error: function (txt, code) {
      this.log('error', txt, code)
    },
    log: function (level, txt, code) {
      var timeout = 10000
      var div = document.createElement('DIV')

      switch (level) {
        case 'info': timeout = 3000
          div.appendChild(document.createElement('I'))
          div.lastChild.setAttribute('class', 'fas fa-info-circle')
          break
        case 'error':
          div.appendChild(document.createElement('I'))
          div.lastChild.setAttribute('class', 'fas fa-times-circle')
          break
        case 'warning':
          div.appendChild(document.createElement('I'))
          div.lastChild.setAttribute('class', 'fas fa-exclamation-circle')
          break
      }

      div.setAttribute('class', 'message ' + level)
      div.appendChild(document.createTextNode(' ' + txt))

      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          div.parentNode.removeChild(div)
        })
      }, timeout)

      djOn(div, 'click', () => {
        window.clearTimeout(timeout)
        div.parentNode.removeChild(div)
      })

      window.requestAnimationFrame(djLang.hitch(this, () => {
        this.logline.appendChild(div)
      }))
    },

    _setCenterAttr: function (date) {
      this.center = date
      this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0)
    },

    _setZoomAttr: function (zoomValue) {
      var style = ''
      var page = getPageRect()
      var days = 1
      var classname = ''

      djDomClass.remove(this.domNode, [ 'day', 'month', 'week', 'quarter', 'semseter' ])
      switch (zoomValue) {
        case 'day':
          days = 2
          classname = 'day'
          style = ' #Sight { display: none; }'
          break
        case 'month':
          days = 31
          classname = 'month'
          break
        case 'week':
          days = 7
          classname = 'week'
          break
        case 'quarter':
          days = 91
          classname = 'quarter'
          break
        case 'semester':
          days = 181
          classname = 'semester'
          break
        default:
          days = zoomValue
          break
      }

      this.daysZoom = days
      if (classname !== '') {
        djDomClass.add(this.domNode, classname)
      }
      this.set('blockSize', Math.floor((window.innerWidth - (this.get('offset') + 40)) / days))
      this.zoomCss.innerHTML = ` :root { --offset-width: ${this.get('offset')}px; }
                                 .timeline .line span { width: ${this.get('blockSize') - 2}px !important; }
                                .timeline .header .tools { width: ${this.get('offset')}px !important; }
                                .timeline .line { margin-left: ${this.get('offset')}px !important; }
                                ${style}`
      this.resize()
    },

    _setFilterAttr: function (value) {
      for (var i = 0; i < this.entries.length; i++) {
        var entry = this.entries[i]
        if (entry.tags.length > 0) {
          if (entry.tags.find((element) => {
            if (element.toLowerCase() === value.toLowerCase()) {
              return true
            }
            return false
          })) {
            entry.set('active', true)
          } else {
            entry.set('active', false)
          }
        } else {
          entry.set('active', false)
        }
      }
    },

    _getZoomAttr: function () {
      return this.daysZoom
    },

    zoomIn: function () {
      if (this.get('zoom') > 7) {
        this.set('zoom', this.get('zoom') - 5)
      }
    },

    zoomOut: function () {
      if (this.get('zoom') < 180) {
        this.set('zoom', this.get('zoom') + 5)
      }
    },

    zoomInN: function (n) {
      this.set('zoom', this.get('zoom') - 7)
    },

    zoomOutN: function (n) {
      this.set('zoom', this.get('zoom') + 7)
    },

    isBefore: function (a, b) {
      if (djDate.compare(a, b, 'date') <= 0) {
        return true
      }
      return false
    },

    _trCantonName: function (c) {
      switch (c) {
        case 'vs': return 'Valais'
        case 'vd': return 'Vaud'
        case 'ge': return 'Genève'
        case 'ju': return 'Jura'
        case 'ne': return 'Neuchâtel'
        case 'fr': return 'Fribourg catholique'
        case 'fr-prot': return 'Fribourg réformé'
        case 'be': return 'Berne'
        case 'fra': return 'France'
        default: return 'Suisse'
      }
    },

    makeDay: function (newDay) {
      var txtDate = ''
      newDay.setHours(12, 0, 0)
      var dayStamp = djDateStamp.toISOString(newDay, {selector: 'date'})

      switch (newDay.getDay()) {
        case 0: txtDate = 'Dim ' + newDay.getDate(); break
        case 1: txtDate = 'Lun ' + newDay.getDate(); break
        case 2: txtDate = 'Mar ' + newDay.getDate(); break
        case 3: txtDate = 'Mer ' + newDay.getDate(); break
        case 4: txtDate = 'Jeu ' + newDay.getDate(); break
        case 5: txtDate = 'Ven ' + newDay.getDate(); break
        case 6: txtDate = 'Sam ' + newDay.getDate(); break
      }

      var domDay = document.createElement('SPAN')
      domDay.setAttribute('data-artnum-day', dayStamp)
      domDay.classList.add('day')

      let holiday = this.Holidays.isHoliday(newDay)
      if (holiday && newDay.getDay() !== 0) {
        domDay.classList.add('holiday')
        let cantons = []
        holiday.c.forEach((c) => {
          cantons.push(this._trCantonName(c))
        })
        let text = `Férié ${cantons[0]}`
        if (holiday.c.length > 1) {
          text = `Férié ${cantons.join(', ')}`
        }
        if (this.Tooltips[newDay.toISOString().split('T')[0]]) {
          this.Tooltips[newDay.toISOString().split('T')[0]].dispose()
        }
        this.Tooltips[newDay.toISOString().split('T')[0]] = new Tooltip(domDay, {title: text, placement: 'bottom'})
      } else {
        if (newDay.getDay() === 0 || newDay.getDay() === 6) {
          domDay.classList.add('weekend')
        }
      }

      domDay.innerHTML = txtDate
      return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay, _line: this.line, computedStyle: djDomStyle.getComputedStyle(domDay) }
    },

    resize: function () {
      this.drawTimeline()
      this.drawVerticalLine()

      if (this.resizeTimeout) {
        window.clearTimeout(this.resizeTimeout)
        this.resizeTimeout = null
      }

      this.resizeTimeout = window.setTimeout(() => {
        for (let i = 0; i < this.entries.length; i++) {
          this.entries[i].resize()
        }
        this.resizeTimeout = null
      }, 250)

      let i = Math.floor(window.scrollY / 76) - 1
      let height = Math.floor(window.innerHeight / 76) + 1 + i
      if (i < 0) { i = 0 }
      if (height > this.entries.length) { height = this.entries.length }
      if (height <= 0) { height = 1 }
      for (; i < height; i++) {
        if (this.entries[i]) {
          this.entries[i].resize()
        }
      }

      this.drawSubline()
    },

    createMonthName: function (month, year, days, frag) {
      var n = document.createElement('DIV')
      n.setAttribute('style', 'width: ' + (days * this.get('blockSize')) + 'px')
      switch (month + 1) {
        case 1: n.innerHTML = 'Janvier&nbsp;' + year; break
        case 2: n.innerHTML = 'Février&nbsp;' + year; break
        case 3: n.innerHTML = 'Mars&nbsp;' + year; break
        case 4: n.innerHTML = 'Avril&nbsp;' + year; break
        case 5: n.innerHTML = 'Mai&nbsp;' + year; break
        case 6: n.innerHTML = 'Juin&nbsp;' + year; break
        case 7: n.innerHTML = 'Juillet&nbsp;' + year; break
        case 8: n.innerHTML = 'Août&nbsp;' + year; break
        case 9: n.innerHTML = 'Septembre&nbsp;' + year; break
        case 10: n.innerHTML = 'Octobre&nbsp;' + year; break
        case 11: n.innerHTML = 'Novembre&nbsp;' + year; break
        case 12: n.innerHTML = 'Décembre&nbsp;' + year; break
      }
      if (month % 2) {
        n.setAttribute('class', 'monthName even')
      } else {
        n.setAttribute('class', 'monthName odd')
      }
      frag.appendChild(n)
      this.months.push(n)
    },
    destroyMonthName: function () {
      for (var x = this.months.pop(); x; x = this.months.pop()) {
        x.parentNode.removeChild(x)
      }
    },

    createWeekNumber: function (number, days, frag) {
      var n = document.createElement('DIV')
      n.setAttribute('style', 'width: ' + (days * this.get('blockSize')) + 'px')
      n.innerHTML = 'Semaine ' + number
      if (days * this.get('blockSize') < 80) {
        n.innerHTML = number
      }
      if (number % 2) {
        n.setAttribute('class', 'weekNumber even')
      } else {
        n.setAttribute('class', 'weekNumber odd')
      }
      frag.appendChild(n)
      this.weekNumber.push(n)
    },
    destroyWeekNumber: function () {
      for (var x = this.weekNumber.pop(); x; x = this.weekNumber.pop()) {
        x.parentNode.removeChild(x)
      }
    },

    handleBCMessage: function (event) {
      if (!event.data || !event.data.type) { return }

      var msg = event.data
      switch (msg.type) {
        default: return
        case 'close':
          if (!msg.what) {
            this.closeWindow()
          }
          switch (msg.what) {
            default:
            case 'window':
              this.closeWindow()
          }
          break
        case 'open':
          if (msg.what && msg.id) {
            switch (msg.what) {
              default:
              case 'reservation':
                this.doSearchLocation(msg.id)
                break
            }
          }
          break
      }

      window.focus()
    },

    postCreate: function () {
      var tContainer = dtRegistry.byId('tContainer')
      this.bc = new BroadcastChannel(Path.bcname('artnum/location'))
      this.view = {}
      this.set('zoom', 'week')
      tContainer.startup()

      djAspect.after(tContainer, 'addChild', function () {
        if (this.hasChildren()) {
          djDomStyle.set(this.domNode.parentNode, 'display', 'block')
          window.App.minimizeMaximize(null, true)
        }
      }, true)

      djAspect.after(tContainer, 'selectChild', function () {
        window.App.minimizeMaximize(null, true)
      }, true)

      djAspect.after(tContainer, 'removeChild', function (child) {
        if (!this.hasChildren()) {
          djDomStyle.set(this.domNode.parentNode, 'display', 'none')
        }
      }, true)

      djOn(window, 'keypress', djLang.hitch(this, this.keys))
      djOn(this.domNode, 'mouseup, mousedown', djLang.hitch(this, this.mouseUpDown))
      window.addEventListener('resize', () => { this.set('zoom', this.get('zoom')) }, {passive: true})
      djOn(this.domNode, 'wheel', djLang.hitch(this, this.eWheel))
      djOn(this.domNode, 'mousemove, touchmove', djLang.hitch(this, this.mouseOver))
      window.addEventListener('mousemove', this.windowMouseMovement.bind(this))
      djOn(window, 'hashchange, load', djLang.hitch(this, () => {
        var that = this
        window.setTimeout(() => { /* hack to work in google chrome */
          if (window.location.hash) {
            if (Number(window.location.hash.substr(1))) {
              that.doSearchLocation(window.location.hash.substr(1), true)
            } else {
              var sub = window.location.hash.substr(1)
              switch (String(sub.substr(0, 3)).toLowerCase()) {
                case 'dec':
                  if (String(sub.substr(4, 1) === '*')) {
                    new CountList({integrated: true}) // eslint-disable-line
                  } else {
                    new Count({'data-id': sub.substr(3)}) // eslint-disable-line
                  }
                  break
              }
            }
          }
        }, 500)
      }))

      this.view.rectangle = getPageRect()
      this.bc.onmessage = function (event) {
        this.handleBCMessage(event)
      }.bind(this)

      window.setTimeout(function () {
        this.update()
      }.bind(this), 5000)
    },

    revision: function () {
      fetch(Path.url('/revision.php')).then(function (response) {
        response.json().then(function (data) {
          this.currentRevision = data.revision
          var currentRevision = window.localStorage.getItem(Path.bcname('revision'))
          if (!currentRevision) {
            this.reinit()
          } else {
            if (currentRevision !== this.currentRevision) {
              this.reinit()
            }
          }
          setTimeout(this.revision.bind(this), 5400000)
        }.bind(this))
      }.bind(this))
    },

    mask: function (state, callback) {
      if (state) {
        var mask = document.createElement('DIV')
        this._mask = true
        this._maskDom = mask
        mask.setAttribute('style', 'background-color: black; opacity: 0.6; margin: 0; padding: 0; top: 0; left: 0; bottom: 0; right: 0; position: fixed; width: 100%; height: 100%; z-index: 99999998')
        djOn(mask, 'click', (e) => { this.mask(false); callback(e) })
        window.requestAnimationFrame(() => {
          document.getElementsByTagName('BODY')[0].appendChild(mask)
        })
      } else {
        this._mask = false
        this._maskDom.parentNode.removeChild(this._maskDom)
      }
    },

    buildMenu: async function () {
      var that = this

      var item = new DtMenuItem({label: 'Tout', disabled: true})
      djOn(item, 'click', djLang.hitch(that, that.filterNone))
      that.searchMenu.addChild(item)
      that.searchMenu.filterNone = item

      if (window.localStorage.getItem(Path.bcname('autoprint'))) {
        this.paramAutoprint.set('checked', true)
      }
      that.searchMenu.addChild(new DtMenuSeparator())

      Req.get('https://airserve01.local.airnace.ch/store/Category').then((response) => {
        if (response && response.data && response.data.length > 0) {
          var names = {}
          for (var i = 0; i < response.data.length; i++) {
            names[response.data[i]['uniqueidentifier']] = response.data[i]['cn;lang-fr']
          }

          for (var key in that.categories) {
            if (names[key]) {
              var item = new DtPopupMenuItem({label: names[key], popup: new DtDropDownMenu()})
              that.searchMenu.addChild(item)

              var all = new DtMenuItem({ label: 'Tout', value: { name: key, content: [] } })
              djOn(all, 'click', djLang.hitch(that, that.filterFamily))
              item.popup.addChild(all)
              item.popup.addChild(new DtMenuSeparator())

              for (var subkey in that.categories[key]) {
                if (names[subkey]) {
                  var subitem = new DtMenuItem({ label: names[subkey], value: {name: subkey, content: that.categories[key][subkey]} })
                  djOn(subitem, 'click', djLang.hitch(that, that.filterFamily))
                  all.value.content = all.value.content.concat(that.categories[key][subkey])
                  item.popup.addChild(subitem)
                }
              }
            }
          }
        }

        that.searchMenu.addChild(new DtMenuSeparator())

        /* */

        Query.exec(Path.url('store/User')).then(function (users) {
          var currentUser = null
          if (window.localStorage.getItem(Path.bcname('user'))) {
            try {
              currentUser = JSON.parse(window.localStorage.getItem(Path.bcname('user')))
            } catch (e) {
              currentUser = null
            }
          }
          if (!currentUser) {
            if (users.success && users.length > 0) {
              currentUser = users.data[0]
              window.localStorage.setItem(Path.bcname('user'), JSON.stringify(currentUser))
            }
          }

          if (users.success && users.length > 0) {
            users.data.forEach(function (user) {
              var radio = new DtRadioMenuItem({label: user.name, checked: currentUser.id === user.id, group: 'user'})
              this.userSelectMenu.addChild(radio)
              radio.on('click', function (event) {
                window.localStorage.setItem(Path.bcname('user'), this)
              }.bind(JSON.stringify(user)))
            }.bind(this))
          }
        }.bind(this))

        Req.get(String(Path.url('store/Status/'))).then((results) => {
          if (results && results.data && results.data.length > 0) {
            var p = new DtPopupMenuItem({label: 'Par status', popup: new DtDropDownMenu()})
            results.data.forEach(djLang.hitch(this, function (entry) {
              if (entry.type === '0') {
                var html = '<li class="fa fa-square" style="color: #' + entry.color + '"></li> ' + entry.name
                var item = new DtMenuItem({label: html, value: entry})
                djOn(item, 'click', djLang.hitch(that, (event) => {
                  var node = dtRegistry.byNode(event.selectorTarget)
                  this.wait()
                  this.Filter.postMessage({ ops: [
                    {filter: 'equal', params: { value: Number(node.value.id), attribute: 'status' }}
                  ]})
                  this.update()
                }))

                p.popup.addChild(item)
              }
            }))
            that.searchMenu.addChild(p)

            p = new DtPopupMenuItem({label: 'Par complément', popup: new DtDropDownMenu()})
            results.data.forEach((entry) => {
              if (entry.type === 1) {
                var html = '<li class="fa fa-square" style="color: #' + entry.color + '"></li> ' + entry.name
                var item = new DtMenuItem({ label: html, value: entry })
                djOn(item, 'click', djLang.hitch(that, (e) => {
                  var node = dtRegistry.byNode(e.selectorTarget)
                  if (node.value && node.value.id) {
                    this.searchMenu.filterNone.set('disabled', false)
                    var out = that.filterComplement(this.entries, node.value.id)
                    this.filterApply(out)
                    this.resize()
                  }
                }))
                p.popup.addChild(item)
              }
            })
            that.searchMenu.addChild(p)
          }

          that.searchMenu.addChild(new DtMenuSeparator())

          var now = djDateStamp.toISOString(djDate.add(new Date(), 'day', 1))

          var item = new DtMenuItem({label: 'Commence le '})
          var x = new DtDateTextBox({value: now, id: 'menuStartDay'})
          item.containerNode.appendChild(x.domNode)
          item.own(x)
          djOn(item, 'click', djLang.hitch(that, (e) => {
            this.filterReset()
            var date = dtRegistry.byId('menuStartDay').get('value')
            this.center = date
            this.update()
            this.filterApply(this.filterDate(this.entries, date))
          }))
          that.searchMenu.addChild(item)

          item = new DtMenuItem({label: 'Termine le '})
          djOn(item, 'click', djLang.hitch(that, () => {
            this.filterReset()
            var date = dtRegistry.byId('menuEndDay').get('value')
            this.center = date
            this.update()
            that.filterApply(this.filterDate(this.entries, date, 'trueEnd'))
          }))
          x = new DtDateTextBox({ value: now, id: 'menuEndDay' })
          item.containerNode.appendChild(x.domNode)
          item.own(x)
          that.searchMenu.addChild(item)

          that.searchMenu.addChild(new DtMenuSeparator())

          item = new DtMenuItem({label: 'À faire le '})
          djOn(item, 'click', djLang.hitch(that, () => {
            var date = dtRegistry.byId('menuTodoDay').get('value')
            this.filters.todo(date, this.Entries)
          }))
          x = new DtDateTextBox({ value: now, id: 'menuTodoDay' })
          item.containerNode.appendChild(x.domNode)
          item.own(x)
          that.searchMenu.addChild(item)
        }).then(() => { that.menu.startup() })
      })
    },

    filters: {
      todo: (date, wEntries) => {
        date.setHours(12, 0, 0)
        let d1 = new Date(); d1.setTime(date.getTime() - 86400000)
        let d2 = new Date(); d2.setTime(date.getTime() + 86400000)

        let txtD1 = d1.toISOString().split('T')[0]
        let txtD2 = d2.toISOString().split('T')[0]
        let txtDate = date.toISOString().split('T')[0]

        /* récupère les réservation commençant à la date */
        let q1 = Query.exec(Path.url('store/Reservation', {params: {
          'search.begin': `~${txtDate}%`,
          'search.deliveryBegin': `~${txtDate}%`,
          'search._rules': 'begin OR deliveryBegin'}}))
        /* récupère les associations étant dans la période */
        let q2 = Query.exec(Path.url('store/Association', {params: {
          'search.begin': `<=${txtD2}`,
          'search.end': `>=${txtD1}`,
          'search.type': `~%/4`
        }}))

        /* récupère les associations qui suivent la taille de la réservation */
        let q3 = new Promise((resolve, reject) => {
          Query.exec(Path.url('store/Reservation', {params: {
            'search.begin': `<${txtD2}`,
            'search.end': `>${txtD1}` }})).then((results) => {
            if (!results.success || results.length <= 0) { resolve([]); return }
            let queries = []
            let entryBind = {}
            results.data.forEach((e) => {
              entryBind[e.id] = e.target
              queries.push(Query.exec(Path.url('store/Association', {params: {
                'search.reservation': e.id,
                'search.type': `~%/4`,
                'search.follow': '1'}})))
            })
            Promise.all(queries).then((results) => {
              let entries = []
              results.forEach((result) => {
                if (result.success && result.length > 0) {
                  result.data.forEach((x) => {
                    if (entryBind[x.reservation] && entries.indexOf(entryBind[x.reservation]) === -1) {
                      entries.push(entryBind[x.reservation])
                    }
                  })
                }
              })
              resolve(entries)
            })
          })
        })

        Promise.all([q1, q2]).then((results) => {
          let entries = []

          /* il convient de récupérer les réservation pour connaître à quel entrée appartient l'association */
          let q4 = new Promise((resolve, reject) => {
            if (!results[1].success || results[1].length <= 0) {
              resolve()
              return
            }

            let queries = []
            results[1].data.forEach((e) => {
              queries.push(Query.exec(Path.url(`store/Reservation/${e.reservation}`)))
            })

            Promise.all(queries).then((results) => {
              results.forEach((result) => {
                if (result.success && result.length > 0) {
                  if (entries.indexOf(result.data.target) === -1) {
                    entries.push(result.data.target)
                  }
                }
              })

              resolve()
            })
          })

          if (results[0].success && results[0].length > 0) {
            results[0].data.forEach((e) => {
              if (entries.indexOf(e.target) === -1) {
                entries.push(e.target)
              }
            })
          }

          q4.then(() => {
            q3.then((results) => {
              results.forEach((e) => {
                if (entries.indexOf(e) === -1) {
                  entries.push(e)
                }
              })
              window.App.searchMenu.filterNone.set('disabled', false)
              window.App.gotoDay(`${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`)
              for (let e in wEntries) {
                if (entries.indexOf(wEntries[e].get('target')) === -1) {
                  wEntries[e].set('active', false)
                } else {
                  wEntries[e].set('active', true)
                }
                wEntries[e].resize()
              }
            })
          })
        })
      }
    },

    filterNone: function () {
      this.searchMenu.filterNone.set('disabled', true)
      this.filterReset()
      this.resize()
    },

    filterFamily: function (event) {
      this.filterReset()
      var node = dtRegistry.byNode(event.selectorTarget)
      this.searchMenu.filterNone.set('disabled', false)
      for (var i = 0; i < this.entries.length; i++) {
        if (node.value.content.indexOf(this.entries[i].target) === -1) {
          this.entries[i].set('active', false)
        } else {
          this.entries[i].set('active', true)
        }
      }
    },

    filterDate: function (entries) {
      this.filterReset()
      var out = []
      var date = new Date()
      var what = 'trueBegin'
      this.searchMenu.filterNone.set('disabled', false)
      if (arguments[1]) {
        date = arguments[1]
      }
      if (arguments[2]) {
        what = arguments[2]
      }

      for (var i = 0; i < entries.length; i++) {
        for (var k in entries[i].entries) {
          if (djDate.compare(entries[i].entries[k].get(what), date, 'date') === 0) {
            out.push(entries[i].get('id')); break
          }
        }
      }

      return out
    },

    filterStatus: function (event) {
      this.filterReset()
      var node = dtRegistry.byNode(event.selectorTarget)
      this.searchMenu.filterNone.set('disabled', false)
      for (var i = 0; i < this.entries.length; i++) {
        var entry = this.entries[i]
        var active = entry.get('activeReservations')
        if (active.length <= 0) {
          entry.set('active', false)
        } else {
          var count = 0
          for (var j = 0; j < active.length; j++) {
            if (active[j].status === node.value.id) {
              count++; break
            }
          }
          if (count > 0) {
            entry.set('active', true)
          } else {
            entry.set('active', false)
          }
        }
      }
      this.resize()
    },

    filterComplementDate: function (date, complement) {
      this.Filters.init()
      this.Filters.beginDay(date).then(function () {
        var result = this.Filters.entries.splice(0)
        this.Filters.init()
        this.Filters.find((val) => {
          for (var i = 0; i < val.complements.length; i++) {
            if (val.complements[i].type.id === complement) {
              return true
            }
          }
          return false
        }).then(function () {
          var set = this.Filters.entries.splice(0)
          this.Filters.init()
          this.Filters.dateRange(date, set, 'complement').then(function () {
            this.searchMenu.filterNone.set('disabled', false)
            result = result.concat(this.Filters.entries)
            for (var i = 0; i < this.entries.length; i++) {
              if (result.indexOf(this.entries[i].get('target')) === -1) {
                this.entries[i].set('active', false)
              } else {
                this.entries[i].set('active', true)
              }
            }
            this.unwait()
          }.bind(this))
        }.bind(this))
      }.bind(this))
      this.filterReset()
    },

    filterComplement: function (entries, value) {
      this.filterReset()
      var out = []
      for (var i = 0; i < entries.length; i++) {
        var found = false
        var active = entries[i].get('activeReservations')
        if (active.length > 0) {
          for (var j = 0; j < active.length; j++) {
            for (var k = 0; k < active[j].complements.length; k++) {
              if (active[j].complements[k].type.id === value) {
                out.push(entries[i].get('id'))
                found = true
                break
              }
            }
            if (found) { break }
          }
        }
      }
      return out
    },

    filterApply: function (entries) {
      this.filterReset()
      for (var i = 0; i < this.entries.length; i++) {
        if (entries.indexOf(this.entries[i].get('id')) === -1) {
          this.entries[i].set('active', false)
        } else {
          this.entries[i].set('active', true)
        }
      }
    },

    filterReset: function (prefilter = false) {
      for (var i = 0; i < this.entries.length; i++) {
        this.entries[i].set('active', true)
      }
    },

    mouseUpDown: function (event) {
      if (event.type === 'mouseup') {
        this.eventStarted = null
      } else {
        this.eventStarted = event
      }
      window.requestAnimationFrame(function () {
        var domNode = document.getElementsByTagName('body')[0]
        if (event.type === 'mouseup') {
          domNode.setAttribute('style', 'cursor: grab; cursor: -webkit-grab;')
          this.timelineMoving = false
          this.refresh()
        } else {
          domNode.setAttribute('style', 'cursor: grabbing !important; cursor: -webkit-grabbing !important;')
          for (let node = this.domEntries.firstElementChild; node; node = node.nextElementSibling) {
            node.dataset.refresh = 'outdated'
          }
          this.timelineMoving = true
        }
      }.bind(this))
    },

    windowMouseMovement: function (event) {
      if (event.clientX < 2) {
        if (!this.CommandModeMouseTo) {
          if (!window.App.CommandMode) {
            this.NextToZeroResetCommandMode = false
            this.CommandModeMouseTo = window.setTimeout((event) => {
              window.App.switchCommandMode(true)
              this.CommandModeMouseTo = null
            }, 350)
          }
        }
        if (this.NextToZeroResetCommandMode) {
          this.NextToZeroResetCommandMode = false
          window.App.switchCommandMode(true)
          this.CommandModeMouseTo = window.setTimeout((event) => {
            this.CommandModeMouseTo = null
          }, 500)
        }
      }

      if (event.clientX > 2 && this.CommandModeMouseTo) {
        window.clearTimeout(this.CommandModeMouseTo)
        this.CommandModeMouseTo = null
      }

      if (event.clientX > 320 && window.App.CommandMode) {
        this.NextToZeroResetCommandMode = true
      }
    },

    mouseOver: function (event) {
      if (this._mask) { return }
      if (event.type === 'touchmove') {
        if (window.App.touchTimeout) {
          clearInterval(window.App.touchTimeout)
        }
      }
      var nodeBox = djDomGeo.getContentBox(this.domNode)
      var sight = this.sight
      var days = this.days

      if (document.selection && document.selection.empty) {
        document.selection.empty()
      } else if (window.getSelection) {
        var sel = window.getSelection()
        sel.removeAllRanges()
      }

      if (event.clientX <= 200 || (this.eventStarted != null && this.eventStarted.clientX <= 200)) { return }
      /* Move, following mouse, timeline left/right and up/down when left button is held */
      if (event.buttons === 1 || event.type === 'touchmove') {
        if (!this.originalTarget) {
          this.originalTarget = event.target
        }
        var multiplicator = 1
        var targetClass = this.originalTarget.getAttribute('class')
        if (targetClass && targetClass.includes('weekNumber')) {
          multiplicator = 7
        } else if (targetClass && targetClass.includes('monthName')) {
          multiplicator = 30
        }
        var xDiff = Math.abs(this.lastClientXY[0] - event.clientX)
        var yDiff = Math.abs(this.lastClientXY[1] - event.clientY)

        if ((Math.abs(xDiff - yDiff) > 40 && xDiff <= yDiff) || xDiff > yDiff) {
          if (this.lastClientXY[0] - event.clientX > 0) {
            this.xDiff += xDiff
          } else if (this.lastClientXY[0] - event.clientX < 0) {
            this.xDiff += -xDiff
          }
          var move = 1
          if (this.xDiff < 0) {
            this.moveXLeft(Math.round(move * multiplicator))
          } else {
            this.moveXRight(Math.round(move * multiplicator))
          }
          this.xDiff = 0
        }

        if ((Math.abs(yDiff - xDiff) > 40 && yDiff <= xDiff) || yDiff > xDiff) {
          var top = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0)
          if (this.lastClientXY[1] - event.clientY > 0) {
            window.scrollTo(0, top + (yDiff * 1.25))
          } else if (this.lastClientXY[1] - event.clientY < 0) {
            window.scrollTo(0, top - (yDiff * 1.25))
          }
        }
      } else {
        this.originalTarget = null
      }

      fastdom.measure(function () {
        var none = true
        for (var i = 0; i < days.length; i++) {
          var pos = djDomGeo.position(days[i].domNode, days[i].computedStyle)
          if (event.clientX >= pos.x && event.clientX <= (pos.x + pos.w)) {
            fastdom.mutate(function () {
              sight.setAttribute('style', 'width: ' + pos.w + 'px; height: ' + nodeBox.h + 'px; top: 0; left: ' + pos.x + 'px;')
            })
            none = false
            break
          }
        }

        if (none) {
          fastdom.mutate(function () {
            sight.removeAttribute('style')
          })
        }
      })

      this.lastClientXY[0] = event.clientX
      this.lastClientXY[1] = event.clientY
    },

    eWheel: function (event) {
      if (this._mask) { return }
      var move = 1
      if (event.deltaX < 0) {
        this.moveXLeft(move)
      } else if (event.deltaX > 0) {
        this.moveXRight(move)
      }
      this.wheelTo = null
      if (event.ctrlKey) {
        event.preventDefault()
        if (event.deltaY < 0) {
          this.zoomInN(event.deltaY)
        } else {
          this.zoomOutN(-event.deltaY)
        }
      }
    },

    getDateRange: function () {
      return { begin: this.firstDay, end: this.lastDay }
    },
    _getDateRangeAttr: function () {
      return this.getDateRange()
    },

    today: function () {
      this.set('center', new Date())
      this.update(true)
    },

    chooseDay: function () {
      var calendar = new DtCalendar({ value: this.center })
      var dialog = new Dialog({title: 'Choisir une date'})

      dialog.addChild(calendar)
      dialog.startup()
      dialog.show()

      djOn(calendar, 'change', djLang.hitch(this, (e) => {
        this.set('center', e)
        this.update()
        dialog.destroy()
      }))
    },

    moveXRight: function (x) {
      this.center = djDate.add(this.center, 'day', Math.abs(x))
      this.update()
    },
    moveOneRight: function () {
      this.center = djDate.add(this.center, 'day', 1)
      this.update()
    },
    moveRight: function () {
      var move = 1
      if (this.days.length > 7) {
        move = Math.floor(this.days.length / 7)
      }
      this.center = djDate.add(this.center, 'day', move)
      this.update()
    },
    moveXLeft: function (x) {
      this.center = djDate.add(this.center, 'day', -Math.abs(x))
      this.update()
    },
    moveOneLeft: function () {
      this.center = djDate.add(this.center, 'day', -1)
      this.update()
    },
    moveLeft: function () {
      var move = 1
      if (this.days.length > 7) {
        move = Math.floor(this.days.length / 7)
      }

      this.center = djDate.add(this.center, 'day', -move)
      this.update()
    },

    /* insert into linked list */
    _lli: function (root, node) {
      node.set('nextNode', null)
      for (var current = root; current; current = current.get('nextNode')) {
        if (current.get('target') === node.get('placeAfter')) {
          node.set('nextNode', current.get('nextNode'))
          current.set('nextNode', node)
          return true
        }
      }

      return false
    },

    placeEntry: function (entry) {
      this.Entries[entry.target] = entry
      this.entries.push(entry)
    },

    _getCompactAttr: function () {
      return this.compact
    },

    toggle: function (attr) {
      var targetNode = this.currentTopEntry()
      var delta = getElementRect(targetNode.domNode)[1] - getPageRect()[1]
      switch (attr) {
        case 'compact':
          if (this.get('compact')) {
            this.set('compact', !this.get('compact'))
          } else {
            this.set('compact', true)
          }

          if (this.get('compact')) {
            djDomClass.add(window.App.domNode, 'compact')
          } else {
            djDomClass.remove(window.App.domNode, 'compact')
          }
          this.emit('zoom')
          break
        case 'extension':
          this.set('extension', !this.get('extension'))
          if (this.get('extension')) {
            djDomClass.remove(window.App.domNode, 'noextender')
          } else {
            djDomClass.add(window.App.domNode, 'noextender')
          }
          break
        case 'autoprint':
          if (window.localStorage.getItem(Path.bcname('autoprint'))) {
            window.localStorage.removeItem(Path.bcname('autoprint'))
          } else {
            window.localStorage.setItem(Path.bcname('autoprint'), '1')
          }
      }
      this.update(true)
      let pos = getElementRect(targetNode.domNode)
      window.scroll(0, pos[1] - delta)
    },

    drawTimeline: function () {
      var avWidth = this.domNode.offsetWidth
      var currentWeek = 0
      var dayCount = 0
      var currentMonth = -1
      var dayMonthCount = 0
      var currentYear = -1
      var months = []
      this.todayOffset = -1
      this.weekOffset = -1
      this.destroyWeekNumber()
      this.destroyMonthName()
      for (var x = this.days.pop(); x != null; x = this.days.pop()) {
        if (x.domNode.parentNode) {
          x.domNode.parentNode.removeChild(x.domNode)
        }
      }

      var docFrag = document.createDocumentFragment()
      var hFrag = document.createDocumentFragment()
      var shFrag = document.createDocumentFragment()

      if (!this.Holidays) {
        this.Holidays = new Holiday(this.center.getFullYear())
      } else {
        this.Holidays.addYear(this.center.getFullYear())
      }
      
      this.firstDay = djDate.add(this.center, 'day', -Math.floor(avWidth / this.get('blockSize') / 2))
      for (var day = this.firstDay, i = 0; i < this.get('zoom'); i++) {
        if (djDate.compare(day, new Date(), 'date') === 0) {
          this.todayOffset = i
        }

        if (currentWeek !== day.getWeek()) {
          if (currentWeek === 0) {
            currentWeek = day.getWeek()
          } else {
            if (this.weekOffset === -1) { this.weekOffset = i }
            this.createWeekNumber(currentWeek, dayCount, hFrag)
            dayCount = 0
            currentWeek = day.getWeek()
          }
        }
        if (currentMonth !== day.getMonth()) {
          if (currentMonth === -1) {
            currentMonth = day.getMonth()
            if (currentMonth % 2) { months.push(i) }
            currentYear = day.getFullYear()
          } else {
            this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag)
            dayMonthCount = 0
            currentMonth = day.getMonth()
            if (currentMonth % 2) { months.push(i) }
            currentYear = day.getFullYear()
          }
        }
        var d = this.makeDay(day)
        if (typeof window.Rent.Days[d.stamp] === 'undefined') {
          window.Rent.Days[d.stamp] = {}
        }

        this.days.push(d)
        if (this.get('blockSize') > 20) {
          djDomConstruct.place(d.domNode, docFrag, 'last')
        }

        day = djDate.add(day, 'day', 1)
        this.lastDay = day
        dayCount++; dayMonthCount++
      }
      if (dayCount > 0) {
        this.createWeekNumber(currentWeek, dayCount, hFrag)
      }
      if (dayMonthCount > 0) {
        this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag)
      }
      fastdom.mutate(djLang.hitch(this, function () {
        this.line.appendChild(docFrag)
        this.header.appendChild(hFrag)
        this.supHeader.appendChild(shFrag)
      }))
    },

    drawSubline: function () {
      var sublineFrag = document.createDocumentFragment()
      for (var i = this.get('dateRange').begin; djDate.compare(i, this.get('dateRange').end, 'date') < 0; i = djDate.add(i, 'day', 1)) {
        var span = document.createElement('SPAN')
        var stamp = djDateStamp.toISOString(i, {selector: 'date'})
        var val = window.Rent.Days[stamp]
        for (var k in val) {
          var total = 0
          for (var j in val[k]) {
            total += val[k][j]
          }
          span.innerHTML += total + ' <i class="fas fa-square-full" style="color: #' + k + '"></i>'
        }
        sublineFrag.appendChild(span)
      }

      fastdom.mutate(function () {
        this.subline.innerHTML = ''
        this.subline.appendChild(sublineFrag)
      }.bind(this))
    },

    drawVerticalLine: function () {
      var frag = document.createDocumentFragment()
      var that = this

      if (this.currentVerticalLine !== this.get('blockSize')) {
        frag.appendChild(document.createElement('DIV'))
        for (var i = 0; i < this.days.length; i++) {
          var node = document.createElement('DIV')
          var nodeclass = ''
          if (i % 2) {
            nodeclass = 'vertical even'
          } else {
            nodeclass = 'vertical odd'
          }

          var style = ''

          if (djDate.compare(this.days[i]._date, new Date(), 'date') === 0) {
            nodeclass = nodeclass + ' today'
          }
          node.setAttribute('class', nodeclass)
          node.setAttribute('style', style + 'height: 100%; position: fixed; top: 0; z-index: -10; width: ' +
          this.get('blockSize') + 'px; display: block; background-color: transparent; left: ' + (this.get('offset') + (this.get('blockSize') * i)) + 'px')
          frag.firstChild.appendChild(node)
        }

        fastdom.mutate(djLang.hitch(this, function () {
          if (this.nVerticals.firstChild) { this.nVerticals.removeChild(that.nVerticals.firstChild) }
          this.nVerticals.appendChild(frag)
          this.currentVerticalLine = this.get('blockSize')
        }))
      }
    },

    run: function () {
      var loaded = []
      this.currentPosition = 0
      this.update()

      Query.exec(new URL('https://aircluster.local.airnace.ch/store/Machine')).then(async function (response) {
        /* TODO when updated completly use new fetch api */
        if (response.data) {
          var whole = response.data
          var inc = 0
          var category = {}
          for (var i = 0; i < whole.length; i++) {
            var machine = whole[i]
            let groupName = []
            var name = machine.description
            var label = machine.cn ? machine.cn : ''

            if (machine.state && machine.state.indexOf('SOLD') !== -1) {
              continue
            }

            if (machine.family) {
              if (Array.isArray(machine.family)) {
                machine.family.forEach((g) => {
                  groupName.push(g.replace(/(\s|-)/g, ''))
                })
              } else {
                groupName.push(machine.family.replace(/(\s|-)/g, ''))
              }
            }
            if (machine.type) {
              if (Array.isArray(machine.type)) {
                machine.type.forEach((g) => {
                  groupName.push(g.replace(/(\s|-)/g, ''))
                })
              } else {
                groupName.push(machine.type.replace(/(\s|-)/g, ''))
              }
            }
            if (name) {
              if (machine.cn) {
                name += '<div class="name">' + machine.cn + '</div>'
              }
              var e = new Entry({name: name, sup: this, isParent: true, target: machine.description, label: machine.cn, url: '/store/Machine/' + machine.description, channel: new MessageChannel(), details: machine})
              e.loadExtension()
              this.placeEntry(e)
              var families = []
              var types = []
              if (machine.family && machine.type) {
                families = String(machine.family).split(',')
                types = String(machine.type).split(',')
                if (!djLang.isArray(families)) { families = new Array(families) }
                if (!djLang.isArray(types)) { types = new Array(types) }
                
                for (var j = 0; j < families.length; j++) {
                  if (!category[families[j]]) {
                    category[families[j]] = {}
                  }

                  for (var k = 0; k < types.length; k++) {
                    if (!category[families[j]][types[k]]) {
                      category[families[j]][types[k]] = []
                    }
                    category[families[j]][types[k]].push(e.target)
                  }
                }
              }

              djDomClass.add(e.domNode, groupName)
              loaded.push(e.loaded)
              this.Updater.postMessage({op: 'newTarget', target: e.get('target')}, [e.port()])
              if (machine.airaltref && djLang.isArray(machine.airaltref)) {
                machine.airaltref.forEach(function (altref) {
                  var name = altref + '<div class="name">' + machine.cn + '</div>'
                  var e = new Entry({name: name, sup: this, isParent: false, target: altref.trim(), label: label, url: '/store/Machine/' + altref.trim(), channel: new MessageChannel(), details: machine})
                  e.loadExtension()
                  this.placeEntry(e)
                  djDomClass.add(e.domNode, groupName)
                  for (var j = 0; j < families.length; j++) {
                    for (var k = 0; k < types.length; k++) {
                      category[families[j]][types[k]].push(e.target)
                    }
                  }

                  loaded.push(e.loaded)
                  this.Updater.postMessage({op: 'newTarget', target: e.get('target')}, [e.port()])
                }.bind(this))
              } else if (machine.airaltref) {
                name = machine.airaltref + '<div class="name">' + machine.cn + '</div>'
                e = new Entry({name: name, sup: this, isParent: false, target: machine.airaltref.trim(), label: label, url: '/store/Machine/' + machine.airaltref.trim(), channel: new MessageChannel(), details: machine})
                e.loadExtension()
                this.placeEntry(e)
                for (j = 0; j < families.length; j++) {
                  for (k = 0; k < types.length; k++) {
                    category[families[j]][types[k]].push(e.target)
                  }
                }

                djDomClass.add(e.domNode, groupName)
                loaded.push(e.loaded)
                this.Updater.postMessage({op: 'newTarget', target: e.get('target')}, [e.port()])
              }

              inc++
            }
          }
        }
        this.categories = category
        djAll(loaded).then(function () {
          this.sortAndDisplayEntries()
          this.buildMenu()
          this.update()
          window.setInterval(function () { console.log('Update child'); this.updateChild() }.bind(this), 300000)
        }.bind(this))
      }.bind(this))
    },

    sortAndDisplayEntries: function () {
      this.entries.sort((a, b) => {
        let aT = Number.isNaN(parseInt(a.get('target'))) ? 99999 : parseInt(a.get('target'))
        let bT = Number.isNaN(parseInt(b.get('target'))) ? 99999 : parseInt(b.get('target'))

        a.domNode.dataset.groupId = Math.floor(aT / 100)
        b.domNode.dataset.groupId = Math.floor(bT / 100)
        if (aT === 99999 && bT !== 99999) { a.domNode.dataset.pushToEnd = true; return 1 }
        if (aT !== 99999 && bT === 99999) { b.domNode.dataset.pushToEnd = true; return -1 }
        if (Math.floor(aT / 100) - Math.floor(bT / 100) !== 0) { return Math.floor(aT / 100) - Math.floor(bT / 100) }

        const techData = [ 'workheight:r', 'floorheight:r', 'maxcapacity:r', 'sideoffset:r' ]
        for (let i = 0; i < techData.length; i++) {
          let [name, reverse] = techData[i].split(':', 2)
          let aT = a.get(name)
          let bT = b.get(name)

          if (aT - bT !== 0) {
            if (reverse === undefined) {
              return aT - bT
            } else {
              return bT - aT
            }
          }
        }

        if (a.get('name') !== b.get('name')) {
          if (a.get('name') > b.get('name')) {
            return 1
          } else {
            return -1
          }
        }

        return ((bT - (Math.floor(bT / 100) * 100)) - (aT - (Math.floor(aT / 100) * 100)))
      })

      this.entries.forEach((e) => {
        let inType = false
        let insertBefore = null
        if (e.domNode.dataset.pushToEnd) {
          this.domEntries.appendChild(e.domNode)
          return
        }
        for (let n = this.domEntries.firstElementChild; n; n = n.nextElementSibling) {
          if (n.dataset.groupId === e.domNode.dataset.groupId && n.dataset.type === e.domNode.dataset.type && !inType) { inType = true }
          if (n.dataset.type !== e.domNode.dataset.type && inType) { insertBefore = n; inType = false; break }
        }
        if (insertBefore) {
          this.domEntries.insertBefore(e.domNode, insertBefore)
        } else {
          this.domEntries.appendChild(e.domNode)
        }
      })

      /* as we display we modify the order, so check the final order by using the DOM */
      let entriesOrder = []
      for (let n = this.domEntries.firstElementChild; n; n = n.nextElementSibling) {
        let widget = dtRegistry.byNode(n)
        if (widget) {
          entriesOrder.push(widget)
        }
      }
      this.entries = [...entriesOrder]
    },

    updateChild: function () {
      for (var k in this.Entries) {
        let update = this.Entries[k].update
        setTimeout(update, 1)
      }
    },

    refresh: function () {
      if (!this.timelineMoving) {
        var begin = new Date()
        var end = new Date()

        begin.setTime(this.get('dateRange').begin.getTime())
        end.setTime(this.get('dateRange').end.getTime())
        begin.setTime(begin.getTime() - 604800000)
        end.setTime(end.getTime() + 604800000)

        this.Updater.postMessage({op: 'move', begin: begin, end: end})
      }
    },

    update: function (force = false) {
      this.refresh()
      this.resize()
    },

    _getEntriesAttr: function () {
      var entries = []
      dtRegistry.findWidgets(this.domEntries).forEach(function (widget) {
        if (widget instanceof location.entry) {
          entries.push(widget)
        }
      })

      return entries
    },

    highlight: function (domNode) {
      if (this.Highlighting) {
        djDomStyle.set(this.Highlighting[0], 'box-shadow', '')
        window.clearTimeout(this.Highlighting[1])
      } else {
        this.Highlighting = []
      }

      djDomStyle.set(domNode, 'box-shadow', '0px 0px 26px 10px rgba(255,255,0,1)')
      this.Highlighting[0] = domNode
      this.Highlighting[1] = window.setTimeout(function () {
        djDomStyle.set(domNode, 'box-shadow', '')
      }, 5000)
    },

    goToReservation: function (data, center) {
      var def = new DjDeferred()
      var that = this
      var middle = window.innerHeight / 3
      var widget = null

      for (var k in this.entries) {
        if (this.entries[k].target === data['target']) {
          widget = this.entries[k]
          break
        }
      }

      var tContainer = dtRegistry.byId('tContainer')
      if (djDomStyle.get(tContainer.domNode, 'display') !== 'none') {
        var w = djDomStyle.get(tContainer.domNode, 'width')
        center = djDate.add(center, 'day', Math.abs(w / this.get('blockSize')))
      }

      that.set('center', center)
      that.update()

      if (widget) {
        var pos = djDomGeo.position(widget.domNode, true)
        window.scroll(0, pos.y - middle)
        var reservation = null

        for (k in widget.entries) {
          if (widget.entries[k].id === data.id) {
            reservation = widget.entries[k]
            break
          }
        }

        if (reservation) {
          def.resolve(reservation)
        }
      }

      return def.promise
    },

    currentTopEntry: function () {
      var current
      var page = getPageRect()
      for (var k in this.entries) {
        var rect = this.entries[k].view.rectangle
        if (!current && rect[1] >= page[1]) {
          current = this.entries[k]
          continue
        }

        if (rect[1] >= page[1] && rect[1] < current.view.rectangle[1]) {
          current = this.entries[k]
        }
      }
      return current
    },

    doSearchLocation: function (loc, dontmove = false) {
      DoWait()
      return new Promise(function (resolve, reject) {
        Query.exec(Path.url('store/DeepReservation/' + loc)).then(function (result) {
          if (result && result.length === 0) {
            reject()
          } else {
            var reservation = result.data
            if (reservation.deleted) {
              reject()
              DoWait(false)
              return
            }
            if (!dontmove) { this.set('center', reservation.deliveryBegin ? new Date(reservation.deliveryBegin) : new Date(reservation.begin)) }
            this.update()
            var data = result.data
            this.Entries[data.target].addOrUpdateReservation([data])
            if (this.Entries[data.target].openReservation(data.id)) {
              if (!dontmove) {
                let pos = djDomGeo.position(this.Entries[data.target].domNode, true)
                window.scroll(0, pos.y - (window.innerHeight / 3))
              }
              resolve()
            } else {
              reject()
            }
            DoWait(false)
          }
        }.bind(this), () => DoWait(false))
      }.bind(this), () => DoWait(false))
    },

    print: function (url) {
      window.open(url)
    },

    getEntry: function (entry) {
      var e = null
      for (var i = 0; i < this.entries.length; i++) {
        if (this.entries[i].get('target') === entry) {
          e = this.entries[i]
          break
        }
      }

      return e
    },

    setOpen: function (ident) {
      if (!this.Open) { this.Open = [] }
      if (this.Open.indexOf(ident) === -1) { this.Open.push(ident) }
    },

    unsetOpen: function (ident) {
      if (this.Open) {
        var idx = this.Open.indexOf(ident)
        if (idx !== -1) {
          this.Open.splice(idx, 1)
        }
      }
    },

    isOpen: function (ident) {
      if (this.Open) {
        if (this.Open.indexOf(ident) === -1) { return false }
        return true
      }
      return false
    },

    setModify: function (ident) {
      if (!this.Mod) { this.Mod = [] }
      if (this.Mod.indexOf(ident) === -1) { this.Mod.push(ident) }
    },

    unsetModify: function (ident) {
      if (this.Mod) {
        var idx = this.Mod.indexOf(ident)
        if (idx !== -1) {
          this.Mod.splice(idx, 1)
        }
      }
    },

    isModify: function (ident) {
      if (this.Mod) {
        if (this.Mod.indexOf(ident) === -1) { return false }
        return true
      }
      return false
    },
    wait: function () {
      if (!document.getElementById('WaitDisplay')) {
        var w = Math.abs(window.innerWidth / 2) - 25
        var x = document.createElement('DIV')
        var y = document.createElement('I')
        y.setAttribute('class', 'fas fa-spinner fa-pulse')
        y.setAttribute('style', 'position: relative; top: 100px;')
        x.appendChild(y)
        x.setAttribute('id', 'WaitDisplay')
        x.setAttribute('style', 'font-size: 80px; text-align: center; position: absolute; z-index: 99999999; left: ' + w + 'px; top: 0; left: 0; bottom: 0; right: 0; background-color: rgba(255,255,255,0.5)')
        if (arguments[0]) {
          var z = document.createElement('DIV')
          z.setAttribute('style', 'font-size: 18pt; font-family: sans-serif; position: relative; top: 150px;')
          z.appendChild(document.createTextNode(arguments[0]))
          x.appendChild(z)
        }
        window.requestAnimationFrame(() => {
          document.body.appendChild(x)
        })
      }
    },
    unwait: function () {
      var n = document.getElementById('WaitDisplay')
      if (n) {
        window.requestAnimationFrame(() => {
          document.body.removeChild(n)
        })
      }
    },
    minimizeMaximize: function (event) {
      var node = this.nMinimizeMaximize
      var inode = node
      var max = false
      if (arguments[1]) {
        max = true
      }
      if (inode.nodeName !== 'I') {
        for (inode = inode.firstChild; inode.nodeName !== 'I'; inode = inode.nextSibling) ;
      }
      while (node && !node.getAttribute('data-artnum-maximize')) {
        node = node.parentNode
      }
      if (!max && node.getAttribute('data-artnum-maximize') === 'yes') {
        node.setAttribute('data-artnum-maximize', 'no')
      } else {
        node.setAttribute('data-artnum-maximize', 'yes')
      }
    },

    reinit: function () {
      if (!this.FirstLoad) {
        if (!confirm('Une mise à jour est dispobnible, voulez-vous recharger')) {
          return
        }
      }

      this.wait('Mise à jour du programme')
      window.localStorage.setItem(Path.bcname('revision'), this.currentRevision)
      this.Cleaner.postMessage({op: 'rebuild'})
    },

    autoprint: function (path) {
      if (window.localStorage.getItem(Path.bcname('autoprint'))) {
        fetch(Path.url('exec/auto-print.php', {params: {file: path}}))
      }
    },
    openUncounted: function () {
      var uncounted = new Doc({width: window.innerWidth - 740, style: 'background-color: #FFFFCF;'})
      var iframe = document.createElement('IFRAME')
      iframe.setAttribute('src', 'uncounted.html')
      iframe.setAttribute('style', 'border: none; width: 100%; height: 100%')
      uncounted.content(iframe)
    }
  })
})
