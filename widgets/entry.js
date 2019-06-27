/* eslint-env browser, amd */
/* global getElementRect, fastdom, GEvent */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/entry.html',

  'dojo/dom',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/request/xhr',
  'dojo/promise/all',
  'dojo/dom-geometry',

  'dijit/Dialog',
  'dijit/registry',

  'location/reservation',
  'location/rForm',
  'location/update',

  'artnum/dojo/Request',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  djLang,
  djEvented,
  DjDeferred,
  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,

  _template,

  djDom,
  djDate,
  djDateStamp,
  djDomConstruct,
  djOn,
  djDomClass,
  djDomStyle,
  djXhr,
  djAll,
  djDomGeometry,

  dtDialog,
  dtRegistry,

  Reservation,
  rForm,

  update,

  Req,
  Path,
  Query
) {
  return djDeclare('location.entry', [dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, update], {
    baseClass: 'entry',
    templateString: _template,
    stores: {},
    childs: {},
    sup: null,
    isParent: false,
    target: null,
    newReservation: null,
    intervalZoomFactors: [],
    waiters: 0, /* number of nested "waiting" func */
    originalHeight: 0,
    tags: [],
    entries: {},
    locked: false,
    currentLocation: '',

    constructor: function (args) {
      this.lastTouchEndEv = 0
      this.lastTouchTarget = null
      this.waiters = 0
      this.childs = {}
      this.newReservation = null
      this.target = null
      this.isParent = false
      this.sup = null
      this.stores = {}
      this.originalHeight = 0
      this.tags = []
      this.entries = {}
      this.currentLocation = ''
      this.CommChannel = args.channel

      this.CommChannel.port1.onmessage = this.channelMsg.bind(this)

      /* Interval zoom factor is [ Hour Begin, Hour End, Zoom Factor ] */
      this.intervalZoomFactors = new Array([ 7, 17, 70 ])
      if (dtRegistry.byId('location_entry_' + args['target'])) {
        alert('La machine ' + args['target'] + ' existe à double dans la base de donnée !')
      } else {
        this.id = 'location_entry_' + args['target']
      }
    },
    warn: function (txt, code) {
      this.sup.warn(txt, code)
    },
    error: function (txt, code) {
      this.sup.error(txt, code)
    },
    info: function (txt, code) {
      this.sup.info(txt, code)
    },
    port: function () {
      return this.CommChannel.port2
    },
    channelMsg: function (msg) {
      let msgData = msg.data
      switch (msgData.op) {
        case 'entries':
          msgData.value.forEach((entry) => {
            if (!this.entries[entry.id]) {
              this.entries[entry.id] = new Reservation({sup: this, uid: entry.id, _json: entry})
            } else {
              this.entries[entry.id].fromJson(entry)
            }
          })
          setTimeout(function () { this.resize(); this.domNode.dataset.refresh = 'fresh'; }.bind(this), 1)
          break
      }
    },
    computeIntervalOffset: function (date) {
      var hour = date.getHours()
      var h = (17 - 7) * 3.8 + (24 - (17 - 7)) * 1
      var bs = this.get('blockSize') / h

      if (hour <= 7) { return bs * hour }
      if (hour > 7 && hour <= 17) { return (7 * bs) + ((hour - 7) * 3.8 * bs) }
      return (7 * bs) + ((17 - 7) * 3.8 * bs) + ((hour - 17) * bs)
    },

    update: function () {
    },

    postCreate: function () {
      djOn(this.domNode, 'click', djLang.hitch(this, this.eClick))
      djOn(this.domNode, 'mousemove', djLang.hitch(this, this.eMouseMove))
      djOn(this.sup, 'cancel-reservation', djLang.hitch(this, this.cancelReservation))
      djOn(this.domNode, 'dblclick', djLang.hitch(this, this.evtDblClick))
      djOn(this.domNode, 'touchend', djLang.hitch(this, this.evTouchEnd))
      djOn(this.domNode, 'touchstart', djLang.hitch(this, this.evTouchStart))
      djOn(this.sup, 'zoom', function () {
        djDomStyle.set(this.domNode, 'height', '')
        this.originalHeight = djDomStyle.get(this.domNode, 'height')
        this.resize()
      }.bind(this))

      this.originalHeight = djDomStyle.get(this.domNode, 'height') ? djDomStyle.get(this.domNode, 'height') : 73 /* in chrome value here is 0, set default known value for now */

      this.view = { rectangle: getElementRect(this.domNode) }
      this.verifyLock()
      Query.exec(Path.url('store/Tags/', {params: {'!': this.url}})).then(function (response) {
        if (response.success && response.length > 0) {
          for (var i in response.data[0]) {
            response.data[0][i].forEach(function (tag) {
              this.tags.push(tag)
            }.bind(this))
          }
        }

        this.displayTags(this.tags)
      }.bind(this))

      var frag = document.createDocumentFragment()

      var a = document.createElement('A')
      a.setAttribute('name', 'entry_' + this.get('target'))

      var s = document.createElement('SPAN')
      s.setAttribute('class', 'reference')
      s.appendChild(document.createTextNode('(' + this.get('target') + ')'))
      a.appendChild(s)

      s = document.createElement('SPAN')
      s.setAttribute('class', 'commonName label')
      s.appendChild(document.createTextNode(this.get('label')))
      a.appendChild(s)

      frag.appendChild(a)
      window.requestAnimationFrame(function () { this.nameNode.appendChild(frag) }.bind(this))
      this.domNode.dataset.reference = this.target
    },

    loadExtension: function () {
      return new Promise(function (resolve, reject) {
        Query.exec(Path.url('store/Entry', {params: {'search.ref': this.get('target')}})).then(function (result) {
          if (result.success && result.length > 0) {
            for (var i = 0; i < result.length; i++) {
              this.set(result.data[i].name, result.data[i].value)
              this.set('_' + result.data[i].name, result.data[i])
            }
          }
          this.displayLocation()
          resolve(this)
        }.bind(this))
      }.bind(this))
    },

    displayTags: function (tags) {
      var def = new DjDeferred()

      var notag = true
      var that = this
      var frag = document.createDocumentFragment()
      if (tags.length > 0) {
        tags.forEach(function (tag) {
          if (tag !== '') {
            notag = false
            var s = document.createElement('A')
            s.setAttribute('class', 'tag ' + tag.tagify())
            s.setAttribute('href', '#' + tag.tagify())
            s.appendChild(document.createTextNode(tag))
            frag.appendChild(s)
          }
        })
      }
      if (notag) {
        frag.appendChild(document.createTextNode('Ajouter ... '))
      }
      window.requestAnimationFrame(function () { that.nTags.appendChild(frag); djOn.once(that.nTags, 'dblclick', djLang.hitch(that, that.eEditTags)); def.resolve() })

      return def.promise
    },

    clearTags: function () {
      var def = new DjDeferred()
      var that = this

      that.nTags.setAttribute('class', 'tags')
      window.requestAnimationFrame(function () {
        while (that.nTags.firstChild) {
          that.nTags.removeChild(that.nTags.firstChild)
        }
        def.resolve()
      })

      return def.promise
    },

    eEditTags: function (event) {
      var that = this
      var form = document.createElement('FORM')
      var input = document.createElement('INPUT')
      form.appendChild(input)
      var button = document.createElement('BUTTON')
      button.setAttribute('type', 'submit'); button.appendChild(document.createTextNode('Ok'))
      form.appendChild(button)

      input.setAttribute('value', this.tags.join(', '))

      djOn.once(form, 'submit', (event) => {
        event.preventDefault()

        var tags = input.value.split(',')
        for (var i in tags) {
          tags[i] = tags[i].trim()
        }
        that.tags = tags
        var q = {}
        q[that.url] = tags
        Req.post(String(Path.url('store/Tags/?!=' + that.url)), { query: q }).then(function () {
          that.clearTags().then(() => { that.displayTags(tags) })
        })
      })

      window.requestAnimationFrame(function () { that.clearTags().then(function () { that.nTags.setAttribute('class', 'tags edit'); that.nTags.appendChild(form); input.focus() }) })
    },

    focus: function () {
      djDomClass.add(this.domNode, 'focus')
    },

    blur: function () {
      djDomClass.remove(this.domNode, 'focus')
    },

    displayLocation: function () {
      var location = this.get('_currentLocation')
      if (location && location.value) {
        window.requestAnimationFrame(function () {
          this.nControl.setAttribute('class', 'control ' + location.value.tagify())
          this.nLocation.setAttribute('data-id', location.id)
          this.nLocation.innerHTML = '<i class="fas fa-warehouse"> </i> ' + location.value
        }.bind(this))
      } else {
        window.requestAnimationFrame(function () {
          this.nLocation.removeAttribute('data-id')
          this.nLocation.innerHTML = '<i class="fas fa-warehouse"> </i> '
        }.bind(this))
      }
    },

    eEditLocation: function (event) {
      var location = this.get('_currentLocation')
      var frag = document.createDocumentFragment()
      var saveLocFn = function (event) {
        var node = null
        var input = null
        for (node = event.target; node.nodeName !== 'DIV'; node = node.parentNode);
        for (input = node.firstChild; input.nodeName !== 'INPUT'; input = input.nextSibling);
        if (node.getAttribute('data-id')) {
          var body = {id: node.getAttribute('data-id'), value: input.value}
          var method = 'PATCH'
          var url = Path.url('store/Entry/' + body.id)
        } else {
          body = {ref: this.get('target'), name: 'currentLocation', value: input.value}
          method = 'POST'
          url = Path.url('store/Entry')
        }

        Query.exec(url, {method: method, body: body}).then(function (result) {
          if (result.success && result.length === 1) {
            Query.exec(Path.url('store/Entry/' + result.data[0].id)).then(function (result) {
              if (result.success && result.length === 1) {
                this.set('_currentLocation', result.data)
                this.displayLocation()
              }
            }.bind(this))
          }
        }.bind(this))
      }.bind(this)

      frag.appendChild(document.createElement('INPUT'))
      if (location && location.value) {
        frag.lastChild.value = location.value
      }
      frag.lastChild.addEventListener('keyup', function (event) { if (event.key === 'Enter') { saveLocFn(event) } })

      frag.appendChild(document.createElement('BUTTON'))
      frag.lastChild.addEventListener('click', saveLocFn)

      frag.lastChild.innerHTML = 'Ok'
      frag.appendChild(document.createElement('BUTTON'))
      frag.lastChild.addEventListener('click', this.displayLocation.bind(this))
      frag.lastChild.innerHTML = 'Annuler'

      window.requestAnimationFrame(function () {
        this.nLocation.setAttribute('class', 'location edit')
        this.nLocation.innerHTML = ''
        this.nLocation.appendChild(frag)
      }.bind(this))
    },

    cancelReservation: function () {
      if (this.newReservation) {
        var that = this
        this.unlock().then(function () {
          var r = that.newReservation.o
          that.newReservation = null
          window.requestAnimationFrame(function () {
            r.domNode.parentNode.removeChild(r.domNode)
            r.destroy()
          })
        })
      }
    },

    defaultStatus: function () {
      return this.sup.defaultStatus()
    },

    evTouchStart: function (event) {
      event.stopPropagation()
      event.preventDefault()
      if (window.App.touchTimeout) {
        clearTimeout(window.App.touchTimeout)
      }
      window.App.touchTimeout = setTimeout(function () {
        this.evtDblClick(event)
      }.bind(this), 500)
    },

    evTouchEnd: function (event) {
      event.stopPropagation()
      event.preventDefault()
      clearTimeout(window.App.touchTimeout)
    },

    evtDblClick: function (event) {
      if (this.DisableDblClick) {
        return
      }
      window.setTimeout(function () {
        this.DisableDblClick = false
      }.bind(this), 500)
      if (event.clientX <= 200) { return }
      this.createReservation(this.dayFromX(event.clientX))
    },

    createReservation: function (day) {
      if (!day) {
        day = this.get('dateRange').begin
      }
      var end = new Date(day.getTime())
      end.setHours(17, 0, 0, 0)
      day.setHours(8, 0, 0, 0)

      var sup = this
      this.defaultStatus().then(function (s) {
        var newReservation = new Reservation({sup: sup, begin: day, end: end, status: s})
        newReservation.save().then((id) => {
          newReservation.set('uid', id)
          newReservation.popMeUp()
        })
      })
    },

    copy: function (original) {
    },

    _getOffsetAttr: function () {
      return this.sup.get('offset')
    },

    lock: function () {
      var def = new DjDeferred()
      def.resolve(true)
      return def.promise
    },

    setLocked: function (lock) {
      this.locked = false
      return false
    },

    verifyLock: function () {

    },

    unlock: function () {
      var def = new DjDeferred()
      def.resolve(true)
      return def.promise
    },

    dayFromX: function (x) {
      var datehour = null
      if (x > this.get('offset')) {
        /* add 1px borders */
        datehour = djDate.add(this.get('dateRange').begin, 'day', Math.ceil((x + 1 - this.get('offset')) / this.get('blockSize')) - 1)
      }

      return datehour
    },
    eMouseMove: function (event) {
      if (this.newReservation) {
        this.newReservation.o.animate(event.clientX)
      }
    },
    eClick: function (event) {
      var that = this
      if (event.clientX <= this.get('offset')) { return }
      if (!this.newReservation && event.ctrlKey) {
        this.lock().then(djLang.hitch(this, function (locked) {
          this.defaultStatus().then(djLang.hitch(this, function (s) {
            if (locked) {
              var dBegin = this.dayFromX(event.clientX)
              var dEnd = new Date(dBegin)
              dBegin.setHours(8, 0, 0, 0)
              dEnd.setHours(17, 0, 0, 0)
              this.newReservation = {start: dBegin}
              this.newReservation.o = new Reservation({ sup: that, status: s, begin: dBegin, end: dEnd, clickPoint: event.clientX })

              djOn.once(this.newReservation.o.domNode, 'click', djLang.hitch(this, this.eClick))
              djOn.once(this.newReservation.o.domNode, 'mousemove', djLang.hitch(this, this.eMouseMove))
              this.own(this.newReservation)
              djDomClass.add(this.newReservation.o.domNode, 'selected')
              this.data.appendChild(this.newReservation.o.domNode)
            }
          }))
        }))
      }
      if (this.newReservation) {
        this._startWait()
        var r = this.newReservation
        this.newReservation = null

        var currentDay = this.dayFromX(event.clientX)
        if (djDate.compare(currentDay, r.start) < 0) {
          currentDay.setHours(8, 0, 0, 0)
          r.o.set('begin', currentDay)
          r.o.set('end', r.start)
        } else {
          currentDay.setHours(17, 0, 0, 0)
          r.o.set('begin', r.start)
          r.o.set('end', currentDay)
        }

        r.o.save().then(djLang.hitch(this, function (result) {
          if (result.type === 'error') {
            this.error("Impossible d'enregistrer les données", 300)
            this.unlock()
          } else {
            var oldId = r.o.get('id')
            dtRegistry.remove(oldId)
            r.o.set('IDent', result.data.id)
            dtRegistry.add(r.o)
            r.o.domNode.setAttribute('widgetid', result.data.id)
            r.o.domNode.setAttribute('id', result.data.id)
            djDomClass.remove(r.o.domNode, 'selected')
            r.o.popMeUp()
            this._stopWait()
            this.unlock()
          }
        }))
      }
    },
    _getBlockSizeAttr: function () {
      return this.sup.get('blockSize')
    },

    _getTargetAttr: function () {
      var t = this._get('target')
      if (djLang.isArray(t)) {
        return t[0]
      }

      return t
    },

    _getDateRangeAttr: function () {
      return this.sup.getDateRange()
    },

    resizeChild: function () {
      for (let e in this.entries) {
        setTimeout(() => {
          this.entries[e].resize()
        }, 0)
      }
    },

    resize: function () {
      for (let entry = this.data.firstElementChild; entry; entry = entry.nextElementSibling) {
        let widget = dtRegistry.getEnclosingWidget(entry)
        if (widget && widget.resize) {
          if (!this.entries[widget.uid]) { this.entries[widget.uid] = widget }
        }
      }
      this.overlap()
      fastdom.measure(function () {
        this.view.rectangle = getElementRect(this.domNode)
      }.bind(this))
      this.resizeChild()
    },

    addOrUpdateReservation: function (reservations) {
      for (var i = 0; i < reservations.length; i++) {
        if (!this.entries[reservations[i].id]) {
          this.entries[reservations[i].id] = new Reservation({uid: reservations[i].id, sup: this, _json: reservations[i]})
        } else {
          this.entries[reservations[i].id].fromJson(reservations[i])
        }
      }

      this.show()
    },

    _setSupAttr: function (sup) {
      this.sup = sup
    },

    _startWait: function () {
    },

    _stopWait: function () {
    },

    _setError: function () {
      var e = this.domNode
      window.requestAnimationFrame(function () { djDomClass.add(e, 'error') })
    },
    _resetError: function () {
      var e = this.domNode
      window.requestAnimationFrame(function () { djDomClass.remove(e, 'error') })
    },

    show: function () {
      var frag = document.createDocumentFragment()
      var entries = []

      for (var k in this.entries) {
        if (!this.entries[k].get('displayed')) {
          if (this.entries[k].domNode) {
            frag.appendChild(this.entries[k].domNode)
          }
          this.entries[k].set('displayed', true)
        }
        this.entries[k].overlap = { elements: [], level: 0, order: 0, do: false }
        entries.push(this.entries[k])
      }

      this.overlap(entries)
      window.requestAnimationFrame(function () {
        this.data.appendChild(frag)
        this.resize()
      }.bind(this))
    },

    overlap: function () {
      var entries
      if (arguments[0]) { entries = arguments[0] } else {
        entries = []
        for (var k in this.entries) {
          this.entries[k].overlap = { elements: [], level: 0, order: 0, do: false }
          entries.push(this.entries[k])
        }
      }

      /* Overlap entries, good enough for now */
      var overlapRoot = []
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].deleted) { continue }
        var root = true
        entries[i].overlap.order = i
        for (var j = 0; j < overlapRoot.length; j++) {
          if (overlapRoot[j].range.overlap(entries[i].range)) {
            if (overlapRoot[j].duration > entries[i].duration) {
              overlapRoot[j].overlap.elements.push(entries[i])
            } else {
              entries[i].overlap.elements = overlapRoot[j].overlap.elements.slice()
              entries[i].overlap.elements.push(overlapRoot[j])
              overlapRoot[j].elements = []
              overlapRoot[j] = entries[i]
            }
            root = false; break
          }
        }
        if (root) {
          overlapRoot.push(entries[i])
        }
      }

      for (i = 0; i < overlapRoot.length; i++) {
        overlapRoot[i].overlap.order = 1
        overlapRoot[i].overlap.level = overlapRoot[i].overlap.elements.length + 1
        overlapRoot[i].overlap.do = true
        for (j = 0; j < overlapRoot[i].overlap.elements.length; j++) {
          overlapRoot[i].overlap.elements[j].overlap.order = j + 2
          overlapRoot[i].overlap.elements[j].overlap.level = overlapRoot[i].overlap.elements.length + 1
          overlapRoot[i].overlap.elements[j].overlap.do = true
        }
      }
    },

    openReservation: function (id) {
      if (this.entries[id]) {
        this.entries[id].popMeUp()
        return true
      }
      return false
    },

    destroyReservation: function (reservation) {
      if (reservation) {
        reservation.destroy()
        delete this.entries[reservation.id]
        window.App.Reservation.remove(reservation.id)
      }
    },

    _getActiveReservationsAttr: function () {
      var active = []
      for (var k in this.entries) {
        if (this.entries[k].get('active')) {
          active.push(this.entries[k])
        }
      }

      return active
    },

    highlight: function (domNode) {
      this.sup.highlight(domNode)
    },

    _getEntriesAttr: function () {
      return this.sup.get('entries')
    },
    _getCompactAttr: function () {
      return this.sup.get('compact')
    },

    _setActiveAttr: function (active) {
      this._set('active', active)
      if (this.get('active')) {
        djDomStyle.set(this.domNode, 'display', '')
        this.update()
      } else {
        djDomStyle.set(this.domNode, 'display', 'none')
        for (var k in this.entries) {
          this.entries[k].set('active', false)
        }
      }
    }
  })
})
