/* eslint-env browser, amd */
/* global pSBC, locationConfig */
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
  'dijit/Dialog',
  'dijit/layout/TabContainer',
  'dijit/layout/ContentPane',
  'dijit/registry',

  'location/contacts',
  'location/card',
  'location/_Cluster',
  'location/_Request',
  'location/bitsfield',
  'location/dateentry',

  'artnum/Request',
  'artnum/Join'
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
  djMemory,
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
  dtDialog,
  dtTabContainer,
  DtContentPane,
  dtRegistry,

  Contacts,
  Card,
  _Cluster,
  request,
  bitsfield,
  dateentry,

  Req,
  Join
) {
  return djDeclare('location.rForm', [
    dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {
    baseClass: 'rForm',
    templateString: _template,
    contacts: {},
    isLayoutContainer: true,

    resize: function () {
      this.nContactsContainer.resize()
    },

    constructor: function (args) {
      this.reservation = args.reservation
      this.contacts = {}
      this.initRequests = []
      this.loaded = { status: false }
    },

    _setDescriptionAttr: function (value) {
      this.description = value
    },

    _setBeginAttr: function (value) {
      this.beginDate.set('value', value.toISOString())
      this.beginTime.set('value', value.toISOString())
      this._set('begin', value)
      if (!this.get('deliveryBegin')) {
        this.set('deliveryBegin', value)
      }
    },

    _setEndAttr: function (value) {
      this.endDate.set('value', value.toISOString())
      this.endTime.set('value', value.toISOString())
      this._set('end', value)
      if (!this.get('deliveryEnd')) {
        this.set('deliveryEnd', value)
      }
    },

    _setDeliveryBeginAttr: function (value) {
      if (!value) { return }
      this.nDeliveryBeginDate.set('value', value.toISOString())
      this.nDeliveryBeginTime.set('value', value.toISOString())
      this._set('deliveryBegin', value)
    },

    _setDeliveryEndAttr: function (value) {
      if (!value) { return }
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
        this.nAssociationType.set('value', locationConfig.store + '/Status/' + c.type.id)

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
      var id = null
      var that = this
      for (var i = event.target; i; i = i.parentNode) {
        if (i.hasAttribute('data-artnum-id')) {
          id = i.getAttribute('data-artnum-id')
          break
        }
      }

      if (id != null) {
        request.del(locationConfig.store + '/Association/' + id).then(function () {
          that.associationRefresh()
        })
      }
    },

    associationRefresh: function () {
      var def = new DjDeferred()
      var that = this
      Req.get(locationConfig.store + '/Association/', { query: { 'search.reservation': this.reservation.get('id') } }).then(function (results) {
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
        request.post('/location/store/Association/', {query: query}).then(function () {
          that.associationRefresh().then(() => { that.reservation.resize() })
        })
      } else {
        request.put(locationConfig.store + '/Association/' + query['id'], { query: query }).then(() => {
          that.associationRefresh().then(() => { that.reservation.resize() })

          that.nComplementId.value = ''
          that.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter')
        })
      }
    },

    evChangeForm: function (event) {
      console.log(event)
      console.log(this)
    },

    changeBegin: function (e) {
      if (this.reservation.get('deliveryBegin')) {
        var newDate = this.beginDate.get('value').join(this.beginTime.get('value'))
        var diff = djDate.difference(newDate, this.reservation.get('begin'), 'second')
        newDate = djDate.add(this.reservation.get('deliveryBegin'), 'second', -diff)
        this.nDeliveryBeginDate.set('value', newDate)
        this.nDeliveryBeginTime.set('value', newDate)
      }
    },

    changeEnd: function (e) {
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

    startup: function () {
      this.inherited(arguments)
      this.load()
    },

    load: function () {
      this.initCancel()

      var that = this
      var r
      this.nMachineChange.set('value', this.reservation.get('target'))

      if (this.reservation.get('creator')) {
        this.nCreator.set('value', this.reservation.get('creator'))
      }

      if (this.reservation.get('title') == null) {
        this.nTitle.set('placeholder', this.nMachineChange.getOptions(this.nMachineChange.get('value')).label)
        this.set('originalTitle', this.nMachineChange.getOptions(this.nMachineChange.get('value')).label)
      } else {
        this.nTitle.set('value', this.reservation.get('title'))
        this.set('originalTitle', null)
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

      r = request.get(locationConfig.store + '/Status/', {query: {'search.type': 0}})
      this.initRequests.push(r)

      if (!this.loaded.status) {
        r.then(djLang.hitch(this, function (results) {
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
        }))
      }

      r = request.get(locationConfig.store + '/Status/', {query: { 'search.type': 1 }})
      this.initRequests.push(r)
      r.then(function (results) {
        if (results.type === 'results') {
          results.data.forEach(function (d) {
            that.nAssociationType.addOption({
              label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
              value: locationConfig.store + '/Status/' + d.id
            })
          })
        }
      })

      if (this.reservation.is('confirmed') || (this.reservation.get('return') && !this.reservation.get('return').deleted)) {
        this.nConfirmed.set('checked', true)
      }
      this.toggleConfirmed()

      if (this.reservation.is('deliverydate')) {
        this.nDelivery.set('checked', true)
      }
      this.toggleDelivery()

      r = request.get(locationConfig.store + '/ReservationContact/', {query: { 'search.reservation': this.reservation.get('id') }})
      this.initRequests.push(r)
      r.then(djLang.hitch(this, function (res) {
        if (res.success()) {
          res.whole().forEach(djLang.hitch(this, function (contact) {
            if (contact.freeform) {
              contact.linkId = contact.id
              this.createContact(contact, contact.comment)
            } else {
              var linkId = contact.id
              var comment = contact.comment
              r = request.get(locationConfig.store + contact.target)
              this.initRequests.push(r)
              r.then(djLang.hitch(this, function (entry) {
                if (entry.success()) {
                  var e = entry.first()
                  e.linkId = linkId
                  this.createContact(e, comment)
                }
              }))
            }
          }))
        }
      }))

      djAll(this.initRequests).then(djLang.hitch(this, () => {
        if (this.reservation.get('status')) {
          this.nStatus.set('value', this.reservation.get('status'))
        }

        that.doResetComplement()
        that._pane[0].set('title', 'Réservation ' + that.reservation.get('id'))
        this.refresh()
        that.initRequests = []
      }))
    },

    refresh: function () {
      var retval = null
      /* if return is populated be deleted, we still populate the form as to allow to undelete with having the user needing to rewrite everything */
      if ((retval = this.reservation.get('return'))) {
        if (!retval.deleted) {
          this.nConfirmed.set('checked', true)
        }
        this.nReturnDone.set('checked', Boolean(retval.done))
        this.nReturnInprogress.set('checked', Boolean(retval.inprogress))
        if (retval.reported) {
          var reported = djDateStamp.fromISOString(retval.reported)
          this.nReturnDate.set('value', djDateStamp.toISOString(reported, {selector: 'date'}))
          this.nReturnTime.set('value', djDateStamp.toISOString(reported, {selector: 'time'}))
        }

        if (retval.contact) {
          this.nReturnAddress.set('value', retval.contact)
        }
        if (retval.other) {
          this.nReturnKeys.set('value', retval.other)
        }
        if (retval.comment) {
          this.nReturnComment.set('value', retval.comment)
        }
        if (retval.creator) {
          this.nReturnCreator.set('value', retval.creator)
        }
      }
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

    saveReturn: function (retForm) {
      var tx = window.App.DB.transaction('return', 'readwrite')
      var store = tx.objectStore('return')
      retForm._hash = ''
      store.put(retForm)
    },

    toggleConfirmed: function () {
      if (this.nConfirmed.get('checked')) {
        var retVal = this.reservation.get('return')
        if (retVal && retVal.reported) {
          this.nReturnDate.set('value', retVal.reported)
          this.nReturnTime.set('value', retVal.reported)
        } else {
          this.nReturnDate.set('value', new Date())
          this.nReturnTime.set('value', new Date())
        }
        this.nBack.setAttribute('style', '')
        this.endTime.set('readOnly', true)
        this.endDate.set('readOnly', true)
        this.nDeliveryEndTime.set('readOnly', true)
        this.nDeliveryEndDate.set('readOnly', true)
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
        closable: true,
        contactType: type,
        contactCard: c,
        contactLinkId: entry.linkId,
        contactSup: this,
        style: 'height: 80px;',
        onClose: function (event) {
          var sup = this.contactSup
          if (confirm('Supprimer le contact ' + this.contactCard.getType(this.contactType))) {
            request.del(locationConfig.store + '/ReservationContact/' + this.contactLinkId).then(function () {
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
        request.get(locationConfig.store + '/ReservationContact/', { query: {
          'search.reservation': this.reservation.get('id'),
          'search.target': id,
          'search.comment': type
        }}).then(djLang.hitch(this, function (results) {
          if (results.count() === 0) {
            request.post(locationConfig.store + '/ReservationContact/', {method: 'post', query: { reservation: that.reservation.get('id'), comment: type, freeform: null, target: id }})
              .then(djLang.hitch(this, function (results) {
                request.get(locationConfig.store + '/' + id, { skipCache: true }).then(djLang.hitch(this, function (c) {
                  var e = c.first()
                  e.linkId = results.first().id
                  that.createContact(e, type, true)
                  that.reservation.modified()
                }))
              }))
          }
        }))
      } else {
        request.get(locationConfig.store + '/ReservationContact', { query: {
          'search.reservation': this.reservation.get('id'),
          'search.comment': type,
          'search.freeform': options.freeform}}).then(djLang.hitch(this, function (results) {
          if (results.count() === 0) {
            request.post(locationConfig.store + '/ReservationContact/', { query: {
              reservation: this.reservation.get('id'), comment: type, freeform: options.freeform, target: null}}).then(function (result) {
              if (result.success()) {
                options.linkId = result.first().id
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

    destroy: function () {
      this.reservation.closeForm()
      this.initCancel()
      this.inherited(arguments)
    },

    hide: function () {
      window.App.unsetOpen(this.reservation.get('IDent'))
      this.get('_pane')[1].removeChild(this.get('_pane')[0])
      this.get('_pane')[0].destroy()
      this.reservation.myForm = null
      this.reservation.myContentPane = null
      this.destroy()
    },

    doPrint: function (event) {
      window.App.print('pdfs/decompte/' + this.reservation.get('IDent'))
    },
    doMission: function (event) {
      window.App.print('pdfs/mission/' + this.reservation.get('IDent'))
    },

    doDelete: function (event) {
      var retval = this.reservation.get('return')
      if (this.reservation.remove()) {
        var that = this
        request.put(locationConfig.store + '/Reservation/' + this.reservation.get('IDent'), { data: { 'deleted': new Date().toISOString(), 'id': this.reservation.get('IDent') } }).then(function () {
          if (retval && retval.id) {
            request.del(locationConfig.store + '/Return/' + retval.id)
          }
          that.hide()
        })
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

      if (!f.creator) {
        this.nCreator.set('state', 'Error')
        return ['Champs responsable de la location manquant', false]
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
      if (this.doSave()) {
        this.hide()
      }
    },
    doSave: function (event) {
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
        this.reservation.set('title', this.get('originalTitle'))
      }

      let f = this.nForm.get('value')
      let begin = f.beginDate.join(f.beginTime)
      let end = f.endDate.join(f.endTime)

      this.reservation.setIs('deliverydate', this.nDelivery.get('checked'))

      let deliveryBegin = begin
      let deliveryEnd = end
      if (this.reservation.is('deliverydate')) {
        deliveryBegin = f.deliveryBeginDate.join(f.deliveryBeginTime)
        deliveryEnd = f.deliveryEndDate.join(f.deliveryEndTime)
      } else {
        deliveryBegin = null
        deliveryEnd = null
      }

      if (this.nConfirmed.get('checked')) {
        var currentRet = this.reservation.get('return') ? this.reservation.get('return') : {}
        var retVal = {}
        if (f.returnDate) {
          if (f.returnTime) {
            retVal.reported = f.returnDate.join(f.returnTime)
          } else {
            retVal.reported = f.returnDate
          }
        }
        retVal.comment = f.returnComment
        retVal.contact = f.returnAddress
        retVal.locality = f.returnLocality
        retVal.other = f.returnKeys
        retVal.creator = f.returnCreator
        if (f.returnDone.length > 0 && !currentRet.done) {
          retVal.done = djDateStamp.toISOString(new Date())
        } else if (f.returnDone.length <= 0 && currentRet.done) {
          retVal.done = null
        } else {
          retVal.done = currentRet.done
        }
        if (f.returnInprogress.length > 0 && !currentRet.inprogress) {
          retVal.inprogress = djDateStamp.toISOString(new Date())
        } else if (f.returnInprogress.length <= 0 && currentRet.inprogress) {
          retVal.inprogress = null
        } else {
          retVal.inprogress = currentRet.inprogress
        }
        retVal.target = this.reservation.get('id')
        if (currentRet.id) {
          retVal.id = currentRet.id
        }
        this.reservation.set('return', retVal)
      } else {
        currentRet = this.reservation.get('return')
        if (currentRet) {
          Req.del('/location/store/Return/' + currentRet.id)
          this.reservation.set('return', null)
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
      this.reservation.set('locality', f.nLocality)
      this.reservation.set('comment', f.nComments)
      this.reservation.set('folder', f.folder)
      this.reservation.set('gps', f.gps)
      this.reservation.set('creator', f.creator)

      if (f.title !== '') {
        this.reservation.set('title', f.title)
      } else {
        if (!this.get('originalTitle')) {
          this.reservation.set('title', '')
        }
      }

      var save = this.reservation.save()
      var reservation = this.reservation
      if (changeMachine) {
        save.then((result) => {
          var entry = window.App.getEntry(reservation.get('target'))
          var oldEntry = window.App.getEntry(changeMachine)
          if (entry) {
            reservation.set('sup', entry)
            reservation.modified()
            window.App.info('Réservation ' + reservation.get('id') + ' correctement déplacée')
            delete oldEntry.entries[reservation.get('id')]
            entry.entries[reservation.get('id')] = reservation
          }
        })
      }

      return true
    },

    destroyReservation: function (reservation) {
      this.reservation.destroyReservation(reservation)
    }

  })
})
