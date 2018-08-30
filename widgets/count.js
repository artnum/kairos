/* eslint-env amd, browser */
/* eslint no-template-curly-in-string: "off" */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/Evented',
  'artnum/Path',
  'artnum/Query',
  'artnum/Doc'
], function (
  djDeclare,
  _dtWidgetBase,
  djEvented,
  Path,
  Query,
  Doc
) {
  return djDeclare('location/count', [ _dtWidgetBase, djEvented ], {
    constructor: async function () {
      this.inherited(arguments)
      var create = true
      if (arguments[0]['data-id']) {
        var data = await Query.exec(Path.url('store/Count/' + arguments[0]['data-id']))
        if (data.length === 1) {
          this.set('data', data.data)
          this.set('data-id', data.data.id)
          var reservationid = data.data.reservation
          create = false
        }
      }

      if (!arguments[0].reservation && !reservationid) {
        window.App.error('Pas de reservation sélectionnée')
        return
      }
      if (arguments[0].reservation) {
        reservationid = arguments[0].reservation
      }

      var reservation = await Query.exec(Path.url('store/DeepReservation/' + reservationid))
      if (reservation.length !== 1) {
        window.App.error('Réservation inexistante')
        return
      }

      Query.exec(Path.url('store/Unit')).then(function (unit) {
        if (unit.length > 0) {
          this.set('units', unit.data)
        } else {
          this.set('units', [])
        }
      }.bind(this))

      this.set('reservation', reservation.data)
      this.set('reservation-id', reservationid)

      if (create) {
        data = await Query.exec(Path.url('store/Count'), {method: 'post', body: JSON.stringify({date: new Date().toISOString(), reservation: this.get('reservation-id')})})
        if (data.success) {
          console.log(data)
          data = await Query.exec(Path.url('store/Count/' + data.data.id))
          if (data.length === 1) {
            this.set('data', data.data)
            this.set('data-id', data.data.id)
          }
        }
      }
      this.start()
    },

    start: function () {
      this.doc = new Doc({style: 'background-color: #FFFFCF'})

      var div = document.createElement('DIV')
      div.setAttribute('class', 'DocCount')
      div.innerHTML = '<h1>Décompte ' + String(this.get('reservation-id')) + '/<em>' + String(this.get('data-id')) + '</em></h1><p contenteditable>' + (this.get('data').comment ? this.get('data').comment : '') + '</p>'

      this.domNode = div
      this.table = document.createElement('TABLE')

      div.appendChild(this.table)
      this.doc.content(this.domNode)

      this.refresh()
    },

    refresh: async function () {
      var url = Path.url('store/Centry')
      url.searchParams.set('search.count', this.get('data-id'))
      Query.exec(Path.url('store/Centry')).then(function (result) {
        if (result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            this.centry(result.data[i])
          }
        }
      }.bind(this))
    },

    centry: function (value, edit = false) {
      var tr = document.createElement('TR')
      if (value.id) {
        tr.setAttribute('data-id', value.id)
      } else {
        tr.setAttribute('data-id', '')
      }

      var txt = ''
      if (edit) {
        txt = '<input type="text" class="description" value="' + (value.description ? value.description : '') + '" />' +
          '<input type="number" step="any" class="quantity" value="' + (value.quantity ? value.quantity : 0) + '" />'
      } else {
        txt = '<span class="description">' + (value.description ? value.description : '') + '</span>' +
          '<span class="quantity">' + (value.quantity ? value.quantity : '') + '</span>'
      }

      tr.innerHTML = txt
      return tr
    }
  })
})
