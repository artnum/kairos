/* eslint-env amd, browser */
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
      this._initialized = new Promise(async function (resolve, reject) {
        if (args[0]['data-id'] === '*') {
          var url = Path.url('store/Count')
          url.searchParams.set('search.deleted', '-')
          var data = await Query.exec(url)
          this.set('data', data.data)
          this.list()
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

          Query.exec(Path.url('store/Unit')).then(function (unit) {
            if (unit.length > 0) {
              this.set('units', unit.data)
            } else {
              this.set('units', [])
            }
          }.bind(this))

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
            for (var i = 0; i < data.length; i++) {
              r.push(data.data[i].reservation)
            }
            this.set('reservations', r)
          } else {
            this.set('reservations', [])
          }

          if (this.get('data').invoice) {
            if (this.get('data')._invoice.address) {
              this.set('address-id', this.get('data')._invoice.address)
            }
          }

          this.refresh_contacts()
          this.start()
        }
      }.bind(this))
    },

    refresh_contacts: async function () {
      var contacts = {}
      if (this.get('reservations').length > 0) {
        var r = this.get('reservations')

        for (var i = 0; i < r.length; i++) {
          var url = Path.url('store/ReservationContact')
          url.searchParams.set('search.comment', '_facturation')
          url.searchParams.set('search.reservation', r[i])
          var data = await Query.exec(url)
          if (data.success && data.length > 0) {
            for (var j = 0; j < data.length; j++) {
              if (data.data.freeform) {
                if (!contacts[data.data[j].id]) {
                  contacts[data.data[j].id] = new Card()
                  contacts[data.data[j].id].entry(data.data[i])
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
        }
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
      return x.getDate() + '.' + (x.getMonth() + 1 < 10 ? '0' + String(x.getMonth() + 1) : String(x.getMonth() + 1)) + '.' + x.getFullYear()
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

    addReservation: function (reservation) {
      this._initialized.then(async function () {
        var url = Path.url('store/CountReservation')
        url.searchParams.set('search.count', this.get('data-id'))
        url.searchParams.set('search.reservation', reservation)
        var link = await Query.exec(url)
        if (link.success && link.length <= 0) {
          Query.exec(Path.url('store/CountReservation'), {method: 'post', body: JSON.stringify({reservation: reservation, count: this.get('data-id')})})
        }
      }.bind(this))
    },

    list: async function () {
      this.doc = new Doc({style: 'background-color: #FFFFCF'})
      var div = document.createElement('DIV')
      div.setAttribute('class', 'DocCount')

      this.domNode = div

      var txt = '<h1>Liste de décompte</h1><table>' +
        '<thead><tr><td>Numéro</td><td>Réservation</td><td>Période</td><td>Remarque</td><td>Facture</td><td>Montant</td><td>Impression</td></tr></thead>' +
        '<tbody>'

      var data = this.get('data')
      var url = Path.url('store/CountReservation')
      for (var i = 0; i < data.length; i++) {
        url.searchParams.set('search.count', data[i].id)
        var reservations = await Query.exec(url)
        if (reservations.success && reservations.length > 0) {
          reservations._table = []
          for (var j = 0; j < reservations.length; j++) {
            reservations._table.push(reservations.data[j].reservation)
          }
          reservations = reservations._table.join(', ')
        } else {
          reservations = ''
        }

        txt += '<tr data-url="#DEC' + String(data[i].id) + '"><td>' + data[i].id + '</td>' +
          '<td>' + reservations + '</td>' +
          '<td>' + this._toHtmlRange(data[i].begin, data[i].end) + '</td>' +
          '<td>' + (data[i].comment ? this._shortDesc(data[i].comment) : '') + '</td>' +
          '<td>' + (data[i].invoice ? (data[i]._invoice.winbiz ? data[i]._invoice.winbiz : '') : '') + '</td>' +
          '<td>' + (data[i].total ? data[i].total : '') + '</td>' +
          '<td>' + (data[i].printed ? this._toHtmlDate(data[i].printed) : '') + '</td>' +
          '</tr>'
      }
      txt += '</tbody></table>'
      this.domNode.innerHTML = txt

      var trs = this.domNode.getElementsByTagName('TR')
      for (i = 0; i < trs.length; i++) {
        if (trs[i].getAttribute('data-url')) {
          trs[i].addEventListener('click', function (event) {
            var tr = event.target
            while (tr && tr.nodeName !== 'TR') {
              tr = tr.parentNode
            }
            window.location.hash = tr.getAttribute('data-url')
          }.bind(this))
        }
      }
      this.doc.content(this.domNode)
    },

    start: function () {
      this.doc = new Doc({style: 'background-color: #FFFFCF'})
      this.Total = 0
      this.Entries = {}

      var div = document.createElement('DIV')
      div.setAttribute('class', 'DocCount')
      div.innerHTML = '<h1>Décompte N°' + String(this.get('data-id')) + '</h1>' +
        '<form name="details"><ul>' +
        (this.get('data').invoice ? (this.get('data')._invoice.winbiz ? '<li>Facture N°' + this.get('data')._invoice.winbiz + '</li>' : '') : '') +
        '<li>Réservation : ' + (this.get('reservations') ? this.get('reservations').join(', ') : '') + '</li>' +
        (this.get('data').printed ? '<li>Dernière impression : ' + this._toHtmlDate(this.get('data').printed) + '</li>' : '') +
        '</ul>' +
        '<fieldset><legend>Période</legend><label for="begin">Début</label>' +
        '<input type="date" value="' + (this.get('data').begin ? this._toInputDate(this.get('data').begin) : '') + '" name="begin" /><label for="end">Fin</label>' +
        '<input type="date" name="end" value="' + (this.get('data').end ? this._toInputDate(this.get('data').end) : '') + '" /></fieldset>' +
        '<textarea name="comment">' + (this.get('data').comment ? this.get('data').comment : '') + '</textarea></form>' +
        '<form name="invoice"><fieldset name="contacts"><fieldset></form>'

      this.domNode = div
      this.table = document.createElement('TABLE')

      div.appendChild(this.table)
      this.doc.content(this.domNode)
      div.lastChild.focus()

      this.thead = document.createElement('THEAD')
      this.thead.innerHTML = '<tr><td class="short">ID</td><td class="short">Réservation</td><td class="long">Description</td><td class="short">Quantité</td><td class="short">Unité</td><td class="short">Prix</td><td class="short">Total</td><td></td></tr>'
      this.tbody = document.createElement('TBODY')
      this.tfoot = document.createElement('TFOOT')

      this.table.appendChild(this.thead)
      this.table.appendChild(this.tbody)
      this.table.appendChild(this.tfoot)

      var save = document.createElement('input')
      save.setAttribute('type', 'button')
      save.setAttribute('value', 'Sauvegarder')
      save.addEventListener('click', this.save.bind(this))
      var print = document.createElement('input')
      print.setAttribute('type', 'button')
      print.setAttribute('value', 'Imprimer')
      print.addEventListener('click', this.print.bind(this))
      this.domNode.appendChild(save)
      this.domNode.appendChild(print)

      this.refresh()

      var forms = this.domNode.getElementsByTagName('FORM')
      for (var i = 0; i < forms.length; i++) {
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
          this.tfoot.innerHTML = '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td>' + this.Total + '</td><td></td></tr>'
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
      tr.setAttribute('tabindex', '0')

      if (!value.total) {
        value.total = parseFloat((value.price ? parseFloat(value.price) : 0) * (value.quantity ? parseFloat(value.quantity) : 1))
      } else {
        value.total = parseFloat(value.total)
      }

      this.Total += value.total

      if (!edit) {
        var txt = '<td>' + String(value.id ? value.id : '&#10022;') + '</td><td>' + String(value.reservation ? value.reservation : '') + '</td><td>' + String(value.description ? value.description : '-').html() + '</td><td>' + String(value.quantity ? value.quantity : '-').html() + '</td><td>' + String(value.unity ? value.unity : '').html() + '</td><td>' + String(value.price ? value.price : '').html() + '</td><td>' + String(value.total ? value.total : '0').html() + '</td><td><i class="far fa-trash-alt action" data-op="delete"></i></td>'
        tr.addEventListener('focus', this.edit.bind(this))
      } else {
        var reservations = this.get('reservations')
        if (reservations.length > 1) {
          var rselect = '<select name="reservation">'
          reservations.forEach(function (r) {
            rselect += '<option value="' + r + '">' + r + '</option>'
          })
          rselect += '</select>'
        } else {
          rselect = ''
        }
        txt = '<td>&#10023;</td><td>' + rselect + '</td><td><input name="description" type="text" value="' + String(value.description ? value.description : '').html() + '" /></td><td><input step="any" name="quantity" type="number" value="' + String(value.quantity ? value.quantity : '').html() + '" /></td><td>---</td><td><input name="price" step="any" type="number" value="' + String(value.price ? value.price : '').html() + '" /></td><td><input name="total" type="number" step="any" value="' + String(value.total ? value.total : '').html() + '" /></td><td><i class="far fa-trash-alt action" data-op="delete"></i></td>'
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
      console.log(event)
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

    save: async function (event) {
      event.preventDefault()
      var parent = this.tbody.firstChild
      while (parent) {
        if (!parent.getAttribute('data-edit')) {
          parent = parent.nextSibling
          continue
        }
        var id = parent.getAttribute('data-id')

        var inputs = parent.getElementsByTagName('INPUT')
        var query = {count: this.get('data-id')}
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].value) {
            query[inputs[i].getAttribute('name')] = inputs[i].value
          }
        }
        var selects = parent.getElementsByTagName('SELECT')
        for (i = 0; i < selects.length; i++) {
          if (selects[i].value) {
            query[selects[i].getAttribute('name')] = selects[i].value
          }
        }

        if (!query.description && !query.quantity && !query.price && !query.total) {
          var remove = parent
          parent = parent.nextSibling
          remove.parentNode.removeChild(remove)
          continue
        }

        if (parseInt(query.quantity) === 0) {
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
      inputs = this.form_invoice.getElementsByTagName('INPUT')
      for (i = 0; i < inputs.length; i++) {
        var val = inputs[i].value
        query[inputs[i].getAttribute('name')] = val
      }
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

      query = {comment: this.form_details.getElementsByTagName('TEXTAREA')[0].value, total: this.Total, id: this.get('data-id')}
      if (invoice.success && invoice.length > 0) {
        if (invoice.data[0].id) {
          query.invoice = invoice.data[0].id
        }
      }
      inputs = this.form_details.getElementsByTagName('INPUT')

      for (i = 0; i < inputs.length; i++) {
        val = inputs[i].value
        if (!val) { continue }
        switch (inputs[i].getAttribute('name')) {
          case 'begin': case 'end':
            val = new Date(val).toISOString()
            break
        }
        query[inputs[i].getAttribute('name')] = val
      }
      await Query.exec(Path.url('store/Count/' + this.get('data-id')), {method: 'patch', body: JSON.stringify(query)})
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
      var parent = event.target
      while (parent.nodeName !== 'TR') {
        parent = parent.parentNode
      }

      if (event.target.getAttribute('name') === 'quantity' || event.target.getAttribute('name') === 'price' || event.target.getAttribute('name') === 'total') {
        var q = -1
        var p = -1
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

          if (input.getAttribute('name') === 'total') {
            totinput = input
          }
        }
        if (q !== -1 && p !== -1 && event.target.getAttribute('name') !== 'total') {
          totinput.setAttribute('value', String(q * p))
        } else if (event.target.getAttribute('name') === 'total') {
          priinput.value = ''
        }
      }
    }
  })
})
