/* eslint-env amd, browser */
/* global Artnum, Address, DoWait, sjcl */
/* eslint no-template-curly-in-string: "off" */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/Evented',
  'artnum/Path',
  'artnum/Query',
  'artnum/Doc',
  'location/card',
  'location/count'
], function (
  djDeclare,
  _dtWidgetBase,
  djEvented,
  Path,
  Query,
  Doc,
  Card,
  Count
) {
  return djDeclare('location/countList', [ _dtWidgetBase, djEvented ], {
    constructor: function () {
      this.inherited(arguments)
      var args = arguments
      this.AddReservationToCount = null
      if (arguments[0] && arguments[0].addReservation) {
        this.AddReservationToCount = arguments[0].addReservation
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
        var url = Path.url('store/Count')
        url.searchParams.set('search.deleted', '-')

        var data = await Query.exec(url)
        this.set('data', data.data)
        this.list(args)
        resolve()
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
        '<thead><tr><th data-sort-type="integer">N°</th><th>Final</th><th>Facture</th><th>Réservation</th><th>Statut</th><th>Période</th><th>Référence client</th><th>Client</th><th>Remarque</th><th>Montant</th><th>Impression</th><th data-sort-type="no"></th></tr></thead>' +
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

            let addIn = []
            let c = []
            clients.forEach(function (_c) {
              let h = sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(_c))
              if (addIn.indexOf(h) === -1) {
                addIn.push(h)
                c.push(_c)
              }
            })

            var tr = document.createElement('TR')
            tr.setAttribute('data-url', `#DEC${String(data[i].id)}`)
            tr.setAttribute('data-count-id', String(data[i].id))
            tr.addEventListener('click', this.evtSelectTr.bind(this))
            tr.innerHTML = `<td>${data[i].id}</td>
          <td>${(data[i].state === 'FINAL' ? 'Oui' : 'Non')}</td>
          <td tabindex data-edit="0" data-invoice="${(data[i].invoice ? data[i].invoice : '')}">${(data[i].invoice ? (data[i]._invoice.winbiz ? data[i]._invoice.winbiz : '') : '')}</td>
          <td>${reservations}</td>
          <td>${(data[i].status && data[i]._status ? data[i]._status.name : '')}</td>
          <td>${this._toHtmlRange(data[i].begin, data[i].end)}</td>
          <td>${(data[i].reference ? data[i].reference : '')}</td>
          <td>${c.length > 0 ? c.join('<hr>') : ''}</td>
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
        this.AddReservationToCount = arguments[0].addReservation
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
        new Count({'data-id': tr.dataset.countId, reservation: this.AddReservationToCount}) // eslint-disable-line
        this.AddReservationToCount = null
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
          this.tfoot.innerHTML = `<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>${this.Total}</td></tr>`
          resolve()
        }.bind(this))
        this.draw_contacts()
      }.bind(this))
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
    }
  })
})
