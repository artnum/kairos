/* eslint-env browser, amd */
/* global getPageRect, getElementRect, APPConf, DoWait, Holiday, Tooltip, Popper */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/timeline.html',

  'dojo/aspect',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/dom-geometry',
  'dijit/registry',

  'location/timeline/popup',
  'location/timeline/keys',
  'location/timeline/filters',
  'location/count',
  'location/countList',
  'location/reservation',

  'artnum/Doc'

], function (
  djDeclare,
  djLang,
  djEvented,
  DjDeferred,
  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,

  _template,
  djAspect,
  djDate,
  djDateStamp,
  djDomConstruct,
  djOn,
  djDomClass,
  djDomStyle,
  djDomGeo,
  dtRegistry,
  
  tlPopup, tlKeys, Filters,
  Count,
  CountList,
  Reservation,

  Doc
) {
  return djDeclare('location.timeline', [
    dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented,
    tlPopup, tlKeys, Filters ], {
    center: null,
    offset: 260,
    blockSize: 42,
    baseClass: 'timeline',
    templateString: _template,
    zoomCss: null,
    timeout: null,
    lastDay: null,
    firstDay: null,
    verticals: null,
    lastClientXY: [0, 0],
    lastMod: 0,
    eventStarted: null,
    daysZoom: 0,
    compact: false,
    currentVerticalLine: 0,

    constructor: function (args) {
      djLang.mixin(this, arguments)
      this.verticals = []
      this.days = []
      this.weekNumber = []
      this.Entries = new Map()
      this.todayOffset = -1
      this.months = []
      this.timeout = null
      this.lastDay = null
      this.firstDay = null
      this.odd = true
  
      this.lastClientXY = []
      this.lastMod = ''
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

      this.center = new Date()
      this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0)

      if (KAIROS.centerTodayRatio) {
        this.center.setTime(this.center.getTime() + this.daysZoom * KAIROS.centerTodayRatio / 2 * 86400000)
      }

      this.Viewport = new KView()
      this.Viewport.setEntryHeight(78)
      this.Viewport.setEntryInnerHeight(74)

      this.Viewport.addEventListener('EnterColumn', event => {
        const frame = document.getElementById('VerticalLineFrame')
        let i = 0;
        for (const node of frame.children) {
          if (event.detail.currentColumn === i) {
            node.classList.add('khover')
          }
          if (event.detail.currentColumn !== i) {
            node.classList.remove('khover')
          }
          i++
        }
      })
      this.Viewport.addEventListener('EnterRow', event => {
        let i = 0;
        for (let node = this.domEntries.firstElementChild; node; node = node.nextElementSibling) {
          if (event.detail.currentRow === i) {
            node.classList.add('khover')
          }
          if (event.detail.currentRow !== i) {
            node.classList.remove('khover')
          }
          i++
        }
      })

      this.Viewport.addEventListener('requestDayMove', event => {
        if (event.detail.days) {
          this.move(event.detail.days)
        }
      })

      this.zoomCss = document.createElement('style')
      this.Updater = new Worker(`${KAIROS.getBase()}/js/ww/updater.js`)
      this.Updater.onmessage = function (e) {
        if (!e || !e.data || !e.data.op) { return }
        switch (e.data.op) {
          case 'complements':
            let node = document.getElementById(`sub-${e.data.date}`)
            if (node) {
              let html = ''
              for (let c in e.data.value) {
                let val = e.data.value[c]
                if (val.count > 0) {
                  let spanClass = 'info'
                  if (val.type === '4' && e.data.options && e.data.options.machinist) {
                      if (Math.round(e.data.options.machinist.length / 2) <= val.count) {
                        spanClass = 'error'
                      }
                  }
                  html += `<span class="spanReset ${spanClass}">${val.count} <i class="fas fa-square-full" style="color: #${c}"></i></span>`
                }
              }
              KAIROSAnim.push(() => { node.innerHTML = html })
            }
            break
          case 'log':
            console.log(e.data.data)
            break
        }
      }.bind(this)

      document.body.appendChild(this.zoomCss)

      var sStore = window.sessionStorage
      let url = new URL('store/Status/', KAIROS.getBase())
      url.searchParams.append('search.type', 0)
      fetch(url).then(response => {
        if (!response.ok) { return }
        response.json().then(results => {
          if (results.length <= 0) { return }
          for (var i = 0; i < results.data.length; i++) {
            sStore.setItem('/Status/' + results.data[i].id, JSON.stringify(results.data[i]))
          }
        })
      })

      if (typeof window.Rent === 'undefined') {
        window.Rent = {}
      }
      if (typeof window.Rent.Days === 'undefined') {
        window.Rent.Days = {}
      }

      window.UnloadCall = {}

      new GEvent().listen('reservation.open', function (event) {
        if (event.detail.id) {
          this.doSearchLocation(event.detail.id).then(() => {
            let n = new Notification(`Réservation ${event.detail.id} ouverte`, {body: 'La réservation a été ouverte avec succès', tag: `reservationOpen${event.detail.id}`})
          })
        }
      }.bind(this))
      new GEvent().listen('reservation.attribute-click', function (event) {
        if (!event.detail) {
          return
        }

        if (event.detail.attribute === 'id') {
          this.doSearchLocation(event.detail.value)
        }
      }.bind(this))
      new GEvent().listen('count.attribute-click', function (event) {
        if (!event.detail) {
          return
        }

        if (event.detail.attribute === 'id') {
          new Count({'data-id': event.detail.value}) // eslint-disable-line
        }
      })
      new GEvent().listen('count.open', function (event) {
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

    info: function (txt, code) {
      KAIROS.info(txt, code)
    },
    warn: function (txt, code) {
      KAIROS.warn(txt, code)
    },
    error: function (txt, code) {
      KAIROS.error(txt, code)
    },
    log: function (level, txt, code) {
      KAIROS.log(level, txt, code)
    },

    _setBlockSizeAttr: function (value) {
      this._set('blockSize', value)
      document.documentElement.style.setProperty('--blocksize', `${value}px`)
    },

    _setCenterAttr: function (date) {
      this.center = date
      this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0)
    },

    _setZoomAttr: function (zoomValue) {
      var style = ''
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
          days = 14
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

      if (days > 547) {
        days = 547
        KAIROS.warn('Zoom minimum atteint')
      }
      if (days < 2) {
        days = 2
        KAIROS.warn('Zoom maximum atteint')
      }

      this.daysZoom = days
      if (classname !== '') {
        djDomClass.add(this.domNode, classname)
      }
      this.set('blockSize', Math.floor((document.documentElement.clientWidth - this.get('offset') - getScrollBarWidth()) / days))
      this.zoomCss.innerHTML = ` :root { --offset-width: ${this.get('offset')}px; }
                                 .timeline .line span { width: ${this.get('blockSize') - 2}px !important; }
                                .timeline .header .tools { width: ${this.get('offset')}px !important; }
                                .timeline .line { margin-left: ${this.get('offset')}px !important; }
                                ${style}`
      this.resize()
      this.Viewport.setOrigin(this.firstDay)
      this.Viewport.setDayCount(days)
      this.update()
    },

    _setFilterAttr: function (value) {
      this.Entries.forEach(entry => {
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
      })
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
      var dayStamp = newDay.toISOString().split('T')[0]

      switch (newDay.getDay()) {
        case 0: txtDate = '<span class="dayname">Dim</span>' + newDay.getDate(); break
        case 1: txtDate = '<span class="dayname">Lun</span>' + newDay.getDate(); break
        case 2: txtDate = '<span class="dayname">Mar</span>' + newDay.getDate(); break
        case 3: txtDate = '<span class="dayname">Mer</span>' + newDay.getDate(); break
        case 4: txtDate = '<span class="dayname">Jeu</span>' + newDay.getDate(); break
        case 5: txtDate = '<span class="dayname">Ven</span>' + newDay.getDate(); break
        case 6: txtDate = '<span class="dayname">Sam</span>' + newDay.getDate(); break
      }

      var domDay = document.createElement('SPAN')
      domDay.setAttribute('data-artnum-day', dayStamp)
      domDay.classList.add('day')

      const today = new Date()
      let holiday = this.Holidays.isHoliday(newDay)
      if (holiday && newDay.getDay() !== 0) {
        domDay.classList.add('holiday')
        let cantons = []
        holiday.c.forEach((c) => {
          cantons.push(this._trCantonName(c))
        })
        let text = `Férié ${holiday.name}: ${cantons[0]}`
        if (holiday.c.length > 1) {
          text = `Férié ${holiday.name}: ${cantons.join(', ')}`
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
      if (newDay.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
        domDay.classList.add('today')
      }

      domDay.innerHTML = txtDate
      return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay, _line: this.line, computedStyle: djDomStyle.getComputedStyle(domDay) }
    },

    toolTip: function (node, element, triggerElement) {
      this.toolTip_hide()
      document.body.appendChild(node)
      window.TooltipPopper = [Popper.createPopper(element, node, {placement: 'top-start'}), node, triggerElement]
      triggerElement.addEventListener('mouseout', this.toolTip_hide, {capture: true})
      triggerElement.addEventListener('mouseleave', this.toolTip_hide, {capture: true})
    },
    toolTip_hide: function () {
      if (window.TooltipPopper) {
        window.TooltipPopper[0].destroy()
        if (window.TooltipPopper[1] && window.TooltipPopper[1].parentNode) {
          window.TooltipPopper[1].parentNode.removeChild(window.TooltipPopper[1])
        }
        window.TooltipPopper = null
      }
    },

    resizeEntries: throttle(function () {
      for (const [_, entry] of this.Entries) {
        entry.resize()
      }
    }, 25),

    resizeTimeline: function () {
      this.drawTimeline()
      this.drawVerticalLine()
    },

    resize: function () { 
      this.resizeTimeline()
      this.resizeEntries()
      this.Viewport.resize()
    },

    createMonthName: function (month, year, days, frag) {
      var n = document.createElement('DIV')
      n.setAttribute('style', 'width: ' + Math.floor((days * this.get('blockSize'))) + 'px')
      switch (month + 1) {
        case 1: n.innerHTML = `Janvier&nbsp;${year}`; break
        case 2: n.innerHTML = `Février&nbsp;${year}`; break
        case 3: n.innerHTML = `Mars&nbsp;${year}`; break
        case 4: n.innerHTML = `Avril&nbsp;${year}`; break
        case 5: n.innerHTML = `Mai&nbsp;${year}`; break
        case 6: n.innerHTML = `Juin&nbsp;${year}`; break
        case 7: n.innerHTML = `Juillet&nbsp;${year}`; break
        case 8: n.innerHTML = `Août&nbsp;${year}`; break
        case 9: n.innerHTML = `Septembre&nbsp;${year}`; break
        case 10: n.innerHTML = `Octobre&nbsp;${year}`; break
        case 11: n.innerHTML = `Novembre&nbsp;${year}`; break
        case 12: n.innerHTML = `Décembre&nbsp;${year}`; break
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
      n.setAttribute('style', 'width: ' + Math.floor(days * this.get('blockSize')) + 'px')
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
      this.fixedHeader.style.zIndex = KAIROS.zMax()
      const ktaskbar = new KTaskBar()

      this.nSearchMachineLive.addEventListener('keyup', this.searchMachineLive.bind(this))

      this.bc = new BroadcastChannel('KAIROS-Location-bc')
      this.view = {}
      this.set('zoom', 'week')

      window.addEventListener('keyup', this.keys.bind(this), {capture: true})
      this.domNode.addEventListener('mouseup', this.mouseUpDown.bind(this))
      this.domNode.addEventListener('mousedown', this.mouseUpDown.bind(this))
      this.domNode.addEventListener('touchstart', this.mouseUpDown.bind(this), {passive: true})
      this.domNode.addEventListener('touchend', this.mouseUpDown.bind(this))
      this.domNode.addEventListener('dragstart', event => {
        window.requestAnimationFrame(() => { document.body.classList.add('kdragging') })
      })
      this.domNode.addEventListener('dragend', event => {
        window.requestAnimationFrame(() => { document.body.classList.remove('kdragging') })
      })
      this.domNode.addEventListener('drop', event => {
        event.preventDefault()
        let entryNode = event.target
        while (entryNode && entryNode.classList && !entryNode.classList.contains('kentry')) { entryNode = entryNode.parentNode }
        if (!entryNode) { return ; }
        const kident = event.dataTransfer.getData('text/plain')
        if (!kident) { return }
        if (!kident.startsWith('kid://')) { return }
        kGStore = new KObjectGStore()
        let object = event.ctrlKey ? kGStore.get(kident.substr(6)).clone() : kGStore.get(kident.substr(6))
        if (object.getType() !== 'kreservation') { return }
        const kstore = new KStore(object.getType())
        const [begin, end] = [new Date(object.get('begin')), new Date(object.get('end'))]
        const diff = end.getTime() - begin.getTime()
        const kview = new KView()
        const originalX = kview.getXFromDate(begin)
        const originalY = kview.getObjectRowById(object.get('target'))
        const newOrigin = new Date()
        newOrigin.setTime(this.firstDay.getTime() + kview.computeXBox(event.clientX) * 86400000)
        KVDays.initDayStartTime(newOrigin, KAIROS.days)
        begin.setTime(newOrigin.getTime())
        end.setTime(begin.getTime() + diff)
        object.set('begin', begin.toISOString())
        object.set('end', end.toISOString())
        object.set('target', entryNode.id)
        kstore.set(object)
      })

      this.domNode.addEventListener('dragover', event => {
        event.preventDefault()
      })
      
      window.addEventListener('dblclick', iAddReservation.bind(this))
      window.addEventListener('click', iGrowAddReservation.bind(this))
      window.addEventListener('mousemove', iFollowGrowAddReservation.bind(this))
      window.addEventListener('keyup', iGrowAddReservationEnd.bind(this))
      window.addEventListener('global-keypress', event => {
        switch(event.key) {
          case 'Enter': return iAddReservation(event).bind(this)
          case 'Delete': return iDeleteReservation(event).bind(this)
        }
      })
      document.addEventListener('mouseout', (event) => { if (event.target.nodeName === 'HTML') { this.followMouse.stop = true } })
      window.addEventListener('resize', () => { this.set('zoom', this.get('zoom')) }, {passive: true})
      this.domNode.addEventListener('wheel', this.eWheel.bind(this), {passive: true})
      this.wheelStopSignal = null
      window.addEventListener('keydown', event => {
        if (event.key === 'Control') {
          if (this.wheelStopSignal) { this.wheelStopSignal.abort() }
          this.wheelStopSignal = new AbortController()
          this.domNode.addEventListener('wheel', this.wheelZoom.bind(this), {signal: this.wheelStopSignal.signal})
        }
      })

      window.addEventListener('keyup', event => {
        if (event.key === 'Control') {
          if (this.wheelStopSignal) {
            this.wheelStopSignal.abort()
            this.wheelStopSignal = null
          }
        }
      })
      window.addEventListener('blur', event => {
        if (this.wheelStopSignal) {
          this.wheelStopSignal.abort()
          this.wheelStopSignal = null
        }
      })

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

      document.addEventListener('click', (event) => {
        for (let [key, entry] of this.Entries) {
          if (entry.EntryStateOpen !== undefined && entry.EntryStateOpen !== null) {
            entry.EntryStateOpen[0].destroy()
            entry.EntryStateOpen[1].parentNode.removeChild(entry.EntryStateOpen[1])
            entry.EntryStateOpen = null
            this.Entries.set(key, entry)
          }
        }
      }, {capture: true})
    },

    countList: function () {
      if (this.CountList) {
        delete this.CountList
      }
      this.CountList = new CountList({integrated: true})
    },

    mask: function (state, callback) {
      if (state) {
        var mask = document.createElement('DIV')
        this._mask = true
        this._maskDom = mask
        mask.setAttribute('style', 'background-color: black; opacity: 0.6; margin: 0; padding: 0; top: 0; left: 0; bottom: 0; right: 0; position: fixed; width: 100%; height: 100%; z-index: 99999998')
        djOn(mask, 'click', (e) => { this.mask(false); callback(e) })
        KAIROSAnim.push(() => {
          document.getElementsByTagName('BODY')[0].appendChild(mask)
        })
      } else {
        this._mask = false
        this._maskDom.parentNode.removeChild(this._maskDom)
      }
    },

    filters: {
      todo: (date) => {
        return new Promise((resolve, reject) => {
          date.setHours(12, 0, 0)
          let day = date.toISOString().split('T')[0]
          const url = KAIROS.URL('%KBASE%/store/DeepReservation/.toprepare/')
          url.searchParams.append('search.day', day)
          fetch(url)
          .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
          })
          .then((results) => {
            if (results.success && results.length > 0) {
              let ids = []
              for (let i = 0; i < results.length; i++) {
                ids.push(results.data[i].target)
              }
              resolve(ids)
              window.App.searchMenu.filterNone.set('disabled', false)
              window.App.gotoDay(`${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`)
            }
          })
        })
      }
    },

    filterNone: function () {
      this.searchMenu.filterNone.set('disabled', true)
      this.filterReset()
    },

    filterFamily: function (event) {
      var node = dtRegistry.byNode(event.selectorTarget)
      this.searchMenu.filterNone.set('disabled', false)
      return node.value.content
    },

    filterDate: function (date = new Date(), what = 'trueBegin') {
      this.filterReset()
      const out = []
     
      this.searchMenu.filterNone.set('disabled', false)
      for (const [_, entry] of this.Entries) {
        for (const [_, reservation] of entry.entries) {
          if (djDate.compare(reservation.get(what), date, 'date') === 0) {
            out.push(entry.get('target')); break
          }
        }
      }
      return out
    },

    filterApply: function (entries) {
      const p = []
      for (const [_, entry] of this.Entries) {
        p.push(new Promise((resolve, reject) => {
          if (entries.indexOf(entry.get('target')) === -1) {
            KAIROSAnim.push(() => { entry.domNode.dataset.active = '0' })
            .then(() => resolve())
          } else {
            KAIROSAnim.push(() => { entry.domNode.dataset.active = '1' })
            .then(() => resolve())
          }
        }))
      }
      Promise.all(p).then(() => {
        this.update()
      })
    },

    filterReset: function (prefilter = false) {
      let p = []
      for (const [_, entry] of this.Entries) {
        p.push(new Promise((resolve, reject) => {
          KAIROSAnim.push(() => { entry.domNode.dataset.active = '1' })
          .then(() => resolve())
        }))
      }
      Promise.all(p).then(() => {
        this.update()
      })
    },

    mouseUpDown: function (event) {
      for (let n = event.target; n; n = n.parentNode) {
        if (n?.dataset?.stopFollowMouse) { this.followMouse.stop = true; return; }
      }
      
      if (event.type === 'mouseup' || event.type === 'touchstart') {
        KAIROSAnim.push(() => {
          document.body.classList.remove('kmove')
        })
        if (this.mouseUpDown.timeout) {
          clearInterval(this.mouseUpDown.timeout)
          this.mouseUpDown.timeout = null
        }
        this.eventStarted = null
        this.followMouse.stop = true
      } else {
        this.mouseUpDown.timeout = setTimeout(() => {
          KAIROSAnim.push(() => {
            document.body.classList.add('kmove')
          })
          this.eventStarted = event
          if (KAIROS.mouse.clientX >= 200) {
            this.followMouse.multiplicator = 1
            if (event.target.classList.contains('weekNumber')) {
              this.followMouse.multiplicator = 7
            }
            if (event.target.classList.contains('monthName')) {
              this.followMouse.multiplicator = 30
            }
            this.followMouse.stop = false
            this.followMouse()
          }
        }, 100)
      }
    },

    followMouse: function () {
      KAIROS.clearSelection()
      if (!this.followMouse.multiplicator) { this.followMouse.multiplicator = 1 }
      if (!this.followMouse.accumulator) { this.followMouse.accumulator = {x: 0, y: 0} }
      this.toolTip_hide()
      this.followMouse.accumulator.x += KAIROS.mouse.clientX - KAIROS.mouse.lastX
      this.followMouse.accumulator.y += (KAIROS.mouse.clientY - KAIROS.mouse.lastY) * 0.25
      if (Math.abs(this.followMouse.accumulator.x) > this.get('blockSize') * 0.75) {
        if (this.followMouse.accumulator.x < 0) {
          this.moveXRight(1 * this.followMouse.multiplicator)
        } else {
          this.moveXLeft(1 * this.followMouse.multiplicator)
        }
        this.followMouse.accumulator.x = 0 
      }

      let top = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0)
      if (this.followMouse.accumulator.y < 0) {
        window.scrollTo(0, top + Math.abs(this.followMouse.accumulator.y))
      } else {
        window.scrollTo(0, top - Math.abs(this.followMouse.accumulator.y))
      }
      this.followMouse.accumulator.y = 0
     
      if (!this.followMouse.stop) {
        setTimeout(_ => { this.followMouse() }, 15)
      }
    },

    showSight: function (event) {
      let none = true
      let nodeBox = djDomGeo.getContentBox(this.domNode)
      for (let i = 0; i < this.days.length; i++) {
        var pos = djDomGeo.position(this.days[i].domNode, this.days[i].computedStyle)
        if (KAIROS.mouse.clientX >= pos.x && KAIROS.mouse.clientX <= (pos.x + pos.w)) {
          KAIROSAnim.push(() => {
            this.sight.setAttribute('style', 'width: ' + pos.w + 'px; height: ' + nodeBox.h + 'px; top: 0; left: ' + pos.x + 'px;')
          })
          none = false
          break
        }
      }

      if (none) {
        this.showSight.timeout = setTimeout(() => {
          KAIROSAnim.push(() => {
            this.sight.removeAttribute('style')
          })
        }, 350)
      } else {
        if (this.showSight.timeout) { clearTimeout(this.showSight.timeout) }
      }
    },

    wheelZoom: function (event) {
      event.preventDefault()
      if (event.deltaY < 0) {
        this.zoomInN(event.deltaY)
      } else {
        this.zoomOutN(-event.deltaY)
      }
    },

    eWheel: function (event) {
      this.toolTip_hide()
      if (this._mask) { return }
      var move = 1
      if (event.deltaX < 0) {
        this.moveXLeft(move)
      } else if (event.deltaX > 0) {
        this.moveXRight(move)
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

    move: function (x) {
      if (x === 0) { return }
      if (x < 0) {
        this.moveXRight(Math.abs(x))
      } else {
        this.moveXLeft(x)
      }
    },

    moveXRight: function (x) {
      this.center = djDate.add(this.center, 'day', Math.abs(x))
      this.Viewport.move(-x)
      this.resizeTimeline()
      this.update()
    },
    moveOneRight: function () {
      this.moveXRight(1)
    },
    moveRight: function () {
      var move = 1
      if (this.days.length > 7) {
        move = Math.floor(this.days.length / 7)
      }
      this.moveXRight(move)
    },
    moveXLeft: function (x) {
      this.center = djDate.add(this.center, 'day', -Math.abs(x))
      this.Viewport.move(x)
      this.resizeTimeline()
      this.update()
    },
    moveOneLeft: function () {
      this.moveXLeft(1)
    },
    moveLeft: function () {
      var move = 1
      if (this.days.length > 7) {
        move = Math.floor(this.days.length / 7)
      }
      this.moveXLeft(move)
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
      this.Entries.set(entry.target, entry)
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
          if (window.localStorage.getItem(`${KAIROS.getBase()}/autoprint`)) {
            window.localStorage.removeItem(`${KAIROS.getBase()}/autoprint`)
          } else {
            window.localStorage.setItem(`${KAIROS.getBase()}/autoprint`, '1')
          }
          break
        case 'showDeleted':
          this.set('sold', !this.get('sold'))
          if (this.get('sold')) {
            this.cmdProcessor('show all')
          } else {
            this.cmdProcessor('show default')
          }
          break
          case 'sortWarehouse':
            this.set('sortw', !this.get('sortw'))
            if (this.get('sortw')) {
              this.cmdProcessor('sort warehouse')
            } else {
              this.cmdProcessor('sort default')
            }
            break
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
      let subLineFrag = document.createDocumentFragment()

      if (!this.Holidays) {
        this.Holidays = new Holiday(this.center.getFullYear())
      } else {
        this.Holidays.addYear(this.center.getFullYear())
      }
    
      this.firstDay = new Date()
      this.firstDay.setTime(this.center.getTime() - ((Math.floor(avWidth / this.get('blockSize') / 2) - 1) * 86400000))
      for (const entry of this.Entries) {
        entry[1].set('origin', this.firstDay)
      }
      this.Viewport.setOrigin(this.firstDay)
      for (var day = this.firstDay, i = 0; i < this.get('zoom'); i++) {
        if (djDate.compare(day, new Date(), 'date') === 0) {
          this.todayOffset = i
        }

        if (currentWeek !==  TimeUtils.getWeekNumber(day)) {
          if (currentWeek === 0) {
            currentWeek = TimeUtils.getWeekNumber(day)
          } else {
            if (this.weekOffset === -1) { this.weekOffset = i }
            this.createWeekNumber(currentWeek, dayCount, hFrag)
            dayCount = 0
            currentWeek =  TimeUtils.getWeekNumber(day)
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

        day.setHours(12, 0, 0)
        let subLineCell = document.createElement('SPAN')
        subLineCell.dataset.date = day.toISOString().split('T')[0]
        subLineCell.innerHTML = `<i  data-action="get-pdf-day" class="far fa-calendar-alt"></i> <i data-action="plan-resource" class="fas fa-car"></i>`
        subLineCell.setAttribute('id', `sub-${day.toISOString().split('T')[0]}`)
        subLineCell.style.width = `var(--blocksize)`
        subLineFrag.appendChild(subLineCell)

        subLineCell.addEventListener('click', event => {
          event.stopPropagation()
          let node = event.target
          while (node && !node.dataset.date) { node = node.parentNode }
          if (!node || !node.dataset.date) { return }
          
          const date = new Date(node.dataset.date)
          if (isNaN(date.getTime())) { return }

          switch(event.target.dataset.action) {
            default: return;
            case 'get-pdf-day':
              return window.open(`${KAIROS.getBase()}/pdfs/day/${node.dataset.date}`, '_blank')
            case 'plan-resource':
              return KIOpenResourceAllocation(date);
          }
        })

        var d = this.makeDay(day)
        d.domNode.style.display = 'inline-block'
        d.domNode.style.maxWidth = `${this.get('blockSize')}px`
        d.domNode.style.width = `${this.get('blockSize')}px`
        d.domNode.style.overflow = 'hidden'
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

      this.Viewport.setViewportWidth(this.get('zoom') * this.get('blockSize'))
      this.Viewport.setMargins(120, 14, 50, this.get('offset'))

      KAIROSAnim.push(() => {
        this.subline.innerHTML = ''
        this.subline.appendChild(subLineFrag)
        this.line.appendChild(docFrag)
        this.header.appendChild(hFrag)
        this.supHeader.appendChild(shFrag)
      })
    },

    drawVerticalLine: function () {
      const draw = () => {
        return new Promise(resolve => {
          const frame = document.getElementById('VerticalLineFrame')
          if (!frame) { resolve(); return }
          const dayLength = this.days.length
          const frameLength = frame.children.length
          const blocksize = this.get('blockSize')
          const offset = this.get('offset')

          const chain = Promise.resolve()
          
          for (let i = dayLength; i < frameLength; i++) {
            const node = frame.children[i]
            chain.then(() => {
              return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                  if (node.parentNode) { frame.removeChild(node); }
                  resolve()
                })
              })
            })
          }
          const today = new Date()
          for (let i = 0; i < dayLength; i++) {
            const day = new Date()
            day.setTime(this.firstDay.getTime() + (i * 86400000))
            const node = frame.children[i] || document.createElement('DIV')
            if (!frame.children[i]) {
              chain.then(() => {
                return new Promise((resolve) => {
                  window.requestAnimationFrame(() => {
                    frame.appendChild(node)
                    resolve()
                  })
                })
              })
            }

            const classes = [ 'vertical' ]
            const left = offset + (blocksize * i)
            if (i % 2) {
              classes.push('even')
            } else {
              classes.push('odd')
            }

            /* priority on showing holiday : a non working staturday can be used to work, if it's an holiday, need to pay more */
            if(this.Holidays.isHolidayInAnyOf(day, KAIROS.holidays)) {
              classes.push('nowork'),
              classes.push('holiday')
            } else if (KAIROS.days[day.getDay()].chunks === null) {
              classes.push('nowork')
            }

            if (day.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
              classes.push('today')
            }

            chain.then(() => {
              return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                  node.style.setProperty('left', `${left}px`)
                  node.setAttribute('class', classes.join(' '))
                  resolve()
                })
              })
            })
          }
          chain.then(() => {
            resolve()
          })
        })
      }
      if (!this.vDrawPromise) { this.vDrawPromise = Promise.resolve() }
      this.vDrawPromise.then(() => draw())
    },

    loadEntries: function () {
      return new Promise((resolve, reject) => {
        const url = KAIROS.URL(`${KAIROS.stores.kentry.store}/_query`)
        kfetch(url, {
          method: 'POST',
          body: JSON.stringify({
            '#and': {
              disabled: '0',
              deleted: '--'
            }
          })
        })
        .then(response => {
          if (!response.ok) { return null }
          return response.json()
        })
        .then(result => {
          if (!result || !result.success) { reject(new Error('ERR:server')); return }
          const entries = Array.isArray(result.data) ? result.data : [result.data]
          const load = []
          for (const entry of entries) {
            if (parseInt(entry.order) < 0) { continue }
            if (entry.disabled !== '0') { continue; }
            load.push(
              KEntry.load(entry[KAIROS.stores.kentry.uid.remote])
              .then(kentry => {
                kentry.sortValue = parseInt(entry.order)
                kentry.get('id')
                .then(uid => {
                  this.Entries.set(uid, kentry)
                })
                return kentry
              })
            )
          }
          return Promise.all(load)
        })
        .then(loadedEntries => {

          loadedEntries.sort((a, b) => {
            return a.sortValue - b.sortValue
          })


          this.Viewport.setEntryCount(loadedEntries.length)
          let i = 0
          const entriesLoaded = []
          for (const kentry of loadedEntries) {
            const row = i
            kentry.register(this.Updater)
            entriesLoaded.push(new Promise((resolve) => {
              kentry.set('origin', this.firstDay)
              .then(_ => {
                this.Viewport.bindObjectToRow(row, kentry)
                kentry.set('row', row)
                resolve(kentry)
              })
            }))
            i++
          }
          return Promise.all(entriesLoaded)
        })
        .then(kentries => {
          const next = Promise.resolve()
          for (const kentry of kentries) {
            next.then(_ => {
              return kentry.render()
            })
            .then(domNode => {
              return new Promise((resolve) => {
                window.requestAnimationFrame(() => {
                  this.domEntries.appendChild(domNode)
                  resolve()
                })
              })
            })
          }  
          return next
        })
        .then(_ => {
          resolve()
        })
      })
    },

    run: function () {
      this.currentPosition = 0
      this.update()
      this.loadEntries({state: 'SOLD'})
      .then(() => {
        this.update()
        this.Updater.postMessage({op: 'ready'})
      })
    },

    _sort_warehouse: function () {
      let sortedEntries = this._sort_default()
      let warehouse = []
      let nowarehouse = []

      sortedEntries.forEach(k => {
        let set = false
        const loc = this.Entries.get(k).get('currentLocation')
        if (loc) {
          if (loc.value) {
            if (loc.value !== '') {
              warehouse.push(k)
              set = true
            }
          }
        }
        if (!set) { nowarehouse.push(k) }
      })
 
      warehouse.sort((a, b) => {
        const locA = this.Entries.get(a).get('currentLocation')
        const locB = this.Entries.get(b).get('currentLocation')

        return locA.value.toLowerCase().localeCompare(locB.value.toLowerCase())
      })

      return [...warehouse, ...nowarehouse]
    },

    _sort_default: function () {
      const sortedEntries = Array.from(this.Entries.keys())
      sortedEntries.sort((ka, kb) => {
        const a = this.Entries.get(ka)
        const b = this.Entries.get(kb)

        let aT = a.get('target')
        let bT = b.get('target')
        if (aT.indexOf('.') !== -1) {
          aT = parseInt(aT.substring(0, aT.indexOf('.')))
        }  else {
          aT = Number.isNaN(parseInt(aT)) ? Infinity : parseInt(aT)
          if (aT !== Infinity) {
            aT = Math.floor(aT / 100)
          }
        }
        if (bT.indexOf('.') !== -1) {
          bT = parseInt(bT.substring(0, bT.indexOf('.')))
        } else {
          bT = Number.isNaN(parseInt(bT)) ? Infinity : parseInt(bT)
          if (bT !== Infinity) {
            bT = Math.floor(bT / 100)
          }
        }
        
        let ida = aT
        let idb = bT
        a.domNode.dataset.groupId = aT
        b.domNode.dataset.groupId = bT
        if (aT === Infinity && bT !== Infinity) { a.domNode.dataset.pushToEnd = true; return 1 }
        if (aT !== Infinity && bT === Infinity) { b.domNode.dataset.pushToEnd = true; return -1 }
        if (aT !== Infinity && bT !== Infinity && aT - bT !== 0) { return aT - bT }

        const techData = [ 'float:workheight:r', 'float:floorheight:r', 'float:maxcapacity:r', 'float:sideoffset:r' ]
        for (let i = 0; i < techData.length; i++) {
          let [type, name, reverse] = techData[i].split(':', 3)
          switch (type) {
            case 'int':
            case 'float':
              let aT = type === 'int' ? parseInt(a.get(name)) : parseFloat(a.get(name))
              let bT = type === 'int' ? parseInt(b.get(name)) : parseFloat(b.get(name))

              if (aT - bT !== 0) {
                if (reverse === undefined) {
                  return aT - bT
                } else {
                  return bT - aT
                }
              }
              break
            }
        }
        if (aT === Infinity && bT === Infinity) {
          return a.get('target').localeCompare(b.get('target'))
        }

        return idb - ida
      })

      return sortedEntries
    },

    sortEntries: function (orderedKeys, linear = false) {
      let container = this.domEntries
      if (linear) {
        for (let k of orderedKeys) {
          const dom  = this.Entries.get(k).domNode
          if (dom.parentNode) {
            dom.parentNode.removeChild(dom)
          }
          container.appendChild(dom, container.firstElementChild)
        }
      } else {
        let last = null
        for (let k of orderedKeys) {
          const dom = this.Entries.get(k).domNode
          if (dom.parentNode !== null) {
            container.removeChild(dom)
          }
          if (last === null) {
            container.insertBefore(dom, container.firstElementChild)
          } else {
            container.insertBefore(dom, last.nextElementSibling)
          }
          last = dom
        }
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
      this.Viewport.runRunOnMove()
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

      for (const [_, entry] of this.Entries) {
        if (entry.target === data['target']) {
          widget = entry
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
      for (const [_, entry] of this.Entries) {
        var rect = entry.view.rectangle
        if (!current && rect[1] >= page[1]) {
          current = entry
          continue
        }

        if (rect[1] >= page[1] && rect[1] < current.view.rectangle[1]) {
          current = entry
        }
      }
      return current
    },

    doSearchLocation: function (resourceId, dontmove = true) {
      DoWait()
      return new Promise((resolve) => {
        fetch(`${KAIROS.getBase()}/store/DeepReservation/${resourceId}`)
        .then(response => {
          if (!response.ok) { throw new Error('Net Error') }
          return response.json()
        })
        .then(result=> {
          if (!result.success) { throw new Error('Server Error') }
          if (result.length <= 0) { return }
          
            const reservation = Array.isArray(result.data) ? result.data[0] : result.data
            if (reservation.deleted) {
              dontmove = true
            }
            if (!dontmove) { this.set('center', reservation.deliveryBegin ? new Date(reservation.deliveryBegin) : new Date(reservation.begin)) }
            this.update()
            if (this.Entries.has(reservation.target)) {
              const entry = this.Entries.get(reservation.target)
              entry.createEntry(reservation, true)
              .then(() => {
                if (entry.openReservation(reservation.uuid || reservation.id)) {
                  if (!dontmove) {
                    let pos = djDomGeo.position(entry.domNode, true)
                    window.scroll(0, pos.y - (window.innerHeight / 3))
                  }
                  resolve(true)
                } else {
                  resolve(false)
                }
              })
            } else {
              let entry = null
              for (const [_, currentEntry] of this.Entries) {
                if (currentEntry.KEntry === undefined) { continue }
                currentEntry.KEntry.is(reservation.target)
                .then(is => {
                  if (!entry && is) {
                    entry = currentEntry
                    const r = new Reservation({uid: data.id, uuid: data.uuid, sup: currentEntry, _json: data})
                    r.popMeUp()
                    resolve(true)
                    return
                  }
                })
              }
            }
        })
        .catch(reason => {
          KAIROS.error(reason)
          resolve(false)
        })
        .finally(_ => {
          DoWait(false)
        })
      })
    },

    print: function (url) {
      window.open(url)
    },

    getEntry: function (entry) {
      for (const [_, entry] of this.Entries) {
        if (entry.get('target') === entry) {
          return entry
        }
      }
      return null
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
        KAIROSAnim.push(() => {
          document.body.appendChild(x)
        })
      }
    },
    unwait: function () {
      var n = document.getElementById('WaitDisplay')
      if (n) {
        KAIROSAnim.push(() => {
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

    autoprint: function (path) {
      if (window.localStorage.getItem(`${KAIROS.getBase()}/autoprint`)) {
        const url = new URL(`${KAIROS.getBase()}/exec/auto-print.php`)
        url.searchParams.append('file', path)
        return fetch(url)
      }
    },
    openUncounted: function () {
      var uncounted = new Doc({width: window.innerWidth - 740, style: 'background-color: #FFFFCF;'})
      var iframe = document.createElement('IFRAME')
      iframe.setAttribute('src', 'uncounted.html')
      iframe.setAttribute('style', 'border: none; width: 100%; height: 100%')
      uncounted.content(iframe)
    },

    searchMachineLive: function (event) {
      let val = event.target.value
      for (const [_, entry] of this.Entries) {
        if (val === '') {
          entry.domNode.dataset.active = '1'; 
          continue
        }
        const regexp = new RegExp(`^.*${val}.*`, 'i')
        if (!regexp.test(entry.label) && !regexp.test(entry.target)) {
          let found = '0'
          if (regexp.test(entry.KEntry?.data?.brand)) {
            found = '1'
          }
          if (found !== '1' && regexp.test(entry.KEntry?.data?.kmodel)) {
            found = '1'
          }
          if (found !== '1') {
            for (let i = 0; i < entry.tags.length; i++) {
              if (regexp.test(entry.tags[i])) {
                found = '1'
                break
              }
            }
          }
          if (found !== '1') {
            if (regexp.test(entry.KEntry?.get('location'))) {
              found = '1'
            }
          }

          if (found !== '1') {
            for (let i = 0; i < entry.details?.motorization?.length; i++) {
              if (regexp.test(entry.details?.motorization[i])) {
                found = '1'
                break
              }
            }
          }
          if (found !== '1') {
            for (let i = 0; i < entry.details?.special?.length; i++) {
              if (regexp.test(entry.details?.special[i])) {
                found = '1'
                break
              }
            }
          }
          entry.domNode.dataset.active = found
        } else {
          entry.domNode.dataset.active = '1'; 
        }
      }
      /* don't trigger whole resize right now, wait for end of typing.
       * According to my research, typing is between 70 cpm and 200 cpm (so 20ms-60ms),
       * wait for twice that time and some more
       */
      if (this.searchMachineLive.timeout) { clearTimeout(this.searchMachineLive.timeout)}
      this.searchMachineLive.timeout = setTimeout(() => {
        this.resize()
      }, 150)
    }
  })
})
