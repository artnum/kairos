/* eslint-env browser, amd */
/* global DateRange, locationConfig, pSBC, fastdom */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',

  'dojo/dom',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-class',
  'dojo/request/xhr',
  'dojo/promise/all',

  'dijit/Tooltip',
  'dijit/registry',
  'dijit/layout/ContentPane',

  'location/rForm',
  'location/_Mouse',

  'artnum/dojo/Request'
], function (
  djDeclare,
  djLang,
  djEvented,
  DjDeferred,

  dtWidgetBase,

  djDom,
  djDate,
  djDateStamp,
  djDomConstruct,
  djOn,
  djDomStyle,
  djDomClass,

  djXhr,
  djAll,

  dtTooltip,
  dtRegistry,
  DtContentPane,

  RForm,
  Mouse,

  Req
) {
  return djDeclare('location.reservation', [
    dtWidgetBase, djEvented, Mouse], {
    events: [],
    baseClass: 'reservation',
    attrs: [],
    detailsHtml: '',
    special: 0,
    form: null,
    dbContact: null,
    complements: [],

    constructor: function () {
      this.destroyed = false
      this.attrs = ['special']
      this.detailsHtml = ''
      this.special = 0
      this.form = null
      this.dbContact = null
      this.complements = []
      this.events = {}
      this.overlap = {}
      this.duration = 0
      this.nodeGeneration = 0
      this.localid = 'R' + Math.random().toString(36).substr(2, 9)
      this._gui = {
        hidden: false
      }
    },

    fromJson: function (json) {
      if (!json) { return }

      if (this.get('_hash')) {
        if (json._hash === this.get('_hash')) {
          this.set('updated', false)
          return
        }
      }

      if (this.sup && json.target !== this.get('target')) {
        var oldEntry = window.App.getEntry(this.get('target'))
        var newEntry = window.App.getEntry(json.target)
        if (newEntry && oldEntry) {
          this.set('sup', newEntry)
          delete oldEntry.entries[this.get('id')]
          newEntry.entries[this.get('id')] = this
          oldEntry.overlap()
          oldEntry.resize()
        }
      }

      djLang.mixin(this, json)

      this.set('updated', true)
      ;[ 'begin', 'end', 'deliveryBegin', 'deliveryEnd' ].forEach(djLang.hitch(this, (attr) => {
        if (json[attr]) {
          this.set(attr, djDateStamp.fromISOString(json[attr]))
        }
      }))

      ;['status', 'address', 'locality', 'comment', 'equipment', 'reference', 'gps', 'folder', 'title', 'previous', 'creator', 'warehouse'].forEach(djLang.hitch(this, (attr) => {
        if (json[attr]) {
          this.set(attr, json[attr])
        }
      }))

      if (this.contacts && this.contacts['_client']) {
        if (this.contacts['_client'][0].target) {
          this.dbContact = this.contacts['_client'][0].target
        } else {
          this.dbContact = { freeform: this.contacts['_client'][0].freeform }
        }
      } else {
        this.dbContact = {}
      }
      if (!this.color) { this.color = 'FFF' }
      if (!this.complements) { this.complements = [] }
      if (!this.IDent) { this.IDent = this.id }

      this.range = new DateRange(this.get('trueBegin'), this.get('trueEnd'))
      this.duration = this.get('trueEnd').getTime() - this.get('trueBegin').getTime()
      if (this.sup) {
        this.sup.overlap()
        this.sup.resize()
      }
    },

    toObject: function () {
      var object = {}

      ;['begin', 'end', 'deliveryBegin', 'deliveryEnd'].forEach(djLang.hitch(this, function (attr) {
        if (!this[attr]) {
          object[attr] = null
        } else {
          object[attr] = djDateStamp.toISOString(this[attr])
        }
      }))

      ;['status', 'address', 'locality', 'comment', 'equipment', 'reference', 'gps', 'folder', 'title', 'previous', 'creator', 'warehouse'].forEach(djLang.hitch(this, function (attr) {
        if (this[attr]) {
          object[attr] = this[attr]
        } else {
          object[attr] = null
        }
      }))

      if (this.sup) {
        object['target'] = this.sup.get('target')
      }

      if (this.get('IDent')) {
        object['id'] = this.get('IDent')
      }

      return object
    },

    modified: function () {
      setTimeout(function () { this.Channel.postMessage({op: 'touch', id: this.get('id')}) }.bind(this), 1500)
    },

    update: function () {
      this.Channel.postMessage({op: 'get', id: this.get('id'), hash: this.get('hash')})
    },

    refresh: this.update,

    error: function (txt, code) {
      if (this.sup) {
        this.sup.error(txt, code)
      }
    },
    warn: function (txt, code) {
      if (this.sup) {
        this.sup.warn(txt, code)
      }
    },
    info: function (txt, code) {
      if (this.sup) {
        this.sup.info(txt, code)
      }
    },
    postCreate: function () {
      var bc = new BroadcastChannel('reservations')
      this.Channel = bc
      bc.onmessage = function (msg) {
        if (msg.data && msg.data.copyfrom && msg.data.copyfrom === this.get('id')) {
          this.copyExt(msg.data.data.id)
          return
        }
        if (msg.data && msg.data.data && msg.data.op === 'response' && String(msg.data.data.id) === String(this.get('id'))) {
          if (!msg.data.unchanged) {
            this.fromJson(msg.data.data)
            return
          }
          if (!msg.data.deleted) {
            this.destroy()
          }
        }
      }.bind(this)

      this.currentDom = document.createElement('DIV')
      this._gui.hidden = true

      this.originalTop = djDomStyle.get(this.currentDom, 'top')
      this.set('active', false)
      djOn(this.currentDom, 'dblclick', djLang.hitch(this, (e) => { e.stopPropagation(); this.popMeUp() }))
      djOn(this.currentDom, 'mousedown', djLang.hitch(this, this.isolateMe))
      djOn(this.currentDom, 'mouseup', djLang.hitch(this, this.cancelIsolation))
      djOn(this.currentDom, 'mousemove', djLang.hitch(this, this.cancelIsolation))

      this.resize()
    },

    isolateMe: function (e) {
      if (!this._isolated) {
        this._isolation = window.setTimeout(djLang.hitch(this, () => {
          this._isolated = true
          this._zindex = djDomStyle.get(this.currentDom, 'z-index')
          this.highlight()
          djDomStyle.set(this.currentDom, 'z-index', '99999999')
          if (this.overlap.do) {
            var height = djDomStyle.get(this.currentDom, 'height')
            djDomStyle.set(this.currentDom, 'height', height * this.getOverlapLevel())
          }
          djOn(this.currentDom, 'dblclick', djLang.hitch(this, this.cancelIsolation))
          window.App.mask(true, djLang.hitch(this, this.cancelIsolation))
        }), 250)
      }
    },

    cancelIsolation: function (e) {
      if (this._isolation) {
        window.clearTimeout(this._isolation)
      }

      if (e.type !== 'mouseup' && e.type !== 'mousemove') {
        if (this._isolated) {
          if (this.overlap.do) {
            var height = djDomStyle.get(this.currentDom, 'height')
            djDomStyle.set(this.currentDom, 'height', height / this.getOverlapLevel())
          }
          djDomStyle.set(this.currentDom, 'z-index', this._zindex)
          this._isolated = false
        }
      }
    },

    addAttr: function (attr) {
      if (this.attrs.indexOf(attr) === -1) {
        this.attrs.push(attr)
      }
    },
    _setPreviousAttr: function (value) {
      this.addAttr('previous')
      this._set('previous', value)
    },
    _setCreatorAttr: function (value) {
      this.addAttr('creator')
      this._set('creator', value)
    },
    _setFolderAttr: function (value) {
      this.addAttr('folder')
      this._set('folder', value)
    },
    _setTitleAttr: function (value) {
      this.addAttr('title')
      this._set('title', value)
    },
    _setStatusAttr: function (value) {
      this.addAttr('status')
      this._set('status', value)
    },
    _setIDentAttr: function (value) {
      this.IDent = value
      this.id = value
    },
    _setEquipmentAttr: function (value) {
      this.addAttr('equipment')
      this._set('equipment', value)
    },
    _setReferenceAttr: function (value) {
      this.addAttr('reference')
      this._set('reference', value)
    },
    _setGpsAttr: function (value) {
      this.addAttr('gps')
      this._set('gps', value)
    },
    _setAddressAttr: function (value) {
      this.addAttr('address')
      this._set('address', value)
    },
    _setLocalityAttr: function (value) {
      this.addAttr('locality')
      this._set('locality', value)
    },
    _setCommentAttr: function (value) {
      this.addAttr('comment')
      this._set('comment', value)
    },
    _setEnableAttr: function () {
      this.set('active', true)
    },
    _setDisableAttr: function () {
      this.set('active', false)
    },

    _setActiveAttr: function (value) {
      this._set('active', value)
      this._gui.hidden = value
    },
    animate: function (x) {
      var that = this
      window.requestAnimationFrame(function () {
        if (x && x > that.get('offset')) {
          djDomStyle.set(that.currentDom, 'width', Math.abs(x - that.get('clickPoint')))
          if (that.get('clickPoint') < x) {
            djDomStyle.set(that.currentDom, 'left', that.get('clickPoint'))
          } else {
            djDomStyle.set(that.currentDom, 'left', x)
          }
        }
        that.set('enable')
        djDomStyle.set(that.currentDom, 'position', 'absolute')
      })
    },
    _setStartAttr: function (value) {
      this.addAttr('begin')
      if (value === this.get('stop')) { value -= this.get('blockSize') }
      this._set('start', value)
    },
    _getStartAttr: function () {
      var s = this.xFromTime(this.get('trueBegin'))
      if (s < this.get('offset')) { s = this.get('offset') }
      return s
    },
    _getStopAttr: function () {
      return this.xFromTime(this.get('trueEnd'))
    },
    _setBeginAttr: function (value) {
      this.addAttr('begin')
      this._set('begin', value)
      this._set('start', this.xFromTime(value))
    },
    _setStopAttr: function (value) {
      this.addAttr('end')
      if (value === this.get('start')) { value += this.get('blockSize') }
      this._set('stop', value)
    },
    _setEndAttr: function (value) {
      this.addAttr('end')
      this._set('end', value)
      this._set('stop', this.xFromTime(value))
    },
    _setDeliveryBeginAttr: function (value) {
      this.addAttr('deliveryBegin')
      this._set('deliveryBegin', value)
    },
    _setDeliveryEndAttr: function (value) {
      this.addAttr('deliveryEnd')
      this._set('deliveryEnd', value)
    },
    _setSupAttr: function (sup) {
      if (this.sup === sup) { return }
      this._set('sup', sup)
      if (this.currentDom) {
        fastdom.mutate(djLang.hitch(this, function () {
          this.currentDom.parentNode.removeChild(this.currentDom)
          sup.data.appendChild(this.currentDom)
        }))
      }
    },
    _setWithWorkerAttr: function (value) {
      this.addAttr('withWorker')
      this._set('withWorker', value)
    },
    _getDeliveryBeginAttr: function () {
      if (this.deliveryBegin) {
        return this.deliveryBegin
      }

      return null
    },
    _getDeliveryEndAttr: function () {
      if (this.deliveryEnd) {
        return this.deliveryEnd
      }
      return null
    },
    _getBeginAttr: function () {
      return this.begin
    },
    _getEndAttr: function () {
      return this.end
    },
    _getCompactAttr: function () {
      if (!this.sup) { return false }
      return this.sup.get('compact')
    },
    _getTrueBeginAttr: function () {
      if (this.deliveryBegin) {
        if (djDate.compare(this.begin, this.deliveryBegin) > 0) {
          return this.deliveryBegin
        }
      }

      return this.begin
    },
    _getTrueEndAttr: function () {
      if (this.deliveryEnd) {
        if (djDate.compare(this.end, this.deliveryEnd) < 0) {
          return this.deliveryEnd
        }
      }
      return this.end
    },
    is: function (what) {
      switch (what) {
        default: return false
        case 'confirmed': if (this.special & 0x1) { return true } else { return false }
        case 'deliverydate':
          if (this.get('deliveryBegin') || this.get('deliveryEnd')) {
            return true
          }
          return false
      }
    },
    setIs: function (what, value) {
      switch (what) {
        case 'confirmed':
          if (value) {
            this.special |= 0x1
          } else {
            this.special &= (~0x1)
          }
          break
        case 'deliverydate':
          if (value) {
            this.special |= 0x2
          } else {
            this.special &= (~0x2)
          }
          break
      }
    },

    store: function () {
      return this.save()
    },

    confirmedDom: function () {
      var span = document.createElement('SPAN')
      var i = document.createElement('I')
      span.appendChild(i)
      var ret = this.get('_return')
      if (this.is('confirmed') || (ret && ret.id && !ret.deleted)) {
        i.setAttribute('class', 'far fa-check-circle')
        if (ret && ret.creator) {
          span.setAttribute('data-balloon', ret.creator)
          span.setAttribute('data-balloon-pos', 'down-left')
        }
      } else {
        i.setAttribute('class', 'far fa-circle')
      }

      return span
    },

    contactDom: function () {
      var contact = this.get('dbContact')
      var content = document.createDocumentFragment()
      if (contact) {
        if (contact.freeform) {
          content.appendChild(document.createTextNode(String(contact.freeform).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1, $2')))
        } else {
          if (contact.o) {
            content.appendChild(document.createElement('SPAN')); content.lastChild.setAttribute('class', 'o names')
            content.lastChild.appendChild(document.createTextNode(contact.o))
          }

          if (contact.givenname) {
            content.appendChild(document.createElement('SPAN')); content.lastChild.setAttribute('class', 'givenname names')
            content.lastChild.appendChild(document.createTextNode(contact.givenname))
          }

          if (contact.sn) {
            content.appendChild(document.createElement('SPAN')); content.lastChild.setAttribute('class', 'sn names')
            content.lastChild.appendChild(document.createTextNode(contact.sn))
          }
        }
      }

      return content
    },

    _setTextDesc: function (root) {
      if (this._lasthash) {
        if (this._lasthash === this._hash) {
          return this._currentTextDesc
        }
      }
      this._lasthash = this._hash
      var frag = document.createElement('DIV')

      frag.appendChild(document.createElement('DIV'))
      if (!this.get('compact')) {
        frag.lastChild.appendChild(this.confirmedDom())
      }

      var ident = document.createElement('SPAN')

      if (this.get('folder') !== '' && this.get('folder') != null) {
        ident.appendChild(document.createElement('SPAN'))
        ident.lastChild.appendChild(document.createTextNode(' '))
        var i = document.createElement('I')
        i.setAttribute('class', 'fas fa-folder')

        ident.lastChild.appendChild(i)
      }
      if (this.get('equipment') !== '' && this.get('equipment') != null) {
        ident.appendChild(document.createElement('SPAN'))
        ident.lastChild.appendChild(document.createTextNode(' '))
        i = document.createElement('I')
        i.setAttribute('class', 'fas fa-wrench')

        ident.lastChild.appendChild(i)
      }

      if (this.get('title') !== '' && this.get('title') != null) {
        ident.appendChild(document.createElement('SPAN'))
        ident.lastChild.appendChild(document.createTextNode(' '))
        i = document.createElement('I')
        i.setAttribute('class', 'fas fa-exchange-alt')

        ident.lastChild.setAttribute('data-balloon', this.get('title'))
        ident.lastChild.setAttribute('data-balloon-pos', 'down-left')

        ident.lastChild.appendChild(i)
      }

      if (this.get('warehouse')) {
        var warehouse = this.get('_warehouse')
        ident.appendChild(document.createElement('SPAN'))
        ident.lastChild.appendChild(document.createTextNode(' '))
        i = document.createElement('I')
        i.setAttribute('class', 'fas fa-bullseye')
        if (warehouse.color) {
          i.setAttribute('style', 'color: ' + warehouse.color)
        }
        if (warehouse.name) {
          ident.lastChild.setAttribute('data-balloon', warehouse.name)
          ident.lastChild.setAttribute('data-balloon-pos', 'down-left')
        }

        ident.lastChild.appendChild(i)
      }

      frag.lastChild.appendChild(ident)

      frag.lastChild.appendChild(document.createElement('address'))
      frag.lastChild.lastChild.appendChild(this.contactDom())

      /* Second line */
      frag.appendChild(document.createElement('DIV'))

      if ((Math.abs(this.get('trueBegin').getTime() - this.get('trueEnd').getTime()) <= 86400000) && (this.get('trueBegin').getDate() === this.get('trueEnd').getDate())) {
        frag.lastChild.appendChild(document.createElement('SPAN'))
        frag.lastChild.lastChild.setAttribute('class', 'date single begin')
        frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueBegin').shortDate()))

        frag.lastChild.appendChild(document.createElement('SPAN'))
        frag.lastChild.lastChild.setAttribute('class', 'hour date single begin')
        frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueBegin').shortHour()))
      } else {
        frag.lastChild.appendChild(document.createElement('SPAN'))
        frag.lastChild.lastChild.setAttribute('class', 'date begin')
        frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueBegin').shortDate()))

        frag.lastChild.appendChild(document.createElement('SPAN'))
        frag.lastChild.lastChild.setAttribute('class', 'hour date begin')
        frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueBegin').shortHour()))

        frag.lastChild.appendChild(document.createElement('SPAN'))
        frag.lastChild.lastChild.setAttribute('class', 'date end')
        frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueEnd').shortDate()))

        frag.lastChild.appendChild(document.createElement('SPAN'))
        frag.lastChild.lastChild.setAttribute('class', 'hour date end')
        frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueEnd').shortHour()))
      }

      if (this.locality || this.address) {
        var locality = frag.lastChild.appendChild(document.createElement('address'))
        locality.setAttribute('class', 'location')
        locality = frag.lastChild.lastChild
        if (this.gps) {
          frag.lastChild.lastChild.appendChild(document.createElement('A'))
          frag.lastChild.lastChild.lastChild.setAttribute('href', 'https://www.google.com/maps/place/' + String(this.gps).replace(/\s/g, ''))
          frag.lastChild.lastChild.lastChild.setAttribute('target', '_blank')
          locality = frag.lastChild.lastChild.lastChild
        }

        if (this.address) {
          locality.appendChild(document.createElement('SPAN'))
          locality.lastChild.setAttribute('class', 'address')
          locality.lastChild.appendChild(document.createTextNode(this.address))
        }

        if (this.locality) {
          locality.appendChild(document.createElement('SPAN'))
          locality.lastChild.setAttribute('class', 'locality')
          locality.lastChild.appendChild(document.createTextNode(this.locality))
        }
      }

      if (this.comment) {
        frag.appendChild(document.createElement('DIV'))
        frag.lastChild.setAttribute('class', 'comment')
        var comment = String(this.comment).replace(/(\r\n|\n|\r)/gm, ' ; ')
        frag.lastChild.appendChild(document.createTextNode(comment))
      }

      var extender = document.createElement('DIV')
      extender.setAttribute('class', 'extender')
      extender.setAttribute('title', 'Ajouter une semaine à la réservation')
      djOn(extender, 'click', djLang.hitch(this, this.extend7))
      extender.innerHTML = '<div><i class="fas fa-angle-double-right"></i></div>'

      var details = document.createElement('DIV')
      details.setAttribute('style', 'position: relative; top: -100%; height: 100%')
      details.appendChild(document.createElement('DIV'))
      details.firstChild.setAttribute('class', 'details')
      details.firstChild.appendChild(extender)
      details.firstChild.appendChild(frag)

      this._currentTextDesc = details
      return this._currentTextDesc
    },

    eDetails: function (event) {
      event.preventDefault()
      event.stopPropagation()

      var pos = this.getAbsPos(event)
      var x = djDomConstruct.toDom('<div>' + this.detailsHtml + '</div>')
      x.style = 'background-color: white;position: absolute; top: ' + pos.y + 'px; left: ' + pos.x + 'px; z-index: 100'

      document.getElementsByTagName('BODY')[0].appendChild(x)
    },
    eClick: function (event) {
      event.stopPropagation()
      event.preventDefault()
      if (!this.get('IDent')) { return }
      if (document.selection && document.selection.empty) {
        document.selection.empty()
      } else if (window.getSelection) {
        var sel = window.getSelection()
        sel.removeAllRanges()
      }
      this.popMeUp()
    },
    popMeUp: function () {
      var tContainer = dtRegistry.byId('tContainer')
      if (this.get('id') == null) { return }
      if (dtRegistry.byId('ReservationTab_' + this.get('id'))) {
        tContainer.selectChild('ReservationTab_' + this.get('id'))
        return
      }
      window.App.setOpen(this.get('IDent'))
      var f = new RForm({ reservation: this })
      this.highlight()

      var cp = new DtContentPane({
        title: '<i class="fas fa-spinner fa-spin"></i> Réservation ' + this.get('id'),
        closable: true,
        id: 'ReservationTab_' + this.get('id'),
        content: f.domNode})
      cp.own(f)
      tContainer.addChild(cp)
      tContainer.resize()
      tContainer.selectChild(cp.id)

      this.myForm = f
      this.myContentPane = cp
      f.set('_pane', [cp, tContainer])
      this.syncForm()
    },

    close: function () {
      if (this.myForm) {
        this.myForm.hide()
      }
      this.closeForm()
    },
    closeForm: function () {
      this.myForm = null
    },

    syncForm: function () {
      if (this.myForm) {
        [ 'begin', 'end', 'deliveryBegin', 'deliveryEnd', 'status', 'address', 'locality', 'comment', 'equipment', 'reference', 'creator', 'gps', 'folder', 'warehouse' ].forEach(djLang.hitch(this, (e) => {
          this.myForm.set(e, this.get(e))
        }))
        this.myForm.load()
      }

      if (this.myContentPane) {
        this.myContentPane.set('title', 'Réservation ' + this.get('id'))
      }
    },

    _getTargetAttr: function () {
      if (!this.sup) { return null }
      return this.sup.get('target')
    },
    _getOffsetAttr: function () {
      if (!this.sup) { return 0 }
      return this.sup.get('offset')
    },
    _getBlockSizeAttr: function () {
      if (!this.sup) { return 0 }
      return this.sup.get('blockSize')
    },
    _getDateRangeAttr: function () {
      if (!this.sup) { return null }
      return this.sup.get('dateRange')
    },
    _setIntervalZoomFactor: function (arr) {
      console.log('Not implemented')
    },
    timeFromX: function (x) {
      if (!this.sup) { return 0 }
      var blockTime = this.get('blockSize') / 24 /* block is a day, day is 24 hours */
      var hoursToX = Math.ceil((x - this.get('offset')) / blockTime)
      var d = djDate.add(this.get('dateRange').begin, 'hour', hoursToX)
      d.setMinutes(0); d.setSeconds(0)
      return d
    },
    xFromTime: function (x) {
      if (!this.sup) { return 0 }
      var diff = djDate.difference(this.get('dateRange').begin, x, 'hour')
      return (diff * this.get('blockSize') / 24) + this.get('offset')
    },
    remove: function () {
      if (confirm('Vraiment supprimer la réservation ' + this.get('IDent'))) {
        this.set('deleted', true)
        this.modified()
        return true
      }

      return false
    },
    computeIntervalOffset: function (date) {
      if (!this.sup) { return 0 }
      return this.sup.computeIntervalOffset(date)
    },

    _drawComplement: function () {
      var that = this
      var x = this.complements
      var byType = {}
      var compdiv = document.createElement('DIV')
      compdiv.setAttribute('style', 'position: relative; height: 100%')

      for (var i = 0; i < x.length; i++) {
        /* Follow set end and begin at the value of the reservation */
        if (Number(x[i].follow)) {
          x[i].begin = this.get('trueBegin'); x[i].end = this.get('trueEnd')
        }
        x[i].range = new DateRange(x[i].begin, x[i].end)
        if (!byType[x[i].type.color]) {
          byType[x[i].type.color] = []
        }
        byType[x[i].type.color].push(x[i])

        var overlap = true
        while (overlap) {
          overlap = false
          var z = byType[x[i].type.color].pop()
          for (var j = 0; j < byType[x[i].type.color].length; j++) {
            var o = byType[x[i].type.color][j].range.merge(z.range)
            if (o != null) {
              byType[x[i].type.color][j].range = o
              if (z.number > byType[x[i].type.color][j].number) {
                byType[x[i].type.color][j].number = z.number
              }
              overlap = true
              break
            }
          }
          if (!overlap) {
            byType[x[i].type.color].push(z)
          }
        }
      }

      var cent = 100
      var height = Math.round(cent / Object.keys(byType).length)
      var lineCount = 0

      for (i in byType) {
        var color = '#FFF'
        byType[i].forEach(function (entry) {
          var display = true
          if (entry.number > 0) {
            var begin = entry.range.begin
            var end = entry.range.end
            if (entry.type && entry.type.color) {
              color = '#' + entry.type.color
            }

            /* Not in view as the end of this entry is after the beginning of the timeline */
            if (djDate.compare(end, that.get('dateRange').begin, 'date') < 0) {
              display = false
            }
            /* Not in view as the entry begins after the timeline end */
            if (djDate.compare(begin, that.get('dateRange').end, 'date') > 0) {
              display = false
            }

            /* If for some reason the entry is bigger than its container, size it to the container size */
            if (djDate.compare(begin, that.get('trueBegin'), 'datetime') < 0) { begin = that.get('trueBegin') }
            if (djDate.compare(end, that.get('trueEnd'), 'datetime') > 0) { end = that.get('trueEnd') }

            if (display) {
              var width = 0
              var left = 0
              var entryBegin = that.get('trueBegin')
              var entryEnd = that.get('trueEnd')

              if (djDate.compare(entryBegin, that.get('dateRange').begin, 'datetime') < 0) {
                entryBegin = that.get('dateRange').begin
              }
              if (djDate.compare(entryEnd, that.get('dateRange').end, 'datetime') > 0) {
                entryEnd = that.get('dateRange').end
              }

              /* base width when fully displayed */
              width = (Math.abs(djDate.difference(begin, end, 'day')) * that.get('blockSize')) - that.computeIntervalOffset(entryBegin) + that.computeIntervalOffset(end)
              /* base left when fully displayed */
              left = (Math.abs(djDate.difference(entryBegin, begin)) * that.get('blockSize')) - that.computeIntervalOffset(entryBegin) + that.computeIntervalOffset(begin)

              /* if it begin before the current timeline's begin */
              if (djDate.compare(begin, that.get('dateRange').begin, 'date') < 0) {
                width = width - (Math.abs(djDate.difference(begin, that.get('dateRange').begin)) * that.get('blockSize')) + that.computeIntervalOffset(entryBegin)
                left = 0
              } else {
                if (djDate.compare(begin, entryBegin, 'datetime') > 0) {
                  width -= that.computeIntervalOffset(begin) - that.computeIntervalOffset(entryBegin)
                }
              }

              /* if it end after the current timeline's end */
              if (djDate.compare(end, that.get('dateRange').end, 'date') >= 0) {
                if (djDate.compare(end, that.get('dateRange').end, 'date') === 0) {
                  width = width - that.computeIntervalOffset(end)
                } else {
                  width = width - (Math.abs(djDate.difference(end, that.get('dateRange').end) + 1) * that.get('blockSize')) - that.computeIntervalOffset(end)
                }
              }

              var div = document.createElement('DIV')
              div.setAttribute('style', 'position: absolute; background-color: ' + pSBC(0.75, color) + '; left: ' + left + 'px; width: ' + width + 'px; top: ' + (lineCount * height) + '%; height: ' + height + '%;')
              div.setAttribute('class', 'stabiloLine')

              var numDiv = document.createElement('DIV')
              numDiv.setAttribute('class', 'number'); numDiv.setAttribute('style', 'color: ' + pSBC(0.1, color))
              for (var i = 0; i < entry.number; i++) {
                var sym = document.createElement('I')
                sym.setAttribute('class', 'fas fa-circle')
                numDiv.appendChild(sym)
              }
              div.appendChild(numDiv)

              compdiv.appendChild(div)
            }
          }
        })
        lineCount++
      }

      return compdiv
    },

    getOverlapLevel: function () {
      if (this.overlap && this.overlap.level) {
        return this.overlap.level
      }
      return 0
    },

    getOverlapOrder: function () {
      if (this.overlap && this.overlap.order) {
        return this.overlap.order
      }

      return 1
    },

    destroy: function () {
      fastdom.mutate(function () {
        if (this.currentDom) {
          if (this.currentDom.parentNode) {
            this.currentDom.parentNode.removeChild(this.currentDom)
          }
        }
      }.bind(this))
      this.destroyed = true
      this.hide()
      this.inherited(arguments)
      this.sup.overlap()
      this.sup.resize()
    },

    show: function () {
      this._gui.hidden = false
      if (!this.currentDom.parentNode) {
        fastdom.mutate(function () {
          this.sup.data.appendChild(this.currentDom)
        }.bind(this))
      }
    },

    hide: function () {
      fastdom.mutate(function () {
        if (this.currentDom.parentNode) {
          this.currentDom.parentNode.removeChild(this.currentDom)
        }
      }.bind(this))
      this._gui.hidden = true
    },

    resize: function (fromEntry = false) {
      if (this.deleted) {
        if (!this.destroyed) {
          this.destroy()
        }
        return
      }
      if (!this.sup) { return }
      if (!this.get('begin') || !this.get('end')) {
        this.hide()
        return
      } else {
        this.show()
      }

      if (!fromEntry) {
        this.sup.overlap()
      }

      /* Verify  if we keep this ourself */
      if (djDate.compare(this.get('trueBegin'), this.get('dateRange').end, 'date') >= 0 ||
        djDate.compare(this.get('trueEnd'), this.get('dateRange').begin, 'date') < 0) {
        if (!this._gui.hidden) {
          this.hide()
        }
        return
      } else {
        this.show()
      }
      var nobegin = false
      var noend = false
      var returnDone = this.get('_return') ? Boolean(this.get('_return').done) : false

      /* Last day included */
      var bgcolor = '#FFFFFF'
      if (this.color) {
        bgcolor = '#' + this.color
      }

      var range = this.get('dateRange')
      var begin = this.get('trueBegin')
      if (djDate.compare(range.begin, begin, 'date') > 0) {
        begin = range.begin
        nobegin = true
      }
      var end = this.get('trueEnd')
      if (djDate.compare(range.end, end, 'date') <= 0) {
        end = range.end
        noend = true
      }

      var t1, t2
      t1 = new Date(end.getTime()); t2 = new Date(begin.getTime())
      t1.setHours(0, 0); t2.setHours(0, 0)
      var width = Math.abs(djDate.difference(t1, t2, 'day'))
      t1 = new Date(this.get('dateRange').begin.getTime()); t2 = new Date(begin.getTime())
      t1.setHours(0, 0); t2.setHours(0, 0)
      var bDay = djDate.difference(t1, t2, 'day')

      if (bDay < 0) { bDay = 0 }
      var startPoint = this.get('offset') + (this.get('blockSize') * bDay)
      var stopPoint = (this.get('blockSize') * width)

      var d = this.computeIntervalOffset(begin)
      startPoint += d
      stopPoint -= d
      stopPoint += this.computeIntervalOffset(end)

      var toolsOffsetBegin = 0
      if (this.get('deliveryBegin')) {
        if (djDate.difference(this.get('deliveryBegin'), this.get('begin'), 'hour') !== 0) {
          toolsOffsetBegin = Math.abs(djDate.difference(this.get('deliveryBegin'), this.get('begin'), 'hour'))
        }
        if (djDate.compare(this.get('begin'), this.get('dateRange').begin) <= 0) { toolsOffsetBegin = 0 }
        if (djDate.compare(this.get('deliveryBegin'), this.get('dateRange').begin) < 0) {
          toolsOffsetBegin -= Math.abs(djDate.difference(this.get('deliveryBegin'), this.get('dateRange').begin, 'hour'))
        }
        toolsOffsetBegin *= this.get('blockSize') / 24
      }

      var toolsOffsetEnd = 0
      if (this.get('deliveryEnd')) {
        if (djDate.difference(this.get('deliveryEnd'), this.get('end'), 'hour') !== 0) {
          toolsOffsetEnd = Math.abs(djDate.difference(this.get('deliveryEnd'), this.get('end'), 'hour'))
        }
        if (djDate.compare(this.get('end'), this.get('dateRange').end) >= 0) { toolsOffsetEnd = 0 }
        if (djDate.compare(this.get('deliveryEnd'), this.get('dateRange').end) > 0) {
          toolsOffsetEnd -= Math.abs(djDate.difference(this.get('deliveryEnd'), this.get('dateRange').end, 'hour'))
        }
        toolsOffsetEnd *= this.get('blockSize') / 24
      }
      var domclass = ['reservation']

      if (this.overlap.do > 0) {
        domclass.push('overlap')
      }
      if (nobegin) {
        domclass.push('nobegin')
      }
      if (noend) {
        domclass.push('noend')
      }
      if (this.is('confirmed')) {
        domclass.push('confirmed')
      }
      if (returnDone) {
        domclass.push('done')
      }

      var supRect = this.sup.view.rectangle
      fastdom.measure(djLang.hitch(this, function () {
        var supTopBorder = djDomStyle.get(this.sup.domNode, 'border-top-width')
        var supBottomBorder = djDomStyle.get(this.sup.domNode, 'border-bottom-width')
        var myTopBorder = 1
        var myBottomBorder = 1

        var height = this.sup.originalHeight - (supBottomBorder + supTopBorder + myTopBorder + myBottomBorder)
        var top = supRect[1] + supTopBorder
        if (this.overlap.do) {
          var overlapLevel = this.getOverlapLevel()
          height /= overlapLevel
          top += (height + myTopBorder) * (this.getOverlapOrder() - 1)
        }

        var domstyle = ['position: absolute']
        domstyle.push('width: ' + stopPoint + 'px')
        domstyle.push('left: ' + startPoint + 'px')
        domstyle.push('top: ' + top + 'px')
        domstyle.push('height: ' + height + 'px')

        var tools = document.createElement('DIV')
        tools.setAttribute('style', 'background-color:' + bgcolor)
        tools.setAttribute('class', 'tools')

        if (toolsOffsetBegin > 0) {
          var div = document.createElement('DIV')
          div.setAttribute('class', 'delivery')
          div.setAttribute('style', 'float: left; height: 100%; width: ' + toolsOffsetBegin + 'px')
          tools.appendChild(div)
        }

        if (toolsOffsetEnd > 0) {
          div = document.createElement('DIV')
          div.setAttribute('class', 'delivery')
          div.setAttribute('style', 'float: right; height: 100%; width: ' + toolsOffsetEnd + 'px')
          tools.appendChild(div)
        }

        var txtdiv = this._setTextDesc()
        var compdiv = this._drawComplement()
        txtdiv.appendChild(tools)

        fastdom.mutate(djLang.hitch(this, function () {
          this.currentDom.innerHTML = ''
          this.currentDom.setAttribute('style', domstyle.join(';'))
          this.currentDom.setAttribute('class', domclass.join(' '))
          this.currentDom.appendChild(compdiv)
          this.currentDom.appendChild(txtdiv)
          this.currentDom.setAttribute('id', 'reservation-' + this.get('id'))
        }))
      }))
    },

    highlight: function () {
      if (this.sup) {
        this.sup.highlight(this.currentDom)
      }
    },
    _getEntriesAttr: function () {
      if (!this.sup) { return [] }
      return this.sup.get('entries')
    },
    destroyReservation: function (reservation) {
      if (this.sup) {
        this.sup.destroyReservation(reservation)
      }
    },
    destroyMe: function () {
      this.destroyReservation(this)
    },

    saveReturn: function () {
      var values = this.get('_return')
      var suffix = ''
      var method = 'post'

      if (!values) {
        return
      }

      if (values['id']) {
        suffix = '/' + values['id']
        method = 'put'
      }

      if (values.reported) {
        values.reported = djDateStamp.toISOString(values.reported)
      }

      if (values.done == null) {
        values.done = ''
      }

      if (values.inprogress == null) {
        values.inprogress = ''
      }

      Req[method](locationConfig.store + '/Return' + suffix, {query: values}).then(djLang.hitch(function (result) {
      }))
    },

    save: function () {
      var object = this.toObject()
      this.Channel.postMessage({op: 'put', data: object, localid: this.localid})
      this.saveReturn()
    },

    copy: function () {
      var object = this.toObject()
      delete object['id']
      this.Channel.postMessage({op: 'put', data: object, copyfrom: this.get('id')})
    },

    copyExt: function (toid) {
      var allReqs = []
      var complements = this.get('complements')
      if (complements.length > 0) {
        for (var i = 0; i < complements.length; i++) {
          var query = {
            begin: complements[i].begin ? djDateStamp.toISOString(complements[i].begin) : '',
            end: complements[i].end ? djDateStamp.toISOString(complements[i].end) : '',
            comment: String(complements[i].comment),
            reservation: String(toid),
            target: complements[i].target,
            type: complements[i].type ? (complements[i].type.id ? '/location/store/Status/' + String(complements[i].type.id) : '') : '',
            number: String(complements[i].number),
            follow: String(complements[i].follow)
          }
          allReqs.push(fetch('/location/store/Association/', {method: 'POST', body: JSON.stringify(query)}))
        }
      }
      var contacts = this.get('contacts')
      for (var k in contacts) {
        for (i = 0; i < contacts[k].length; i++) {
          var contact = contacts[k][i]
          query = {
            comment: contact.comment,
            freeform: contact.freeform,
            reservation: String(toid),
            target: contact.target ? (contact.target.IDent ? '/Contacts/' + contact.target.IDent : '') : ''
          }
          allReqs.push(fetch('/location/store/ReservationContact', {method: 'POST', body: JSON.stringify(query)}))
        }
      }
      djAll(allReqs).then(function () {
        for (k in window.App.Entries) {
          if (window.App.Entries[k].openReservation(toid)) {
            break
          }
        }
        /* wait 1.5 sec as db as a mod time granularity of 1 second ... */
        setTimeout(function () {
          this.Channel.postMessage({op: 'touch', id: this.get('id')})
        }.bind(this), 1500)
      }.bind(this))
    },

    extend7: function (e) {
      this.extend(7)
    },

    extend: function (days) {
      var newEnd = djDate.add(this.end, 'day', days)
      if (newEnd) {
        var newDEnd = ''
        if (this.deliveryEnd) {
          newDEnd = djDate.add(newEnd, 'second', Math.abs(djDate.difference(this.deliveryEnd, this.end, 'second')))
        }

        this.end = newEnd
        this.deliveryEnd = newDEnd
        this.save()
      }
    }
  })
})
