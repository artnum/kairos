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

      if (arguments[0].integrated) {
        this.doc = new Doc({width: window.innerWidth - 740, style: 'background-color: #FFFFCF;'})
        this.doc.close.closableIdx = KAIROS.stackClosable(this.doc.close.bind(this.doc))
        this.doc.addEventListener('close', (event) => { 
          KAIROS.removeClosableByIdx(this.doc.close.closableIdx)
        })
      } else {
        if (arguments[0].parent) {
          this.doc = arguments[0].parent
        } else {
          this.doc = document.body
        }
      }

      this.AddReservationToCount = null
      if (arguments[0] && arguments[0].addReservation) {
        this.AddReservationToCount = arguments[0].addReservation
      }
      this.run(arguments)
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

    run: async function () {
      var limit = 50
      var offset = 0
      if (arguments[0].limit && arguments[0].limit > 0) {
        limit = arguments[0].limit
      } else if (arguments[0].limit) {
        limit = -1
      } else {
        limit = 50
      }

      if (arguments[0].offset) {
        offset = arguments[0].offset
      }

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
      let url = Path.url('store/Count')
      url.searchParams.set('search.deleted', '-')
      url.searchParams.set('sort.id', 'DESC')
      if (limit) {
        url.searchParams.set('limit', `${offset},${limit}`)
      }

      let query = Query.exec(url)
      var queryCount = Path.url('store/Count/.count')
      queryCount.searchParams = url.searchParams
      queryCount = Query.exec(queryCount)

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
          window.requestAnimationFrame(() => {
            if (node.parentNode) {
              node.parentNode.removeChild(node)
            }
          })
        }
      }.bind(this))

      this.domNode = div

      let lOption = ''
      ;['50', '100', '500', '1000', '-1'].forEach((n) => {
        let s = ''
        if (String(limit) === n) { s = 'selected' }
        if (n === '-1') {
          lOption += `<option value="-1" ${s}>∞</option>`
        } else {
          lOption += `<option value="${n}" ${s}>${n}</option>`
        }
      })

      var txt = `<h1>Liste de décompte</h1><table>
        <label for="paging">Afficher </label><select name="paging">${lOption}</select>
        <thead><tr><th data-sort-type="integer">N°</th><th data-sort-type="boolean">Final</th><th data-sort-type="integer">Facture</th><th data-sort-value="integer">Réservation</th><th>Statut</th><th data-sort-type="date">Période</th><th>Référence client</th><th>Client</th><th>Remarque</th><th>Montant</th><th>Impression</th><th data-sort-type="no"></th></tr></thead>
          <tbody></tbody></table>`
      this.domNode.innerHTML = txt
      var select = this.domNode.getElementsByTagName('SELECT')[0]
      select.addEventListener('change', function (evt) {
        this.run({limit: evt.target.value})
      }.bind(this))

      queryCount.then(function (n) {
        if (limit <= 0) { return }
        let pselect = document.createElement('SELECT')
        var pages = Math.floor(n.length / limit)
        for (let i = 0; i < pages; i++) {
          pselect.appendChild(document.createElement('OPTION'))
          pselect.lastChild.setAttribute('value', i)
          if (i * limit === offset) {
            pselect.lastChild.setAttribute('selected', 'selected')
          }
          pselect.lastChild.appendChild(document.createTextNode(i + 1))
        }
        pselect.addEventListener('change', function (evt) {
          this.run({limit: limit, offset: parseInt(evt.target.value) * limit})
        }.bind(this))

        window.requestAnimationFrame(() => {
          select.parentNode.insertBefore(document.createTextNode(` page `), select.nextSibling)
          select.parentNode.insertBefore(pselect, select.nextSibling.nextSibling)
          select.parentNode.insertBefore(document.createTextNode(` sur ${pages}`), pselect.nextSibling)
        })
      }.bind(this))
      var Tbody = this.domNode.getElementsByTagName('TBODY')[0]
      var Table = this.domNode.getElementsByTagName('TABLE')[0]
      this.dtable = new Artnum.DTable({table: Table, sortOnly: true})

      query.then(function (results) {
        var _clients = {}
        let url = Path.url('store/CountReservation', {params: {'sort.count': 'DESC'}})
        for (let i = 0; i < results.length; i++) {
          setTimeout(function () {
            let count = results.data[i]
            var clients = []
            url.searchParams.set('search.count', count.id)
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
              tr.setAttribute('data-url', `#DEC${String(count.id)}`)
              tr.setAttribute('data-count-id', String(count.id))
              tr.addEventListener('click', this.evtSelectTr.bind(this))
              tr.innerHTML = `<td data-sort-value="${count.id}">${count.id}</td>
          <td data-sort-value="${(count.state === 'FINAL' ? 'true' : 'false')}">${(count.state === 'FINAL' ? 'Oui' : 'Non')}</td>
          <td tabindex data-edit="0" data-invoice="${(count.invoice ? count.invoice : '')}">${(count.invoice ? (count._invoice.winbiz ? count._invoice.winbiz : '') : '')}</td>
          <td>${reservations}</td>
          <td>${(count.status && count._status ? count._status.name : '')}</td>
          <td data-sort-value="${count.begin}">${this._toHtmlRange(count.begin, count.end)}</td>
          <td>${(count.reference ? count.reference : '')}</td>
          <td>${c.length > 0 ? c.join('<hr>') : ''}</td>
          <td>${(count.comment ? this._shortDesc(count.comment) : '')}</td>
          <td>${(count.total ? count.total : '')}</td>
          <td>${(count.printed ? this._toHtmlDate(count.printed) : '')}</td>
          <td data-op="delete"><i class="far fa-trash-alt action"></i></td>`

              let n = Tbody.lastElementChild
              let p = null
              while (n &&
                     parseInt(tr.firstElementChild.dataset.sortValue) > parseInt(n.firstElementChild.dataset.sortValue)) {
                p = n
                n = n.previousSibling
              }
              window.requestAnimationFrame(() => Tbody.insertBefore(tr, p))
            }.bind(this))
          }.bind(this), 10)
        }
      }.bind(this))

      this.doc.content(this.domNode)
      if (arguments[0].addReservation && String(arguments[0].addReservation) !== '0') {
        this.AddReservationToCount = arguments[0].addReservation
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
