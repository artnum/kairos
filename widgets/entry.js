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
) {
  return djDeclare('location.entry', [dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented], {
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
      this.entries = new Map()
      this.currentLocation = ''
      this.HPos = -1
      this.Stores = {
        Locality: new KLocalityStore('warehouse')
      }

      KEntry.load(args.target)
      .then(kentry => {
        this.KEntry = kentry
        this.displayLocation()
        const create = (event) => {
          for (const value of this.entries) {
            if (value.uuid === event.detail.entry.uuid) {
              return
            }
          }
          if (event.detail && event.detail.entry) {
            this.KEntry.fixReservation(event.detail.entry)
            .then (json => {
              if (json) { this.createEntry(json, event.detail.isMe) }
            })
          }
        }
        const remove = (event) => {
          console.log(event)
          if (event.detail && event.detail.entry) {
            this.removeEntry(event.detail.entry)
          }
        }
        const update = (event) => {
          console.log(entry)
          if (event.detail && event.detail.entry) {
            this.KEntry.fixReservation(event.detail.entry)
            .then (json => {
              if (json) { this.createEntry(json, event.detail.isMe) }
            })
          }
        }
        kentry.addEventListener('update-entry', update)
        kentry.addEventListener('remove-entry', remove)
        kentry.addEventListener('create-entry', create)
        kentry.addEventListener('state-change', this.stateChange.bind(this))
        kentry.register(args.wwInstance)
      })

      /* Interval zoom factor is [ Hour Begin, Hour End, Zoom Factor ] */
      this.intervalZoomFactors = new Array([ 7, 17, 70 ])
      if (dtRegistry.byId('location_entry_' + args['target'])) {
        KAIROS.error('La machine ' + args['target'] + ' existe à double dans la base de donnée !')
      } else {
        this.id = 'location_entry_' + args['target']
      }
    },

    setHPos: function (hpos) {
      this.HPos = hpos
    },
  
    getHPos: function (hpos) {
      return this.HPos
    },

    removeEntry: function (entry) {
      return new Promise((resolve, reject) => {
        for (const [kEntry, currentEntry] of this.entries) {
          if (currentEntry.uuid === entry.uuid) {
            this.destroyReservation(currentEntry)
            .then(() => {
              this.entries.delete(kEntry)
              this.resize()
              resolve()
            })
            break
          }
        }
        resolve()
      })
    },
    createEntry: function (entry, isMe) {
      return new Promise((resolve, reject) => {
        const id = entry.uuid || entry.id
        if (!this.entries.has(id)) {
          this.entries.set(id, new Reservation({
            sup: this,
            uuid: entry.uuid
          }))
        }
        const currentEntry = this.entries.get(id)
        if (currentEntry.isOpen() && !isMe) {
          currentEntry.signalRemoteModification()
          return;
        }
        currentEntry.fromJson(entry)
        .then(() => {
          if (this.entries[id]) { this.entries[id].waitStop() }
          this.resize()
          resolve(this.entries.get(id))
        })
      })
    },
    stateChange: function (event) {
      let eventType = ''
      switch(Math.trunc(event.detail.severity / 1000)) {
        case 0: eventType = 'eventNone'; break
        case 1: eventType = 'eventCheck'; break
        case 2: eventType = 'eventError'; break
        case 3: eventType = 'eventFailure'; break
      }
      KAIROSAnim.push(() => {
        this.domNode.classList.remove('eventNone', 'eventCheck', 'eventError','eventFailure')
        this.domNode.classList.add(eventType)
      })
    },
    computeIntervalOffset: function (date) {
      var hour = date.getHours()
      var h = (17 - 7) * 3.8 + (24 - (17 - 7)) * 1
      var bs = this.get('blockSize') / h

      if (hour <= 7) { return bs * hour }
      if (hour > 7 && hour <= 17) { return (7 * bs) + ((hour - 7) * 3.8 * bs) }
      return (7 * bs) + ((17 - 7) * 3.8 * bs) + ((hour - 17) * bs)
    },

    postCreate: function () {
      this.domNode.addEventListener('dblclick', event => { this.evtDblClick(event) })
      this.originalHeight = djDomStyle.get(this.domNode, 'height') ? djDomStyle.get(this.domNode, 'height') : 73 /* in chrome value here is 0, set default known value for now */

      this.view = { rectangle: getElementRect(this.domNode) }
      this.verifyLock()
      let url = new URL(`store/Tags/`, KAIROS.getBase())
      url.searchParams.append('!', this.url)
      fetch(url)
      .then(response => {
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
      a.innerHTML = ` <span class="reference">(${this.get('target')})</span>
                      <span class="commonName label">${this.get('label')}</span>
                      ${this.details.parent !== '' ? '<span class="parentMachine">' + this.details.parent + '</span>' : ''}`
      if (this.details.kmodel || this.details.brand) {
        a.innerHTML += `<br><span class="brand">${this.details.brand ?? ''}</span> <span class="kmodel">${this.details.kmodel ?? ''}</span>`
      }
      frag.appendChild(a)
      KAIROSAnim.push(() => { this.nameNode.appendChild(frag) })
      this.domNode.dataset.reference = this.target
      this.domNode.dataset.type = Array.isArray(this.details.type) ? this.details.type[0] : this.details.type
      this.domNode.dataset.family = Array.isArray(this.details.family) ? this.details.family[0] : this.details.family
      this.domNode.dataset.details = JSON.stringify(this.details)
      
      this.genDetails()
      if (this.details) {
        if (!Array.isArray(this.details.state)) {
          this.details.state = [this.details.state]
        }
        this.details.state.forEach(state => {
          this.domNode.classList.add(state)
        })
      }

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
      let closeEvPopUp = () => {
        KAIROS.removeClosableFromStack(closeEvPopUp)
        if (this.EntryStateOpen !== undefined && this.EntryStateOpen !== null) {
          this.EntryStateOpen[0].destroy()
          this.EntryStateOpen[1].parentNode.removeChild(this.EntryStateOpen[1])
          this.EntryStateOpen = null
        }
        if (closeEvPopUp.closableIdx) {
          KAIROS.removeClosableByIdx(closeEvPopUp.closableIdx)
        }
      }
      closeEvPopUp.closableIdx = KAIROS.stackClosable(closeEvPopUp)
      if (this.EntryStateOpen !== undefined && this.EntryStateOpen !== null) {
        closeEvPopUp()
        return
      }
      this.KEntry.getEvents().then(evenements => {
        if (evenements.length === 0) {
          KAIROS.info(`Aucune chaîne d'évènements ouverte pour la machine ${this.target}`)
          return
        }
        if (evenements.length === 1) {
          KAIROS.info(`1 chaîne d'évènements ouverte pour la machine ${this.target}`)
        } else {
          KAIROS.info(`${evenements.length} chaînes d'évènements ouvertes pour la machine ${this.target}`)
        }
        let chains = document.createElement('DIV')
        chains.classList.add('evenement')
        for (let i = 0; i < evenements.length; i++) {
          let evenement = evenements[i]
          let first = true
          do {
            let line = document.createElement('DIV')
            if (evenement.reservation) {
              line.dataset.reservationId = evenement.reservation
            }
            line.classList.add((i % 2 ? 'odd' : 'even'))
            line.classList.add(`s${Math.trunc(evenement.severity / 1000)}`)
            if (first) {
              line.classList.add('first')
            }
            line.innerHTML = `
                <span class="field date">${new Date(evenement.date).fullDate()}</span>
                <span class="field name">${evenement.name}</span>
                <span class="field technician">${evenement.technician}</span>
                <span class="field comment">${evenement.comment}</span>`
            chains.appendChild(line)
            evenement = evenement.previous
            first = false
          } while (evenement)
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
      })
    },

    resolveCategories: function () {
      return new Promise((resolve) => {
        const p = []
        for (const k of ['family', 'special', 'subtype', 'type', 'motorization']) {
          if (!this.details[k]) { continue }
          if (!Array.isArray(this.details[k])) {
            this.details[k] = [this.details[k]]
          }
          for (const category in this.details[k]) {
            p.push(new Promise((resolve, reject) => {
              fetch(new URL(`${KAIROS.getBase()}/store/Category/uniqueIdentifier=${this.details[k][category]}`))
              .then(response => {
                if (!response.ok) { throw new Error('Erreur réseau')}
                return response.json()
              }) 
              .then(result => {
                const data = Array.isArray(result.data) ? result.data[0] : result.data
                if (data['cn;'][`lang-${KAIROS.lang()}`]) { 
                  this.details[k][category] = Array.isArray(data['cn;'][`lang-${KAIROS.lang()}`]) ? data['cn;'][`lang-${KAIROS.lang()}`][0] : data['cn;'][`lang-${KAIROS.lang()}`]
                } else if (data['cn']) {
                  this.details[k][category] = Array.isArray(data['cn']) ? data['cn'][0] : data['cn']
                }
                resolve()
              })
              .catch(reason => {
                reject(reason)
              })
            }))
          }
        }
        Promise.allSettled(p)
        .then(_ => { resolve() })
      })
    },

    genDetails: function () {
      new Promise((resolve, reject) => {
        this.resolveCategories()
        .then(_ => { resolve() })
      })
      .then(_ => {
        const categories = ['motorization', 'special']
        const texts = ['reference', 'uid', 'kmodel', 'brand', 'motorization']
        const weights = ['maxcapacity', 'weight']
        const lengths = ['length', 'height', 'width', 'floorheight', 'workheight', 'sideoffset']
        let x = {}

        if (this.details.oldid !== undefined) {
          if (Array.isArray(this.details.oldid)) {
            let oldid = []
            for (let i = 0; i < this.details.oldid.length; i++) {
              if (this.details.oldid[i] !== this.detail.uid) {
                oldid.push(this.details.oldid[i])
              }
            }
            x['oldid'] = { type: '', raw: oldid, html: oldid.join(', ') }
          } else {
            if (this.details.oldid !== this.details.uid) {
              x['oldid'] = { type: '', raw: this.details.oldid , html: this.details.oldid }
            }
          }
        }
        for (let i = 0; i < texts.length; i++) {
          if (this.details[texts[i]] !== undefined) {
            x[texts[i]] = { type: 'text', raw: this.details[texts[i]], html: this.details[texts[i]] }
          }
        }
        for (let i = 0; i < weights.length; i++) {
          if (this.details[weights[i]] !== undefined) {
            let v = parseInt(this.details[weights[i]])
            if (!Number.isNaN(v)) {
              x[weights[i]] = {
                type: 'number',
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
                type: 'number',
                raw: v,
                html: `${v / 100} m`
              }
            }
          }
        }
        for (const cat of categories) {
          if(this.details[cat]) {
            x[cat] = {
              type: 'list',
              raw: this.details[cat],
              html: this.details[cat],
            }
          }
        }
        const labels = {
          reference: 'Originale',
          brand: 'Marque',
          kmodel: 'Modèle',
          oldid: 'Ancien numéro',
          weight: 'Poids',
          maxcapacity: 'Charge max',
          workheight: 'Hauteur travail',
          floorheight: 'Hauteur plancher',
          sideoffset: 'Déport latéral',
          width: 'Largeur',
          height: 'Hauteur',
          length: 'Longueur',
          motorization: 'Motorisation',
          special: 'Spécialité',
        }
        let txt = []
        for (let k in labels) {
          if (x[k]) {
              if (x[k].type === 'list') {
                txt.push(`<p class="detail text"><span class="label">${labels[k]}:</span>`)
                for (const text of x[k].html) {
                  txt.push(`<span class="value">${text}</span>`)

                }
                txt.push('</p>')
              } else {
                txt.push(`<p class="detail ${x[k].type}"><span class="label">${labels[k]}:</span><span class="value">${x[k].html}</span></p>`)
              }
          }
        }
        return txt
      })
      .then(txt => {
        txt.push(`<p><a target="_blank" href="${KAIROS.getBase()}/html/permachine.html#${this.get('target')}">Réservations pour la machine</a></p>`)
        this.htmlDetails = txt.join('')
      })
      .then(_ => {
        this.Tooltip = new Tooltip(this.nControl, {trigger: 'click', html: true, title: this.htmlDetails, placement: 'bottom-start', closeOnClickOutside: true})
      })
    
    },

    displayTags: function (tags) {
      return new Promise((resolve, reject) => {
        let notag = true
        let frag = document.createDocumentFragment()
        if (!this.KEntry) { return }
        if (tags.length > 0) {
          this.KEntry.set('tags', tags)
          for (let tag of tags) {
            if (tag !== '') {
              notag = false
              var s = document.createElement('A')
              s.setAttribute('class', 'tag ' + tag.tagify())
              s.setAttribute('href', '#' + tag.tagify())
              s.appendChild(document.createTextNode(tag))
              frag.appendChild(s)
            }
          }
        }
        if (notag) {
          frag.appendChild(document.createTextNode('Ajouter ... '))
        }
        this.nTags.addEventListener('dblclick', event => { this.eEditTags(event) }, {once: true})
        KAIROSAnim.push(() => {
          this.nTags.appendChild(frag); 
        })
        .then(() => {
          resolve()
        })
      })
    },

    clearTags: function () {
      return new Promise((resolve, reject) => {
        this.nTags.setAttribute('class', 'tags')
        KAIROSAnim.push(() => {
          this.nTags.innerHTML = ''
        })
        .then(() => resolve())
      })
    },

    eEditTags: function (event) {
      let form = document.createElement('FORM')
      form.style.zIndex = KAIROS.zMax()
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
            this.clearTags().then(() => { this.displayTags(tags) })
          })
        })
      })

      this.clearTags()
      .then(() => {
        this.nTags.setAttribute('class', 'tags edit'); 
        KAIROSAnim.push(() => {
          this.nTags.appendChild(form); 
          let input = form.firstElementChild
          while (input && input.getAttribute('name') !== 'tags') { input = input.nextElementSibling }
          input.focus() 
        })
      })
    },

    focus: function () {
      this.domNode.classList.add('focus')
    },

    blur: function () {
      this.domNode.classList.remove('focus')
    },

    displayLocation: function () {
      const location = this.get('currentLocation')
      const anim = KAIROSAnim.push(() => {
        this.nLocation.removeAttribute('data-id')
        this.nLocation.innerHTML = `<i class="fas fa-warehouse"> </i> `
      })
      if (!location) {
        return
      }
      anim
      .then(() => {
        this.Stores.Locality.get(location.value)
        .then(value => {
          if (location && location.value) {
            const label = value.printableLabel
            const color = value.color ? CSSColor(value.color) : 'black'
            this.KEntry.set('location', label)
            KAIROSAnim.push(() => {
              this.nControl.setAttribute('class', 'control ' + label.tagify())
              this.nLocation.dataset.value = location.value
              this.nLocation.dataset.id = location.id
              this.nLocation.style.color = color;
              this.nLocation.innerHTML = `<i class="fas fa-warehouse"> </i> ${label}`
            })
          }
        })
      })
    },

    eEditLocation: function (event) {
      const form = document.createElement('FORM')
      this.Stores.Locality.get(this.nLocation.dataset.value)
      .then(value => {
        form.dataset.id = this.nLocation.dataset.id
        form.innerHTML = `<input type="text" name="location"></input><button type="submit">Valider</button><button type="reset">Annuler</button>`
        const select = new Select(form.firstElementChild, this.Stores.Locality, {allowFreeText: true, realSelect: true})
        select.value = value.value
        const popup = new KPopup('Modifer dépôt', {reference: this.nControl, minWith: '200px', minHeight: '180px'})
        popup.setContentDiv(form)
        popup.open()
        form.addEventListener('reset', event => {
          popup.close();
        })
        form.addEventListener('submit', event => {
          event.preventDefault()
          kcremove(`${KAIROS.getBase()}/store/Machine/${this.KEntry.data.uid}`)
          let query
          const body = {
            name: 'currentLocation',
            value: select.value
          }
          if (! this.nLocation.dataset.id) {
            body.ref = this.KEntry.data.uid
            query = fetch(`${KAIROS.getBase()}/store/Entry`, {
              method: 'POST',
              body: JSON.stringify(body)
            })
          } else {
            body.id = event.target.dataset.id
            query = fetch(`${KAIROS.getBase()}/store/Entry/${event.target.dataset.id}`, {
              method: 'PATCH',
              body: JSON.stringify(body)
            })
          }
          query.then(response => {
            if (!response.ok) { return null }
            return response.json()
          })
          .then(result => {
            if (!result) { KAIROS.error('Erreur lors de l\'attribution du nouveau dépôt'); popup.close(); return }
            if (result.length <= 0) { KAIROS.error('Erreur lors de l\'attribution du nouveau dépôt'); popup.close(); return }
            body.id = Array.isArray(result.data) ? result.data[0].id : result.data.id
            body.value = select.value
            body.ref = this.KEntry.data.uid
            this.set('currentLocation', body)
            this.displayLocation()
            popup.close()
          })
        })
      })
    },

    defaultStatus: function () {
      return this.sup.defaultStatus()
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

      Promise.all([this.defaultStatus(), UserStore.getCurrentUser()])
      .then(([defaultStatus, currentUser]) => {
        const uuid = KAIROS.uuidV4()
        const newReservation = new Reservation({
          sup: this,
          uuid: uuid,
          begin: day,
          end: end,
          status: defaultStatus,
          creator: currentUser !== null ? currentUser.getUrl() : null, create: true
        })
        this.entries.set(uuid, newReservation)
        newReservation.save()
        .then((id) => {
          fetch(new URL(`${KAIROS.getBase()}/store/DeepReservation/${id}`))
          .then(response => {
            if (!response.ok) { KAIROS.error(`Réservation ${id} n'a pas pu être retrouvée après sa création`); return }
            response.json()
            .then(reservation => {
              newReservation.fromJson(reservation)
              .then(() => {
                newReservation.waitStop()
                newReservation.popMeUp()
              })
              .catch(reason => KAIROS.catch(reason))
            })
            .catch(reason => KAIROS.catch(reason))
          })
          .catch (reason => KAIROS.catch(reason))
        })
        .catch(reason => KAIROS.catch(reason))
      })
      .catch(reason => KAIROS.catch(reason, 'Erreur de création de la réservation'))
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
      if (Array.isArray(t)) {
        return t[0]
      }

      return t
    },

    _getDateRangeAttr: function () {
      return this.sup.getDateRange()
    },
  
    resize: function () {
      this.modified = true
      this.domNode.dataset.refresh = 'outdated'
    },
    _resizeChild: function () {
      this.entries.forEach(e => {
        e.resize()
      })
    },

    _resize: function () {
      if (!this.modified) {
        return
      }
      this.overlap()
      this.view.rectangle = getElementRect(this.domNode)
      this._resizeChild()
      this.modified = false
      this.domNode.dataset.refresh = 'fresh'
    },

    _setSupAttr: function (sup) {
      this.sup = sup
    },

    _startWait: function () {
    },

    _stopWait: function () {
    },

    _setError: function () {
      KAIROSAnim.push(() => { this.domNode.classList.add('error') })
    },
    _resetError: function () {
      KAIROSAnim.push(() => { this.domNOde.classList.remove('error') })
    },

    overlap: function () {
      let entries
      if (arguments[0]) { entries = arguments[0] } else {
        entries = []
        this.entries.forEach(entry =>{
          if (entry.deleted) {
            this.removeEntry(entry)
            return
          }
          Object.assign(entry.overlap, { elements: [], level: 0, order: 0, do: false })
          entries.push(entry)
        })
      }

      /* Overlap entries, good enough for now */
      var overlapRoot = []
      for (var i = 0; i < entries.length; i++) {
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

    display: function (yes = true) {
      if (!yes) {
        this.domNode.classList.add('nodisplay')
      } else {
        this.domNode.classList.remove('nodisplay')
      }
    },

    openReservation: function (id) {
      if (this.entries.has(id)) {
        this.entries.get(id).popMeUp()
        return true
      }
      for (const entry of this.entries) {
        if (entry.uid === id || entry.id === id || entry.uuid === id) {
          entry.popMeUp()
          return true
        }
      }
      return false
    },

    destroyReservation: function (reservation) {
      return new Promise((resolve, reject) => {
        if (!reservation) { resolve(); return }
        const id = reservation.uuid || reservation.uid || reservation.id
        this.entries.delete(id)
        reservation.destroy()
        .then(() => {
          resolve()
        })
      })
    },

    _getActiveReservationsAttr: function () {
      var active = []
      for (const entry of this.entries) {
        if (entry.get('active')) {
          active.push(entry)
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
