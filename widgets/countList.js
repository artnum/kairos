/* eslint-env amd, browser */
/* global Artnum, Address, DoWait, sjcl */
/* eslint no-template-curly-in-string: "off" */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/Evented',

  'artnum/Doc',
  'location/count'
], function (
  djDeclare,
  _dtWidgetBase,
  djEvented,

  Doc,
  
  Count
) {
  return djDeclare('location/countList', [ _dtWidgetBase, djEvented ], {
    constructor: function () {
      this.data = new Map()
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
        return (d1 ? (new Date(d1)).briefDate() : '') + ' - ' + (d2 ? (new Date(d2)).briefDate() : '')
      }

      return ''
    },

    run: function () {
      let limit = 50
      let offset = 0
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

      const url = new URL(`${KAIROS.getBase()}/store/Count`)
      url.searchParams.set('search.deleted', '-')
      url.searchParams.set('sort.id', 'DESC')
      if (limit) {
        url.searchParams.set('limit', `${offset},${limit}`)
      }

      const query = fetch(url)
      .then(response => {
        if (!response.ok) { return null }
        return response.json()
      })

      const url2 = new URL(`${KAIROS.getBase()}/store/Count/.count`)
      url2.searchParams = url.searchParams
      const queryCount = fetch(url2)
      .then(response =>{
        if (!response.ok) { return null }
        return response.json()
      })

      const div = document.createElement('DIV')
      div.setAttribute('class', 'DocCount')
      window.GEvent.listen('count.count-deleted', event => {
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
      })

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

      queryCount.then(n => {
        if (!n) {return }
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
      })
      var Tbody = this.domNode.getElementsByTagName('TBODY')[0]
      var Table = this.domNode.getElementsByTagName('TABLE')[0]
      this.dtable = new Artnum.DTable({table: Table, sortOnly: true})

      query
      .then(results => {
        if (!results) { return }
        const url = new URL(`${KAIROS.getBase()}/store/CountReservation`)
        url.searchParams.append('sort.count', 'DESC')

        let queryChain = Promise.resolve()
        for (let i = 0; i < results.length; i++) {
          const promise = new Promise((resolve, reject) => {
            const count = results.data[i]
            url.searchParams.set('search.count', count.id)
            fetch(url)
            .then(response => {
              if (!response.ok) { return null }
              return response.json()
            })
            .then(reservations => {
              return new Promise((resolve, reject) => {
                if (!reservations) { resolve([count, '', []]); return}
                if (reservations.length <= 0) { resolve([count, '', []]); return }
                const p = []
                const table = []
                const clients = []
                const _clients = new Map()
                for (let j = 0; j < reservations.length; j++) {
                  table.push(reservations.data[j].reservation)
                  if (_clients.has(reservations.data[j].reservation)) { continue; }
                  
                  p.push(new Promise((resolve, reject) => {
                    fetch(new URL(`${KAIROS.getBase()}/store/DeepReservation/${reservations.data[j].reservation}`))
                    .then(response => {
                      if (!response.ok) { return null }
                      return response.json()
                    })
                    .then(t => {
                      if (!t) { resolve(); return }
                      if (t.length !== 1) { resolve(); return }
          
                      if (t.data.contacts && t.data.contacts['_client'] && t.data.contacts['_client'].length > 0) {                 
                        _clients.set(
                          reservations.data[j].reservation, 
                          new Address(t.data.contacts['_client'][0]).toArray().slice(0, 2).join('<br />')
                        )
                      }
          
                      if (_clients.has(reservations.data[j].reservation)) {
                        clients.push(_clients.get(reservations.data[j].reservation))
                      }
                      resolve()
                    })
                  }))
                }
                Promise.all(p)
                .then(_ => {
                  const c = []
                  for (const client of clients) {
                    if (c.indexOf(client) === -1) {
                      c.push(client)
                    }
                  }
                  resolve([count, table.join(', '), c])
                })
              })
            })
            .then(([count, reservations, clients]) => {
              let tr = document.createElement('TR')
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
                <td>${clients.length > 0 ? clients.join('<hr>') : ''}</td>
                <td>${(count.comment ? this._shortDesc(count.comment) : '')}</td>
                <td>${(count.total ? count.total : '')}</td>
                <td>${(count.printed ? (new Date(count.printed)).briefDate() : '')}</td>
                <td data-op="delete"><i class="far fa-trash-alt action"></i></td>`

              let n = Tbody.lastElementChild
              let p = null
              while (n &&
                      parseInt(tr.firstElementChild.dataset.sortValue) > parseInt(n.firstElementChild.dataset.sortValue)) {
                p = n
                n = n.previousSibling
              }
              window.requestAnimationFrame(() => { Tbody.insertBefore(tr, p); resolve() })
            })
          })
          queryChain.then(_ => { return promise })
        }
      })

      this.doc.content(this.domNode)
      if (arguments[0].addReservation && String(arguments[0].addReservation) !== '0') {
        this.AddReservationToCount = arguments[0].addReservation
      }
    },

    evtSelectTr: async function (event) {
      let tr = event.target
      let td = event.target
      while (tr && tr.nodeName !== 'TR') {
        if (tr.nodeName === 'TD') { td = tr }
        tr = tr.parentNode
      }
      if (td.dataset.invoice !== undefined) {
        if (td.dataset.edit === '0') {
          td.dataset.edit = '1'
          td.dataset.previousValue = td.innerHTML
          const fn = (event) => {
            let td = event.target
            while (td.nodeName !== 'TD') { td = td.parentNode }

            if (event.target.value.trim() === '') {
              td.dataset.edit = '0'
              window.requestAnimationFrame(() => {
                td.innerHTML = td.dataset.previousValue
              })
              return 
            }
            const invoice = td.dataset.invoice
            new Promise((resolve, reject ) => {
              if (invoice) {
                fetch(new URL(`${KAIROS.getBase()}/store/Invoice/${invoice}`),
                  {method: 'PATCH', body: JSON.stringify({id: invoice, winbiz: event.target.value.trim()})})
                .then(response => {
                  if (!response.ok) { return null }
                  return response.json()
                })
                .then(result => {
                  if (!result) { resolve(null); return }
                  resolve(invoice)
                })
              } else {
                let tr = event.target
                while (tr.nodeName !== 'TR') { tr = tr.parentNode }
                const countid = tr.dataset.countId
                fetch(new URL(`${KAIROS.getBase()}/store/Invoice`), {method: 'POST', body: JSON.stringify({winbiz: event.target.value.trim()})})
                .then(response => {
                  if (!response.ok) { return null }
                  return response.json()
                }).then(result => {
                  if (!result) { resolve(null); return }
                  if (result.length <= 0) { resolve(null); return }

                  const invoice = Array.isArray(result.data) ? result.data[0] : result.data
                  td.dataset.invoice = invoice.invoice
                  fetch(new URL(`${KAIROS.getBase()}/store/Count/${countid}`), {method: 'PATCH', body: JSON.stringify({id: countid, invoice: invoice.id})})
                  .then(response => {
                    if (!response.ok) { return null }
                    return response.json()
                  })
                  .then(result => {
                    if (!result) { resolve(null); return }
                    resolve(invoice.id)
                  })
                })
              }
            })
            .then(result => {
              if (!result) { return; }
              td.dataset.edit = '0'
              fetch(new URL(`${KAIROS.getBase()}/store/Invoice/${result}`))
              .then(response => {
                if (!response.ok) { return null }
                return response.json()
              })
              .then(result => {
                if (!result || !result.data) { 
                  window.requestAnimationFrame(() => {
                    td.innerHTML = td.dataset.previousValue
                  })
                  return 
                }
                window.requestAnimationFrame(() => {
                  td.innerHTML =  Array.isArray(result.data) ? result.data[0].winbiz : result.data.winbiz
                })
              })
            })
          }
          const input = document.createElement('INPUT')
          input.value = td.innerHTML
          input.addEventListener('blur', fn)
          input.addEventListener('keypress', event => {
            if (event.key === 'Enter') { fn(event); return }
            if (event.key === 'Escape') {
              let td = event.target
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
        return 
      } 
      if (td.dataset.op) {
        switch (td.dataset.op) {
          case 'delete':
            if (!tr.dataset.countId) { return }
            fetch(new URL(`${KAIROS.getBase()}/store/Count/${tr.dataset.countId}`), {method: 'DELETE', body: JSON.stringify({id: tr.dataset.countId})})
            .then(response => {
              if (!response.ok) { return null }
              return response.json()
            }).then(result => {
              if (!result) { return }
              window.requestAnimationFrame(() => { tr.parentNode.removeChild(tr) })
            })
            break
        }
        return
      } 
      new Count({'data-id': tr.dataset.countId, reservation: this.AddReservationToCount}) // eslint-disable-line
      this.AddReservationToCount = null
    }
  })
})
