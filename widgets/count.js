/* eslint-env amd, browser */
/* global Artnum, Address, DoWait */
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
      var args = arguments
      this.addReservation = null
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

        if (args[0]['data-id'] === '*') {
          var url = Path.url('store/Count')
          url.searchParams.set('search.deleted', '-')

          var data = await Query.exec(url)
          this.set('data', data.data)
          this.list(args)
          resolve()
        } else {
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

          url = Path.url('store/CountReservation')
          url.searchParams.set('search.count', this.get('data-id'))
          data = await Query.exec(url)
          if (data.success && data.length > 0) {
            var r = []
            var deleted = []
            for (var i = 0; i < data.length; i++) {
              r.push(data.data[i].reservation)
            }
            this.set('reservations', r)
            this.set('deleted-reservation', deleted)
          } else {
            this.set('reservations', [])
            this.set('deleted-reservation', [])
          }

          if (this.get('data').invoice) {
            if (this.get('data')._invoice.address) {
              this.set('address-id', this.get('data')._invoice.address)
            }
          }

          this.refresh_contacts()
          if (args[0] && args[0].reservation) {
            await this.addReservation(args[0].reservation)
          }
          this.start(arguments)
        }
      }.bind(this))

      if (!this.eventTarget) {
        this.eventTarget = new EventTarget()
      }
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
                  contacts[data.data[j].id].entry(data.data[j])
                }
              } else {
                var contact = await Query.exec(Path.url('store/' + data.data[j].target))
                if (contact.success && contact.length === 1) {
                  contacts[data.data[j].id] = new Card()
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
      for (i in contacts) {
        frag.appendChild(contacts[i].domNode)
        contacts[i].domNode.setAttribute('data-address-id', i)
        if (i === this.get('address-id')) {
          contacts[i].domNode.setAttribute('data-selected', '1')
        } else {
          if (Object.keys(contacts).length === 1) {
            this.set('address-id', i)
            contacts[i].domNode.dataset.selected = 1
          }
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

    addReservation: async function (reservation) {
      var url = Path.url('store/CountReservation')
      url.searchParams.set('search.count', this.get('data-id'))
      url.searchParams.set('search.reservation', reservation)
      var link = await Query.exec(url)
      if (link.success && link.length <= 0) {
        var res = await Query.exec(Path.url('store/CountReservation'), {method: 'post', body: JSON.stringify({reservation: reservation, count: this.get('data-id')})})
        if (res.success) {
          var r = this.get('reservations')
          r.push(reservation)
          this.set('reservations', r)
        }
      }
    },

    list: async function () {
      this.doc = new Doc({width: window.innerWidth - 740, style: 'background-color: #FFFFCF;'})
      this.doc.addEventListener('close', function (event) { window.location.hash = '' })
      var div = document.createElement('DIV')
      div.setAttribute('class', 'DocCount')
      window.GEvent.listen('count.count-deleted', function (event) {
        var id = String(event.detail.id)
        var tbody = this.domNode.getElementsByTagName('TBODY')[0]
        var node = tbody.firstElementChild
        for (; node; node = node.nextElementSibling) {
          if (node.getAttribute('data-count-id') === id) {
            break
          }
        }
        if (node) {
          window.requestAnimationFrame(() => node.parentNode.removeChild(node))
        }
      }.bind(this))

      this.domNode = div

      var txt = '<h1>Liste de décompte</h1><table>' +
        '<thead><tr><th data-sort-type="integer">N°</th><th>Facture</th><th>Réservation</th><th>Statut</th><th>Période</th><th>Référence client</th><th>Client</th><th>Remarque</th><th>Montant</th><th>Impression</th><th data-sort-type="no"></th></tr></thead>' +
          '<tbody></tbody></table>'
      this.domNode.innerHTML = txt
      var Tbody = this.domNode.getElementsByTagName('TBODY')[0]
      var Table = this.domNode.getElementsByTagName('TABLE')[0]
      this.dtable = new Artnum.DTable({table: Table, sortOnly: true})

      var data = this.get('data')
      var url = Path.url('store/CountReservation')
      var _clients = {}
      for (let i = 0; i < data.length; i++) {
        setTimeout(function () {
          var clients = []
          url.searchParams.set('search.count', data[i].id)
          Query.exec(url).then(async function (reservations) {
            if (reservations.success && reservations.length > 0) {
              reservations._table = []
              clients = []
              for (var j = 0; j < reservations.length; j++) {
                reservations._table.push(reservations.data[j].reservation)
                if (!_clients[reservations.data[j].reservation]) {
                  var t = await Query.exec(Path.url(`store/DeepReservation/${reservations.data[j].reservation}`))
                  if (t.success && t.length === 1) {
                    if (t.data.contacts && t.data.contacts['_client'] && t.data.contacts['_client'].length > 0) {
                      var a = new Address(t.data.contacts['_client'][0])
                      _clients[reservations.data[j].reservation] = a.toArray()[0]
                      if (a.toArray().length > 1) {
                        _clients[reservations.data[j].reservation] += `<br />${a.toArray()[1]}`
                      }
                    }
                  }
                }
                if (_clients[reservations.data[j].reservation]) {
                  clients.push(_clients[reservations.data[j].reservation])
                }
              }
              reservations = reservations._table.join(', ')
            } else {
              reservations = ''
            }
            var tr = document.createElement('TR')
            tr.setAttribute('data-url', `#DEC${String(data[i].id)}`)
            tr.setAttribute('data-count-id', String(data[i].id))
            tr.addEventListener('click', this.evtSelectTr.bind(this))
            tr.innerHTML = `<td>${data[i].id}</td>
          <td tabindex data-edit="0" data-invoice="${(data[i].invoice ? data[i].invoice : '')}">${(data[i].invoice ? (data[i]._invoice.winbiz ? data[i]._invoice.winbiz : '') : '')}</td>
          <td>${reservations}</td>
          <td>${(data[i].status && data[i]._status ? data[i]._status.name : '')}</td>
          <td>${this._toHtmlRange(data[i].begin, data[i].end)}</td>
          <td>${(data[i].reference ? data[i].reference : '')}</td>
          <td>${clients.length > 0 ? clients.join('<hr>') : ''}</td>
          <td>${(data[i].comment ? this._shortDesc(data[i].comment) : '')}</td>
          <td>${(data[i].total ? data[i].total : '')}</td>
          <td>${(data[i].printed ? this._toHtmlDate(data[i].printed) : '')}</td>
          <td data-op="delete"><i class="far fa-trash-alt action"></i></td>`
            window.requestAnimationFrame(() => Tbody.appendChild(tr))
          }.bind(this))
        }.bind(this), 10)
      }

      this.doc.content(this.domNode)
      if (arguments[0].addReservation && String(arguments[0].addReservation) !== '0') {
        this.addReservation = arguments[0].addReservation
      }
      var trs = this.domNode.getElementsByTagName('TR')
      for (var i = 0; i < trs.length; i++) {
        if (trs[i].getAttribute('data-url')) {
        }
      }
    },
    evtSelectTr: async function (event) {
      var tr = event.target
      var td = event.target
      while (tr && tr.nodeName !== 'TR') {
        if (tr.nodeName === 'TD') { td = tr }
        tr = tr.parentNode
      }
      if (td.getAttribute('data-invoice') !== null) {
        if (td.getAttribute('data-edit') === '0') {
          td.setAttribute('data-edit', '1')
          td.dataset.previousValue = td.innerHTML
          var fn = async function (event) {
            var td = event.target
            while (td.nodeName !== 'TD') { td = td.parentNode }
            var invoice = td.getAttribute('data-invoice')
            if (invoice) {
              var result = await Query.exec(Path.url('store/Invoice/' + invoice), {method: 'PATCH', body: {id: invoice, winbiz: event.target.value}})
            } else {
              var tr = event.target
              while (tr.nodeName !== 'TR') { tr = tr.parentNode }
              var countid = tr.getAttribute('data-count-id')
              result = await Query.exec(Path.url('store/Invoice'), {method: 'POST', body: {winbiz: event.target.value}})
              if (result.success) {
                invoice = result.data[0].id
                td.setAttribute('data-invoice', invoice)
                result = await Query.exec(Path.url('store/Count/' + countid), {method: 'PATCH', body: {id: countid, invoice: result.data[0].id}})
              }
            }
            if (result.success) {
              td.setAttribute('data-edit', '0')
              result = await Query.exec(Path.url('store/Invoice/' + invoice))
              var winbiz = result.data.winbiz
              window.requestAnimationFrame(function () {
                td.innerHTML = winbiz
              })
            }
          }
          var input = document.createElement('INPUT')
          input.value = td.innerHTML
          input.addEventListener('blur', fn)
          input.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') { fn(event); return }
            if (event.key === 'Escape') {
              var td = event.target
              for (; td.nodeName !== 'TD'; td = td.parentNode) ;
              td.innerHTML = td.dataset.previousValue
              td.dataset.previousValue = null
            }
          })
          window.requestAnimationFrame(function () {
            td.innerHTML = ''
            td.appendChild(input)
          })
        }
      } else if (td.getAttribute('data-op')) {
        switch (td.getAttribute('data-op')) {
        case 'delete':
          if (tr.getAttribute('data-count-id')) {
            var res = await Query.exec(Path.url('store/Count/' + tr.getAttribute('data-count-id')), {method: 'DELETE', body: {id: tr.getAttribute('data-count-id')}})
            if (res.success) {
              tr.parentNode.removeChild(tr)
            }
          }
          break
        }
      } else {
        if (this.addReservation) {
          console.log(this.addReservation)
          await Query.exec(Path.url('store/CountReservation'), {method: 'POST', body: {count: tr.dataset.countId, reservation: this.addReservation}})
          delete this.addReservation
          this.eventTarget.dispatchEvent(new Event('save'))
        }
        window.location.hash = tr.dataset.url
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
          if (x.locality) {
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
      this.doc.addEventListener('close', function (event) { window.location.hash = '' })
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
      if (reservations.length > 0) {
        for (var i = 0; i < reservations.length; i++) {
          if (machines.indexOf(reservations[i].target) === -1) {
            machines.push(reservations[i].target)
          }
          if (reservations[i].reference) {
            references += `<div data-reservation-id="${reservations[i].id}" data-reference-value="${reservations[i].reference}"><b>Réservation ${reservations[i].id}</b>&nbsp;: ${reservations[i].reference}</div>`
          }
          if (begin === null || (new Date(begin)).getTime() > (new Date(reservations[i].begin)).getTime) {
            begin = reservations[i].begin
          }
          if (end === null || (new Date(end)).getTime() < (new Date(reservations[i].end)).getTime) {
            end = reservations[i].end
          }
        }
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
        htmlReservation.push(`<span class="button" data-reservation-id="${r}">${r}<span data-action="delete-reservation"><i class="fas fa-trash"> </i></span></span>`)
      })
      this.get('deleted-reservation').forEach(function (d) {
        htmlReservation.push(`<span class="button deleted" data-reservation-id="${d}"><del>${d}</del><span data-action="delete-reservation"><i class="fas fa-trash"> </i></span></span>`)
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
        ${(this.get('data').invoice ? (this.get('data')._invoice.winbiz ? '<li>Facture N°' + this.get('data')._invoice.winbiz + '</li>' : '') : '')}
        <li>Réservation : ${(htmlReservation.length > 0 ? htmlReservation.join(' ') : '')}</li>
        <li>Machine : ${(machines.length > 0 ? machines.join(', ') : '')}</li>
        ${(this.get('data').printed ? '<li>Dernière impression : ' + this._toHtmlDate(this.get('data').printed) + '</li>' : '')}</ul>
        <fieldset><legend>Période</legend><label for="begin">Début</label>
        <input type="date" value="${(this.get('data').begin ? this._toInputDate(this.get('data').begin) : this._toInputDate(begin))}" name="begin" /><label for="end">Fin</label>
        <input type="date" name="end" value="${(this.get('data').end ? this._toInputDate(this.get('data').end) : this._toInputDate(end))}" /></fieldset>
        <label for="comment">Remarque interne</label><textarea name="comment">${(this.get('data').comment ? this.get('data').comment : '')}</textarea>${references}</form>
        <form name="invoice" ${(this.get('data').invoice ? ' data-invoice="' + this.get('data').invoice + '" ' : '')}><fieldset name="contacts"><fieldset></form>`

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
          default:
            if (node.getAttribute('data-reference-value')) {
              var value = node.getAttribute('data-reference-value')
              while (node.tagName !== 'INPUT') { node = node.nextSibling }
              node.value = value
            }
        }
      }.bind(this))

      this.domNode = div
      this.table = document.createElement('TABLE')

      div.appendChild(this.table)
      this.doc.content(this.domNode)
      div.lastChild.focus()

      this.thead = document.createElement('THEAD')
      this.thead.innerHTML = '<tr><td class="short">ID</td><td class="short">Réservation</td><td class="short">Référence</td><td class="long">Description</td><td class="short">Quantité</td><td class="short">Unité</td><td class="short">Prix</td><td class="short">Rabais</td><td class="short">Total</td><td></td></tr>'
      this.tbody = document.createElement('TBODY')
      this.tfoot = document.createElement('TFOOT')

      this.table.appendChild(this.thead)
      this.table.appendChild(this.tbody)
      this.table.appendChild(this.tfoot)

      div.appendChild(domStatus)

      var save = document.createElement('input')
      save.setAttribute('type', 'button')
      save.setAttribute('value', 'Sauvegarder')
      save.addEventListener('click', this.save.bind(this))
      var saveQuit = document.createElement('input')
      saveQuit.setAttribute('type', 'button')
      saveQuit.setAttribute('value', 'Sauvegarder et quitter')
      saveQuit.addEventListener('click', this.saveQuit.bind(this))
      var print = document.createElement('input')
      print.setAttribute('type', 'button')
      print.setAttribute('value', 'Imprimer')
      print.addEventListener('click', this.print.bind(this))
      var del = document.createElement('input')
      del.setAttribute('type', 'button')
      del.setAttribute('value', 'Supprimer')
      del.setAttribute('style', 'float: right');
      del.addEventListener('click', function () {
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

      this.refresh()

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
          this.tfoot.innerHTML = '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>' + this.Total + '</td><td></td></tr>'
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
        var txt = '<td>' + String(value.id ? value.id : '&#10022;') + '</td><td>' + String(value.reservation ? value.reservation : '') + '</td><td>' +
          String(value.reference ? value.reference : '').html() + '</td><td>' +
          String(value.description ? value.description : '-').html() + '</td><td>' + String(value.quantity ? value.quantity : '-').html() + '</td><td>' +
          String(unit).html() + '</td><td>' + String(value.price ? value.price : '').html() + '</td><td>' +
          String(value.discount ? value.discount + '%' : '').html() + '</td><td>' +
          String(value.total ? value.total : '0').html() + '</td><td><i class="far fa-trash-alt action" data-op="delete"></i></td>'
        tr.addEventListener('focus', this.edit.bind(this))
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
          rselect = ''
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

        txt = '<td>&#10023;</td><td>' + rselect + '</td><td><input name="reference" type="text" value="' + String(value.reference ? value.reference : '').html() +
          '" /><td><input name="description" type="text" value="' + String(value.description ? value.description : '').html() +
          '" /></td><td><input step="any" name="quantity" type="number" lang="en" value="' + String(value.quantity ? value.quantity : '').html() +
          '" /></td><td>' + units + '</td><td><input name="price" lang="en" step="any" type="number" value="' + String(value.price ? value.price : '').html() +
          '" /></td><td><input name="discount" lang="en" step="any" type="number" value="' + String(value.discount ? value.discount : '').html() +
          '" /></td><td><input lang="en" name="total" type="number" step="any" value="' + String(value.total ? value.total : '').html() +
          '" /></td><td><i class="far fa-trash-alt action" data-op="delete"></i></td>'
        tr.addEventListener('keypress', function (event) {
          if (event.key === 'Enter') {
            this.save(event)
          }
        }.bind(this))
        tr.setAttribute('data-edit', '1')
        tr.addEventListener('change', this.calculate.bind(this))
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

    saveQuit: async function (event) {
      await this.save(event)
      this.doc.close()
    },

    save: async function (event) {
      event.preventDefault()
      var parent = this.tbody.firstChild
      while (parent) {
        if (!parent.getAttribute('data-edit')) {
          parent = parent.nextSibling
          continue
        }
        this.calculate({target: parent})
        var id = parent.getAttribute('data-id')

        var inputs = parent.getElementsByTagName('INPUT')
        var query = {count: this.get('data-id')}
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].value) {
            query[inputs[i].getAttribute('name')] = inputs[i].value
          } else {
            query[inputs[i].getAttribute('name')] = null
          }
        }
        var selects = parent.getElementsByTagName('SELECT')
        for (i = 0; i < selects.length; i++) {
          if (selects[i].value) {
            query[selects[i].getAttribute('name')] = selects[i].value
          } else {
            query[selects[i].getAttribute('name')] = null
          }
        }

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
        inputs = this.form_invoice.getElementsByTagName(element)
        for (i = 0; i < inputs.length; i++) {
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
        inputs = [...this.form_details.elements, ...document.querySelectorAll('*[form=details]')]
        for (i = 0; i < inputs.length; i++) {
          var val = inputs[i].value
          if (!val) { continue }
          switch (inputs[i].getAttribute('name')) {
            case 'begin': case 'end':
              val = new Date(val).toISOString()
              break
          }
          query[inputs[i].getAttribute('name')] = val
        }
      }.bind(this))
      await Query.exec(Path.url('store/Count/' + this.get('data-id')), {method: 'patch', body: JSON.stringify(query)})
      this.eventTarget.dispatchEvent(new Event('save'))
    },

    print: async function (event) {
      await this.save(event)
      window.open(Path.url('pdfs/count/' + this.get('data-id')))
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

    calculate: function (event) {
      var fix = function (value) {
        return Math.round(value * 100) / 100
      }
      var parent = event.target
      while (parent.nodeName !== 'TR') {
        parent = parent.parentNode
      }

      if (event.target.getAttribute('name') === 'quantity' || event.target.getAttribute('name') === 'price' || event.target.getAttribute('name') === 'total' || event.target.getAttribute('name') === 'discount') {
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
    },
    addEventListener: function (type, listener, options = {}) {
      this.eventTarget.addEventListener(type, listener.bind(this), options)
    }
  })
})
