/* eslint-env browser, amd */
/* global getElementRect, Tooltip */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/entry.html',

  'dojo/date',
  'dojo/dom-class',
  'dojo/dom-style',
  'dijit/registry',

  'location/reservation',
  'location/update',
], function (
  djDeclare,
  djLang,
  djEvented,
  DjDeferred,
  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,

  _template,

  djDate,
  djDomClass,
  djDomStyle,
  dtRegistry,

  Reservation,
  update,
) {
  return djDeclare('location.entry', [dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, update], {
    baseClass: 'entry',
    templateString: _template,
    stores: {},
    childs: {},
    sup: null,
    isParent: false,
    target: null,
    intervalZoomFactors: [],
    waiters: 0, /* number of nested "waiting" func */
    originalHeight: 0,
    tags: [],
    entries: {},
    locked: false,
    currentLocation: '',
    modified: true,

    constructor: function (args) {
      this.lastTouchEndEv = 0
      this.lastTouchTarget = null
      this.waiters = 0
      this.childs = {}
      this.target = null
      this.isParent = false
      this.sup = null
      this.stores = {}
      this.originalHeight = 0
      this.tags = []
      this.entries = {}
      this.currentLocation = ''
      this.creating = {}
      this.CommChannel = args.channel

      this.CommChannel.port1.onmessage = this.channelMsg.bind(this)

      /* Interval zoom factor is [ Hour Begin, Hour End, Zoom Factor ] */
      this.intervalZoomFactors = new Array([ 7, 17, 70 ])
      if (dtRegistry.byId('location_entry_' + args['target'])) {
        KAIROS.error('La machine ' + args['target'] + ' existe à double dans la base de donnée !')
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
            if (entry.target !== this.get('target')) {
              if (this.entries[entry.id]) {
                this.destroyReservation(this.entries[entry.id])
              }
            } else {
              for (let lid in this.creating) {
                if (this.creating[lid].uid == entry.id) {                 
                  this.entries[entry.id] = this.creating[lid]
                  delete this.creating[lid]
                }
              }
              if (!this.entries[entry.id]) {
                this.entries[entry.id] = new Reservation({sup: this, uid: entry.id, _json: entry})
                this.entries[entry.id].addEventListener('change', this.handleReservationEvent.bind(this))
              } else {
                this.entries[entry.id].fromJson(entry)
              }
            }
          })
          this.modified = true
          break
        case 'state':
          if (!this.nControl) { return }
          if (!msgData.value) { return }
          if (!msgData.value.type) { return }
          if (!msgData.value.type.color) { return }
          let node = this.nControl.firstElementChild
          while (node && !node.classList.contains('tools')) {
            node = node.nextElementSibling
          }
          node = node.firstElementChild
          while (node && !node.classList.contains('fa-shield-alt')) {
            node = node.nextElementSibling
          }
          window.requestAnimationFrame(() => node.style.color = msgData.value.type.color)
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
      this.domNode.addEventListener('dblclick', event => { this.evtDblClick(event) })
      this.domNode.addEventListener('touchend', event=> { this.evTouchEnd(event) })
      this.domNode.addEventListener('touchstart', event => { this.evTouchStart(event) })

      this.originalHeight = djDomStyle.get(this.domNode, 'height') ? djDomStyle.get(this.domNode, 'height') : 73 /* in chrome value here is 0, set default known value for now */

      this.view = { rectangle: getElementRect(this.domNode) }
      this.verifyLock()
      let url = new URL(`store/Tags/`, KAIROS.getBase())
      url.searchParams.append('!', this.url)
      fetch(url).then(response => {
        if (!response.ok) { return }
        response.json().then(result => {
          if (result.length > 0) {
            for (let i in result.data[0]) {
              result.data[0][i].forEach(tag => {
                this.tags.push(tag)
              })
            }
          }
          this.displayTags(this.tags)
        })
      })

      var frag = document.createDocumentFragment()

      var a = document.createElement('A')
      a.setAttribute('name', 'entry_' + this.get('target'))
      a.innerHTML = `<span class="reference">(${this.get('target')})</span><span class="commonName label">${this.get('label')}</span>${this.details.parent !== '' ? '<span class="parentMachine">' + this.details.parent + '</span>' : ''}`

      frag.appendChild(a)
      window.requestAnimationFrame(function () { this.nameNode.appendChild(frag) }.bind(this))
      this.domNode.dataset.reference = this.target
      this.domNode.dataset.type = Array.isArray(this.details.type) ? this.details.type[0] : this.details.type
      this.domNode.dataset.family = Array.isArray(this.details.family) ? this.details.family[0] : this.details.family
      this.domNode.dataset.details = JSON.stringify(this.details)
      
      this.genDetails()

      let node = this.nControl.firstElementChild
      while (node && !node.classList.contains('tools')) {
        node = node.nextElementSibling
      }
      node = node.firstElementChild
      while (node && !node.classList.contains('fa-shield-alt')) {
        node = node.nextElementSibling
      }
      node.addEventListener('click', (event) => {
        event.stopPropagation()
        this.EvenementPopUp(node)
      }, {capture: true})
      node.addEventListener('dblclick', (event) => {
        event.stopPropagation()
      }, {capture: true})
    },

    EvenementPopUp: function (node) {
      if (this.EntryStateOpen !== undefined && this.EntryStateOpen !== null) {
        this.EntryStateOpen[0].destroy()
        this.EntryStateOpen[1].parentNode.removeChild(this.EntryStateOpen[1])
        this.EntryStateOpen = null
        return
      }
      let url = new URL(`store/Evenement/.chain`, KAIROS.getBase())
      url.searchParams.append('machine', this.target)
      fetch(url).then(response => {
        if (!response.ok) {
          KAIROS.error('Erreur lors de l\'interrogation des évènements')
          return
        }
        response.json().then(result => {
          if (result.length <= 0) {
            KAIROS.info(`Aucune chaîne d'évènements ouverte pour la machine ${this.target}`)
          } else {
            if (result.length === 1) {
              KAIROS.info(`1 chaîne d'évènements ouverte pour la machine ${this.target}`)
            } else {
              KAIROS.info(`${result.length} chaînes d'évènements ouvertes pour la machine ${this.target}`)
            }
            let chains = document.createElement('DIV')
            chains.classList.add('evenement')
            for (let i = 0; i < result.length; i++) {
              let entry = result.data[i]
              let first = true
              do {
                let line = document.createElement('DIV')
                if (entry.reservation) {
                  line.dataset.reservationId = entry.reservation
                }
                line.classList.add((i % 2 ? 'odd' : 'even'))
                line.classList.add(`s${Math.trunc(entry.severity / 1000)}`)
                if (first) {
                  line.classList.add('first')
                }
                line.innerHTML = `<span class="field date">${new Date(entry.date).fullDate()}</span><span class="field name">${entry.name}</span><span class="field technician">${entry.technician}</span><span clasS="field comment">${entry.comment}</span>`
                chains.appendChild(line)
                entry = entry.previous
                first = false
              } while (entry)
            }
            document.body.appendChild(chains)
            chains.addEventListener('click', (event) => {
              event.stopPropagation()
              let node = event.target
              while (node && node.nodeName !== 'DIV') { node = node.parentNode }
              if (node.dataset.reservationId) {
                window.GEvent('reservation.open', {id: node.dataset.reservationId})
              }
            }, {capture: true})
            if (this.EntryStateOpen === undefined || this.EntryStateOpen === null) {
              this.EntryStateOpen = [Popper.createPopper(node, chains, {placement: 'right'}), chains]
            }
          }
        })
      })
    },

    handleReservationEvent: function (event) {
      switch (event.type) {
        case 'change':
          if (event.detail) {
            this.CommChannel.port1.postMessage({op: 'reload', reservation: event.detail})
          }
          break
      }
    },
    genDetails: function () {
      const texts = ['reference']
      const weights = ['maxcapacity', 'weight']
      const lengths = ['length', 'height', 'width', 'floorheight', 'workheight', 'sideoffset']
      let x = {}
      for (let i = 0; i < texts.length; i++) {
        x[texts[i]] = { raw: this.details[texts[i]], html: this.details[texts[i]] }
      }
      for (let i = 0; i < weights.length; i++) {
        if (this.details[weights[i]] !== undefined) {
          let v = parseInt(this.details[weights[i]])
          if (!Number.isNaN(v)) {
            x[weights[i]] = {
              raw: v,
              html: v >= 1000 ? `${v / 1000} T` : `${v} kg`
            }
          }
        }
      }
      for (let i = 0; i < lengths.length; i++) {
        if (this.details[lengths[i]] !== undefined) {
          let v = parseInt(this.details[lengths[i]])
          if (!Number.isNaN(v)) {
            x[lengths[i]] = {
              raw: v,
              html: `${v / 100} m`
            }
          }
        }
      }
      const labels = {
        reference: 'Originale',
        weight: 'Poids',
        maxcapacity: 'Charge max',
        workheight: 'Hauteur travail',
        floorheight: 'Hauteur plancher',
        sideoffset: 'Déport latéral',
        width: 'Largeur',
        height: 'Hauteur',
        length: 'Longueur'
      }
      let txt = []
      for (let k in labels) {
        if (x[k]) {
          txt.push(`<p class="detail"><span class="label">${labels[k]}:</span><span class="value">${x[k].html}</span></p>`)
        }
      }
      this.getDatasheet().then((url) => {
        if (url) {
          txt.push(`<p><a href="${url}" target="_blank">Fiche technique</a></p>`)
        }
        this.htmlDetails = txt.join('')
        this.Tooltip = new Tooltip(this.nControl, {trigger: 'click', html: true, title: this.htmlDetails, placement: 'bottom-start', closeOnClickOutside: true})
      })
    },

    getDatasheet: function () {
      return new Promise((resolve, reject) => {
        let datasheet = window.localStorage.getItem(`location/datasheet/${this.details.reference}`)
        if (datasheet) {
          try { datasheet = JSON.parse(datasheet) } catch (error) { datasheet = null }
        } else {
          datasheet = null
        }
        if (datasheet && datasheet.lastFetch < new Date().getTime() - 2592000) {
          datasheet = null
        }
        if (datasheet) { resolve(datasheet.url) } else {
          fetch(`https://www.local.airnace.ch/${this.details.reference}/pdf`, {mode: 'cors', method: 'HEAD'}).then((response) => {
            if (response.ok) {
              let datasheet = {lastFetch: new Date().getTime(), url: `https://www.local.airnace.ch/${this.details.reference}/pdf`}
              window.localStorage.setItem(`location/datasheet/${this.details.reference}`, JSON.stringify(datasheet))
              resolve(datasheet.url)
            } else {
              resolve(null)
            }
          })
        }
      })
    },

    /* this function can be deleted and replaced by just a call to displayLocation */
    loadExtension: function () {
      return new Promise(function (resolve, reject) {
        this.displayLocation()
        resolve(this)
      }.bind(this))
    },

    displayTags: function (tags) {
      return new Promise((resolve, reject) => {
        let notag = true
        let frag = document.createDocumentFragment()
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
        window.requestAnimationFrame(() => {
          this.nTags.appendChild(frag); 
          this.nTags.addEventListener('dblclick', event => { this.eEditTags(event) }, {once: true})
          resolve()
        })
      })
    },

    clearTags: function () {
      return new Promise((resolve, reject) => {
        this.nTags.setAttribute('class', 'tags')
        window.requestAnimationFrame(() => {
          this.nTags.innerHTML = ''
          resolve()
        })
      })
    },

    eEditTags: function (event) {
      let form = document.createElement('FORM')
      form.innerHTML = `<input type="text" name="tags" value="${this.tags.join(', ')}" /><input type="submit" value="Ok" />`
      form.addEventListener('submit', event => {
        event.preventDefault()
        let input = event.target.firstElementChild
        while (input && input.getAttribute('name') !== 'tags') { input = input.nextElementSibling }

        let tags = input.value.split(',')
        for (var i in tags) {
          tags[i] = tags[i].trim()
        }
        this.tags = tags
        let q = {}
        q[this.url] = tags
        let url = new URL('store/Tags', KAIROS.getBase())
        url.searchParams.append('!', this.url)
        fetch(url, {method: 'post', body: JSON.stringify(q)}).then (response => {
          if (!response.ok) { return }
          response.json().then(results => {
            console.log(results)
            this.clearTags().then(() => { this.displayTags(tags) })
          })
        })
      })

      this.clearTags().then(() => {
        this.nTags.setAttribute('class', 'tags edit'); 
        window.requestAnimationFrame(() => {
          this.nTags.appendChild(form); 
          let input = form.firstElementChild
          while (input && input.getAttribute('name') !== 'tags') { input = input.nextElementSibling }
          input.focus() 
        })
      }) 
    },

    focus: function () {
      djDomClass.add(this.domNode, 'focus')
    },

    blur: function () {
      djDomClass.remove(this.domNode, 'focus')
    },

    displayLocation: function () {
      var location = this.get('currentLocation')
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
      var location = this.get('currentLocation')
      var frag = document.createDocumentFragment()
      var saveLocFn = (event) => {
        var node = null
        var input = null
        let url
        for (node = event.target; node.nodeName !== 'DIV'; node = node.parentNode);
        for (input = node.firstChild; input.nodeName !== 'INPUT'; input = input.nextSibling);
        if (node.getAttribute('data-id')) {
          var body = {id: node.getAttribute('data-id'), value: input.value}
          var method = 'PATCH'
          url = new URL(`store/Entry/${body.id}`, KAIROS.getBase())
        } else {
          body = {ref: this.get('target'), name: 'currentLocation', value: input.value}
          method = 'POST'
          url = new URL('store/Entry', KAIROS.getBase())
        }

        fetch(url, {method: method, body: JSON.stringify(body)}).then(response => {
          if (!response.ok) { return }
          response.json().then(result => {
            if (result.length !== 1) { return }
            fetch(new URL(`store/Entry/${result.data[0].id}`, KAIROS.getBase())).then((response) => {
              if (!response.ok) { return }
              response.json().then(result => {
                if (result.length !== 1) { return }
                this.set('currentLocation', result.data)
                this.displayLocation()
              })
            })
          })
        })
      }

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

    defaultStatus: function () {
      return this.sup.defaultStatus()
    },

    evTouchStart: function (event) {
      event.stopPropagation()
      event.preventDefault()
      if (window.App.touchTimeout) {
        clearTimeout(window.App.touchTimeout)
      }
      window.App.touchTimeout = setTimeout(() => {
        this.evtDblClick(event)
      }, 500)
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

      this.defaultStatus().then((s) => {
        UserStore.getCurrentUser().then(currentUser => {
          let newReservation = new Reservation({sup: this, begin: day, end: end, status: s, creator: currentUser !== null ? currentUser.getUrl() : null, create: true})
          this.creating[newReservation.localid] = newReservation
          newReservation.addEventListener('change', this.handleReservationEvent.bind(this))
          newReservation.save().then((id) => {
            newReservation.set('uid', id)
            newReservation.popMeUp()
          })
        })
      })
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
    },
    resize: function () {
      this.modified = true
      this.domNode.dataset.refresh = 'outdated'
    },
    _resizeChild: function () {
      for (let e in this.entries) {
        this.entries[e].resize()
      }
    },

    _resize: function () {
      if (!this.modified) {
        return
      }
      for (let entry = this.data.firstElementChild; entry; entry = entry.nextElementSibling) {
        let widget = dtRegistry.getEnclosingWidget(entry)
        if (widget && widget.resize) {
          if (!this.entries[widget.uid]) { this.entries[widget.uid] = widget }
        }
      }
      this.overlap()
      this.view.rectangle = getElementRect(this.domNode)
      this._resizeChild()
      this.modified = false
      this.domNode.dataset.refresh = 'fresh'
    },

    addOrUpdateReservation: function (reservations) {
      for (var i = 0; i < reservations.length; i++) {
        if (!this.entries[reservations[i].id]) {
          this.entries[reservations[i].id] = new Reservation({uid: reservations[i].id, sup: this, _json: reservations[i]})
          this.entries[reservations[i].id].addEventListener('change', this.handleReservationEvent.bind(this))
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
          if (!this.entries[k]) { delete this.entries[k]; continue }
          if (this.entries[k].deleted) {
            this.entries[k].hide()
            delete this.entries[k]
            continue
          }
          Object.assign(this.entries[k].overlap, { elements: [], level: 0, order: 0, do: false })
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
          if (!overlapRoot[j].range) { continue }
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
    _getNameAttr: function () {
      const namesAttr = [ 'cn', 'cn;lang-de', 'cn;lang-en' ]
      for (let i = 0; i < namesAttr.length; i++) {
        if (this.details[namesAttr[i]] !== undefined) {
          return this.details[namesAttr[i]] 
        }
      }
      return ''
    },
    _setCurrentLocationAttr: function (value) {
      this.details.currentLocation = value
    },
    _getCurrentLocationAttr: function () {
      if (this.details.currentLocation) {
        return this.details.currentLocation
      }
      return ''
    },
    getNumTechData: function (name) {
      if (this.details === undefined) {
        return 0
      }
      if (this.details[name] === undefined) {
        return 0
      }
      if (Number.isNaN(parseFloat(this.details[name]))) {
        return 0
      }
      return parseFloat(this.details[name])
    },
    _getFloorheightAttr: function () {
      return this.getNumTechData('floorheight')
    },
    _getWorkheightAttr: function () {
      return this.getNumTechData('workheight')
    },
    _getSideoffsetAttr: function () {
      return this.getNumTechData('sideoffset')
    },
    _getMaxcapacityAttr: function () {
      return this.getNumTechData('maxcapacity')
    }
  })
})
