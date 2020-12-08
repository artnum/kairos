/* eslint-env browser, amd */
/* global APPConf, pSBC, Artnum, Select, MButton */
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
  'dijit/form/NumberTextBox',
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
  'location/countList',
  'location/Stores/Locality',
  'location/Stores/Machine',
  'location/Stores/Status',
  'location/Stores/Unit',
  'location/rform/handler',
  'location/rform/section',
  
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
  djNumberTextBox,
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
  CountList,
  Locality,
  Machine,
  Status,
  Unit,
  RFormHandler,
  RFormSection,
  
  Req,
  Path,
  Query
) {
  return djDeclare('location.rForm', [dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented,
                                      RFormHandler, RFormSection], {
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
      this.historyList = {}
      this.contacts = {}
      this.initRequests = []
      this.LocalData = {}
      this.loaded = {status: false, warehouse: false, association: false, user: false}
      this.deleted = false
      
      window.GEvent.listen('count.reservation-add', function (event) {
        if (event.detail.reservation && event.detail.reservation === this.reservation.uid) {
          this.refreshCount()
        }
      }.bind(this))
      window.GEvent.listen('reservation.close', function (event) {
        if (event.detail.id && event.detail.id === this.reservation.uid) {
          if (!this.CloseInProgress) {
            this.close(true)
          }
        }
      }.bind(this))
      if (args && args.deleted) {
        this.deleted = args.deleted
      }

      if (args.reservation && args.reservation.sup && args.reservation.isNew) {
        this.Defaults = Query.exec(Path.url('store/Entry', {params: {'search.ref': args.reservation.sup.target, 'search.name': '~default.%'}}))
        this.isNew = true
      } else {
        this.Defaults = null
        this.isNew = false
      }
    },

    _setDescriptionAttr: function (value) {
      this.description = value
    },

    _setLocality: function (value) {
      this._set('locality', value)
      this.nLocality.value = value
    },

    _setWarehouseAttr: function (value) {
      if (!value) { return }
      Query.exec(Path.url(`store/Warehouse/${value}`)).then((result) => {
        if (result.success && result.length === 1) {
          this._set('warehouse', value)
          this._set('locality', `Warehouse/${value}`)
          this.nLocality.value = `Warehouse/${value}`
        }
      })
    },
    _setCreatorAttr: function (value) {
      this.nCreator.value = value
    },
    _setTechnicianAttr: function (value) {
      this.nTechnician.value = value
    },
    _setArrivalCreatorAttr: function (value) {
      this.nArrivalCreator.value = value
    },
    _setVreportAttr: function (value) {
      this.nAddReport.value = value
    },
    _setStatusAttr: function (value) {
      this.nStatus.value = value
    },
    _setPadlockAttr: function (value) {
      this.nPadlock.set('value', value)
    },
    _setDeliveryRemarkAttr: function (value) {
      this.nDeliveryRemark.set('value', value)
    },
    _setVisitAttr: function (value) {
      this.nAddVisit.value = value
      if (this.nAddVisit.value) {
        this.nAddReport.disabled = false
      } else {
        this.nAddReport.disabled = true
      }
    },

    _setBeginAttr: function (value) {
      this.beginDate.set('value', value.toISOString())
      this.beginTime.value = value.toISOString()
      this._set('begin', value)
    },

    _setEndAttr: function (value) {
      this.endDate.set('value', value.toISOString())
      this.endTime.value = value.toISOString()
      this._set('end', value)
    },

    _setDeliveryBeginAttr: function (value) {
      if (!value) {
        this._set('deliveryBegin', null)
        return
      }
      this.nDeliveryBeginDate.set('value', value.toISOString())
      this.deliveryBeginTime.value = value.toISOString()
      this._set('deliveryBegin', value)
    },

    _setDeliveryEndAttr: function (value) {
      if (!value) {
        this._set('deliveryEnd', null)
        return
      }
      this.nDeliveryEndDate.set('value', value.toISOString())
      this.deliveryEndTime.value = value.toISOString()
      this._set('deliveryEnd', value)
    },

    _setAddressAttr: function (value) {
      if (value) {
        this.nAddress.value = value
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

    _setCommentAttr: function (value) {
      if (value) {
        this.nComments.set('value', value)
      }
    },
    _setNoteAttr: function (value) {
      if (value) {
        let d = document.createElement('DIV')
        d.classList.add('backward')
        d.innerHTML = value
        window.requestAnimationFrame(() => {
          this.nNewNote.appendChild(d)
        })
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
      this.associationRefresh().then (() => {}, () => {KAIROS.error('Reject de l\'opération') })
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
          that.associationRefresh().then(() => {}, () => {KAIROS.error('Reject de l\'opération') })
        })
      }
    },

    associationRefresh: function () {
      return new Promise((resolve, reject) => {
        let url = new URL('store/Association', KAIROS.getBase())
        url.searchParams.append('search.reservation', this.reservation.get('uid'))
        fetch(url).then((response) => {
          if (!response.ok) { return }
          response.json().then(results => {
            if (results.length > 0) {
              let types = []
              let queries = []
              for (let i = 0; i < results.length; i++) {  
                let entry = results.data[i]
                if (types.indexOf(entry.type) === -1) {
                  let query = fetch(new URL(entry.type, KAIROS.getBase()))
                  queries.push(new Promise((resolve, reject) => {
                    query.then (response => {
                      if (!response.ok) { resolvedType[entry.type] = null; return }
                      response.json().then(result => {
                        if (result.length !== 1) { resolve(null); return }
                        if (Array.isArray(result.data)) { resolve(result.data[0]) }
                        else { resolve(result.data) }
                      })
                    })
                  }))
                }
              }

              Promise.all(queries).then(types => {
                let complements = results.data
                for (let i = 0; i < complements.length; i++) {
                  let type = complements[i].type.split('/')
                  type = type[type.length - 1]
                  for (let j = 0; j < types.length; j++) {
                    if (types[j].id === type) {
                      complements[i].type = types[j]
                    }
                  }
                }
                this.reservation.complements = complements
                this.associationEntries(this.reservation.complements)
                resolve()
                return
              })
              resolve()
              return
            } else {
              this.reservation.complements = []
              this.associationEntries([])
              resolve()
              return
            }
          }, () => reject())
        }, () => reject())
      })
    },

    doAddEditComplement: function () {
      var query = {}
      var f = djDomForm.toObject(this.nComplementsForm)

      if (!f.nMFollow) {
        ;['nMBeginDate', 'nMBeginTime', 'nMEndDate', 'nMEndTime'].forEach(i => {
          if (f[i] === '') {
            this[i].set('state', 'Error')
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
      query['reservation'] = this.reservation.uid

      if (this.nComplementId.value !== '') {
        query['id'] = this.nComplementId.value
      } else {
        query['id'] = null
      }

      if (query['id'] == null) {
        let url = new URL(`${KAIROS.getBase()}/store/Association`)
        fetch(url, {method: 'post', body: JSON.stringify(query)}).then(response => {
          if (!response.ok) { return }
          this.associationRefresh().then(() => { this.reservation.resize() }, () => {KAIROS.error('Reject de l\'opération') })
        })
      } else {
        let url = new URL(`${KAIROS.getBase()}/store/Association/${query.id}`)
        fetch(url, {method: 'patch', body: JSON.stringify(query)}).then(response => {
          if (!response.ok) { return }
          this.associationRefresh().then(() => { this.reservation.resize() }, () => {KAIROS.error('Reject de l\'opération') })
          this.nComplementId.value = ''
          this.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter')
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
        var newDate = this.beginDate.get('value').join(this.beginTime.value)
        var diff = djDate.difference(newDate, this.reservation.get('begin'), 'second')
        newDate = djDate.add(this.reservation.get('deliveryBegin'), 'second', -diff)
        this.nDeliveryBeginDate.set('value', newDate)
        this.deliveryBeginTime.value = newDate
      }
    },

    changeEnd: function (e) {
      if (!this.nDelivery.get('checked')) {
        return
      }
      if (this.reservation.get('deliveryEnd')) {
        var newDate = this.endDate.get('value').join(this.endTime.value)
        var diff = djDate.difference(newDate, this.reservation.get('end'), 'second')
        newDate = djDate.add(this.reservation.get('deliveryEnd'), 'second', -diff)
        this.nDeliveryEndDate.set('value', newDate)
        this.deliveryEndTime.value = newDate
      }
    },

    buttonCreate: function () {
      this.Buttons = {
        save: new MButton(this.nSaveButton, [
          {label: 'Sauvergarder', events: {click: this.doSave.bind(this)}}
        ]),
        copy: new MButton(this.nCopyButton),
        printMission: new MButton(this.nPrintMission, [
          {label: 'Afficher mission', events: {click: () => this.showPrint('mission')}},
          {label: 'Afficher bon de travail', events: {click: () => this.showPrint('bulletin', {forceType: 'travail'})}},
          {label: 'Afficher bulletin de livraison', events: {click: () => this.showPrint('bulletin', {forceType: 'livraison'})}},
          {label: 'Imprimer mission', events: {click: () => this.autoPrint('mission')}},
          {label: 'Imprimer bon de travail', events: {click: () => this.autoPrint('bulletin', {forceType: 'travail'})}},
          {label: 'Imprimer bulletin de livraison', events: {click: () => this.autoPrint('bulletin', {forceType: 'livraison'})}}
        ]),
        printRecu: new MButton(this.nPrintRecu, [
          {label: 'Afficher reçu', events: {click: () => this.showPrint('decompte')}}
        ]),
        addCount: new MButton(this.nAddCount, [
          {label: 'Ajouter à un décompte', events: {click: () => this.openAddCount()}}
        ]),
        del: new MButton(this.nDelete),
        addVisit: new MButton(this.nAddVisit, { set: () => (new Date()).toISOString(), unset: '' }),
        addVReport: new MButton(this.nAddReport, { set: () => (new Date()).toISOString(), unset: '' }),
        addArrivalInProgress: new MButton(this.nArrivalInprogress, { set: () => (new Date()).toISOString(), unset: '' }),
        addArrivalDone: new MButton(this.nArrivalDone, { set: () => (new Date()).toISOString(), unset: '' }),
        addControl: new MButton(this.nControl, {set:true, unset: false}),
        addEnd: new MButton(this.nConfirmed, { set: () => (new Date()).toISOString(), unset: '' }),
        addEndAndDone: new MButton(this.nConfirmedAndReturned),
        addFault: new MButton(this.nFault),
        addBreak: new MButton(this.nBreak)
      }

      this.Buttons.del.addEventListener('click', () => {
        this.doDelete()
      })
      this.Buttons.addCount.addEventListener('click', () => {
        this.openCount()
      })
      this.Buttons.printRecu.addEventListener('click', () => {
        this.autoPrint('decompte')
      })
      this.Buttons.printMission.addEventListener('click', () => {
        this.autoPrint('mission').then(
          () => {
            this.autoPrint('bulletin')
          }
        )
      })
      this.Buttons.copy.addEventListener('click', this.doCopy.bind(this))
      this.Buttons.save.addEventListener('click', this.doSaveAndQuit.bind(this))

      this.Buttons.addEnd.linkDisabledState(this.Buttons.addArrivalInProgress)
      this.Buttons.addArrivalInProgress.linkDisabledState(this.Buttons.addArrivalDone)
      this.Buttons.addArrivalDone.linkDisabledState(this.Buttons.addControl)
      this.Buttons.addVisit.linkDisabledState(this.Buttons.addVReport)

      this.Buttons.addEnd.addEventListener('set', event => {
        let url = new URL(`${KAIROS.getBase()}/store/Arrival`)
        url.searchParams.append('search.reservation', this.reservation.id)
        
        let fetchArrival = new Promise((resolve, reject) => {
          fetch(url).then(response => {
            if (!response.ok) { resolve(null); return }
            response.json().then(result => {
              if (result.length === 1) {
                resolve(result.data[0])
              } else {
                resolve(null)
              }
            })
          })
        })
        Promise.all([fetchArrival, UserStore.getCurrentUser()]).then((arrival, user) => {
          if (arrival !== null) {
            if (arrival.inprogress) {
              this.Buttons.addArrivalInProgress.setValue(true)
            }
            if (arrival.done) {
              this.Buttons.addArrivalDone.setValue(true)
            }
            this.nArrivalDate.set('value', arrival.reported)
            this.nArrivalTime.set('value', arrival.reported)
            this.nArrivalCreator.value = arrival.creator
          } else {
            this.Buttons.addArrivalInProgress.setValue(false)
            this.Buttons.addArrivalDone.setValue(false)
            this.nArrivalDate.set('value', new Date())
            this.nArrivalTime.set('value', new Date())
            this.nArrivalCreator.value = user.getUrl()
          }
          window.requestAnimationFrame(() => {
            this.nBack.style.removeProperty('display')
          })
        })
      })

      this.Buttons.addEnd.addEventListener('unset', event => {
        UserStore.getCurrentUser().then(user => {
          this.nArrivalDone = false
          this.nArrivalInprogress = false

          window.requestAnimationFrame(() => {
            this.nBack.style.setProperty('display', 'none')
          })
        })
      })

      this.Buttons.addArrivalDone.addEventListener('set', event => {
        let id = this.reservation.id
        Promise.all([UserStore.getCurrentUser(), KairosEvent.hasAnyEventOfType(KAIROS.events['autoReturn'], id)]).then(([user, has]) => {
          if (!has) {
            KairosEvent('autoReturn', {technician: user.getUrl(), reservation: id, append: true}).then(() => {
              this.interventionReload()
            })
          }
        })
      })
      this.Buttons.addArrivalDone.addEventListener('unset', event => {
        let id = this.reservation.id
        KairosEvent.hasAnyEventOfType(KAIROS.events['autoReturn'], id).then(has => {
          if (has) {
            KairosEvent.removeAutoAdded('autoReturn', id).then(() => {
              this.interventionReload()
            })
          }
        })
      })


      this.nConfirmedAndReturned.addEventListener('click', (event) => {
        event.preventDefault()
        this.toggleConfirmedAndReturned()
      })
      this.nArrivalInprogress.addEventListener('change', (event) => {
        if (event.target.value) {
          this.nArrivalDone.disabled = false
        } else {
          this.nArrivalDone.disabled = true
        }
      })

      this.Buttons.addControl.addEventListener('change', event => {
        if (!event.target.value) {
          this.Buttons.addControl.setColorFlavor('')
          KairosEvent.removeAutoAdded('autoCheck', this.reservation.id).then(() => { this.interventionReload() })
          this.Buttons.addControl.popup.close()
        } else {
          const Form = `<form>
              <div class="radiogroup">État :  <br><span class="state radiolike" data-checked="1" data-flavor="green" data-value="${KAIROS.events.autoCheck[0]}"><i class="fas fa-smile"></i> En ordre</span>
                      <span class="state radiolike" data-flavor="yellow" data-value="${KAIROS.events.autoCheck[1]}"><i class="fas fa-meh"></i> Défaut</span>
                      <span class="state radiolike" data-flavor="red" data-value="${KAIROS.events.autoCheck[2]}"><i class="fas fa-frown"></i> Panne</span></div><br>
              Remarque : <input type="text" name="comment" value="" /><br>
              <input type="submit" value="Valider">
              </form>
            `
            const element = document.createElement('DIV')
            element.classList.add('addControl')
            element.innerHTML = Form
            let radioGroup
            element.querySelectorAll('.radiogroup').forEach (node => {
              radioGroup = new RadioLikeGroup(node)
            })
            let popup = new KPopup('Contrôle', {reference: event.target})
            popup.setContentDiv(element)
            popup.open().then((content) => {
              content.querySelector('input[name="comment"]').focus()
            })
            this.Buttons.addControl.popup = popup
            element.addEventListener('submit', event => {
              event.preventDefault()
              let form = new FormData(event.target)
              UserStore.getCurrentUser().then(current => {
                KairosEvent('autoCheck', {
                  reservation: this.reservation.id,
                  type: radioGroup.value,
                  technician: current.getUrl(),
                  comment: form.get('comment'),
                  append: true
                }).then(() => { this.interventionReload(); popup.close() })
              })
            })
        }
      })
      this.interventionSetCheckButton()

      const AddMessageBox = `
        <form>
        Remarque : <input type="text" name="comment" value="" /><br>
        <input type="submit" value="Valider">
        </form>
      `
      const AddEventFunction = (formNode, type, popup) => {
        let form = new FormData(formNode)
        UserStore.getCurrentUser().then(current => {
          KairosEvent.createNewChain('shortEvent', this.reservation.id, form.get('comment'), current.getUrl(), type).then(() => { 
            this.interventionReload();
            popup.close()
          })  
        })
      }

      this.Buttons.addFault.addEventListener('click', event => {
        let popup = new KPopup('Ajout panne', {
          content: AddMessageBox,
          reference: this.Buttons.addFault
        })
        popup.open()
        popup.addEventListener('submit', event => {
          event.preventDefault()
          AddEventFunction(event.target, KAIROS.events.autoCheck[1], popup)
        })
      })

      this.Buttons.addBreak.addEventListener('click', event => {
        let popup = new KPopup('Ajout défaut', {
          content: AddMessageBox,
          reference: this.Buttons.addBreak
        })
        popup.open()
        popup.addEventListener('submit', event => {
          event.preventDefault()
          AddEventFunction(event.target, KAIROS.events.autoCheck[2], popup)
        })
      })
    },

    interventionSetCheckButton: function () {
      KairosEvent.hasAutoAdded('autoCheck', this.reservation.id).then(evenement => {
        if (evenement) {
          this.Buttons.addControl.setDisabled(false)
          this.Buttons.addControl._setValue(true)
          switch(evenement.type) {
            case KAIROS.events.autoCheck[0]: this.Buttons.addControl.setColorFlavor('green'); break
            case KAIROS.events.autoCheck[1]: this.Buttons.addControl.setColorFlavor('yellow'); break
            case KAIROS.events.autoCheck[2]: this.Buttons.addControl.setColorFlavor('red'); break
          }
        } else {
          this.Buttons.addControl._setValue(false)
          this.Buttons.addControl.setColorFlavor('')
        }
      }, () => {
        this.Buttons.addControl._setValue(false)
        this.Buttons.addControl.setColorFlavor('')
      })
    },

    interventionGetDomNode: function () {
      let node = this.domNode.getElementsByTagName('fieldset')
      let fset = null
      for (let k in node) {
        if (node[k].classList.contains('intervention')) {
          fset = node[k]
          break
        }
      }
      return fset
    },

    interventionCreate: function () {
      return new Promise((resolve, reject) => {
        this.Stores.Status1 = new Status({type: 3})
        let fset = this.interventionGetDomNode()
        if (fset === null) { return }
        this.Intervention = {}
        let button = null
        let inputs = [...fset.getElementsByTagName('input'), ...fset.getElementsByTagName('button')]
        for (let k in inputs) {
          switch (inputs[k].name) {
          case 'iDate':
            inputs[k].value = new Date().toISOString().split('T')[0]
            break
          case 'iType':
            this.Intervention.type = new Select(inputs[k], this.Stores.Status1, {allowFreeText: false, realSelect: true})
            break
          case 'iPerson':
            this.Intervention.person = new Select(inputs[k], new UserStore(), {allowFreeText: true, realSelect: true})
            break
          case 'iAdd':
            button = inputs[k]
            break
          }
        }
        button = new MButton(button)
        button.addEventListener('click', this.interventionAdd.bind(this))
        this.interventionReload(fset)
      })
    },

    interventionAdd: function (event) {
      event.preventDefault()
      let fset = event.target
      for (; fset && fset.nodeName !== 'FIELDSET'; fset = fset.parentNode) ;
      let inputs = fset.getElementsByTagName('input')
      let data = {reservation: this.reservation.get('id'), technician: this.Intervention.person.value, type: this.Intervention.type.value}
      let prevs = []
      if (fset.dataset.previous) {
        prevs = fset.dataset.previous.split(',')
      }
      for (let k in inputs) {
        switch (inputs[k].name) {
          case 'iDate':
            let day
            try {
              day = new Date(inputs[k].value)
              day.setHours(12, 0, 0)
            } catch (e) {
              day = new Date()
            }
            data.date = day.toISOString()
            break
          case 'iComment': data.comment = inputs[k].value === undefined ? '' : inputs[k].value; break
        }
      }
      let queries = []
      do {
        let prev = prevs.pop()
        if (prev) {
          data.previous = String(prev).trim()
        }
        queries.push(fetch(new URL('store/Evenement', KAIROS.getBase()), {method: 'post', body: JSON.stringify(data)}))
      } while (prevs.length > 0)
      Promise.all(queries).then((responses) => {
        this.interventionReload(fset)
        this.interventionClearForm(fset)
      })
    },

    interventionClearForm: function (fset = null) {
      if (!fset) {
        fset = this.interventionGetDomNode()
        if (!fset) { return }
      }
      let inputs = fset.getElementsByTagName('input')
      for (let k in inputs) {
        if (inputs[k].name === 'iDate') {
          window.requestAnimationFrame(() => inputs[k].value = (new Date()).toISOString().split('T')[0])
        } else if (inputs[k].name === 'iPerson') {
          this.Intervention.person.clear()
        } else if (inputs[k].name === 'iType') {
          this.Intervention.type.clear()
        } else {
          window.requestAnimationFrame(() => inputs[k].value = '')
        }
      }
      fset.dataset.previous = ''
    },

    interventionReload: function (fset = null) {
      if (!fset) {
        fset = this.interventionGetDomNode()
        if (!fset) { return }
      }
      Query.exec(Path.url('store/Evenement/.unified', {params: {'search.reservation': this.reservation.get('uid'), 'sort.date': 'DESC'}})).then(async function (results) {
        let div = fset.getElementsByTagName('DIV')
        for (let i = 0; i < div.length; i++) {
          if (div[i].getAttribute('name') === 'iContent') {
            div = div[i]
            break
          }
        }
        if (!div) { return }
        let frag = document.createDocumentFragment()
        for (let i = 0; i < results.length; i++) {
          let n = document.createElement('DIV')
          n.classList.add('event')
          n.dataset.id = results.data[i].id
          let date = new Date(results.data[i].date)

          let technician = results.data[i].technician
          if (technician) {
            try {
              let t = await this.Stores.User.get(technician)
              if (t !== null) {
                technician = t.name
              } else {
                technician = ''
              }
            } catch (e) {
              technician = ''
            }
          } else {
            technician = ''
          }
          let type = results.data[i].type
          let color = 'black'
          if (type) {
            t = await this.Stores.Status1.get(type)
            if (t !== null) {
              type = t.name
              color = t.color
            }
          } else {
            type = ''
          }

          let comment = results.data[i].comment
          n.style.color = color
          n.innerHTML = `<span class="date">${date.fullDate()}</span><span class="type">${type}</span><span class="technician">${technician}</span><span class="buttons"><span class="reply"><i class="fas fa-reply"></i></span><span class="delete"><i class="far fa-trash-alt"> </i></span></span>${comment === '' ? '' : '<span class="comment">' + comment + '</span>'}`
          for (let s = n.firstElementChild; s; s = s.nextElementSibling) {
            if (s.classList.contains('buttons')) {
              s.addEventListener('click', (event) => {
                let node = event.target
                while (node && node.nodeName !== 'SPAN') {
                  node = node.parentNode
                }
                if(node.classList.contains('delete')) {
                  this.interventionDelete(event)
                } else if (node.classList.contains('reply')) {
                  this.interventionReply(event)
                }
              })
            }
          }
          frag.appendChild(n)
        }
        this.interventionSetCheckButton()
        window.requestAnimationFrame(() => {
          div.innerHTML = ''
          div.appendChild(frag)
        })
      }.bind(this))
    },

    interventionReply: function (event) {
      let node = event.target
      while (node && !node.classList.contains('event')) {
        node = node.parentNode
      }
      if (node.dataset.id === undefined) {
        KAIROS.error('Aucun identifiant sur l\'élément selectionné')
        return
      }
      let fset = node
      while (fset && fset.nodeName !== 'FIELDSET') {
        fset = fset.parentNode
      }

      if (node.classList.contains('replying')) {
        window.requestAnimationFrame(() => node.classList.remove('replying'))
        let a = fset.dataset.previous.split(',')
        let b = []
        a.forEach((e) => {
          if (String(e).trim() !== String(node.dataset.id).trim()) {
            b.push(String(e).trim())
          }
        })
        fset.dataset.previous = b.join(',')
      } else {
        window.requestAnimationFrame(() => node.classList.add('replying'))
        if (fset.dataset.previous === undefined || fset.dataset.previous === '') {
          fset.dataset.previous = node.dataset.id
        } else {
          fset.dataset.previous += `,${node.dataset.id}`
        }
      }
    },

    interventionDelete: function (event) {
      let fset = event.target
      while (fset && fset.nodeName !== 'FIELDSET') {
        fset = fset.parentNode
      }
      let line = event.target
      for (; line && line.dataset.id === undefined; line = line.parentNode) ;
      let id = line.dataset.id
      fetch(Path.url(`store/Evenement/${id}`), {method: 'delete', headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})}).then((result) => {
        if (!result.ok) {
          KAIROS.error(`Suppression de l'évènmenent ${id} a échoué`)
        }
        this.interventionReload(fset)
        this.interventionClearForm(fset)
      })
    },

    postCreate: function () {
      if (!window.OpenedForm) {
        window.OpenedForm = {}
      }
      window.OpenedForm[this.reservation.uid] = this
      window.onbeforeunload = (event) => {
        event.preventDefault()
        event.returnValue = ''
      }
      this.PostCreatePromise = new Promise((resolve, reject) => {
        this.nMissionDrop.addEventListener('paste', this.evCopyDrop.bind(this), { capture: true })
        this.nMissionDrop.addEventListener('drop', this.evCopyDrop.bind(this), { capture: true })
        this.nMissionDrop.addEventListener('dragover', (event) => {
          event.stopPropagation()
          event.preventDefault()
          let n = event.target
          for (; n && n.nodeName !== 'DIV'; n = n.parentNode);
          n.classList.add('dragOver')
        }, { capture: true })
        this.nMissionDrop.addEventListener('dragleave', (event) => {
          event.stopPropagation()
          event.preventDefault()
          let n = event.target
          for (; n && n.nodeName !== 'DIV'; n = n.parentNode);
          n.classList.remove('dragOver')
        }, { capture: true })

        let L = new Locality()
        let U = new UserStore()
        let M = new Machine()
        let S = new Status({type: '0'})
        this.Stores = {
          Locality: L,
          User: new UserStore(),
          Machine: M,
          Unit: new Unit()
        }
        let namedNode = this.domNode.querySelectorAll('*[name]')
        for (let i of namedNode) {
          switch (i.getAttribute('name')) {
            case 'offerUnit':
              new Select(i, this.Stores.Unit, { allowFreeText: false, realSelect: true })
              break
          }
        }
        this.nLocality = new Select(this.nLocality, L, {allowFreeText: true, realSelect: true})
        this.nStatus = new Select(this.nStatus, S, {allowFreeText: false, realSelect: true})
        this.nArrivalLocality = new Select(this.nArrivalLocality, L)
        this.nArrivalCreator = new Select(this.nArrivalCreator, new UserStore(), { allowFreeText: false, realSelect: true })
        this.nCreator = new Select(this.nCreator, new UserStore(), { allowFreeText: false, realSelect: true })
        this.nTechnician = new Select(this.nTechnician, new UserStore(), { allowFreeText: true, realSelect: false })
        this.nMachineChange = new Select(this.nMachineChange, M, { allowFreeText: false, realSelect: true })

        this.interventionCreate()

        this.nEntryDetails.appendChild(document.createRange().createContextualFragment(this.htmlDetails))
        djOn(this.nMFollow, 'change', djLang.hitch(this, (e) => {
          let n = this.nMFollow.domNode
          while (n && n.nodeName !== 'LABEL') {
            n = n.parentNode
          }
          if (this.nMFollow.get('value')) {
            n = n.nextElementSibling
            if (n) {
              n.style.display = 'none'
              n = n.nextElementSibling
              if (n) {
                n.style.display = 'none'
              }
            }
          } else {
            n = n.nextElementSibling
            if (n) {
              n.style.display = ''
              n = n.nextElementSibling
              if (n) {
                n.style.display = ''
              }
            }
          }
        }))

        this.beginTime = new HourBox(this.nBeginTime)
        this.beginTime.addEventListener('change', this.changeBegin.bind(this))
        this.endTime = new HourBox(this.nEndTime)
        this.endTime.addEventListener('change', this.changeEnd.bind(this))
        this.deliveryBeginTime = new HourBox(this.nDeliveryBeginTime)
        this.deliveryEndTime = new HourBox(this.nDeliveryEndTime)
        djOn(this.beginDate, 'change', djLang.hitch(this, this.changeBegin))
        djOn(this.endDate, 'change', djLang.hitch(this, this.changeEnd))

        this.nContactsContainer.addChild(new DtContentPane({ title: 'Nouveau contact', content: new Contacts({ target: this }) }))
        djOn(this.domNode, 'mousemove', function (event) {
          event.preventDefault()
          event.stopPropagation()
        }, { capture: true })

        this.domNode.addEventListener('keyup', this.handleFormEvent.bind(this), { capture: true })
        this.domNode.addEventListener('blur', this.handleFormEvent.bind(this), { capture: true })
        this.domNode.addEventListener('focus', this.handleFormEvent.bind(this), { capture: true })

        this.nMBeginDate.set('value', this.beginDate.get('value'))
        this.nMBeginTime.set('value', this.beginTime.value)
        this.nMEndDate.set('value', this.endDate.get('value'))
        this.nMEndTime.set('value', this.endTime.value)
        this.dtable = new Artnum.DTable({ table: this.nCountTable, sortOnly: true })
        djOn(this.nForm, 'click', this.clickForm.bind(this))

        Query.exec(Path.url('store/Mission', { params: { 'search.reservation': this.reservation.uid } })).then((result) => {
          if (result.success && result.length > 0) {
            this.nMissionDisplay.dataset.uid = result.data[0].uid
            Query.exec(Path.url('store/MissionFichier', { params: { 'search.mission': result.data[0].uid } })).then(async (result) => {
              if (result.length <= 0) { return }
              let images = result.data
              images = images.sort((a, b) => {
                return parseInt(a.ordre) - parseInt(b.ordre)
              })
              for (let i = 0; i < images.length; i++) {
                await this.addMissionImage(images[i], true)
              }
            })
          }
        })
        this.buttonCreate()
        for (let i in this.Sections) {
          this.Sections[i].bind(this)()
        }

        if (this.isNew && this.Defaults) {
          this.Defaults.then((results) => {
            if (results.length > 0) {
              results.data.forEach((def) => {
                let name = def.name.split('.')[1]
                if (!name) { return }
                let node = this.domNode.querySelector(`[name=${name}]`)
                if (!node) { return }
                node.value = def.value
              })
            }
          })
        }
        resolve()
        this.load()
      })
    },

    clickForm: function (event) {
      if (event.target.dataset.href) {
        let href = event.target.dataset.href
        switch (href) {
          case 'beginDate':
          case 'endDate':
            let date = this[href].get('value')
            window.App.gotoMachine(this.reservation.get('target'))
            window.App.set('center', date)
            window.App.update()
            this.reservation.highlight()
            break
          default:
            window.open(href, href)
            break
        }
      }
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

    load: async function () {
        this.initCancel()
        this.nMachineChange.value = this.reservation.get('target')
        this.nLocality.value = this.reservation.get('locality')
        if (this.reservation.get('title') != null) {
          this.nTitle.set('value', this.reservation.get('title'))
        }

        if (this.reservation.get('folder')) {
          var folder = this.reservation.get('folder')
          this.nFolder.set('value', this.reservation.get('folder'))
          let url = folder
          if (!folder.match(/^[a-zA-Z]*:\/\/.*/)) {
            url = 'file://' + encodeURI(url.replace('\\', '/')).replace(',', '%2C')
          }
          let node = this.nFolder.domNode.previousElementSibling
          node.dataset.href = url
        }

        if (this.reservation.get('gps')) {
          this.nGps.set('value', this.reservation.get('gps'))

          let node = this.nGps.domNode.previousElementSibling
          node.dataset.href = APPConf.maps.direction.replace('$FROM', 'Airnace+SA,Route+des+Iles+Vieilles+8-10,1902+Evionnaz').replace('$TO', String(this.reservation.get('gps')).replace(/\s/g, '+'))
        } else {
          let node = this.nGps.domNode.previousElementSibling
          let addr = ''
          let l = this.reservation.get('locality')
          if (l && l !== undefined && l !== null) {
            if (l.indexOf('PC/') === 0) {
              this.Stores.Locality.get(l).then((locality) => {
                if (!locality || locality === undefined || locality === null) { return }
                if (this.reservation.get('address')) {
                  addr = this.reservation.get('address').trim().replace(/(?:\r\n|\r|\n)/g, ',').replace(/\s/g, '+')
                }
                if (locality) {
                  if (!locality.np) { return } // in warehouse
                  if (addr !== '') {
                    addr += ','
                  }
                  addr += `${locality.np.trim()}+${locality.name.trim()}`
                }
                if (addr) {
                  node.dataset.href = APPConf.maps.direction.replace('$FROM', 'Airnace+SA,Route+des+Iles+Vieilles+8-10,1902+Evionnaz').replace('$TO', addr)
                }
              })
            } else {
              if (this.reservation.get('address')) {
                addr = this.reservation.get('address').trim().replace(/(?:\r\n|\r|\n)/g, ',').replace(/\s/g, '+')
              }
              if (this.reservation.get('locality')) {
                if (addr !== '') {
                  addr += ','
                }
                addr += this.reservation.get('locality').trim().replace(/\s/g, '+')
              }
              if (addr) {
                node.dataset.href = APPConf.maps.direction.replace('$FROM', 'Airnace+SA,Route+des+Iles+Vieilles+8-10,1902+Evionnaz').replace('$TO', addr)
              }
            }
          }
        }

        if (!this.loaded.association) {
          let url = Path.url('store/Status')
          url.searchParams.set('search.type', 1)
          results = await Query.exec(url)
          if (results.type === 'results') {
            results.data.forEach((d) => {
              this.nAssociationType.addOption({
                label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
                value: String(Path.url('store/Status/' + d.id))
              })
            })
          }
          this.loaded.association = true
        }
        this.set('warehouse', this.reservation.get('warehouse'))

        if (this.reservation.is('confirmed') || (this.reservation.get('_arrival') && this.reservation.get('_arrival').id && !this.reservation.get('_arrival').deleted)) {
          this.nConfirmed.value = true
        } else {
          this.nConfirmed.value = false
        }

        if (this.reservation.get('deliveryBegin') || this.reservation.get('deliveryEnd')) {
          this.nDelivery.set('checked', true)
        } else {
          this.nDelivery.set('checked', false)
        }
        this.toggleDelivery()

        let url = Path.url('store/ReservationContact')
        url.searchParams.set('search.reservation', this.reservation.uid)
        var res = await Query.exec(url)
        if (res.length > 0) {
          res.data.forEach(djLang.hitch(this, async function (contact) {
            if (contact.freeform) {
              contact.linkId = contact.id
              this.createContact(contact, contact.comment)
            } else {
              var linkId = contact.id
              var comment = contact.comment
              let url = Path.url('store/' + contact.target)
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
              var w = dtRegistry.byNode(inputs[j])
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
          this.nConfirmed.value = true
        }

        this.nArrivalInprogress.value = retval.inprogress
        if (this.nArrivalInprogress.value) {
          this.nArrivalDone.disabled = false
          this.nArrivalDone.value = retval.done
        } else {
          this.nArrivalDone.disabled = true
        }

        if (retval && retval.reported) {
          var reported = new Date(retval.reported)
          if (!isNaN(reported.getTime())) {
            this.nArrivalDate.set('value', reported.toISOString())
            this.nArrivalTime.set('value', reported.toISOString())
          }
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
          this.nArrivalLocality.value = retval.locality
        }
        if (retval.creator) {
          if (this.nArrivalCreator) {
            this.nArrivalCreator.value = retval.creator
          }
        }
      }

      this.refreshCount()
    },

    toggleDelivery: function () {
      if (this.nDelivery.get('checked')) {
        djDomStyle.set(this.nDeliveryFields, 'display', '')

        if (!this.deliveryBegin) {
          this.deliveryBeginTime.value = this.beginTime.value
          this.nDeliveryBeginDate.set('value', this.beginDate.get('value'))
        }
        if (!this.deliveryEnd) {
          this.deliveryEndTime.value = this.endTime.value
          this.nDeliveryEndDate.set('value', this.endDate.get('value'))
        }
      } else {
        djDomStyle.set(this.nDeliveryFields, 'display', 'none')
      }
    },

    toggleConfirmedAndReturned: function () {
      if (!this.nConfirmed.value) {
        this.nConfirmed.value = true
      }
      this.nArrivalInprogress.value = true
      this.nArrivalDone.value = true
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
        let url = Path.url('store/ReservationContact')
        url.searchParams.set('search.reservation', this.reservation.uid)
        url.searchParams.set('search.target', id)
        url.searchParams.set('search.comment', type)
        Query.exec(url).then(djLang.hitch(this, function (results) {
          if (results.length === 0) {
            Query.exec(Path.url('store/ReservationContact'), {method: 'post', body: {reservation: that.reservation.uid, comment: type, freeform: null, target: id}}).then(djLang.hitch(this, function (result) {
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
        let url = Path.url('store/ReservationContact')
        url.searchParams.set('search.reservation', this.reservation.uid)
        url.searchParams.set('search.target', id)
        url.searchParams.set('search.freeform', options.freeform)
        Query.exec(url).then(djLang.hitch(this, function (results) {
          if (results.length === 0) {
            Query.exec(Path.url('store/ReservationContact'), {method: 'post', body: {reservation: this.reservation.uid, comment: type, freeform: options.freeform, target: null}}).then(function (result) {
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
      delete window.OpenedForm[this.reservation.uid]
      if (Object.keys(window.OpenedForm).length <= 0) {
        window.onbeforeunload = null
      }
      if (!noevent) {
        window.GEvent('reservation.close', {id: this.reservation.uid})
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

    autoPrint: function (file, params = {}) {
      let type = params.forceType ? params.forceType : file
      return new Promise((resolve, reject) => {
        this.doSave().then(() => {
          Query.exec((Path.url('exec/auto-print.php', {
            params: {
              type: type, file: `pdfs/${file}/${this.reservation.uid}`
            }
          }))).then((result) => {
            if (result.success) {
              window.App.info(`Impression (${type}) pour la réservation ${this.reservation.uid} en cours`)
              resolve()
            } else {
              window.App.error(`Erreur d'impression (${type}) pour la réservation ${this.reservation.uid}`)
              reject(new Error('Print error'))
            }
          })
        }, () => {
          window.App.error(`Erreur d'impression (${type}) pour la réservation ${this.reservation.uid}`)
          reject(new Error('Print error'))
        })
      })
    },

    showPrint: function (type, params = {}) {
      this.doSave().then(() => {
        let url = new URL(`${window.location.origin}/${APPConf.base}/pdfs/${type}/${this.reservation.uid}`)
        for (let k in params) {
          url.searchParams.append(k, params[k])
        }
        window.open(url)
      })
    },

    doDelete: function (event) {
      this.reservation.remove().then(() => {
        this.hide()
      })
    },

    validate: function () {
      [ this.nDeliveryBeginDate, this.nDeliveryEndDate, this.beginDate, this.endDate ].forEach(function (c) {
        c.set('state', 'Normal')
      })

      var f = this.nForm.get('value')
      f.beginTime = this.beginTime.value
      f.endTime = this.endTime.value
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
        var deliveryBegin = f.deliveryBeginDate.join(this.deliveryBeginTime.value)
        var deliveryEnd = f.deliveryEndDate.join(this.deliveryEndTime.value)

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
      this.reservation.copy().then((id) => {
        if (!this.reservation.sup.openReservation(id)) {
          window.App.OpenAtCreation[id] = true
        } else {
          this.reservation.highlight()
        }
        this.hide()
      })
    },

    doSaveAndQuit: function (event) {
      this.doSave().then(function () {
        this.hide()
      }.bind(this))
    },
    doSave: function (event) {
      this.doNumbering()
      this.domNode.setAttribute('style', 'opacity: 0.2')
      return new Promise(function (resolve, reject) {
        var err = this.validate()
        if (!err[1]) {
          window.App.error(err[0])
          reject(new Error('Not valid'))
        }
        var changeMachine = false
        if (this.reservation.get('target') !== this.nMachineChange.value) {
          var newEntry = window.App.getEntry(this.nMachineChange.value)
          if (newEntry == null) {
            alert('Déplacement vers machine inexistante')
            reject(new Error('Target not found'))
          }
          changeMachine = this.reservation.get('target')
          this.reservation.set('sup', newEntry)
          this.reservation.set('previous', changeMachine)
          this.reservation.set('target', this.nMachineChange.value)
        }

        let f = this.nForm.get('value')
        f.beginTime = this.beginTime.value
        f.endTime = this.endTime.value
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
          deliveryBegin = f.deliveryBeginDate.join(this.deliveryBeginTime.value)
          deliveryEnd = f.deliveryEndDate.join(this.deliveryEndTime.value)
        } else {
          deliveryBegin = ''
          deliveryEnd = ''
        }

        Query.exec(Path.url('store/Arrival', {params: {'search.target': this.reservation.uid}})).then((res) => {
          let arrival = {}
          if (res.success && res.length > 0) {
            arrival = Object.assign(arrival, res.data[0])
          }

          if (this.nConfirmed.value) {
            arrival.deleted = null
            arrival.target = this.reservation.uid
            if (f.arrivalDate) {
              if (f.arrivalTime) {
                arrival.reported = f.arrivalDate.join(f.arrivalTime)
              } else {
                arrival.reported = f.arrivalDate
              }
            }
            arrival.creator = this.nArrivalCreator.value
            arrival.comment = f.arrivalComment
            arrival.contact = f.arrivalAddress
            arrival.locality = this.nArrivalLocality.value
            arrival.other = f.arrivalKeys
            arrival.done = this.nArrivalDone.value
            arrival.inprogress = this.nArrivalInprogress.value

            this.reservation.set('_arrival', arrival)
          } else {
            if (arrival.id) {
              this.reservation.set('_arrival', {id: arrival.id, _op: 'delete'})
            } else {
              this.reservation.set('_arrival', {})
            }
          }

          let status = this.nStatus.value
          if (isNaN(parseInt(status))) {
            status = status.split('/').pop()
          }
          this.reservation.set('status', `${status}`)
          this.reservation.set('begin', begin)
          this.reservation.set('end', end)
          this.reservation.set('deliveryBegin', deliveryBegin)
          this.reservation.set('deliveryEnd', deliveryEnd)
          this.reservation.set('address', this.nAddress.value)
          this.reservation.set('reference', f.reference)
          this.reservation.set('equipment', f.equipment)
          this.reservation.set('locality', this.nLocality.value)
          this.reservation.set('comment', f.comments)
          this.reservation.set('folder', f.folder)
          this.reservation.set('gps', f.gps)
          this.reservation.set('title', f.title)
          this.reservation.set('creator', this.nCreator.value)
          this.reservation.set('technician', this.nTechnician.value)
          this.reservation.set('visit', this.nAddVisit.value)
          this.reservation.set('vreport', this.nAddReport.value)
          this.reservation.set('padlock', this.nPadlock.value)
          this.reservation.set('deliveryRemark', this.nDeliveryRemark.value)

          this.reservation.save().then((id) => {
            this.resize()
            var reservation = this.reservation
            if (changeMachine) {
              var entry = window.App.getEntry(reservation.get('target'))
              var oldEntry = window.App.getEntry(changeMachine)
              if (entry) {
                KAIROS.info(`Réservation ${reservation.uid} correctement déplacée`)
                delete oldEntry.entries[reservation.uid]
                entry.entries[reservation.uid] = reservation
                entry.resize()
                oldEntry.resize()
              }
            }
            this.domNode.removeAttribute('style')
            resolve()
          })
        })
      }.bind(this))
    },

    evtNoEquipment: function () {
      let node = this.domNode.querySelector('[name=equipment]')
      if (node.value.length > 1 && node.value !== '%') {
        if (!confirm('Êtes-vous certain de vouloir supprimer tout le matériel ?')) {
          return
        }
      }
      node.value = '%'
    },

    destroyReservation: function (reservation) {
      this.reservation.destroyReservation(reservation)
    },

    openCount: async function () {
      new Count({reservation: this.reservation.uid}) // eslint-disable-line
    },
    openAddCount: async function () {
      new CountList({addReservation: this.reservation.uid, integrated: true}) // eslint-disable-line
    },
    clickExport: function () {
      this.reservation.export()
    },

    dropToDeleteBegin: function () {
      window.requestAnimationFrame(() => {
        this.nMissionDrop.classList.add('dragToDelete')
        this.nMissionDrop.innerText = 'Glisser pour supprimer !'
      })
    },
    dropToDeleteEnd: function () {
      window.requestAnimationFrame(() => {
        this.nMissionDrop.classList.remove('dragToDelete')
        this.nMissionDrop.innerText = 'Glisser ou copier des images pour ajouter !'
      })
    },
    doNumbering: async function () {
      let parent = this.nMissionDisplay
      for (let i = 0, n = parent.firstElementChild; n; n = n.nextElementSibling) {
        n.dataset.number = i
        Query.exec(Path.url(`store/MissionFichier/${n.dataset.hash},${this.nMissionDisplay.dataset.uid}`)).then((result) => {
          if (result.success && result.length <= 0) {
            Query.exec(Path.url(`store/MissionFichier/`), {
              method: 'post',
              body: {
                mission: this.nMissionDisplay.dataset.uid,
                fichier: n.dataset.hash,
                ordre: i
              }
            })
          } else {
            Query.exec(Path.url(`store/MissionFichier/${n.dataset.hash},${this.nMissionDisplay.dataset.uid}`), {
              method: 'patch',
              body: {
                fichier: n.dataset.hash,
                mission: this.nMissionDisplay.dataset.uid,
                ordre: i
              }
            })
          }
        })
        i++
      }
    },
    deleteImage: function (hash) {
      Query.exec(Path.url(`store/MissionFichier/${hash},${this.nMissionDisplay.dataset.uid}`), {method: 'delete'}).then((result) => {
        if (result.success) {
          for (let n = this.nMissionDisplay.firstElementChild; n; n = n.nextElementSibling) {
            if (n.dataset.hash === hash) {
              n.parentNode.removeChild(n)
              break
            }
          }
        }
      })
    },

    addMissionImage: function (image, skipNumbering = false) {
      return new Promise((resolve, reject) => {
        let hash = image.name ? image.name : image.fichier
        for (let n = this.nMissionDisplay.firstElementChild; n; n = n.nextElementSibling) {
          if (n.dataset.hash === hash) {
            return
          }
        }

        let div = document.createElement('DIV')
        div.dataset.hash = hash
        div.setAttribute('draggable', 'true')
        div.addEventListener('dragover', (event) => {
          if (event.dataTransfer.items.length < 0) { return }
          for (let item of event.dataTransfer.items) {
            if (item.type !== 'text/x-location-image-hash') { continue }
            item.getAsString((hash) => {
              let n = event.target
              for (; n && n.nodeName !== 'DIV'; n = n.parentNode);
              if (n.dataset.hash === hash) { return }
              let p = n.parentNode
              let spacer = p.firstElementChild
              for (; spacer && !spacer.classList.contains('ddSpacer'); spacer = spacer.nextElementSibling);

              let brect = n.getBoundingClientRect()
              let m = brect.x + (brect.width / 2) + 1
              if (event.clientX > m) {
                window.requestAnimationFrame(() => {
                  p.removeChild(spacer)
                  p.insertBefore(spacer, n.nextElementSibling)
                })
              } else {
                window.requestAnimationFrame(() => {
                  p.removeChild(spacer)
                  p.insertBefore(spacer, n)
                })
              }
            })
            break
          }
        })
        div.addEventListener('dragstart', (event) => {
          this.dropToDeleteBegin()
          let n = event.target
          for (; n && n.nodeName !== 'DIV'; n = n.parentNode);
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/x-location-image-hash', n.dataset.hash)
          event.dataTransfer.setData('text/uri-list', Path.url(`${APPConf.uploader}/${hash}`))

          let p = n.parentNode
          if (p.firstElementChild === n && !n.nextElementSibling) { return }

          let spacer = document.createElement('DIV')
          spacer.classList.add('ddSpacer')
          window.requestAnimationFrame(() => {
            if (p.firstElementChild === n) {
              p.insertBefore(spacer, n.nextElementSibling)
            } else {
              p.insertBefore(spacer, n)
            }
            n.style.opacity = '0.4'
          })
        })
        div.addEventListener('dragend', (event) => {
          this.dropToDeleteEnd()
          let n = event.target
          for (; n && n.nodeName !== 'DIV'; n = n.parentNode);
          let p = n.parentNode
          let spacer = p.firstElementChild
          for (; spacer && !spacer.classList.contains('ddSpacer'); spacer = spacer.nextElementSibling);
          window.requestAnimationFrame(() => {
            if (spacer) {
              if (n) {
                p.removeChild(n)
                p.insertBefore(n, spacer)
              }
              p.removeChild(spacer)
            }
            n.style.opacity = ''
          })
        })
        div.addEventListener('click', (event) => {
          window.open(`${window.location.origin}/${APPConf.base}/${APPConf.uploader}/${hash},download`, hash)
        })
        /* add div in place */
        window.requestAnimationFrame(() => {
          this.nMissionDisplay.appendChild(div)
          div.style.backgroundImage = `url('${window.location.origin}/${APPConf.base}/${APPConf.uploader}/${hash}')`
          if (!skipNumbering) { this.doNumbering(this.nMissionDisplay) }
          resolve()
        })
      })
    },

    evCopyDrop: function (event) {
      event.preventDefault()
      event.stopPropagation()
      this.dropToDeleteEnd()
      if (event.dataTransfer && event.dataTransfer.items.length > 0) {
        for (let item of event.dataTransfer.items) {
          if (item.type !== 'text/x-location-image-hash') { continue }
          item.getAsString(this.deleteImage.bind(this))
          return
        }
      }
      if (!this.nMissionDisplay.dataset.uid) {
        Query.exec(Path.url('store/Mission', {params: {'search.reservation': this.reservation.uid}}))
          .then((result) => {
            if (result.success && result.length <= 0) {
              Query.exec(
                Path.url('store/Mission'), {method: 'post', body: {reservation: this.reservation.uid}}
              ).then((result) => {
                if (result.success && result.length === 1) {
                  this.nMissionDisplay.dataset.uid = result.data[0].id
                }
              })
            } else {
              if (result.success && result.length === 1) {
                this.nMissionDisplay.dataset.uid = result.data[0].uid
              }
            }
          })
      }

      let upload = (formData) => {
        fetch(new URL(`${window.location.origin}/${KAIROS.base}/${KAIROS.uploader}`), {
          method: 'POST',
          body: formData,
          headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})
        }).then((response) => {
          response.json().then((result) => {
            if (result.success) {
              this.addMissionImage(result)
            }
          })
        })
      }

      let data = null
      if (event.type === 'paste') {
        data = event.clipboardData
      } else {
        event.target.classList.remove('dragOver')
        data = event.dataTransfer
      }
      for (let i = 0; i < data.items.length; i++) {
        let form = null
        let item = data.items[i]
        if (item.kind === 'file' && (item.type.indexOf('image') === 0 || item.type.indexOf('application/pdf') === 0)) {
          form = new FormData()
          form.append('upload', item.getAsFile())
          upload(form)
        } else if (item.kind === 'string') {
          switch (item.type) {
            case 'text/uri-list':
              form = new FormData()
              item.getAsString((url) => {
                let uObject
                try {
                  uObject = new URL(url)
                } catch (e) {
                  // nope
                  return
                }
                if (uObject.protocol !== 'http:' && uObject.protocol !== 'https:') {
                  alert('Accès à ce service non-supporté')
                  return
                }
                form = new FormData()
                form.append('upload', new File([url], 'url-file', {type: 'text/plain'}))
                upload(form)
              })
              break
          }
        }
      }
    },

    refreshCount: async function () {
      Query.exec(Path.url('store/CountReservation', {params: {'search.reservation': this.reservation.uid}})).then(async function (counts) {
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
              tr.innerHTML = `<td class="clickable" data-id="${count.id}">${count.id}</td><td>${(count._invoice ? (count._invoice.winbiz ? count._invoice.winbiz : '') : '')}</td><td>${count._status ? (count._status.name ? count._status.name : '') : ''}</td><td>${(count.period ? count.period : '')} ${count.state !== 'INTERMEDIATE' ? '⯁' : ''}</td>`
              tr.setAttribute('data-sort', sortBegin)
              trs.push(tr)

              tr.addEventListener('click', function (event) {
                if (event.target) {
                  if (!event.target.getAttribute('data-id')) { return }
                  new Count({'data-id': event.target.getAttribute('data-id')}) // eslint-disable-line
                }
              })
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
    },

    handleFormEvent: function (event) {
      let p = event.target

      for (p = event.target; p; p = p.parentNode) {
        if (p.dataset && p.dataset.handler && this.Actions[p.dataset.handler]) {
          this.Actions[p.dataset.handler].bind(this)(event)
          return
        }
      }
    }
  })
})
