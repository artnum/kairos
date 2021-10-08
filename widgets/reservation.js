/* eslint-env browser, amd */
/* global DateRange, pSBC, Histoire, Tooltip, GSymbol, crc32 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',

  'dijit/_WidgetBase',

  'dojo/date',
  'dojo/date/stamp',
   'dojo/on',
  'dojo/dom-style',


  'dijit/registry',
  'dijit/layout/ContentPane',

  'location/rForm',
  'location/lock',

  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  djLang,
  djEvented,

  dtWidgetBase,

  djDate,
  djDateStamp,
  djOn,
  djDomStyle,

  dtRegistry,
  DtContentPane,

  RForm,
  Lock,

  Path,
  Query
) {
  return djDeclare('location.reservation', [
    dtWidgetBase, djEvented], {
    events: [],
    baseClass: 'reservation',
    attrs: [],
    detailsHtml: '',
    special: 0,
    form: null,
    dbContact: null,
    complements: [],
    hdivider: 1,
    hposition: 0,
    modifiedState: true,

    constructor: function (options = {}) {
      this.destroyed = false
      this.detailsHtml = ''
      this.special = 0
      this.form = null
      this.dbContact = null
      this.complements = []
      this.events = {}
      this.overlap = {}
      this.dataHash = {}
      this.duration = 0
      this.localid = 'R' + Math.random().toString(36).substr(2, 9)
      this.uuid = options.uuid
      this.KReservation = new KReservation()
      this.version = 1
      this._gui = {
        hidden: false
      }
      this.Lock = new Lock(null)
      this.own(this.Lock)
      this.Stores = {
        Locality: new KLocalityStore()
      }
      if (options.sup) {
        this.target = options.sup.get('target')
      }

      if (options.create) {
        this.isNew = true
      } else {
        this.isNew = false
      }

      this.EventTarget = new EventTarget()
    },

    addEventListener: function (type, listener, options = undefined) {
      this.EventTarget.addEventListener(type, listener, options)
    },
    
    resync () {
      return new Promise((resolve, reject) => {
        fetch(`${KAIROS.getBase()}/store/DeepReservation/${this.uid}`)
        .then(response => {
          if (!response.ok) { throw new Error('Erreur serveur') }
          return response.json()
        })
        .then(result => {
          if (!result.success) { throw new Error('Erreur serveur') }
          return this.fromJson(Array.isArray(result.data) ? result.data[0] : result.data)
        })
        .then(_ => {
          this.syncForm()
          resolve()
        })
        .catch(error => {
          KAIROS.error(error)
        })
      })
    },

    fromJson: function (json) {
      return new Promise((resolve, reject) => {
        if (!json) { resolve(); return }
        if (json.data) {
          json = Array.isArray(json.data) ? json.data[0] : json.data
        }
        this.modifiedState = true
        if (this.get('_hash')) {
          if (json._hash === this.get('_hash')) {
            this.set('updated', false)
            resolve()
            return
          }
        }

        const hash = new MurmurHash3()
        this._target = json.target
        hash.hash(json.target)
        if (this.sup && json.target !== this.get('target')) {
          var oldEntry = window.App.getEntry(this.get('target'))
          var newEntry = window.App.getEntry(json.target)
          if (newEntry && oldEntry) {
            this.set('sup', newEntry)
            delete oldEntry.entries[this.uid]
            newEntry.entries[this.uid] = this
            oldEntry.overlap()
            // oldEntry.resize()
          }
        }

        if (json['modification']) {
          this.lastModified = parseInt(json['modification'])
        }

        if (json.version) {
          this.version = parseInt(json.version)
        }
        this.updateVersionId()

        let krLoad = Promise.resolve()
        if (json['id']) {
          hash.hash(json.id)
          this.set('uid', json['id'])
        }
        djLang.mixin(this, json)
        this.dataOriginal = json
        this.dataHash['target'] = crc32(this.get('target') ? this.get('target') : '__no_target__')
        this.set('updated', true)
        for (let attr of [ 'begin', 'end', 'deliveryBegin', 'deliveryEnd' ]) {
          let date = new Date(json[attr])
          if (!Number.isNaN(date.getTime()) && json[attr]) {
            /* date and time are UTC on server but locale on the client, so store the client one */
            this.dataHash[attr] = crc32(date.toISOString())
            this.set(attr, date)
          } else {
            this.set(attr, null)
            this.dataHash[attr] = crc32('')
          }
        }

        /* string value */
        for (let attr of [
          'visit',
          'vreport',
          'padlock',
          'deliveryRemark'
        ]) {
          if (json[attr]) {
            hash.hash(json[attr])
            this.dataHash[attr] = crc32(json[attr])
            this.set(attr, json[attr])
          } else {
            this.set(attr, '')
            this.dataHash[attr] = crc32('')
          }
        }

        /* nullifiable value */
        for (let attr of [
          'status',
          'address',
          'locality',
          'comment',
          'equipment',
          'reference',
          'gps',
          'folder',
          'title',
          'previous',
          'creator',
          'technician',
          'warehouse',
          'note'
        ]) {
          if (json[attr]) {
            hash.hash(json[attr])
            this.dataHash[attr] = crc32(json[attr])
            this.set(attr, json[attr])
          } else {
            this.dataHash[attr] = crc32('')
          }
        }

        if (json['other']) {
          hash.hash(json.other)
          this.dataHash['other'] = crc32(json['other'])
          this.set('other', JSON.parse(json['other']))
        } else {
          this.dataHash['other'] = crc32('{\"critic\":\"\"}')
        }

        if (json['uuid']) {
          hash.hash(json.uuid)
          this.dataHash['uuid'] = crc32(json['uuid'])
        } else {
          this.dataHash['uuid'] = crc32('')
        }

        if (!this.color) { this.color = 'FFF' }
        if (!this.complements) { this.complements = [] }

        if (json.arrival) {
          this.set('_arrival', Object.assign({}, json.arrival))
        } else {
          json.arrival = {}
        }
        this.dataHash['_arrival'] = {}
        for (let attrArr of ['reported', 'done', 'inprogress', 'contact', 'where', 'comment', 'other', 'locality', 'creator']) {
          if (json.arrival[attrArr]) {
            this.dataHash['_arrival'][attrArr] = crc32(json.arrival[attrArr])
          } else {
            this.dataHash['_arrival'][attrArr] = crc32('')
          }
        }
        this.range = new DateRange(this.get('trueBegin'), this.get('trueEnd'))
        this.duration = this.get('trueEnd').getTime() - this.get('trueBegin').getTime()
        if (this.sup) {
          this.sup.overlap()
          this.sup.resize()
        }
        this.modifiedState = true
        this.resize()
        this.KReservation.init(this.get('uid')).then(_ => {
          let state = hash.result()
          if (this.stateHash && this.stateHash !== state) {
            this.EventTarget.dispatchEvent(new CustomEvent('synced'))
          }
        })
        .then(() => {
          this.resize()
          krLoad.then(kres => {
            delete this.KReservation
            this.KReservation = kres
            this.stateHash = hash.result()
            resolve()
          })
        })
      })
    },

    toObject: function () {
      let dataHash = {}
      return new Promise ((resolve, reject) => {
        var object = {}
        const p = []

        for (let attr of ['begin', 'end', 'deliveryBegin', 'deliveryEnd']) {
          if (!this[attr]) {
            object[attr] = null
            if (dataHash) { dataHash[attr] = crc32('') }
          } else {
            object[attr] = djDateStamp.toISOString(this[attr])
            if (dataHash) { dataHash[attr] = crc32(object[attr]) }
          }
        }

        /* string value */
        for (let attr of [
          'target',
          'visit',
          'vreport',
          'padlock',
          'deliveryRemark'
        ]) {
          if (this[attr]) {
            object[attr] = this[attr]
            if (dataHash) { dataHash[attr] = crc32(this[attr]) }
          } else {
            object[attr] = ''
            if (dataHash) { dataHash[attr] = crc32('') }
          }
        }

        /* nullifiable value */
        for (let attr of [
          'uuid',
          'status',
          'address',
          'locality',
          'comment',
          'equipment',
          'reference',
          'gps',
          'folder',
          'title',
          'previous',
          'creator',
          'technician',
          'warehouse',
          'note'
        ]) {
          if (this[attr]) {
            object[attr] = this[attr]
            if (dataHash) { dataHash[attr] = crc32(this[attr]) }
          } else {
            object[attr] = null
            if (dataHash) { dataHash[attr] = crc32('') }
          }
        }

        if (this.get('other')) {
          object['other'] = JSON.stringify(this.get('other'))
          if (dataHash) { dataHash['other'] = crc32(object['other']) }
        }

        if (!object.creator) {
          p.push(new Promise((resolve, reject) => {
            UserStore.getCurrentUser()
            .then(currentUser => {
              if (currentUser) {
                object.creator = currentUser.getUrl()
                this.set('creator', object.creator)
                if (dataHash) { dataHash['creator'] = crc32(object.creator) }
              }
              resolve()
            })
          }))
        }

        if (this.get('_arrival')) {
          object.arrival = Object.assign({}, this.get('_arrival'))
        } else {
          object.arrival = {}
        }

        dataHash['_arrival'] = {}
        ;['reported', 'done', 'inprogress', 'contact', 'where', 'comment', 'other', 'locality', 'creator'].forEach((attrArr) => {
          if (object.arrival[attrArr]) {
            dataHash['_arrival'][attrArr] = crc32(object.arrival[attrArr])
          } else {
            dataHash['_arrival'][attrArr] = crc32('')
          }
        })
        object.id = this.uid
        Promise.all(p)
        .then(_ => {
          resolve([object, dataHash])
        })
      })
    },

    modified: function () {
      if (!this.get('deleted')) {
        fetch(Path.url(`/store/Reservation/${this.uid}`), {
            method: 'PATCH',
            body: JSON.stringify({id: this.uid})
          })
      }
    },

    waitStart: function () {
      if (this.destroyed) { return }
      KAIROSAnim.push(() => {
        if (!this.domNode) { return }
        this.domNode.classList.add('updating')
      })
    },

    waitStop: function () {
      if (this.destroyed) { return }
      KAIROSAnim.push(() => {
        if (!this.domNode) { return }
        this.domNode.classList.remove('updating')
      })
    },

    restore: function () {
      fetch(Path.url(`/store/Reservation/${this.uid}`), {
        method: 'PATCH',
        headers: new Headers({'X-Restore': new Date().toISOString(), 'X-Request-Id': `${new Date().toISOString()}-${performance.now()}`})
      })
    },

    postCreate: function () {
      this.domNode.dataset.uuid = this.uuid
      if (this._json) {
        this.fromJson(this._json)
        delete this._json
      }
      this.domNode.dataset.uid = this.uid ? this.uid : null
      this._gui.hidden = true
      this.set('active', false)
    },

    isolateMe: function (e) {
      if (!this._isolated) {
        this._isolation = window.setTimeout(djLang.hitch(this, () => {
          this._isolated = true
          this.highlight()
          this.domNode.style.setProperty('z-index', KAIROS.zMax())
          djOn(this.domNode, 'dblclick', djLang.hitch(this, this.cancelIsolation))
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
          this.domNode.style.removeProperty('z-index')
          this._isolated = false
        }
      }
    },
    _setUidAttr: function (value) {
      this.uid = value
      if (this.domNode) {
        this.domNode.dataset.uid = value
      }
    },
    _setWarehouseAttr: function (value) {
      if (value && value.startsWith('Warehouse')) {
        this._set('locality', value)
      } else {
        this._set('locality', `Warehouse/${value}`)
      }
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
      KAIROSAnim.push(() => {
        if (x && x > this.get('offset')) {
          djDomStyle.set(this.domNode, 'width', Math.abs(x - this.get('clickPoint')))
          if (this.get('clickPoint') < x) {
            djDomStyle.set(this.domNode, 'left', this.get('clickPoint'))
          } else {
            djDomStyle.set(this.domNode, 'left', x)
          }
        }
        this.set('enable')
        djDomStyle.set(this.domNode, 'position', 'absolute')
      })
    },
    _setStartAttr: function (value) {

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

      this._set('begin', value)
      this._set('start', this.xFromTime(value))
    },
    _setStopAttr: function (value) {

      if (value === this.get('start')) { value += this.get('blockSize') }
      this._set('stop', value)
    },
    _setEndAttr: function (value) {

      this._set('end', value)
      this._set('stop', this.xFromTime(value))
    },
    _setDeliveryBeginAttr: function (value) {

      this._set('deliveryBegin', value)
    },
    _setDeliveryEndAttr: function (value) {

      this._set('deliveryEnd', value)
    },
    _setSupAttr: function (sup) {
      if (this.sup === sup) { return }
      this._set('sup', sup)
      if (this.domNode && this.domNode.parentNode) {
        KAIROSAnim.push(() => {
          if (this.domNode?.parentNode) {
            this.domNode.parentNode.removeChild(this.domNode)
          }
          if (this.domNode) { sup.data.appendChild(this.domNode) }
        })
      }
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
      var ret = this.get('_arrival')
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
      const contact = this.get('dbContact')
      const domNode = 
        contact === null ? 
          document.createElement('ADDRESS') : 
          contact.getDOMLabel({postaladdress: true, o: true, mail: true, mobile: true, telephonenumber: true}, true)
      domNode.classList.add('inline')
      return domNode
    },

    _setTextDesc: function (root) {
      if (this._lasthash) {
        if (this._lasthash === this._hash) {
          return null
        }
      }

      this._lasthash = this._hash
      var frag = document.createElement('DIV')

      frag.appendChild(document.createElement('DIV'))
      if (!this.get('compact')) {
        frag.lastChild.appendChild(this.confirmedDom())
      }

      if (!this.htmlIdentity) {
        this.htmlIdentity = document.createElement('SPAN')
      }
      let ident = this.htmlIdentity
      ident.classList.add('identity')
      ident.innerHTML = ' <i class="fas fa-folder" data-name="folder"></i><i class="fas fa-wrench" data-name="equipment"></i><i class="fas fa-exchange-alt" data-name="exchange"></i><i class="fas fa-bullseye" data-name="warehouse"></i><i class="fas fa-exclamation-triangle" data-name="critic"></i><i class="far fa-user" data-name="creator"></i>'

      if (this.get('folder') !== '' && this.get('folder') != null) {
        ident.dataset.folder = this.get('folder')
      } else {
        delete ident.dataset.folder
      }
      if (this.get('equipment') !== '' && this.get('equipment') != null && this.get('equipment') !== '%') {
        ident.dataset.equipment = this.get('equipment')
      } else {
        delete ident.dataset.equipment
      }
      if (this.get('_creator')) {
        let creator = this.get('_creator')
        let currentCreator = JSON.parse(localStorage.getItem('/location/user'))
        if (currentCreator && creator) {
          if (currentCreator.id === creator.id) {
            let i = this.htmlIdentity.firstElementChild
            for (; i; i = i.nextElementSibling) {
              if (i.classList.contains('fa-user')) {
                i.classList.replace('far', 'fas')
                break
              }
            }        
          }
        }
        if (creator.name) {
          ident.dataset.creator = creator.name
        }
      }
      if (this.get('title') !== '' && this.get('title') != null) {
        ident.dataset.exchange = this.get('title')
      } else {
        delete ident.dataset.exchange
      }

      if (this.get('other') && this.get('other').critic) {
        ident.dataset.critic = this.get('other').critic
      } else {
        delete ident.dataset.critic
      }

      frag.lastChild.appendChild(ident)

      frag.lastChild.appendChild(this.contactDom())

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
          frag.lastChild.lastChild.lastChild.setAttribute('href', KAIROS.maps.gps.replace('$GPS', String(this.gps).replace(/\s/g, '')))
          frag.lastChild.lastChild.lastChild.setAttribute('target', '_blank')
          locality = frag.lastChild.lastChild.lastChild
        }

        if (this.address) {
          locality.appendChild(document.createElement('SPAN'))
          locality.lastChild.setAttribute('class', 'address')
          locality.lastChild.appendChild(document.createTextNode(this.address))
        }

        if (this.locality && this.locality !== null) {
          if (/^PC\/[0-9a-f]{32,32}$/.test(this.locality) || /^Warehouse\/[a-zA-Z0-9]*$/.test(this.locality)) {
            this.Stores.Locality.get(this.locality).then((entry) => {
              if (entry.state) {
                delete this.htmlIdentity.dataset.warehouse
                locality.appendChild(document.createElement('SPAN'))
                locality.lastChild.setAttribute('class', 'locality')
                locality.lastChild.appendChild(document.createTextNode(entry.label))
              } else {
                this.htmlIdentity.dataset.warehouse = entry.label
                for (let i = this.htmlIdentity.firstElementChild; i; i = i.nextElementSibling) {
                  if (i.classList.contains('fa-bullseye')) {
                    let colors = entry.color.split(';')
                    if (colors.length === 2) {
                      colors[0] = colors[0].trim().toLowerCase()
                      colors[1] = colors[1].trim().toLowerCase()
                      KAIROSAnim.push(() => { i.style.color = colors[0]; i.style.backgroundColor = colors[1] })
                    } else {
                      colors[0] = colors[0].trim().toLowerCase()
                      KAIROSAnim.push(() => { i.style.color = colors[0] })
                    }
                    return
                  }
                }
              }
            })
          } else {
            delete this.htmlIdentity.dataset.warehouse
            locality.appendChild(document.createElement('SPAN'))
            locality.lastChild.setAttribute('class', 'locality')
            locality.lastChild.appendChild(document.createTextNode(this.locality !== null ? this.locality : ''))
          }
        }
      } else {
        delete this.htmlIdentity.dataset.warehouse
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

    eClick: function (event) {
      event.stopPropagation()
      event.preventDefault()
      if (!this.uid) { return }
      if (document.selection && document.selection.empty) {
        document.selection.empty()
      } else if (window.getSelection) {
        var sel = window.getSelection()
        if (sel) { sel.removeAllRanges() }
      }
      this.popMeUp()
    },

    popMeUp: function () {
      return new Promise((resolve, reject) => {
        var tContainer = dtRegistry.byId('tContainer')
        if (this.get('localid') == null) { return }
        if (dtRegistry.byId('ReservationTab_' + this.get('localid'))) {
          tContainer.selectChild('ReservationTab_' + this.get('localid'))
          return
        }

        window.App.setOpen(this.uid)
        var f = new RForm({reservation: this, htmlDetails: this.sup ? this.sup.htmlDetails : '<p></p>', deleted: this.deleted ? true : false})
        let title = `Réservation ${this.uid} V.${this.version}`

        var cp = new DtContentPane({
          title: title,
          closable: true,
          style: 'width: 100%; height: 100%; padding: 0; padding-top: 8px;',
          id: 'ReservationTab_' + this.get('localid'),
          content: f.domNode})
        cp.own(f)
        tContainer.addChild(cp)
        tContainer.resize()
        tContainer.selectChild(cp.id)

        this.myForm = f
        this.myForm.PostCreatePromise.then(() => {
          this.syncForm()
          this.myContentPane = cp
          f.set('_pane', [cp, tContainer])
          f.set('_closeId', 'ReservationTab_' + this.get('localid'))
          this.close.closableIdx = KAIROS.stackClosable(this.close.bind(this))
        })
      })
    },

    isOpen () {
      if (this.myForm) { return true }
      return false
    },

    signalRemoteModification () {
      this.myForm.outOfSync()
    },

    close: function () {
      KAIROS.removeClosableFromStack(this.close.bind(this))
      if (this.myForm) {
        this.myForm.close()
      }
      this.closeForm()
      if (this.close.closableIdx) {
        KAIROS.removeClosableByIdx(this.close.closableIdx)
      }
    },
    closeForm: function () {
      this.myForm = null
      this.Lock.unlock()
    },

    syncForm: function () {
      if (this.myForm) {
        [
          'other',
          'begin',
          'end',
          'deliveryBegin',
          'deliveryEnd',
          'status',
          'address',
          'locality',
          'comment',
          'equipment',
          'reference',
          'creator',
          'technician',
          'gps',
          'folder',
          'warehouse',
          'note',
          'padlock',
          'deliveryRemark',
          'visit',
          'vreport'
         ].forEach(djLang.hitch(this, function (e) {
          this.myForm.set(e, this.get(e))
        }))
        this.myForm.lastModified = this.lastModified
        this.myForm.load()
      }
    },

    _getTargetAttr: function () {
      if (!this.sup && this._target) {
        return this._target
      }
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
      return new Promise(function (resolve, reject) {
        if (confirm(`Vraiment supprimer la réservation ${this.uid}`)) {
          if (this.domNode && this.domNode.parentNode) {
            this.domNode.parentNode.removeChild(this.domNode)
          }
          this.set('deleted', true)
          Query.exec(Path.url('/store/Arrival', {params: {'search.target': this.uid}})).then((result) => {
            if (result.success && result.length > 0) {
              result.data.forEach((r) => {
                Query.exec(Path.url(`/store/Arrival/${r.id}`), {method: 'DELETE', body: {id: r.id}})
              })
            }
          })
          Query.exec(Path.url(`/store/Reservation/${this.uid}`), {method: 'DELETE', body: {id: this.uid}})
          resolve()
        } else {
          reject(new Error('Canceled by user'))
        }
      }.bind(this))
    },

    computeIntervalOffset: function (date) {
      if (!this.sup) { return 0 }
      return this.sup.computeIntervalOffset(date)
    },

    _drawComplement: function () {
      if (!this.complements) { return null }
      let compdiv = document.createElement('DIV')
      compdiv.classList.add('complementDiv')
      let begin = Math.round(this.get('trueBegin').getTime() / 1000)
      let end = Math.round(this.get('trueEnd').getTime() / 1000)

      /* if reservation is bigger than range, calculate on range */ 
      let rBegin = Math.round(this.get('dateRange').begin.getTime() / 1000)
      let rEnd = Math.round(this.get('dateRange').end.getTime() / 1000)
      if (begin < rBegin) { begin = rBegin }
      if (end > rEnd) { end = rEnd }

      let lines = {}

      for (let i = 0; i < this.complements.length; i++) {
        let c = this.complements[i]
        if (!c.type || !c.type.color) { continue }
        let color = c.type.color
        if (!lines[color]) {
          lines[color] = [0]
        } else {
          lines[color].count++
        }
        /* line is full add an element on it */
        if (lines[color][0] >= 100) {
          continue
        }
        /* follow the whole reservation */
        if (parseInt(c.follow)) {
          lines[color][0] = 100
        } else {
          let b = Math.round((new Date(c.begin)).getTime() / 1000)
          let e = Math.round((new Date(c.end)).getTime() / 1000)
          if (e <= begin || b >= end) {
            continue
          }
          if (isNaN(b) || isNaN(e)) { continue }

          matchingSegment = null
          for (let i = 1; i < lines[color].length; i++) {
            let seg = lines[color][i]
            if ((b < seg.end && b > seg.start) || (e > seg.begin && e < seg.end)) {
              matchingSegment = seg
              break
            }
          }

          if (!matchingSegment) {
            let percentStart = Math.round((b - begin) / (end - begin) * 10000) / 100
            let percent = Math.round((e - b) / (end - begin) * 10000) / 100
            lines[color][0] += percent
            if (lines[color][0] >= 100) { continue }
            lines[color].push({
              start: b,
              end: e,
              percent: percent,
              percentStart: percentStart,
              count: 1
            })
          } else {
            if (matchingSegment.start > b) {
              matchingSegment.start = b
            }
            if (matchingSegment.end < e) {
              matchingSegment.end = e
            }
            matchingSegment.percentStart = Math.round((matchingSegment.start - begin) / (end - begin) * 10000) / 100
            matchingSegment.percent = Math.round((matchingSegment.end - matchingSegment.start) / (end - begin) * 10000) / 100
            matchingSegment.count++
            lines[color][0] += matchingSegment.percent
          }
        }
      }
      let height = Math.round(1000 / Object.keys(lines).length) / 10
      let lineCount = 0;
      for (let color in lines) {
        if (lines[color][0] >= 100) {
          let div = document.createElement('DIV')
          div.classList.add('stabiloLine')
          div.setAttribute('style', `position: absolute; background-color: ${CSSColor(color)}; left: 0; width: 100%; top: ${lineCount * height}%; height: ${height}%;`)
          compdiv.appendChild(div)
        } else {
          for (let i = 1; i < lines[color].length; i++) {
            let div = document.createElement('DIV')
            div.classList.add('stabiloLine')
            div.setAttribute('style', `position: absolute; background-color: ${CSSColor(color)}; left: ${lines[color][i].percentStart}%; width: ${lines[color][i].percent}%; top: ${lineCount * height}%; height: ${height}%;`)
            compdiv.appendChild(div)
          }
        }
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
      return new Promise((resolve, reject) => {
        if (this.myForm) {
          this.myForm.remoteDelete()
        }
        this.hide()
        .then(() => {
          this.destroyed = true
          this.inherited(arguments)
          resolve()
        })
      })
    },

    show: function () {
      this._gui.hidden = false
      if (!this.domNode) {
        this.domNode = document.createElement('DIV')
      }
      if (!this.DblClick) {
        this.domNode.addEventListener('dblclick', (event) => {
          event.stopPropagation()
          this.popMeUp()
        })
      }
      if (!this.domNode.parentNode) {
        KAIROSAnim.push(() => {
          if (this.sup && this.sup.data) { this.sup.data.appendChild(this.domNode) }
        })
      }
    },

    hide: function () {
      return new Promise((resolve, reject) => {
        KAIROSAnim.push(() => {
          if (this.domNode && this.domNode.parentNode) {
            this.domNode.parentNode.removeChild(this.domNode)
          }
          resolve()
        })
        this._gui.hidden = true
      })
    },

    resize: async function (fromEntry = false) {
      if (this.destroyed) { return }
      let moving = false
      if (!this.modifiedState) { return }
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
      }

      /* Verify  if we keep this ourself */
      if (djDate.compare(this.get('trueBegin'), this.get('dateRange').end, 'date') >= 0 ||
        djDate.compare(this.get('trueEnd'), this.get('dateRange').begin, 'date') < 0) {
        if (!this._gui.hidden) {
          this.hide()
        }
        return
      }

      if (!fromEntry) {
        this.sup.overlap()
      }

      this.show()
      var nobegin = false
      var noend = false
      var returnDone = this.get('_arrival') ? (this.get('_arrival').deleted ? false : Boolean(this.get('_arrival').done)) : false

      /* Last day included */
      var bgcolor = '#FFFFFF'
      if (this) {
        var cres = JSON.parse(window.localStorage.getItem(Path.url('store/Status/' + this.get('status'))))

        if (!cres) {
          cres = await Query.exec(Path.url('store/Status/' + this.get('status')))
          window.localStorage.setItem(Path.url('store/Status/' + this.get('status')), JSON.stringify(cres))
        }
        if (cres.success && cres.length === 1) {
          bgcolor = '#' + cres.data.color
        }
      }

      var range = this.get('dateRange')
      range.begin.setHours(0, 0, 0)
      range.end.setHours(0, 0, 0)
      var begin = this.get('trueBegin')
      if (djDate.compare(range.begin, begin, 'date') > 0) {
        begin = range.begin
        nobegin = true
      }
      if (!this.DisplayBegin || (this.DisplayBegin.getTime() !== begin.getTime())) { moving = true }
      if (!moving && !this.updated) { return }
      this.DisplayBegin = new Date(begin.getTime())

      var end = this.get('trueEnd')
      if (djDate.compare(range.end, end, 'date') < 0) {
        end = range.end
        noend = true
      }
      this.DisplayEnd = new Date(end.getTime())

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
      var domclass = {reservation: true, overlap: this.overlap.do > 0, nobegin: nobegin, noend: noend, confirmed: this.is('confirmed'), done: returnDone}
      var supRect = this.sup.view.rectangle

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
      if (stopPoint < 20) {
        stopPoint = 20
      }
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

      new Promise((resolve, reject) => {
        KAIROSAnim.push(() => {
          if (this.domNode) {
            this.domNode.innerHTML = ''
            this.domNode.setAttribute('style', domstyle.join(';'))
            for (let c in domclass) {
              if (domclass[c]) {
                this.domNode.classList.add(c)
              } else {
                this.domNode.classList.remove(c)
              }
            }
            if (compdiv) {
              this.domNode.appendChild(compdiv)
            }
            if (txtdiv == null) {
              this.domNode.appendChild(this._currentTextDesc)
            } else {
              this.domNode.appendChild(txtdiv)
              txtdiv.appendChild(tools)
            }
            this.domNode.dataset.uid = this.uid
          }
        })
        .then(() => {
          resolve()
        })
      }).then(() => {
        // this.showIntervention(this.domNode, moving)
      })
    },

    updateVersionId: function () {
      if (this.myContentPane) {
        this.myContentPane.set('title', `Réservation ${this.id} V.${this.version}`)
      }
    },

    showIntervention: function (parentNode, moving) {
      if (!this.interventions || this.interventions.length <= 0) {
        return
      }
      if (moving) {
        if (!this.InterventionsSymbols) {
          this.InterventionsSymbols = []
        } else {
          this.InterventionsSymbols.forEach((x) => {
            delete x[0]
            delete x[1]
          })
        }
        let rect = this.domNode.getBoundingClientRect()
        if (rect.width < this.get('blockSize')) { return } // under certain size don't show symbols to avoid overload
        for (let i = 0; i < this.interventions.length; i++) {
          let intervention = this.interventions[i]
          let begin = new Date(this.DisplayBegin.getTime())
          begin.setHours(12)
          if (intervention.date.split('T')[0] < begin.toISOString().split('T')[0] ||
              intervention.date.split('T')[0] > this.DisplayEnd.toISOString().split('T')[0]) {
            continue
          }
          let d = new Date(intervention.date)
          let left = Math.round(
            (rect.width / (this.DisplayEnd.getTime() - this.DisplayBegin.getTime())) *
              (d.getTime() - this.DisplayBegin.getTime())
          )

          let s = document.createElement('I')
          s.classList.add(...GSymbol(intervention.symbol))
          s.style.position = 'absolute'
          s.style.top = rect.height - 24
          s.style.left = left

          let message = []
          ;['name', 'comment', 'technician'].forEach((k) => {
            if (intervention[k]) { message.push(intervention[k]) }
          })

          let x = new Tooltip(s, {placement: 'top', title: `${message.join(' / ')}`})
          this.InterventionsSymbols.push([s, x])
          KAIROSAnim.push(() => {
            parentNode.appendChild(s)
          })
        }
      } else {
        if (!this.InterventionsSymbols) { return }
        this.InterventionsSymbols.forEach((s) => {
          KAIROSAnim.push(() => {
            if (s[0]) { parentNode.appendChild(s[0]) }
          })
        })
      }
    },

    highlight: function () {
      if (this.highlightTimer) { window.clearTimeout(this.highlightTimer) }
      this.domNode.classList.add('highlight')
      this.highlightTimer = window.setTimeout(function () {
        this.domNode.classList.remove('highlight')
      }.bind(this), 3000)
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

    move: function (newTarget, oldTarget) {
      this.set('target', newTarget)
      this.previous = oldTarget
    },

    save: function (object = null, duplicate = false) {
      this.modifiedState = true
      if (this.saveInProgress) { 
        KAIROS.warn(`La réservation ${this.uid} est en cours de sauvegarde. Opération annulée.`)
        return 
      }
      this.saveInProgress = true
      this.waitStart()
      const modifiedLog = {type: 'Reservation', object: null, attribute: [], original: this.dataOriginal}
      const savePromise = new Promise((resolve, reject) => {
        this.toObject()
        .then(obj => {
          const dataHash = obj[1]
          const reservation = object === null ? obj[0] : object
          modifiedLog.object = reservation.uid
          if (dataHash && this.dataHash) {
            for (let k in dataHash) {
              if (k === '_arrival') {
                for (let _k in dataHash[k]) {
                  if (this.dataHash[k] && dataHash[k] && this.dataHash[k][_k] !== dataHash[k][_k]) {
                    modifiedLog.attribute.push(`${k}.${_k}`)
                    this.dataHash[k][_k] = dataHash[k][_k]
                  }
                }
              } else {
                if (this.dataHash[k] !== dataHash[k]) {
                  modifiedLog.attribute.push(k)
                  this.dataHash[k] = dataHash[k]
                }
              }
            }
          }
          return reservation
        })
        .then(reservation => {
          let arrival = reservation.arrival
          delete reservation.arrival
          reservation.version = this.version
          fetch(
            new URL(
              `${KAIROS.getBase()}/store/Reservation/${reservation.id ? reservation.id : ''}`
            ), 
            {
              method: reservation.id ? 'PUT' : 'POST',
              body: JSON.stringify(reservation)
            }
          )
          .then(response => {
            if (!response.ok) { 
              if (reservation.id) {
                KAIROS.error(`Ne peut pas enregistrer la réservation ${reservation.id}/${reservation.uuid}`)
              } else {
                KAIROS.error(`Ne peut pas créer la réservation ${reservation.uuid}`)
              }
              return null
            }
            return response.json()
          })
          .then(result => {
            if (result === null) { }
            if (result.length !== 1) {
              if (reservation.id) {
                KAIROS.error(`Ne peut pas enregistrer la réservation ${reservation.id}/${reservation.uuid}`)
              } else {
                KAIROS.error(`Ne peut pas créer la réservation ${reservation.uuid}`)
              }
              return
            }
            let entry = Array.isArray(result.data) ? result.data[0] : result.data
            let id = entry.id
            this.version = parseInt(entry.version)
            this.id = id

            this.updateVersionId()
            
            let subQueries = []
            this.EventTarget.dispatchEvent(new CustomEvent('id-received', {detail: {id: id, uuid: reservation.uuid}}))
            if (modifiedLog.attribute.length > 0 || duplicate) {
              /* POST to mod log */
              modifiedLog.object = id
              Histoire.LOG(modifiedLog.type, modifiedLog.object, modifiedLog.attribute, modifiedLog.original, duplicate ? {'action': 'duplicate', 'original': duplicate} : (reservation.id ? {'action': 'modify'} : {'action': 'create'}))
            }
            subQueries.push(new Promise((resolve, reject) => {
              fetch(`${KAIROS.getBase()}/store/Reservation/${id}`)
              .then(response => {
                if (!response.ok) { resolve(); return }
                response.json()
                .then(result => {
                  let data = Array.isArray(result.data) ? result.data[0] : result.data
                  this.lastModified = parseInt(data.modification)
                  resolve()
                })
              })
            }))
          
            if (arrival && Object.keys(arrival).length > 0 && !arrival.deleted) {
              if (arrival._op && arrival._op.toLowerCase() === 'delete') {
                this.set('_arrival', null)
                subQueries.push(fetch(new URL(`${KAIROS.getBase()}/store/Arrival/${arrival.id}`), {method: 'DELETE', body: JSON.stringify({id: arrival.id})}))
              } else {
                arrival.target = id
                subQueries.push(fetch(new URL(`${KAIROS.getBase()}/store/Arrival/${arrival.id ? arrival.id : ''}`), {method: arrival.id ? 'PUT' : 'POST', body: JSON.stringify(arrival)}))
              }
            }

            Promise.all(subQueries)
            .then(_ => {
              resolve(id)
            })
          })
        })
      })

      return new Promise((resolve, reject) => {
        savePromise.then((id) => {
          this.waitStop()
          this.resize()
          this.saveInProgress = false
          resolve(id)
        })
      })
    },

    copy: function (exclude = []) {
      return new Promise((resolve, reject) => {
        this.toObject().then(obj => {
          let object = obj[0]
          let originalId = object['id']
          object['uuid'] = KAIROS.uuidV4()
          delete object['id']
          delete object['arrival']
          delete object['note']
          UserStore.getCurrentUser().then(creator => {
            if (creator) {
              object['creator'] = creator.getUrl()
            }
            this.sup.createEntry(object).then(reservation => { reservation.save().then((id) => {
              let newId = id
              let promises = []
              
              reservation.set('id', id)
              reservation.set('uid', id)

              if (exclude.indexOf('contact') === -1) {
                promises.push(new Promise((resolve, reject) => {
                  let url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
                  url.searchParams.append('search.reservation', originalId)
                  fetch(url).then(response => {
                    if (!response.ok) { resolve(); return }
                    response.json().then(result => {
                      let p = []
                      for (let i = 0; i < result.length; i++) {
                        delete result.data[i].id
                        result.data[i].reservation = newId
                        p.push(new Promise((resolve, reject) => {
                          fetch(new URL(`${KAIROS.getBase()}/store/ReservationContact`), {
                                method: 'POST', body: JSON.stringify(result.data[i])}).then(response => {
                            resolve()
                          })
                        }))
                      }
                      Promise.all(p).then(() => { resolve() })
                    })
                  })
                }))
              }

              if (exclude.indexOf('association') === -1) {
                promises.push(new Promise((resolve, reject) => {
                  let url = new URL(`${KAIROS.getBase()}/store/Association`)
                  url.searchParams.append('search.reservation', originalId)
                  fetch(url).then(response => {
                    if (!response.ok) { resolve(); return }
                    response.json().then(result => {
                      let p = []
                      for (let i = 0; i < result.length; i++) {
                        delete result.data[i].id
                        result.data[i].reservation = newId
                        p.push(new Promise((resolve, reject) => {
                          fetch(new URL(`${KAIROS.getBase()}/store/Association`), {method: 'POST', body: JSON.stringify(result.data[i])}).then(response => {
                            resolve()
                          })
                        }))
                      }
                      Promise.all(p).then(() => { resolve() })
                    })
                  })
                }))
              }

              if (exclude.indexOf('mission') === -1) {
                promises.push(new Promise((resolve, reject) => {
                  Query.exec(Path.url('/store/Mission', { params: { 'search.reservation': originalId } })).then((result) => {
                    if (result.success && result.length > 0) {
                      let oMId = result.data[0].uid
                      Query.exec(Path.url('/store/Mission'), { method: 'POST', body: { reservation: newId } }).then((result) => {
                        if (result.success && result.length === 1) {
                          let mId = result.data[0].id
                          Query.exec(Path.url('/store/MissionFichier', { params: { 'search.mission': oMId } })).then((results) => {
                            if (results.success && results.length > 0) {
                              (async function () {
                                for (let i = 0; i < results.length; i++) {
                                  let entry = results.data[i]
                                  delete entry.uid
                                  entry.mission = mId
                                  await Query.exec(Path.url('/store/MissionFichier'), { method: 'POST', body: entry })
                                }
                                resolve()
                              })()
                            } else {
                              resolve()
                            }
                          })
                        } else {
                          resolve()
                        }
                      })
                    } else {
                      resolve()
                    }
                  })
                }))

                Promise.all(promises).then(() => {
                  resolve(reservation)
                })
              }
            })})
          })
        })
      })
    },

    export: function () {
      this.toObject().then(obj => {
        let RFileObject = {version: 1.0}
        let reservation = obj[0]
        let arrival = {}
        let rid = reservation.id
        if (reservation.type) {
          reservation.type = `store/Status/${reservation.type}`
        }
        delete reservation.id
        if (reservation.arrival) {
          arrival = reservation.arrival
          delete arrival.target
          delete reservation.arrival
        }

        let pContacts = Query.exec(Path.url('/store/ReservationContact', {params: {'search.reservation': rid}}))
        let pAssociations = Query.exec(Path.url('/store/Association', {params: {'search.reservation': rid}}))
        let associations = []
        let contacts = []
        Promise.all([pContacts, pAssociations]).then((results) => {
          console.log(results)
          if (results[1].length > 0) {
            results[1].data.forEach((a) => {
              delete a.reservation
              if (a.type) {
                let t = a.type.split('/')
                a.type = `store/Status/${t[t.length - 1]}`
              }
              associations.push(a)
            })
          }
          if (results[0].length > 0) {
            results[0].data.forEach((c) => {
              console.log(c)
              delete c.reservation
              if (c.target) {
                c.target = `store${c.target}`
              }
              contacts.push(c)
            })
          }
          RFileObject.content = [
            {
              reservation: rid,
              content: reservation,
              arrival: arrival,
              association: associations,
              contact: contacts
            }
          ]
          let OutFile = btoa(JSON.stringify(RFileObject))
          window.open(`data:application/octet-stream;filename=export.txt,base64,${OutFile}`, 'export.txt')
        })
      })
    },

    extend7: function (e) {
      this.extend(7)
    },

    extend: function (days) {
      Query.exec(Path.url(`/store/DeepReservation/${this.get('id')}`)).then(function (result) {
        if (!result.success && result.length !== 1) { console.warn('Erreur pour obtenir les données avant modification'); return }
        let newEnd = djDate.add(new Date(result.data.end), 'day', days)
        let newDeliveryEnd = null
        if (result.data.deliveryEnd) {
          newDeliveryEnd = djDate.add(new Date(result.data.deliveryEnd), 'day', days)
        }
        this.end = newEnd
        this.deliveryEnd = newDeliveryEnd
        this.save()
      }.bind(this))
    },

    addContact: function (address, type) {
      return this.KReservation.addContact(address, type)
    },

    delContact: function (address, type) {
      return this.KReservation.delContact(address, type)
    }

  })
})
