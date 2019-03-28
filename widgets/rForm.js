/* eslint-env browser, amd */
/* global pSBC */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/rForm.html',

  'dojo/dom',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-class',
  'dojo/dom-form',
  'dojo/request/xhr',
  'dojo/store/Memory',
  'dojo/promise/all',

  'dijit/form/Form',
  'dijit/form/DateTextBox',
  'dijit/form/TimeTextBox',
  'dijit/form/Textarea',
  'dijit/form/TextBox',
  'dijit/form/Button',
  'dijit/form/Select',
  'dijit/form/FilteringSelect',
  'dijit/form/CheckBox',
  'dijit/form/ComboBox',
  'dijit/Dialog',
  'dijit/layout/TabContainer',
  'dijit/layout/ContentPane',
  'dijit/registry',

  'location/contacts',
  'location/card',
  'location/bitsfield',
  'location/dateentry',
  'location/count',

  'artnum/dojo/Request',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  djLang,
  djEvented,
  DjDeferred,

  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,

  _template,

  djDom,
  djDate,
  djDateStamp,
  djDomConstruct,
  djOn,
  djDomStyle,
  djDomClass,
  djDomForm,
  djXhr,
  DjMemory,
  djAll,

  dtForm,
  dtDateTextBox,
  dtTimeTextBox,
  djTextarea,
  djTextBox,
  dtButton,
  dtSelect,
  dtFilteringSelect,
  dtCheckBox,
  dtComboBox,
  dtDialog,
  dtTabContainer,
  DtContentPane,
  dtRegistry,

  Contacts,
  Card,
  bitsfield,
  dateentry,
  Count,

  Req,
  Path,
  Query
) {
  return djDeclare('location.rForm', [
    dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
    baseClass: 'rForm',
    templateString: _template,
    contacts: {},
    isLayoutContainer: true,

    resize: function () {
      this.nContactsContainer.resize()
    },

    constructor: function (args) {
      this.Disabled = false
      this.reservation = args.reservation
      this.contacts = {}
      this.initRequests = []
      this.LocalData = {}
      this.loaded = {status: false, warehouse: false, association: false, user: false}
      this.userStore = new DjMemory()
      this.userStore_bis = new DjMemory()

      window.GEvent.listen('reservation.close', function (event) {
        if (event.detail.id && event.detail.id === this.reservation.get('id')) {
          if (!this.CloseInProgress) {
            this.close(true)
          }
        }
      }.bind(this))
    },

    _setDescriptionAttr: function (value) {
      this.description = value
    },

    _setWarehouseAttr: function (value) {
      this._set('warehouse', value)
      if (this.loaded.warehouse) {
        var store = this.nLocality.get('store')
        if (store && value && value.id) {
          var item = store.get(value.id)
          if (item) {
            this.nLocality.set('value', item.name)
          }
        }
      }
    },

    getUser: async function (value) {
      if (!value) { return null }
      var user = await Query.exec(Path.url(value))
      if (user.success && user.length === 1) {
        return user.data
      }

      return null
    },

    _setCreatorAttr: function (value) {
      this.getUser(value).then(function (user) {
        if (user) {
          this._set('creator', value)
          this.nCreator.innerHTML = user.name + ' '
          var current = window.localStorage.getItem(Path.bcname('user'))
          if (current) {
            current = JSON.parse(current)
            if ('store/User/' + current.id !== value) {
              var b = document.createElement('BUTTON')
              b.innerHTML = 'S\'attribuer'
              b.setAttribute('type', 'button')
              b.setAttribute('data-target', 'c')
              b.addEventListener('click', this.eChangeUser.bind(this))
              this.nCreator.appendChild(b)
            }
          }
        }
      }.bind(this))
    },

    _setArrivalCreatorAttr: function (value) {
      this.getUser(value).then(function (user) {
        if (user) {
          this._set('arrivalCreator', value)
          this.nArrivalCreator.innerHTML = user.name + ' '
          var current = window.localStorage.getItem(Path.bcname('user'))
          if (current) {
            current = JSON.parse(current)
            if ('store/User/' + current.id !== value) {
              var b = document.createElement('BUTTON')
              b.innerHTML = 'S\'attribuer'
              b.setAttribute('type', 'button')
              b.setAttribute('data-target', 'ac')
              b.addEventListener('click', this.eChangeUser.bind(this))
              this.nArrivalCreator.appendChild(b)
            }
          }
        }
      }.bind(this))
    },

    eChangeUser: async function (event) {
      if (window.localStorage.getItem(Path.bcname('user'))) {
        var _c = JSON.parse(window.localStorage.getItem(Path.bcname('user')))
        _c = 'store/User/' + _c.id
        if (event.target.getAttribute('data-target') === 'c') {
          var mod = await Query.exec(Path.url('store/Reservation/' + this.reservation.get('id')), {method: 'PATCH', body: JSON.stringify({ id: this.reservation.get('id'), creator: _c })})
          if (mod.success && mod.length === 1) {
            this.set('creator', _c)
          }
        } else {
          mod = await Query.exec(Path.url('store/Arrival/' + this.reservation.get('_arrival').id), {method: 'PATCH', body: JSON.stringify({ id: this.reservation.get('id'), creator: _c })})
          if (mod.success && mod.length === 1) {
            this.set('arrivalCreator', _c)
          }
        }
      }
    },

    _setBeginAttr: function (value) {
      this.beginDate.set('value', value.toISOString())
      this.beginTime.set('value', value.toISOString())
      this._set('begin', value)
    },

    _setEndAttr: function (value) {
      this.endDate.set('value', value.toISOString())
      this.endTime.set('value', value.toISOString())
      this._set('end', value)
    },

    _setDeliveryBeginAttr: function (value) {
      if (!value) {
        this._set('deliveryBegin', null)
        return
      }
      this.nDeliveryBeginDate.set('value', value.toISOString())
      this.nDeliveryBeginTime.set('value', value.toISOString())
      this._set('deliveryBegin', value)
    },

    _setDeliveryEndAttr: function (value) {
      if (!value) {
        this._set('deliveryEnd', null)
        return
      }
      this.nDeliveryEndDate.set('value', value.toISOString())
      this.nDeliveryEndTime.set('value', value.toISOString())
      this._set('deliveryEnd', value)
    },

    _setAddressAttr: function (value) {
      if (value) {
        this.nAddress.set('value', value)
      }
    },

    _setReferenceAttr: function (value) {
      if (value) {
        this.nReference.set('value', value)
      }
    },

    _setEquipmentAttr: function (value) {
      if (value) {
        this.nEquipment.set('value', value)
      }
    },

    _setLocalityAttr: function (value) {
      if (value) {
        this.nLocality.set('value', value)
      }
    },

    _setCommentAttr: function (value) {
      if (value) {
        this.nComments.set('value', value)
      }
    },
    _setNoteAttr: function (value) {
      if (value) {
        this.nNote.set('value', value)
      }
    },

    associationEntries: function (entries) {
      var frag = document.createDocumentFragment()
      var byType = {}

      for (var i = 0; i < entries.length; i++) {
        if (!byType[entries[i].type.id]) {
          byType[entries[i].type.id] = []
        }
        byType[entries[i].type.id].push(entries[i])
      }

      for (var k in byType) {
        var divType = document.createElement('DIV')
        var color = '#FFFFFF'
        if (byType[k][0].type.color) {
          color = '#' + byType[k][0].type.color
        }
        var name = byType[k][0].type.name

        divType.setAttribute('class', 'association type')
        divType.setAttribute('data-association-type-id', k)
        divType.appendChild(document.createElement('DIV'))
        divType.lastChild.setAttribute('style', 'background: linear-gradient(0.25turn, ' + pSBC(0.75, color) + ', ' + (color) + ',' + pSBC(0.75, color) + ');')
        divType.lastChild.setAttribute('class', 'name')
        divType.lastChild.appendChild(document.createTextNode(name))

        for (i = 0; i < byType[k].length; i++) {
          var divLine = document.createElement('DIV')
          divLine.setAttribute('class', 'item')

          var begin = djDateStamp.fromISOString(byType[k][i].begin)
          var end = djDateStamp.fromISOString(byType[k][i].end)

          var line = document.createElement('DIV')
          line.setAttribute('class', 'description')

          line.appendChild(document.createElement('SPAN'))
          line.lastChild.setAttribute('class', 'number value')
          line.lastChild.appendChild(document.createTextNode(byType[k][i].number))

          line.appendChild(document.createElement('I'))
          line.lastChild.setAttribute('class', 'fas fa-times')

          if (!Number(byType[k][i].follow)) {
            line.appendChild(document.createElement('SPAN'))
            line.lastChild.setAttribute('class', 'date begin value')
            line.lastChild.appendChild(document.createTextNode(begin.fullDate()))

            line.appendChild(document.createElement('SPAN'))
            line.lastChild.setAttribute('class', 'hour begin value')
            line.lastChild.appendChild(document.createTextNode(begin.shortHour()))

            line.appendChild(document.createElement('SPAN'))
            line.lastChild.setAttribute('class', 'date end value')
            line.lastChild.appendChild(document.createTextNode(end.fullDate()))

            line.appendChild(document.createElement('SPAN'))
            line.lastChild.setAttribute('class', 'hour end value')
            line.lastChild.appendChild(document.createTextNode(end.shortHour()))
          } else {
            line.appendChild(document.createElement('SPAN'))
            line.lastChild.setAttribute('class', 'follow value')
            line.lastChild.appendChild(document.createTextNode(' durant toute la réservation'))
          }
          line.appendChild(document.createElement('DIV'))
          line.lastChild.setAttribute('class', 'toolbox')

          line.lastChild.appendChild(document.createElement('I'))
          line.lastChild.lastChild.setAttribute('class', 'far fa-edit')
          line.lastChild.lastChild.setAttribute('data-artnum-id', byType[k][i].id)
          djOn(line.lastChild.lastChild, 'click', djLang.hitch(this, this.doEditComplement))

          line.lastChild.appendChild(document.createElement('I'))
          line.lastChild.lastChild.setAttribute('class', 'far fa-trash-alt')
          line.lastChild.lastChild.setAttribute('data-artnum-id', byType[k][i].id)
          djOn(line.lastChild.lastChild, 'click', djLang.hitch(this, this.doRemoveComplement))

          divLine.appendChild(line)

          if (byType[k][i].comment !== '') {
            divLine.appendChild(document.createElement('DIV'))
            divLine.lastChild.setAttribute('class', 'comment')
            divLine.lastChild.appendChild(document.createTextNode(byType[k][i].comment))
          }

          divType.appendChild(divLine)
        }

        frag.appendChild(divType)
      }

      var complements = this.complements
      window.requestAnimationFrame(() => {
        while (complements.firstChild) {
          complements.removeChild(complements.firstChild)
        }
        complements.appendChild(frag)
      })

      this.reservation.resize()
    },

    doEditComplement: function (event) {
      if (this.Disabled) { return }
      var id = null
      var node
      var c
      for (var i = event.target; i; i = i.parentNode) {
        if (i.hasAttribute('data-artnum-id')) {
          id = i.getAttribute('data-artnum-id')
          break
        }
      }

      if (id) {
        for (i = 0; i < this.reservation.complements.length; i++) {
          if (this.reservation.complements[i].id === id) {
            c = this.reservation.complements[i]
            break
          }
        }

        this.nComplementId.value = id
        this.nAddEditComplementButton.set('label', '<i class="fas fa-edit"> </i> Éditer')
        this.nNumber.set('value', c.number)
        if (!Number(c.follow)) {
          this.nMFollow.set('value', false)
          this.nMBeginDate.set('value', djDateStamp.toISOString(c.range.begin, {selector: 'date'}))
          this.nMBeginTime.set('value', djDateStamp.toISOString(c.range.begin, {selector: 'time'}))
          this.nMEndDate.set('value', djDateStamp.toISOString(c.range.end, {selector: 'date'}))
          this.nMEndTime.set('value', djDateStamp.toISOString(c.range.end, {selector: 'time'}))
        } else {
          this.nMBeginDate.set('value', djDateStamp.toISOString(this.reservation.get('trueBegin'), {selector: 'date'}))
          this.nMBeginTime.set('value', djDateStamp.toISOString(this.reservation.get('trueBegin'), {selector: 'time'}))
          this.nMEndDate.set('value', djDateStamp.toISOString(this.reservation.get('trueEnd'), {selector: 'date'}))
          this.nMEndTime.set('value', djDateStamp.toISOString(this.reservation.get('trueEnd'), {selector: 'time'}))
          this.nMFollow.set('value', 'on')
        }

        this.nMComment.set('value', c.comment)
        this.nAssociationType.set('value', String(Path.url('store/Status/' + c.type.id)))

        for (i = event.target; i; i = i.parentNode) {
          if (i.hasAttribute('class')) {
            if (i.getAttribute('class') === 'item') {
              node = i; break
            }
          }
        }

        /* reset selection display */
        for (i = this.complements.firstChild; i; i = i.nextSibling) {
          for (var j = i.firstChild; j; j = j.nextSibling) {
            if (j.hasAttribute('class') && j.getAttribute('class') === 'item') {
              djDomStyle.set(j, 'color', '')
            }
          }
        }

        djDomStyle.set(node, 'color', 'grey')
      }
    },

    doResetComplement: function (event) {
      this.nComplementId.value = ''
      this.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter')
      this.nAssociationType.set('value', '')
      this.nNumber.set('value', 1)
      this.nMFollow.set('value', true)
      this.nMBeginDate.set('value', djDateStamp.toISOString(this.reservation.get('trueBegin'), {selector: 'date'}))
      this.nMBeginTime.set('value', djDateStamp.toISOString(this.reservation.get('trueBegin'), {selector: 'time'}))
      this.nMEndDate.set('value', djDateStamp.toISOString(this.reservation.get('trueEnd'), {selector: 'date'}))
      this.nMEndTime.set('value', djDateStamp.toISOString(this.reservation.get('trueEnd'), {selector: 'time'}))
      this.nMComment.set('value', '')
      this.associationRefresh()
    },

    doRemoveComplement: function (event) {
      if (this.Disabled) { return }
      var id = null
      var that = this
      for (var i = event.target; i; i = i.parentNode) {
        if (i.hasAttribute('data-artnum-id')) {
          id = i.getAttribute('data-artnum-id')
          break
        }
      }

      if (id != null) {
        var url = Path.url('store/Association/' + id)
        Query.exec(url, {method: 'DELETE'}).then(function () {
          that.associationRefresh()
        })
      }
    },

    associationRefresh: function () {
      var def = new DjDeferred()
      var that = this
      Req.get(String(Path.url('store/Association/')), { query: { 'search.reservation': this.reservation.get('id') } }).then(function (results) {
        if (results && results.data && results.data.length > 0) {
          var types = []
          results.data.forEach(function (r) {
            if (types.indexOf(r.type) === -1) { types.push(r.type) }
          })

          var t = {}
          types.forEach(function (type) {
            if (type !== '') {
              t[type] = Req.get(type)
            }
          })
          djAll(t).then(function (types) {
            for (var k in types) {
              for (var i = 0; i < results.data.length; i++) {
                if (results.data[i].type === k) {
                  if (types[k] && types[k].data) {
                    results.data[i].type = types[k].data
                  }
                }
              }
            }

            that.reservation.complements = results.data
            that.associationEntries(that.reservation.complements)
            def.resolve()
          })
        } else {
          that.reservation.complements = []
          that.associationEntries([])
          def.resolve()
        }
      })

      return def.promise
    },

    doAddEditComplement: function () {
      var that = this
      var query = {}
      var f = djDomForm.toObject(this.nComplementsForm)

      if (!f.nMFollow) {
        ;['nMBeginDate', 'nMBeginTime', 'nMEndDate', 'nMEndTime'].forEach(function (i) {
          if (f[i] === '') {
            that[i].set('state', 'Error')
          }
        })

        query['begin'] = djDateStamp.toISOString(djDateStamp.fromISOString(f.nMBeginDate + f.nMBeginTime), {zulu: true})
        query['end'] = djDateStamp.toISOString(djDateStamp.fromISOString(f.nMEndDate + f.nMEndTime), {zulu: true})
        query['follow'] = 0
      } else {
        query['begin'] = ''
        query['end'] = ''
        query['follow'] = 1
      }
      query['number'] = f.number ? f.number : 1
      query['target'] = null
      query['comment'] = f.nMComment ? f.nMComment : ''
      query['type'] = f.associationType
      query['reservation'] = this.reservation.get('id')

      if (this.nComplementId.value !== '') {
        query['id'] = this.nComplementId.value
      } else {
        query['id'] = null
      }

      if (query['id'] == null) {
        var url = Path.url('store/Association')
        Query.exec(url, {method: 'post', body: query}).then(function () {
          that.associationRefresh().then(() => { that.reservation.resize() })
        })
      } else {
        url = Path.url('store/Association/' + query['id'])
        Query.exec(url, {method: 'patch', body: query}).then(() => {
          that.associationRefresh().then(() => { that.reservation.resize() })

          that.nComplementId.value = ''
          that.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter')
        })
      }
    },

    evChangeForm: function (event) {
    },

    changeBegin: function (e) {
      if (!this.nDelivery.get('checked')) {
        return
      }
      if (this.reservation.get('deliveryBegin')) {
        var newDate = this.beginDate.get('value').join(this.beginTime.get('value'))
        var diff = djDate.difference(newDate, this.reservation.get('begin'), 'second')
        newDate = djDate.add(this.reservation.get('deliveryBegin'), 'second', -diff)
        this.nDeliveryBeginDate.set('value', newDate)
        this.nDeliveryBeginTime.set('value', newDate)
      }
    },

    changeEnd: function (e) {
      if (!this.nDelivery.get('checked')) {
        return
      }
      if (this.reservation.get('deliveryEnd')) {
        var newDate = this.endDate.get('value').join(this.endTime.get('value'))
        var diff = djDate.difference(newDate, this.reservation.get('end'), 'second')
        newDate = djDate.add(this.reservation.get('deliveryEnd'), 'second', -diff)
        this.nDeliveryEndDate.set('value', newDate)
        this.nDeliveryEndTime.set('value', newDate)
      }
    },

    postCreate: function () {
      this.inherited(arguments)

      var entries = this.reservation.get('entries')
      for (var i = 0; i < entries.length; i++) {
        this.nMachineChange.addOption({
          label: entries[i].target + ' - ' + entries[i].label,
          value: entries[i].target
        })
      }

      djOn(this.nMFollow, 'change', djLang.hitch(this, (e) => {
        if (this.nMFollow.get('value')) {
          djDomStyle.set(this.nMFollowToggle, 'display', 'none')
        } else {
          djDomStyle.set(this.nMFollowToggle, 'display', '')
        }
      }))

      djOn(this.beginDate, 'change', djLang.hitch(this, this.changeBegin))
      djOn(this.beginTime, 'change', djLang.hitch(this, this.changeBegin))
      djOn(this.endDate, 'change', djLang.hitch(this, this.changeEnd))
      djOn(this.endTime, 'change', djLang.hitch(this, this.changeEnd))

      this.nContactsContainer.addChild(new DtContentPane({ title: 'Nouveau contact', content: new Contacts({target: this}) }))
      djOn(this.nForm, 'mousemove', function (event) { event.stopPropagation() })

      this.nMBeginDate.set('value', this.beginDate.get('value'))
      this.nMBeginTime.set('value', this.beginTime.get('value'))
      this.nMEndDate.set('value', this.endDate.get('value'))
      this.nMEndTime.set('value', this.endTime.get('value'))
    },

    disable: function (v) {
      this.Disabled = v
      ;[ 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON' ].forEach(function (type) {
        var inputs = this.domNode.getElementsByTagName(type)
        for (var i = 0; i < inputs.length; i++) {
          var widget = dtRegistry.getEnclosingWidget(inputs[i])
          if (widget) {
            widget.set('disabled', v)
          } else {
            if (v) {
              inputs[i].setAttribute('disabled', 'disabled')
            } else {
              inputs[i].removeAttribute('disabled')
            }
          }
        }
      }.bind(this))
    },

    startup: function () {
      this.inherited(arguments)
      this.load()
    },

    load: async function () {
      this.initCancel()

      var that = this
      this.nMachineChange.set('value', this.reservation.get('target'))

      if (this.reservation.get('title') != null) {
        this.nTitle.set('value', this.reservation.get('title'))
      }

      if (this.reservation.get('folder')) {
        var folder = this.reservation.get('folder')
        this.nFolder.set('value', this.reservation.get('folder'))
        var url = folder
        if (!folder.match(/^[a-zA-Z]*:\/\/.*/)) {
          url = 'file://' + encodeURI(url.replace('\\', '/')).replace(',', '%2C')
        }

        var a = document.createElement('A')
        a.setAttribute('href', url); a.setAttribute('target', '_blank')
        a.appendChild(document.createTextNode(' '))
        a.appendChild(document.createElement('I'))
        a.lastChild.setAttribute('class', 'fas fa-external-link-alt')
        if (this.fLink.previousSibling.nodeName === 'A') {
          this.fLink.parentNode.removeChild(this.fLink.previousSibling)
        }
        this.fLink.parentNode.insertBefore(a, this.fLink)
      }

      if (this.reservation.get('gps')) {
        this.nGps.set('value', this.reservation.get('gps'))

        a = document.createElement('A')
        a.setAttribute('href', 'https://www.google.com/maps/place/' + String(this.reservation.get('gps')).replace(/\s/g, '')); a.setAttribute('target', '_blank')
        a.appendChild(document.createTextNode(' '))
        a.appendChild(document.createElement('I'))
        a.lastChild.setAttribute('class', 'fas fa-external-link-alt')
        if (this.gLink.previousSibling.nodeName === 'A') {
          this.gLink.parentNode.removeChild(this.gLink.previousSibling)
        }
        this.gLink.parentNode.insertBefore(a, this.gLink)
      }

      if (!this.loaded.status) {
        url = Path.url('store/Status')
        url.searchParams.set('search.type', 0)
        var results = await Query.exec(url)
        if (results.type === 'results') {
          var def
          for (var i = 0; i < results.data.length; i++) {
            var d = results.data[i]
            if (d.default === '1') { def = d.id }
            this.nStatus.addOption({ label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name, value: d.id })
          }
        }
        if (def) {
          this.nStatus.set('value', def)
        }
        this.loaded.status = true
      }

      if (!this.loaded.association) {
        url = Path.url('store/Status')
        url.searchParams.set('search.type', 1)
        results = await Query.exec(url)
        if (results.type === 'results') {
          results.data.forEach(function (d) {
            that.nAssociationType.addOption({
              label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
              value: String(Path.url('store/Status/' + d.id))
            })
          })
        }
        that.loaded.association = true
      }

      if (!this.loaded.warehouse) {
        url = Path.url('store/Warehouse')
        results = await Query.exec(url)
        var data = []
        results.data.forEach(function (d) {
          data.push({
            name: 'Dépôt ' + d.name,
            id: d.id
          })
        })
        that.nLocality.set('store', new DjMemory({data: data}))
        that.loaded.warehouse = true
        if (that.reservation.get('warehouse')) {
          that.set('warehouse', that.reservation.get('_warehouse'))
        }
      } else {
        that.set('warehouse', that.reservation.get('_warehouse'))
      }

      if (!this.loaded.user) {
        fetch(Path.url('store/User'), {credentials: 'same-origin'}).then(function (response) { return response.json() }).then(function (json) {
          if (json.type === 'results' && json.data && json.data.length > 0) {
            that.loaded.user = true
            var store = that.get('userStore')
            var storeBis = that.get('userStore_bis')
            for (var i = 0; i < json.data.length; i++) {
              if (!store.get('/store/User/' + json.data[i].id)) {
                store.add({name: json.data[i].name, id: '/store/User/' + json.data[i].id})
              }
              if (!storeBis.get('/store/User/' + json.data[i].id)) {
                storeBis.add({name: json.data[i].name, id: '/store/User/' + json.data[i].id})
              }
            }
          }
          if (that.reservation.get('creator')) {
            that.set('creator', that.reservation.get('creator'))
          } else {
            if (window.localStorage.getItem(Path.bcname('user'))) {
              var _c = JSON.parse(window.localStorage.getItem(Path.bcname('user')))
              that.set('creator', 'store/User/' + _c.id)
            }
          }
          if (that.reservation.get('_arrival') && that.reservation.get('_arrival').creator) {
            that.set('arrivalCreator', that.reservation.get('_arrival').creator)
          } else {
            if (window.localStorage.getItem(Path.bcname('user'))) {
              _c = JSON.parse(window.localStorage.getItem(Path.bcname('user')))
              that.set('arrivalCreator', 'store/User/' + _c.id)
            }
          }
        })
      } else {
        that.set('creator', that.reservation.get('creator'))
      }

      if (this.reservation.is('confirmed') || (this.reservation.get('_arrival') && this.reservation.get('_arrival').id && !this.reservation.get('_arrival').deleted)) {
        this.nConfirmed.set('checked', true)
      }
      this.toggleConfirmed()

      if (this.reservation.get('deliveryBegin') || this.reservation.get('deliveryEnd')) {
        this.nDelivery.set('checked', true)
      } else {
        this.nDelivery.set('checked', false)
      }
      this.toggleDelivery()

      url = Path.url('store/ReservationContact')
      url.searchParams.set('search.reservation', this.reservation.get('id'))
      var res = await Query.exec(url)
      if (res.length > 0) {
        res.data.forEach(djLang.hitch(this, async function (contact) {
          if (contact.freeform) {
            contact.linkId = contact.id
            this.createContact(contact, contact.comment)
          } else {
            var linkId = contact.id
            var comment = contact.comment
            url = Path.url('store/' + contact.target)
            results = await Query.exec(url)
            if (results.length > 0) {
              var e = results.data[0]
              e.linkId = linkId
              this.createContact(e, comment)
            }
          }
        }))
      }

      djAll(this.initRequests).then(djLang.hitch(this, () => {
        if (this.reservation.get('status')) {
          this.nStatus.set('value', this.reservation.get('status'))
        }

        this.doResetComplement()
        this.refresh()
        this.initRequests = []
      }))

      var inputs = this.domNode.getElementsByTagName('input')
      for (var j = 0; j < inputs.length; j++) {
        var name = inputs[j].getAttribute('name')
        if (name && name.substr(0, 2) === 'o-') {
          var other = this.get('other')
          if (other && other[name.substr(2)]) {
            var w = dtRegistry.byNode(inputs[i])
            if (w) {
              w.set('value', other[name.substr(2)])
            } else {
              inputs[j].value = other[name.substr(2)]
            }
          }
        }
      }
    },

    refresh: function () {
      var retval = null
      /* if return is populated be deleted, we still populate the form as to allow to undelete with having the user needing to rewrite everything */
      if ((retval = this.reservation.get('_arrival'))) {
        if (retval.id && !retval.deleted) {
          this.nConfirmed.set('checked', true)
        }
        this.nArrivalDone.set('checked', Boolean(retval.done))
        this.nArrivalInprogress.set('checked', Boolean(retval.inprogress))
        if (retval.reported) {
          var reported = djDateStamp.fromISOString(retval.reported)
          this.nArrivalDate.set('value', djDateStamp.toISOString(reported, {selector: 'date'}))
          this.nArrivalTime.set('value', djDateStamp.toISOString(reported, {selector: 'time'}))
        }

        if (retval.contact) {
          this.nArrivalAddress.set('value', retval.contact)
        }
        if (retval.other) {
          this.nArrivalKeys.set('value', retval.other)
        }
        if (retval.comment) {
          this.nArrivalComment.set('value', retval.comment)
        }
        if (retval.locality) {
          this.nArrivalLocality.set('value', retval.locality)
        }
        if (retval.creator) {
        }
      }

      this.refreshCount()
    },

    toggleDelivery: function () {
      if (this.nDelivery.get('checked')) {
        djDomStyle.set(this.nDeliveryFields, 'display', '')

        if (!this.deliveryBegin) {
          this.nDeliveryBeginTime.set('value', this.beginTime.get('value'))
          this.nDeliveryBeginDate.set('value', this.beginDate.get('value'))
        }
        if (!this.deliveryEnd) {
          this.nDeliveryEndTime.set('value', this.endTime.get('value'))
          this.nDeliveryEndDate.set('value', this.endDate.get('value'))
        }
      } else {
        djDomStyle.set(this.nDeliveryFields, 'display', 'none')
      }
    },

    toggleConfirmedAndReturned: function () {
      if (!this.nConfirmed.get('checked')) {
        this.nConfirmed.set('checked', true)
        this.toggleConfirmed()
      }
      this.nArrivalDone.set('checked', true)
      this.nArrivalInprogress.set('checked', true)
    },

    toggleConfirmed: function () {
      if (this.nConfirmed.get('checked')) {
        var retVal = this.reservation.get('_arrival')
        if (retVal && retVal.id && retVal.reported) {
          this.nArrivalDate.set('value', retVal.reported)
          this.nArrivalTime.set('value', retVal.reported)
        } else {
          this.nArrivalDate.set('value', new Date())
          this.nArrivalTime.set('value', new Date())
        }
        this.nBack.setAttribute('style', '')
        this.endTime.set('readOnly', true)
        this.endDate.set('readOnly', true)
        this.nDeliveryEndTime.set('readOnly', true)
        this.nDeliveryEndDate.set('readOnly', true)
        if (this.get('arrivalCreator')) {

        } else {
          if (window.localStorage.getItem('user')) {
            this.set('arrivalCreator', JSON.parse(window.localStorage.getItem('user')))
          }
        }
      } else {
        this.nBack.setAttribute('style', 'display: none')
        this.endTime.set('readOnly', false)
        this.endDate.set('readOnly', false)
        this.nDeliveryEndTime.set('readOnly', false)
        this.nDeliveryEndDate.set('readOnly', false)
      }
    },

    createContact: function (entry, type) {
      var c = new Card('/Contacts/')

      if (type === '') {
        type = 'Autre'
      }

      c.entry(entry)

      var contact = new DtContentPane({
        title: '<i class="fa fa-user-circle-o" aria-hidden="true"></i> ' + c.getType(type),
        content: c.domNode,
        closable: !this.Disabled,
        contactType: type,
        contactCard: c,
        contactLinkId: entry.linkId,
        contactSup: this,
        style: 'height: 80px;',
        onClose: function (event) {
          var sup = this.contactSup
          if (confirm('Supprimer le contact ' + this.contactCard.getType(this.contactType))) {
            var url = Path.url('store/ReservationContact/' + this.contactLinkId)
            Query.exec(url, {method: 'delete'}).then(function () {
              event.removeChild(this)
              this.contactSup.reservation.modified()
              for (var i in sup.contacts) {
                if (sup.contacts[i].contactLinkId === this.contactLinkId) {
                  sup.contacts[i].destroy()
                  delete sup.contacts[i]
                  break
                }
              }
            }.bind(this))
          }
        }
      })

      for (var k in this.contacts) {
        if (this.contacts[k].contactLinkId === contact.contactLinkId) {
          this.nContactsContainer.removeChild(this.contacts[k])
          this.contacts[k].destroy()
          break
        }
      }
      this.contacts[type + contact.contactLinkId] = contact
      this.nContactsContainer.addChild(this.contacts[type + contact.contactLinkId])
      if (type === '_client') {
        this.nContactsContainer.selectChild(this.contacts[type + contact.contactLinkId])
      }
    },

    saveContact: function (id, options) {
      var that = this
      var type = options.type ? options.type : ''
      if (options.type === '_autre') {
        type = options.comment
      }

      if (id != null) {
        var url = Path.url('store/ReservationContact')
        url.searchParams.set('search.reservation', this.reservation.get('id'))
        url.searchParams.set('search.target', id)
        url.searchParams.set('search.comment', type)
        Query.exec(url).then(djLang.hitch(this, function (results) {
          if (results.length === 0) {
            Query.exec(Path.url('store/ReservationContact'), {method: 'post', body: {reservation: that.reservation.get('id'), comment: type, freeform: null, target: id}}).then(djLang.hitch(this, function (result) {
              if (!result.success) {
                return
              }
              Query.exec(Path.url('store/' + id)).then(djLang.hitch(this, function (c) {
                if (c.success && c.length === 1) {
                  var e = c.data[0]
                  e.linkId = result.data[0].id
                  that.createContact(e, type, true)
                  that.reservation.modified()
                }
              }))
            }))
          }
        }))
      } else {
        url = Path.url('store/ReservationContact')
        url.searchParams.set('search.reservation', this.reservation.get('id'))
        url.searchParams.set('search.target', id)
        url.searchParams.set('search.freeform', options.freeform)
        Query.exec(url).then(djLang.hitch(this, function (results) {
          if (results.length === 0) {
            Query.exec(Path.url('store/ReservationContact'), {method: 'post', body: {reservation: this.reservation.get('id'), comment: type, freeform: options.freeform, target: null}}).then(function (result) {
              if (result.success && result.length === 1) {
                options.linkId = result.data[0].id
                that.createContact(options, type, true)
                that.reservation.modified()
              }
            })
          }
        }))
      }
    },

    show: function () {
      var that = this
      window.requestAnimationFrame(function () { djDomStyle.set(that.domNode.parentNode, 'display', 'block') })
    },

    initCancel: function () {
      for (var i = 0; i < this.initRequests.length; i++) {
        if (!this.initRequests[i].isFulfilled()) {
          this.initRequests[i].cancel()
        }
      }
      this.initRequests = []
    },

    destroy: function (noevent = false) {
      this.CloseInProgress = true
      if (!noevent) {
        window.GEvent('reservation.close', {id: this.reservation.get('id')})
      }
    },

    hide: function () {
      this.close()
    },

    close: function (noevent = false, fromdestroy = false) {
      this.get('_pane')[1].removeChild(this.get('_pane')[0])
      this.get('_pane')[0].destroy()
      this.reservation.myForm = null
      this.reservation.myContentPane = null
      this.destroy(noevent)
    },

    _print: function (type) {
      if (window.localStorage.getItem(Path.bcname('autoprint'))) {
        Query.exec((Path.url('exec/auto-print.php', {params: {type: type, file: 'pdfs/' + type + '/' + this.reservation.get('IDent')}}))).then(function (result) {
          if (result.success) {
            window.App.info('Impression (' + type + ') pour la réservation ' + this.reservation.get('id') + ' en cours')
          } else {
            window.App.error('Erreur d\'impression (' + type + ') pour la réservation ' + this.reservation.get('id'))
          }
        }.bind(this))
      } else {
        window.App.print('../pdfs/' + type + '/' + this.reservation.get('IDent'))
      }
    },

    evPrint: function (event) {
      var printType = null
      if (event.target.getAttribute('data-print-type')) {
        printType = event.target.getAttribute('data-print-type')
      } else {
        for (var node = event.target; node; node = node.parentNode) {
          if (node.getAttribute('data-print-type')) {
            printType = node.getAttribute('data-print-type')
            break
          }
        }
      }
      if (printType) {
        if (this.doSave(event)) {
          this._print(printType)
        }
      }
    },

    doDelete: function (event) {
      var retval = this.reservation.get('_arrival')
      if (this.reservation.remove()) {
        if (retval && retval.id) {
          Query.exec(Path.url('store/Arrival/' + retval.id), {method: 'delete'})
        }
        Query.exec(Path.url('store/Reservation/' + this.reservation.get('id')), {method: 'delete'}).then(function (result) {
          this.reservation.destroy()
          this.hide()
        }.bind(this))
      }
    },

    validate: function () {
      [ this.nDeliveryBeginDate, this.nDeliveryEndDate, this.beginDate, this.endDate ].forEach(function (c) {
        c.set('state', 'Normal')
      })

      var f = this.nForm.get('value')

      if (f.beginDate == null || f.endDate == null || f.beginTime == null || f.endTime == null) {
        this.beginDate.set('state', 'Error')
        this.endDate.set('state', 'Error')
        return ['Début ou fin manquante', false]
      }

      var begin = f.beginDate.join(f.beginTime)
      var end = f.endDate.join(f.endTime)

      if (djDate.compare(begin, end) >= 0) {
        this.beginDate.set('state', 'Error')
        this.endDate.set('state', 'Error')
        return ['La fin de réservation est avant le début', false]
      }

      if (this.nDelivery.get('checked')) {
        var deliveryBegin = f.deliveryBeginDate.join(f.deliveryBeginTime)
        var deliveryEnd = f.deliveryEndDate.join(f.deliveryEndTime)

        if (djDate.compare(deliveryBegin, deliveryEnd) >= 0) {
          this.nDeliveryBeginDate.set('state', 'Error')
          this.nDeliveryEndDate.set('state', 'Error')
          return ['La fin de la livraison est avant le début', false]
        }

        if (djDate.compare(deliveryBegin, begin) === 0 && djDate.compare(deliveryEnd, end) === 0) {
          this.nDelivery.set('checked', false)
          this.toggleDelivery()
          return ['Date de livraison identique à la date de location', false]
        }

        if (djDate.compare(deliveryBegin, begin) > 0) {
          this.beginDate.set('state', 'Error')
          this.nDeliveryBeginDate.set('state', 'Error')
          return ['La fin de la livraison est avant la fin de la location', false]
        }

        if (djDate.compare(deliveryEnd, end) < 0) {
          this.nDeliveryEndDate.set('state', 'Error')
          this.endDate.set('state', 'Error')
          return ['Début de livraison est après le début de la location', false]
        }
      }

      return ['Pas d\'erreur', true]
    },

    doCopy: function (event) {
      this.reservation.copy()
    },

    doSaveAndQuit: function (event) {
      this.doSave().then(function () {
        this.hide()
      }.bind(this))
    },
    doSave: async function (event) {
      if (!this.HashLastSave) {
        this.HashLastSave = this.reservation.get('_hash')
      } else {
        if (this.HashLastSave === this.reservation.get('_hash')) {
          window.App.warn('Dernière sauvegare pas encore validée (double-clique sur "sauvegarder" ?)')
          return false
        } else {
          this.HashLastSave = this.reservation.get('_hash')
        }
      }
      var err = this.validate()
      if (!err[1]) {
        window.App.error(err[0])
        return false
      }
      var changeMachine = false
      if (this.reservation.get('target') !== this.nMachineChange.get('value')) {
        var newEntry = window.App.getEntry(this.nMachineChange.get('value'))
        if (newEntry == null) {
          alert('Déplacement vers machine inexistante')
          return false
        }
        changeMachine = this.reservation.get('target')
        this.reservation.set('sup', newEntry)
        this.reservation.set('previous', changeMachine)
        this.reservation.set('target', this.nMachineChange.get('value'))
      }

      let f = this.nForm.get('value')
      var other = {}
      for (var k in f) {
        if (k.substr(0, 2) === 'o-') {
          other[k.substr(2)] = f[k]
        }
      }
      this.reservation.set('other', other)
      let begin = f.beginDate.join(f.beginTime)
      let end = f.endDate.join(f.endTime)

      let deliveryBegin = begin
      let deliveryEnd = end
      if (this.nDelivery.get('checked')) {
        deliveryBegin = f.deliveryBeginDate.join(f.deliveryBeginTime)
        deliveryEnd = f.deliveryEndDate.join(f.deliveryEndTime)
      } else {
        deliveryBegin = ''
        deliveryEnd = ''
      }

      var res = await Query.exec(Path.url('store/Arrival', {params: {'search.target': this.reservation.get('id')}}))
      var arrival = {target: this.reservation.get('id')}
      if (res.success && res.length > 0) {
        arrival = Object.assign(arrival, res.data[0])
      }

      if (this.nConfirmed.get('checked')) {
        if (f.arrivalDate) {
          if (f.arrivalTime) {
            arrival.reported = f.arrivalDate.join(f.arrivalTime)
          } else {
            arrival.reported = f.arrivalDate
          }
        }
        arrival.comment = f.arrivalComment
        arrival.contact = f.arrivalAddress
        arrival.locality = f.arrivalLocality
        arrival.other = f.arrivalKeys

        if (f.arrivalDone.length > 0) {
          if (!arrival.done) {
            arrival.done = (new Date()).toISOString()
          }
        } else {
          arrival.done = null
        }

        if (f.arrivalInprogress.length > 0) {
          if (!arrival.inprogress) {
            arrival.inprogress = (new Date()).toISOString()
          }
        } else {
          arrival.inprogress = null
        }

        this.reservation.set('_arrival', arrival)
      } else {
        if (arrival.id) {
          this.reservation.set('_arrival', {id: arrival.id, _op: 'delete'})
        } else {
          this.reservation.set('_arrival', null)
        }
      }

      this.reservation.set('status', f.status)
      this.reservation.set('begin', begin)
      this.reservation.set('end', end)
      this.reservation.set('deliveryBegin', deliveryBegin)
      this.reservation.set('deliveryEnd', deliveryEnd)
      this.reservation.set('address', f.nAddress)
      this.reservation.set('reference', f.nReference)
      this.reservation.set('equipment', f.nEquipment)

      var store = this.nLocality.get('store')
      var item = store.query({name: this.nLocality.get('value')})
      if (item.length === 1) {
        this.reservation.set('warehouse', item[0].id)
        this.reservation.set('locality', '')
      } else {
        this.reservation.set('warehouse', '')
        this.reservation.set('locality', f.nLocality)
      }
      this.reservation.set('comment', f.nComments)
      this.reservation.set('note', f.nNote)
      this.reservation.set('folder', f.folder)
      this.reservation.set('gps', f.gps)
      this.reservation.set('title', f.title)

      this.reservation.save()
      var reservation = this.reservation
      if (changeMachine) {
        var entry = window.App.getEntry(reservation.get('target'))
        var oldEntry = window.App.getEntry(changeMachine)
        if (entry) {
          window.App.info('Réservation ' + reservation.get('id') + ' correctement déplacée')
          delete oldEntry.entries[reservation.get('id')]
          entry.entries[reservation.get('id')] = reservation
          entry.resize()
          oldEntry.resize()
        }
      }

      return true
    },

    destroyReservation: function (reservation) {
      this.reservation.destroyReservation(reservation)
    },

    openCount: async function () {
      var count = new Count({reservation: this.reservation.get('id')}) // eslint-disable-line
      count.addEventListener('save', function (event) {
        this.refreshCount()
      }.bind(this))
    },
    openAddCount: async function () {
      var count = new Count({'data-id': '*', addReservation: this.reservation.get('id')}) // eslint-disable-line
      count.addEventListener('save', function (event) {
        this.refreshCount()
      }.bind(this))
    },

    refreshCount: async function () {
      Query.exec(Path.url('store/CountReservation', {params: {'search.reservation': this.reservation.get('id')}})).then(async function (counts) {
        var frag = document.createDocumentFragment()
        if (counts.success && counts.length > 0) {
          var trs = []
          for (var i = 0; i < counts.length; i++) {
            var count = await Query.exec(Path.url('store/Count/' + counts.data[i].count))
            if (count.success && count.length === 1) {
              count = count.data
              if (count.deleted) { continue }
              var tr = document.createElement('TR')
              tr.setAttribute('data-count-id', count.id)
              count.period = ''
              var sortBegin = '0'
              if (count.begin) {
                count.period = (new Date(count.begin)).shortDate(true)
                sortBegin = (new Date(count.begin)).getTime()
              }
              if (count.end) {
                if (count.period !== '') { count.period += ' - ' }
                count.period += (new Date(count.end)).shortDate(true)
              }
              tr.innerHTML = '<td data-id="' + count.id + '">' + count.id + '</td><td>' + (count._invoice ? (count._invoice.winbiz ? count._invoice.winbiz : '') : '') + '</td><td>' + (count._status ? (count._status.name ? count._status.name : '') : '') + '</td><td>' + (count.period ? count.period : '') + '</td>'
              tr.setAttribute('data-sort', sortBegin)
              trs.push(tr)

              tr.addEventListener('click', function (event) {
                if (event.target) {
                  if (!event.target.getAttribute('data-id')) { return }
                  var count = new Count({'data-id': event.target.getAttribute('data-id')})
                  count.addEventListener('save', function (event) {
                    this.refreshCount()
                  }.bind(this))
                }
              }.bind(this))
            }
          }

          trs.sort(function (a, b) {
            a = parseInt(a.getAttribute('data-sort'))
            b = parseInt(b.getAttribute('data-sort'))
            return a - b
          })
          trs.forEach(function (n) {
            frag.appendChild(n)
          })
        }
        window.requestAnimationFrame(function () {
          this.nCountList.innerHTML = ''
          this.nCountList.appendChild(frag)
        }.bind(this))
      }.bind(this))
    }
  })
})
