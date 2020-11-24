/* eslint-env amd, browser */
/* global DoWait, Holiday, compareDate, hideTooltip, showTooltip, MButton */
/* eslint no-template-curly-in-string: "off" */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/Evented',
  'artnum/Path',
  'artnum/Query',
  'artnum/Doc',
  'location/card'
], function (
  djDeclare,
  _dtWidgetBase,
  djEvented,
  Path,
  Query,
  Doc,
  Card
) {
  return djDeclare('location/count', [ _dtWidgetBase, djEvented ], {
    constructor: function () {
      this.inherited(arguments)
      this.Arguments = arguments
      this.Days = {}
      this.Current = {begin: null, end: null, canton: 'vs'}
      var args = arguments
      this.AddReservationToCount = null
      if (arguments[0] && arguments[0].reservation) {
        this.AddReservationToCount = arguments[0].reservation
      }
      this._initialized = new Promise(async function (resolve, reject) {
        var units = await Query.exec(Path.url('store/Unit'))
        if (units.success && units.length > 0) {
          this.set('units', units.data)
        } else {
          this.set('units', [])
        }

        var articles = await Query.exec(Path.url('store/Article'))
        if (articles.success && articles.length > 0) {
          this.set('articles', articles.data)
        } else {
          this.set('articles', [])
        }
        var data
        var create = true
        if (args[0]['data-id']) {
          data = await Query.exec(Path.url('store/Count/' + args[0]['data-id']))
          if (data.length === 1) {
            this.set('data', data.data)
            this.set('data-id', data.data.id)
            create = false
            resolve()
          }
        }

        if (create) {
          data = await Query.exec(Path.url('store/Count'), {method: 'post', body: JSON.stringify({date: new Date().toISOString()})})
          if (data.success) {
            data = await Query.exec(Path.url('store/Count/' + data.data[0].id))
            if (data.length === 1) {
              this.set('data', data.data)
              this.set('data-id', data.data.id)
              resolve()
            }
          }
        }

        var r = []
        var url = Path.url('store/CountReservation')
        url.searchParams.set('search.count', this.get('data-id'))
        data = await Query.exec(url)
        if (data.success && data.length > 0) {
          var deleted = []
          let H = new Holiday()
          for (let i = 0; i < data.length; i++) {
            r.push(data.data[i].reservation)
            Query.exec(Path.url(`store/Reservation/${data.data[i].reservation}`)).then((_r) => {
              if (_r.success && _r.length === 1) {
                let days = H.bdays(new Date(_r.data.begin), new Date(_r.data.end), this.data.canton ? this.data.canton : 'vs')
                this.Days[data.data[i].reservation] = {begin: new Date(_r.data.begin), end: new Date(_r.data.end), days: days, effectiveBegin: new Date(_r.data.begin), effectiveEnd: new Date(_r.data.end)}
              }
            })
          }
          if (this.AddReservationToCount && r.indexOf(this.AddReservationToCount) < 0) { r.push(this.AddReservationToCount) }
          this.set('reservations', r)
          this.set('deleted-reservation', deleted)
        } else {
          if (this.AddReservationToCount) {
            r.push(this.AddReservationToCount)
          }
          this.set('reservations', r)
          this.set('deleted-reservation', [])
        }

        if (this.get('data').invoice) {
          if (this.get('data')._invoice.address) {
            this.set('address-id', this.get('data')._invoice.address)
          }
        }

        this.refresh_contacts()
        this.start(arguments)
      }.bind(this))
    },

    refresh_contacts: async function () {
      var contacts = {}
      if (this.get('reservations').length > 0) {
        var r = this.get('reservations')

        for (var i = 0; i < r.length; i++) {
          var url = Path.url('store/ReservationContact')
          url.searchParams.set('search.comment:1', '_facturation')
          url.searchParams.set('search.comment:2', '_client')
          url.searchParams.set('search.reservation', r[i])
          url.searchParams.set('search._rules', '(comment:1 OR comment:2) AND reservation')
          var data = await Query.exec(url)
          if (data.success && data.length > 0) {
            for (var j = 0; j < data.length; j++) {
              if (data.data[j].freeform) {
                if (!contacts[data.data[j].id]) {
                  contacts[data.data[j].id] = new Card()
                  contacts[data.data[j].id].set('type', data.data[j].comment)
                  contacts[data.data[j].id].entry(data.data[j])
                }
              } else {
                var contact = await Query.exec(Path.url('store/' + data.data[j].target))
                if (contact.success && contact.length === 1) {
                  contacts[data.data[j].id] = new Card()
                  contacts[data.data[j].id].set('type', data.data[j].comment)
                  contacts[data.data[j].id].entry(contact.data[0])
                }
              }
            }
          }
        }
      }
      this.set('contacts', contacts)
    },

    draw_contacts: async function () {
      await this.refresh_contacts()

      var cfield = null
      var inform = this.form_invoice.getElementsByTagName('FIELDSET')
      for (var i = 0; i < inform.length; i++) {
        if (inform[i].getAttribute('name') === 'contacts') {
          cfield = inform[i]
        }
      }

      var contacts = this.get('contacts')
      var frag = document.createDocumentFragment()
      frag.appendChild(document.createElement('LEGEND'))
      frag.firstChild.appendChild(document.createTextNode('Addresse de facturation'))
      let defaultAddr = null
      let addrSelected = false
      for (i in contacts) {
        if (defaultAddr === null && contacts[i].get('type') === '_client') {
          defaultAddr = contacts[i]
        }
        if (defaultAddr === null && contacts[i].get('type') === '_facturation') {
          defaultAddr = contacts[i]
        }
        if (
          defaultAddr !== null &&
            defaultAddr.get('type') !== '_facturation' &&
            contacts[i].get('type') === '_facturation'
        ) {
          defaultAddr = contacts[i]
        }
        frag.appendChild(contacts[i].domNode)
        contacts[i].domNode.setAttribute('data-address-id', i)
        if (i === this.get('address-id')) {
          contacts[i].domNode.setAttribute('data-selected', '1')
          addrSelected = true
        }
        if (Object.keys(contacts).length > 1) {
          contacts[i].domNode.addEventListener('click', function (event) {
            var node = event.target
            while (!node.getAttribute('data-address-id')) {
              node = node.parentNode
            }

            this.set('address-id', node.getAttribute('data-address-id'))

            var div = node
            for (node = node.parentNode.firstChild; node; node = node.nextSibling) {
              node.removeAttribute('data-selected')
            }
            div.setAttribute('data-selected', '1')
          }.bind(this))
        }
      }
      if (!addrSelected && defaultAddr !== null) {
        this.set('address-id', i)
        defaultAddr.domNode.dataset.selected = 1
      }

      window.requestAnimationFrame(function () {
        cfield.innerHTML = ''
        cfield.appendChild(frag)
      })
    },

    _toInputDate: function (date) {
      var x = new Date(date)
      x = x.toISOString()
      return x.split('T')[0]
    },

    _toHtmlDate: function (date) {
      var x = new Date(date)
      return x.getDate() + '.' + (x.getMonth() + 1 < 10 ? '0' + String(x.getMonth() + 1) : String(x.getMonth() + 1)) + '.' + String(x.getYear() - 100)
    },

    _shortDesc: function (text) {
      var x = text.replace(/(?:[\r\n]+)/g, ', ')
      if (x.length > 30) {
        x = x.substr(0, 30)
        x += ' ...'
      }
      return x
    },

    _toHtmlRange: function (d1, d2) {
      if (d1 || d2) {
        return (d1 ? this._toHtmlDate(d1) : '') + ' - ' + (d2 ? this._toHtmlDate(d2) : '')
      }

      return ''
    },

    setCanton: function (canton) {
      let selects = this.domNode.getElementsByTagName('SELECT')
      for (let i = 0; i < selects.length; i++) {
        if (selects[i].name === 'canton') {
          selects[i].value = canton
          break
        }
      }
    },

    addReservation: async function (reservation) {
      var url = Path.url('store/CountReservation')
      url.searchParams.set('search.count', this.get('data-id'))
      url.searchParams.set('search.reservation', reservation)
      var link = await Query.exec(url)
      if (link.success && link.length <= 0) {
        var rData = Query.exec(Path.url('store/Reservation/' + reservation))
        var res = await Query.exec(Path.url('store/CountReservation'), {method: 'post', body: JSON.stringify({reservation: reservation, count: this.get('data-id')})})
        if (res.success) {
          var r = this.get('reservations')
          if (r.indexOf(reservation) < 0) {
            r.push(reservation)
            this.set('reservations', r)
          }
        }

        rData.then(async function (result) {
          let H = new Holiday()
          if (result.success && result.length === 1) {
            let state = 'vs'
            if (/^PC\/[0-9a-f]{32,32}$/.test(result.data.locality)) {
              let locality = await Query.exec(Path.url(`store/${result.data.locality}`))
              if (locality.success && locality.length === 1) {
                state = locality.data.state.toLowerCase()
              }
            }
            if (!this.get('data').canton) {
              this.setCanton(state)
              this.data.canton = state
            }
            var unit = this.get('units').find(x => x.default > 0).id
            var days = H.bdays(new Date(result.data.begin), new Date(result.data.end), H.hasState(state) ? state : 'vs')
            this.Days[r] = {begin: new Date(result.data.begin), end: new Date(result.data.end), days: days, effectiveBegin: new Date(result.data.begin), effectiveEnd: new Date(result.data.end)}
            this.tbody.insertBefore(this.centry({reservation: reservation, reference: result.data.target, unit: unit, quantity: days, state: state}, true), this.tbody.firstChild)
          }
        }.bind(this))
      }
    },

    deleteCount: function (countId) {
      return new Promise(function (resolve, reject) {
        Promise.all([
          Query.exec(Path.url('store/CountReservation', {params: {'search.count': countId}})),
          Query.exec(Path.url('store/Centry', {params: {'search.count': countId}}))
        ]).then(function (results) {
          var subres = []
          for (var i = 0; i < results.length; i++) {
            if (results[i].success && results[i].length > 0) {
              for (var j = 0; j < results[i].length; j++) {
                subres.push(Query.exec(Path.url((i === 0 ? 'store/CountReservation/' : 'store/Centry/') + results[i].data[j].id), {method: 'DELETE'}))
              }
            }
          }
          Promise.all(subres).then(() => {
            Query.exec(Path.url('store/Count/' + countId), {method: 'DELETE'}).then(function (result) {
              if (result.success) {
                window.GEvent('count.count-deleted', {id: countId})
                resolve()
              } else {
                reject(new Error('Delete failed'))
              }
            }, () => reject(new Error('Delete query failed')))
          }, () => reject(new Error('Sub delete failed')))
        }, () => reject(new Error('Sub delete query failed')))
      })
    },

    deleteReservation: function (countId, reservationId) {
      return new Promise(async function (resolve, reject) {
        var result = await Query.exec(Path.url('store/CountReservation', {params: {'search.count': countId}}))

        if (result.success && result.length === 1) {
          if (confirm('Ce décompte ne contient qu\'une résarvation. Voulez-vous supprimer le décompte ?')) {
            this.deleteCount().then(function () {
              resolve('count-deleted')
            }, () => reject(new Error(`Suppression de la réservation ${countId} échouée`)))
            return
          } else {
            resolve('user-cancel')
            return
          }
        }

        Promise.all([
          Query.exec(Path.url('store/CountReservation', {params: {'search.count': countId, 'search.reservation': reservationId}})),
          Query.exec(Path.url('store/Centry', {params: {'search.count': countId, 'search.reservation': reservationId}}))
        ]).then(function (results) {
          if (results[1].success && results[0].success && results[0].length === 1) {
            var all = []
            var centryDeleted = []
            for (var i = 0; i < results[1].length; i++) {
              all.push(Query.exec(Path.url('store/Centry/' + results[1].data[i].id), {method: 'DELETE'}))
              centryDeleted.push(results[1].data[i].id)
            }
            Promise.all(all).then(function (results2) {
              var s = 'success'
              for (i = 0; i < results2.length; i++) {
                if (!results2[i].success) {
                  s = 'success-with-errors'
                  break
                }
              }
              Query.exec(Path.url('store/CountReservation/' + results[0].data[0].id), {method: 'DELETE'}).then(function (result) {
                if (result.success) {
                  window.GEvent('count.reservation-deleted', {id: countId, reservation: reservationId})
                  resolve(s)
                }
              })
            })
          } else {
            reject(new Error(`Erreur de traitement de la suppression de la réseravtion ${reservationId}`))
          }
        }, () => reject(new Error(`Requête échouée pour les sous-éléments du décompte ${countId} durant la suppression de la réservation ${reservationId}`)))
      }.bind(this))
    },

    getReservations: async function () {
      var r = this.get('reservations')
      var reservations = []
      for (var i = 0; i < r.length; i++) {
        var x = await Query.exec(Path.url('store/DeepReservation/' + r[i]))
        if (x.success && x.length) {
          x = x.data
          x.state = 'vs'
          if (x.locality) {
            if (/^PC\/[0-9a-f]{32,32}$/.test(x.locality) || /^Warehouse\/[a-zA-Z0-9]*$/.test(x.locality)) {
              let locality = await Query.exec(Path.url(`store/${x.locality}`))
              if (locality.success && locality.length === 1) {
                locality = locality.data
                if (locality.np) {
                  x.locality = `${locality.np} ${locality.name} (${locality.state.toUpperCase()})`
                  x.canton = locality.state
                } else {
                  x.locality = `Dépôt ${locality.name}`
                }
              }
            }
            if (x.address && x.address.length > 0) {
              x.address = x.address.trim() + ', ' + x.locality.trim()
            } else {
              x.address = x.locality.trim()
            }
          }
          if (!x.reference && x.address) {
            x.reference = x.address
          } else if (x.reference && x.address) {
            x.reference = x.reference + ' / ' + x.address.split('\n').join(', ')
          }
          reservations.push(x)
        }
      }

      return reservations
    },

    start: async function () {
      this.doc = new Doc({width: window.innerWidth - 740, style: 'background-color: #FFFFCF'})
      this.doc.close.closableIdx = KAIROS.stackClosable(this.doc.close.bind(this.doc))
      this.doc.addEventListener('close', (event) => { 
        KAIROS.removeClosableByIdx(this.doc.close.bind(this.doc.close.closableIdx))
      })
      this.Total = 0
      this.Entries = {}
      window.GEvent.listen('count.count-deleted', function (event) {
        if (String(this.get('data-id')) === String(event.detail.id)) {
          this.doc.close()
        }
      }.bind(this))

      window.GEvent.listen('count.reservation-deleted', function (event) {
        var id = String(event.detail.reservation)
        var r = this.get('reservations')
        var i = r.indexOf(id)
        if (i > -1) {
          r.splice(i, 1)
        }
        this.set('reservation', r)

        var selects = this.domNode.getElementsByTagName('SELECT')
        for (let i = 0; i < selects.length; i++) {
          if (selects[i].getAttribute('name') === 'reservation') {
            if (r.length === 1) {
              window.requestAnimationFrame(() => selects[i].parentNode.removeChild(selects[i]))
            } else {
              let n = selects[i].firstElementChild
              for (; n; n = n.nextElementSibling) {
                if (n.value === id) {
                  window.requestAnimationFrame(() => n.parentNode.removeChild(n))
                }
              }
            }
          }
        }

        ;['DIV', 'SPAN', 'TR'].forEach(function (nt) {
          let nodes = this.domNode.getElementsByTagName(nt)
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].getAttribute('data-reservation-id') === id) {
              window.requestAnimationFrame(() => nodes[i].parentNode.removeChild(nodes[i]))
            }
          }
        }.bind(this))
      }.bind(this))

      var reservations = await this.getReservations()
      var references = '<fieldset name="reference"><legend>Référence</legend>'
      var begin = null
      var end = null
      var machines = []
      let refs = []
      if (reservations.length > 0) {
        for (var i = 0; i < reservations.length; i++) {
          if (machines.indexOf(reservations[i].target) === -1) {
            machines.push(reservations[i].target)
          }
          if (reservations[i].reference) {
            refs.push(`<div class="reference" data-action="select-reference" data-reservation-id="${reservations[i].id}" data-reference-value="${reservations[i].reference}"><b>Rés. ${reservations[i].id}</b>&nbsp;: ${reservations[i].reference}</div>`)
          }
          if (begin === null || (new Date(begin)).getTime() > (new Date(reservations[i].begin)).getTime) {
            begin = reservations[i].begin
          }
          if (end === null || (new Date(end)).getTime() < (new Date(reservations[i].end)).getTime) {
            end = reservations[i].end
          }
        }
      }
      if (refs.length > 0) {
        references += refs.join('<span class="separator"> | </span>')
        references += '<br />'
      }
      if (reservations.length === 1 && !this.get('data').reference) {
        references += `<input type="text" name="reference" value="${reservations[0].reference ? reservations[0].reference : ''}"></fieldset>`
      } else {
        references += `<input type="text" name="reference" value="${(this.get('data').reference ? this.get('data').reference : '')}"></fieldset>`
      }

      var div = document.createElement('DIV')
      div.setAttribute('class', 'DocCount')

      var htmlReservation = []
      this.get('reservations').forEach(function (r) {
        htmlReservation.push(`<span class="button" data-action="open-reservation" data-reservation-id="${r}">${r}<span data-action="delete-reservation"><i class="fas fa-trash"> </i></span></span>`)
      })
      this.get('deleted-reservation').forEach(function (d) {
        htmlReservation.push(`<span class="button deleted" data-action="open-reservation" data-reservation-id="${d}"><del>${d}</del><span data-action="delete-reservation"><i class="fas fa-trash"> </i></span></span>`)
      })

      var allStatus = await Query.exec(Path.url('store/Status', {params: {'search.type': 2}}))
      var txtStatus = ''
      if (allStatus.success && allStatus.length > 0) {
        txtStatus = '<label for="status">Statut</label><select form="details" name="status">'
        allStatus.data.forEach(function (s) {
          var checked = ''
          if (this.get('data').status && String(this.get('data').status) === String(s.id)) {
            checked = 'selected'
          }
          txtStatus += `<option value="${s.id}" ${checked}>${s.name}</option>`
        }.bind(this))
        txtStatus += '</select><br/>'
      }
      var domStatus = document.createRange().createContextualFragment(txtStatus)

      div.innerHTML = `<h1>Décompte N°${String(this.get('data-id'))}</h1><form name="details"><ul>
        <li><span data-action="add-invoice">${(this.get('data').invoice && (this.get('data')._invoice.winbiz) ? 'Facture N°' + this.get('data')._invoice.winbiz : ' <i class="fas fa-plus-circle"> </i> Ajouter une facture')}</span></li>
        <li>Réservation : ${(htmlReservation.length > 0 ? htmlReservation.join(' ') : '')} <span data-action="add-reservation"> <i class="fas fa-plus-circle"> </i> Ajouter une réservation</span></li>
        <li>Machine : ${(machines.length > 0 ? machines.join(', ') : '')}</li>
        ${(this.get('data').printed ? '<li>Dernière impression : ' + this._toHtmlDate(this.get('data').printed) + '</li>' : '')}</ul>
        <fieldset><legend>Période</legend><label for="begin">Début</label>
        <input type="date" value="${(this.get('data').begin ? this._toInputDate(this.get('data').begin) : this._toInputDate(begin))}" name="begin" /><label for="end">Fin</label>
        <input type="date" name="end" value="${(this.get('data').end ? this._toInputDate(this.get('data').end) : this._toInputDate(end))}" />
        <label for="state"> Final <input type="checkbox" ${this.get('data').state === 'FINAL' ? 'checked' : ''} name="state"/></label>
        <label for="canton">Feriés : <select name="canton">
        <option value="vs">Valais</option>
        <option value="vd">Vaud</option>
        <option value="ge">Genève</option>
        <option value="fr">Fribourg (catholique)</option>
        <option value="fr-prot">Fribourg (protestant)</option>
        <option value="ne">Neuchâtel</option>
        <option value="be">Berne</option>
        <option value="ju">Jura</option>
        </select>
        </fieldset>
        <label for="comment">Communication client</label><textarea name="comment">${(this.get('data').comment ? this.get('data').comment : '')}</textarea>${references}</form>
        <form name="invoice" ${(this.get('data').invoice ? ' data-invoice="' + this.get('data').invoice + '" ' : '')}><fieldset name="contacts"><fieldset></form>`

      div.addEventListener('change', (event) => {
        switch (event.target.name) {
          case 'begin':
          case 'end':
          case 'canton':
            let begin = event.target.parentNode.querySelector('input[name="begin"]')
            let end = event.target.parentNode.querySelector('input[name="end"]')
            let canton = event.target.parentNode.querySelector('select[name="canton"]')

            if (begin && begin.value) {
              this.Current.begin = new Date(begin.value)
              for (let k in this.Days) {
                if (compareDate(this.Days[k].begin, this.Current.begin) <= 0) {
                  this.Days[k].effectiveBegin = this.Current.begin
                } else {
                  this.Days[k].days = -1
                }
              }
            }
            if (end && end.value) {
              this.Current.end = new Date(end.value)
              for (let k in this.Days) {
                if (compareDate(this.Days[k].end, this.Current.end) >= 0) {
                  this.Days[k].effectiveEnd = this.Current.end
                } else {
                  this.Days[k].days = -1
                }
              }
            }
            this.Current.canton = canton.value
            let H = new Holiday()
            for (let k in this.Days) {
              if (this.Days[k].days !== -1) {
                this.Days[k].days = H.bdays(this.Days[k].effectiveBegin, this.Days[k].effectiveEnd, this.Current.canton)
              }
            }
            break
        }
      })

      let selects = div.getElementsByTagName('select')
      for (let i = 0; i < selects.length; i++) {
        if (selects[i].name === 'canton') {
          /* for Fribourg, default to catholique Fribourg */
          selects[i].value = this.get('data').canton
          break
        }
      }

      div.addEventListener('click', async function (event) {
        var node = event.target
        while (node && node.getAttribute) {
          if (node.getAttribute('data-action')) {
            break
          }
          node = node.parentNode
        }
        if (!node || !node.getAttribute) {
          return
        }
        switch (node.dataset.action) {
          case 'open-reservation':
            if (node.dataset.reservationId) {
              window.GEvent('reservation.open', {id: node.dataset.reservationId})
            }
            break
          case 'delete-reservation':
            DoWait()
            var id
            if (node.dataset.reservationId) {
              id = node.dataset.reservationId
            } else {
              var n = node.parentNode
              while (n && !n.dataset.reservationId) { n = n.parentNode }
              id = n.dataset.reservationId
            }

            this.deleteReservation(this.get('data-id'), id).then(function (result) {
              if (result.type === 'success-with-error' || result.type === 'success') {
                if (result.type === 'success-with-error') {
                  window.App.warn('Des erreurs bégnines se sont produites durant la suppression')
                }
                while (node && !node.classList.contains('button')) { node = node.parentNode }
                window.requestAnimationFrame(function () {
                  node.parentNode.removeChild(node)
                })
              } else if (result.type === 'count-deleted') {
                this.doc.close()
                window.GEvent('count.count-deleted', {id: result.id})
              }
              DoWait(false)
            }, (error) => { DoWait(false); window.App.error(error.message) })
            break
          case 'select-reference':
            if (node.getAttribute('data-reference-value')) {
              var value = node.getAttribute('data-reference-value')
              while (node.tagName !== 'INPUT') { node = node.nextSibling }
              node.value = value
            }
            break
          case 'add-reservation':
            this.manAddReservation(event)
            break
          case 'add-invoice':
            this.manAddInvoice(event)
            break
        }
      }.bind(this))

      this.domNode = div
      this.table = document.createElement('TABLE')

      div.appendChild(this.table)
      this.doc.content(this.domNode)
      div.lastChild.focus()

      this.thead = document.createElement('THEAD')
      this.thead.innerHTML = '<tr><td class="short">Réservation</td><td class="short">Référence</td><td class="long">Description</td><td class="short">Quantité</td><td class="short">Unité</td><td class="short">Prix</td><td class="short">Rabais</td><td class="short">Total</td><td></td></tr>'
      this.tbody = document.createElement('TBODY')
      this.tfoot = document.createElement('TFOOT')

      this.table.appendChild(this.thead)
      this.table.appendChild(this.tbody)
      this.table.appendChild(this.tfoot)

      div.appendChild(domStatus)

      var save = document.createElement('button')
      save.innerHTML = 'Sauvegarder'
      let sButton = new MButton(save)
      sButton.addEventListener('click', this.save.bind(this))

      var saveQuit = document.createElement('button')
      saveQuit.innerHTML = 'Sauvegarder et quitter'
      let sqButton = new MButton(saveQuit)
      sqButton.addEventListener('click', this.saveQuit.bind(this))

      var print = document.createElement('button')
      print.innerHTML = 'Imprimer'
      let pButton = new MButton(print, [
        {label: 'Afficher', events: {click: () => this.print()}}
      ])
      pButton.addEventListener('click', () => this.autoPrint('count'))

      var del = document.createElement('button')
      del.innerHTML = 'Supprimer'
      del.setAttribute('style', 'float: right')

      let dButton = new MButton(del)
      dButton.addEventListener('click', function () {
        if (confirm(`Confirmez la suppression du décompte ${this.get('data-id')}`)) {
          DoWait()
          this.deleteCount(this.get('data-id')).then(function () {
            this.doc.close()
            DoWait(false)
          }.bind(this), () => {
            DoWait(false)
            window.App.error('Erreur de suppression du décompte')
          })
        }
      }.bind(this))
      this.domNode.appendChild(del)
      this.domNode.appendChild(save)
      this.domNode.appendChild(saveQuit)
      this.domNode.appendChild(print)

      this.refresh().then(function () {
        if (this.AddReservationToCount) {
          this.addReservation(this.AddReservationToCount)
        }
      }.bind(this))

      var forms = this.domNode.getElementsByTagName('FORM')
      for (i = 0; i < forms.length; i++) {
        forms[i].addEventListener('submit', this.save.bind(this))
        this['form_' + forms[i].getAttribute('name')] = forms[i]
      }
    },

    refresh: async function () {
      this.hideChanges()
      return new Promise(function (resolve, reject) {
        this.Total = 0
        var url = Path.url('store/Centry')
        url.searchParams.set('search.count', this.get('data-id'))
        Query.exec(url).then(function (result) {
          var trs = this.tbody.getElementsByTagName('TR')
          if (result.length > 0) {
            for (var i = 0; i < result.length; i++) {
              var replace = null
              for (var j = 0; j < trs.length; j++) {
                if (trs[j].getAttribute('data-id') === result.data[i].id) {
                  replace = trs[j]
                  break
                }
              }
              if (replace) {
                this.tbody.replaceChild(this.centry(result.data[i]), replace)
              } else {
                this.tbody.appendChild(this.centry(result.data[i]))
              }
            }
          }
          this.newEmpty()
          this.tfoot.innerHTML = `<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td name="total">${String(this.Total).toMoney()}</td></tr>`
          resolve()
        }.bind(this))
        this.draw_contacts()
      }.bind(this))
    },

    centry: function (value, edit = false) {
      var tr = document.createElement('TR')
      if (value.id) {
        tr.setAttribute('data-id', value.id)
        this.Entries[value.id] = value
      } else {
        tr.setAttribute('data-id', '')
      }
      if (value.reservation) {
        tr.setAttribute('data-reservation-id', value.reservation)
      }
      tr.setAttribute('tabindex', '0')

      if (!value.total) {
        value.total = parseFloat((value.price ? parseFloat(value.price) : 0) * (value.quantity ? parseFloat(value.quantity) : 1))
      } else {
        value.total = parseFloat(value.total)
      }

      this.Total += value.total

      if (!edit) {
        var unit = ''
        if (value.unit) {
          this.get('units').forEach(function (u) {
            if (u.id === value.unit) {
              if (value.quantity > 1) {
                unit = u.names
              } else {
                unit = u.name
              }
            }
          })
        }
        let desc = ''
        if (value.description) {
          desc = value.description.split('\n')
          if (desc[desc.length - 1] === '') { desc.pop() }
          desc = desc.join(', ')
        }
        var txt = '<td>' + String(value.reservation ? value.reservation : '') + '</td><td>' +
            String(value.reference ? value.reference : '').html() + '</td><td>' + desc.html() + '</td><td>' +
            String(value.quantity ? value.quantity : '-').html() + '</td><td>' +
            String(unit).html() + '</td><td>' + String(value.price ? String(value.price).toMoney() : '').html() + '</td><td>' +
          String(value.discount ? value.discount + '%' : '').html() + '</td><td>' +
            String(value.total ? String(value.total).toMoney() : '').html() + '</td><td><i class="far fa-trash-alt action" data-op="delete"></i></td>'
        tr.addEventListener('focus', this.edit.bind(this))
        tr.addEventListener('blur', (event) => {
          if (event.target.name === 'unit') {
            /* UNIT */
          }
        }, {passive: true, capture: true})
      } else {
        var reservations = this.get('reservations')
        if (reservations.length > 1) {
          var rselect = '<select name="reservation"><option value=""></option>'
          reservations.forEach(function (r) {
            var selected = ''
            if (r === value.reservation) {
              selected = 'selected'
            }
            rselect += '<option value="' + r + '" ' + selected + '>' + r + '</option>'
          })
          rselect += '</select>'
        } else {
          rselect = reservations[0]
        }

        var units = '<select name="unit"><option value=""></option>'
        var optgroups = {}
        this.get('units').forEach(function (u) {
          var str = ''
          var selected = ''
          if (u.id === value.unit) {
            selected = 'selected'
          }
          str = '<option value="' + u.id + '" ' + selected + '>' + u.name + (u.symbol ? ' [' + u.symbol + ']' : '') + '</option>'
          if (u.collection) {
            if (!optgroups[u.collection]) {
              optgroups[u.collection] = document.createElement('OPTGROUP')
              optgroups[u.collection].setAttribute('label', u._collection.name)
            }
            optgroups[u.collection].innerHTML += str
          } else {
            units += str
          }
        })
        for (var opts in optgroups) {
          units += optgroups[opts].outerHTML
        }
        units += '</select>'
        txt = `<td>${rselect}</td><td><input class="number" name="reference" type="text" value="${String(value.reference ? value.reference : '').html()}" /><td><textarea rows="1" name="description">${String(value.description ? value.description : '').html()}</textarea></td><td><input step="any" onwheel="this.blur()" name="quantity" type="number" lang="en" value="${String(value.quantity ? value.quantity : '').html()}" /></td><td>${units}</td><td><input name="price" lang="en" onwheel="this.blur()" step="any" type="number" value="${String(value.price ? value.price : '').html()}" /></td><td><input name="discount" lang="en" step="any" type="number" onwheel="this.blur()" value="${String(value.discount ? value.discount : '').html()}" /></td><td><input onwheel="this.blur()" lang="en" name="total" type="number" step="any" value="${String(value.total ? value.total : '').html()}" /></td><td><i class="far fa-trash-alt action" data-op="delete"></i></td>`
        tr.addEventListener('keypress', function (event) {
          if (event.key === 'Enter' && event.target.nodeName !== 'TEXTAREA') {
            this.save(event)
          }
        }.bind(this))
        tr.setAttribute('data-edit', '1')
        tr.addEventListener('focus', (event) => {
          if (event.target.name === 'quantity') {
            let tr = event.target
            while (tr && tr.nodeName !== 'TR') { tr = tr.parentNode }
            let rid = ''
            if (tr.dataset.reservationId) {
              rid = tr.dataset.reservationId
            } else {
              let s = tr.querySelector('select[name="reservation"]')
              if (s && s.value) {
                rid = s.value
              }
            }

            let tooltip = []
            if (rid !== '') {
              tooltip.push(`Réservation ${rid}: ${this.Days[rid].days} jours ouvré`)
            } else {
              for (let r in this.Days) {
                if (this.Days[r].days !== -1) {
                  tooltip.push(`Réservation ${r}: ${this.Days[r].days} jours ouvrés`)
                }
              }
            }
            showTooltip(event.target, tooltip.join('<br />'))
          }
        }, {capture: true})
        let groupClick = (event) => {
          if (event.target.nodeName === 'I' && event.target.classList.contains('fa-layer-group')) {
            let tr = event.target
            for (; tr && tr.nodeName !== 'TR'; tr = tr.parentNode) ;

            event.preventDefault()
            let incValue = 1
            if (event.type === 'contextmenu') { incValue = -1 }
            let node = event.target
            if (!this.lastGroupId) {
              this.lastGroupId = 1
            }
            let gidNode
            if (!tr.dataset.groupId) {
              gidNode = document.createElement('span')
              gidNode.classList.add('groupid')
              if (incValue < 0 && this.lastGroupId > 1) {
                this.lastGroupId--
              }
              tr.dataset.groupId = this.lastGroupId
              window.requestAnimationFrame(() => {
                gidNode.innerHTML = this.lastGroupId
                node.parentNode.insertBefore(gidNode, node.nextSibling)
              })
            } else {
              gidNode = node.nextElementSibling
              if (parseInt(tr.dataset.groupId) + incValue > 0) {
                tr.dataset.groupId = parseInt(tr.dataset.groupId) + incValue
              }
              window.requestAnimationFrame(() => {
                gidNode.innerHTML = tr.dataset.groupId
              })
              this.lastGroupId = tr.dataset.groupId
            }

            let tbody = tr
            for (; tbody && tbody.nodeName !== 'TBODY'; tbody = tbody.parentNode) ;
            let groupHead = tbody.firstElementChild
            for (; groupHead; groupHead = groupHead.nextSiblingElement) {
              if (groupHead.dataset.groupHead === tr.dataset.groupId) {
                break
              }
            }
            if (groupHead) {
              tbody.removeChild(tr)
              tbody.insertBefore(tr, groupHead.nextElementSibling)
            } else {
              let gH = document.createElement('TR')
              gH.innerHTML = `<tr><td>${tr.dataset.nodeId}</td><td colspan="5"><textarea></textarea></td><td><input type="text" /></td><td><input type="text" /></td><td></td>`
              gH.dataset.groupHead = tr.dataset.groupId
              tbody.insertBefore(gH, tr)
            }
          }
        }
        tr.addEventListener('click', groupClick)
        tr.addEventListener('contextmenu', groupClick)
        tr.addEventListener('blur', hideTooltip, {capture: true})
        tr.addEventListener('change', this.calculate.bind(this))
        tr.addEventListener('keyup', (event) => {
          if (event.keyCode < 32) { return }
          switch (event.target.name) {
            case 'price':
            case 'quantity':
            case 'discount':
            case 'total':
              this.calculate(event)
              break
          }
        })
      }

      tr.addEventListener('mousedown', this.click.bind(this))
      tr.innerHTML = txt

      var inputs = tr.getElementsByTagName('INPUT')
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('change', this.showChange.bind(this))
      }

      return tr
    },

    newEmpty: function () {
      var trs = this.tbody.getElementsByTagName('TR')
      var empty = false
      for (var i = trs.length - 1; i >= 0; i--) {
        if (trs[i].getAttribute('data-id') === '' && !trs[i].getAttribute('data-edit')) {
          empty = true
        }
      }

      if (!empty) {
        this.tbody.appendChild(this.centry({}, false))
      }
    },

    hideChanges: function () {
      if (this.Changed) {
        this.Changed.forEach(function (element) {
          if (element) {
            element.removeAttribute('data-changed')
          }
        })
        this.Changed = []
      }
    },

    showChange: function (event) {
      if (!this.Changed) {
        this.Changed = []
      }

      event.target.setAttribute('data-changed', '1')
      this.Changed.push(event.target)
    },

    edit: function (event) {
      var id = event.target.getAttribute('data-id')
      if (id) {
        var e = this.centry(this.Entries[id], true)
      } else {
        e = this.centry({}, true)
      }

      var old = event.target
      while (old.nodeName !== 'TR') {
        old = old.parentNode
      }
      var parent = old.parentNode
      parent.replaceChild(e, old)

      e.getElementsByTagName('INPUT')[0].focus()
      this.newEmpty()
    },

    delete: async function (event) {
      var parent = event.target
      while (parent.nodeName !== 'TR') {
        parent = parent.parentNode
      }

      var id = parent.getAttribute('data-id')
      if (id) {
        await Query.exec(Path.url('/store/Centry/' + id), {method: 'delete', body: JSON.stringify({id: id})})
      }
      parent.parentNode.removeChild(parent)
      this.refresh()
    },

    saveQuit: function (event) {
      return new Promise((resolve, reject) => {
        this.save(event).then(() => {
          this.doc.close()
          resolve()
        })
      })
    },

    save: async function (event) {
      if (event) { event.preventDefault() }
      var parent = this.tbody.firstChild
      while (parent) {
        if (!parent.getAttribute('data-edit')) {
          parent = parent.nextSibling
          continue
        }
        this.calculate({target: parent})
        var id = parent.getAttribute('data-id')

        var query = {count: this.get('data-id')}
        ;['INPUT', 'TEXTAREA', 'SELECT'].forEach((e) => {
          let inputs = parent.getElementsByTagName(e)
          for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].value) {
              query[inputs[i].name] = inputs[i].value
            } else {
              query[inputs[i].name] = null
            }
          }
        })

        if (!query.description && !query.quantity && !query.price && !query.total && !query.reference) {
          var remove = parent
          parent = parent.nextSibling
          remove.parentNode.removeChild(remove)
          continue
        }

        if (parseFloat(query.quantity) === 0) {
          remove = parent
          parent = parent.nextSibling
          remove.parentNode.removeChild(remove)
          if (id) {
            query = {id: id}
            await Query.exec(Path.url('store/Centry/' + id), {method: 'delete', body: JSON.stringify(query)})
          }
          continue
        }

        if (id) {
          query['id'] = id
          await Query.exec(Path.url('store/Centry/' + id), {method: 'put', body: JSON.stringify(query)})
        } else {
          var res = await Query.exec(Path.url('store/Centry'), {method: 'post', body: JSON.stringify(query)})
          if (res.length === 1) {
            parent.setAttribute('data-id', res.data[0].id)
          }
        }
        parent = parent.nextSibling
      }
      await this.refresh()

      query = {}
      ;['INPUT', 'SELECT'].forEach(function (element) {
        let inputs = this.form_invoice.getElementsByTagName(element)
        for (let i = 0; i < inputs.length; i++) {
          var val = inputs[i].value
          query[inputs[i].getAttribute('name')] = val
        }
      }.bind(this))
      var method = 'post'
      var url = 'store/Invoice'
      if (this.form_invoice.getAttribute('data-invoice')) {
        method = 'patch'
        query.id = this.form_invoice.getAttribute('data-invoice')
        url += '/' + query.id
      }

      if (this.get('address-id')) {
        query.address = this.get('address-id')
      }

      var invoice = await Query.exec(Path.url(url), {method: method, body: JSON.stringify(query)})

      query = {comment: this.form_details.getElementsByTagName('TEXTAREA')[0].value, total: this.Total, id: this.get('data-id'), reference: null}
      if (invoice.success && invoice.length > 0) {
        if (invoice.data[0].id) {
          query.invoice = invoice.data[0].id
          this.form_invoice.setAttribute('data-invoice', query.invoice)
        }
      }

      ;['INPUT', 'SELECT'].forEach(function (element) {
        let inputs = [...this.form_details.elements, ...document.querySelectorAll('*[form=details]')]
        for (let i = 0; i < inputs.length; i++) {
          var val = inputs[i].value
          if (!val) { continue }
          switch (inputs[i].getAttribute('name')) {
            case 'begin': case 'end':
              val = new Date(val).toISOString()
              break
            case 'state':
              val = inputs[i].checked ? 'FINAL' : 'INTERMEDIATE'
              break
          }
          query[inputs[i].getAttribute('name')] = val
        }
      }.bind(this))
      await Query.exec(Path.url('store/Count/' + this.get('data-id')), {method: 'patch', body: JSON.stringify(query)})
      this.get('reservations').forEach(function (r) {
        window.GEvent('count.reservation-add', {reservation: r})
      })
    },

    print: async function (event) {
      this.save(event).then(() => {
        window.open(Path.url('pdfs/count/' + this.get('data-id')))
      })
    },

    autoPrint: function (file, params = {}) {
      let type = params.forceType ? params.forceType : file
      return new Promise((resolve, reject) => {
        this.save().then(() => {
          Query.exec((Path.url('exec/auto-print.php', {
            params: {
              type: type, file: `pdfs/${file}/${this.get('data-id')}`
            }
          }))).then((result) => {
            if (result.success) {
              window.App.info(`Impression du décompte ${this.get('data-id')} en cours`)
              resolve()
            } else {
              window.App.error(`Erreur d'impression du décompte ${this.get('data-id')}`)
              reject(new Error('Print error'))
            }
          })
        })
      })
    },

    click: function (event) {
      switch (event.target.getAttribute('data-op')) {
        case '': default: break
        case 'delete':
          event.stopPropagation()
          this.delete(event)
          break
      }
    },
    manAddInvoice: function (event) {
      let input = document.createElement('input')
      input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          let body = {winbiz: event.target.value}
          let iId = this.get('data').invoice
          Query.exec(Path.url(`store/Invoice/${iId || ''}`), {method: iId ? 'PATCH' : 'POST', body: body}).then((res) => {
            if (res.length > 0) {
              let invoice = res.data[0].id
              Query.exec(Path.url(`store/Count/${this.get('data-id')}`), {method: 'PATCH', body: {id: this.get('data-id'), invoice: invoice}}).then((res) => {
                if (res.length > 0) {
                  this.doc.close()
                  delete this.id
                  this.constructor({'data-id': res.data[0].id})
                }
              })
            }
          })
        }
      })
      let p = event.target.parentNode
      window.requestAnimationFrame(() => {
        p.insertBefore(input, event.target)
        p.removeChild(event.target)
      })
    },
    manAddReservation: function (event) {
      let input = document.createElement('input')
      input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          let rId = event.target.value
          Query.exec(Path.url(`store/Reservation/${rId}`)).then((res) => {
            let cId = this.get('data-id')
            if (res.success && res.length > 0) {
              Query.exec(Path.url(`store/CountReservation`), {
                method: 'POST',
                body: JSON.stringify({reservation: rId, count: cId})
              }).then((result) => {
                if (result.success && result.length > 0) {
                  window.GEvent('count.reservation-add', {reservation: rId})
                  let s = document.createElement('SPAN')
                  s.dataset.action = 'open-reservation'
                  s.dataset.reservationId = rId
                  s.classList.add('button')
                  s.innerHTML = `${rId} <span data-action="delete-reservation"><i class="fas fa-trash"> </i></span>`
                  this.saveQuit().then(() => {
                    delete this.id
                    this.constructor({'data-id': cId})
                  })
                }
              })
            }
          })
        }
      })
      let p = event.target.parentNode
      window.requestAnimationFrame(() => {
        p.insertBefore(input, event.target)
      })
    },
    calculate: function (event) {
      var fix = function (value) {
        return Math.round(value * 100) / 100
      }
      var parent = event.target
      while (parent.nodeName !== 'TR') {
        parent = parent.parentNode
      }

      if (event.target.getAttribute('name') === 'quantity' ||
          event.target.getAttribute('name') === 'price' ||
          event.target.getAttribute('name') === 'total' ||
          event.target.getAttribute('name') === 'discount') {
        var q = -1
        var p = -1
        var discount = -1
        var totinput
        var priinput
        var inputs = parent.getElementsByTagName('INPUT')
        for (var i = 0; i < inputs.length; i++) {
          var input = inputs[i]
          if (input.getAttribute('name') === 'quantity') {
            if (input.value) {
              q = parseFloat(input.value)
            }
          }

          if (input.getAttribute('name') === 'price') {
            priinput = input
            if (input.value) {
              p = parseFloat(input.value)
              if (q === -1) {
                q = 1
                parent.querySelector('input[name="quantity"]').value = q
              }
            }
          }

          if (input.getAttribute('name') === 'discount') {
            if (input.value) {
              discount = parseFloat(input.value)
            }
          }

          if (input.getAttribute('name') === 'total') {
            totinput = input
          }
        }
        if (q !== -1 && p !== -1 && event.target.getAttribute('name') !== 'total') {
          if (discount !== -1) {
            discount = (100 - discount) / 100
          } else {
            discount = 1
          }
          totinput.setAttribute('value', String(fix(q * p * discount)))
        } else if (event.target.getAttribute('name') === 'total') {
          priinput.value = ''
        }
      }

      let totals = this.tbody.querySelectorAll('input[name="total"]')
      let grandTotal = 0
      for (let i = 0; i < totals.length; i++) {
        if (!isNaN(parseFloat(totals[i].value))) {
          grandTotal += parseFloat(totals[i].value)
        }
      }
      let total = this.tfoot.querySelector('td[name="total"]')
      total.innerHTML = String(grandTotal).toMoney()
    }
  })
})
