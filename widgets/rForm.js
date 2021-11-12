/* eslint-env browser, amd */
/* global APPConf, pSBC, Artnum, Select, MButton */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/rForm.html',

  'dojo/date',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-form',
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

  'location/count',
  'location/countList',
  'location/Stores/Machine',
  'location/Stores/Status',
  'location/Stores/Unit',
  'location/rform/handler',
  'location/rform/section'
], function (
  djDeclare,
  djLang,
  djEvented,

  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,

  _template,

  djDate,
  djOn,
  djDomStyle,
  djDomForm,
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

  Count,
  CountList,
  Machine,
  Status,
  Unit,
  RFormHandler,
  RFormSection,
) {
  return djDeclare('location.rForm', [dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented,
                                      RFormHandler, RFormSection], {
    baseClass: 'rForm',
    templateString: _template,  
    contacts: {},
    isLayoutContainer: true,

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
    },

    outOfSync: function() {
      this.domNode.classList.add('outofsync')
      this.Buttons.resync.setDisabled(false)
    },

    remoteDelete: function () {
      this.domNode.classList.add('deleted')
    },


    _setDescriptionAttr: function (value) {
      this.description = value
    },

    _setLocality: function (value) {
      this._set('locality', value)
      this.nLocality.value = value
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
        KAIROSAnim.push(() => {
          this.nNewNote.appendChild(d)
        })
      }
    },

    associationEntries: function (entries) {
      var frag = document.createDocumentFragment()
      var byType = {}

      for (let i = 0; i < entries.length; i++) {
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

        for (let i = 0; i < byType[k].length; i++) {
          let divLine = document.createElement('DIV')
          divLine.setAttribute('class', 'item')

          let begin = new Date(byType[k][i].begin)
          let end = new Date(byType[k][i].end)
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
      KAIROSAnim.push(() => {
        while (complements.firstChild) {
          complements.removeChild(complements.firstChild)
        }
        complements.appendChild(frag)
      })

      this.reservation.resize()
    },

    doEditComplement: function (event) {
      if (this.Disabled) { return }
      let id = null
      let node
      let c
      for (let i = event.target; i; i = i.parentNode) {
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
          this.nMBeginDate.set('value', new Date(c.begin))
          this.MBeginTime.value = new Date(c.begin)
          this.nMEndDate.set('value', new Date(c.end))
          this.MEndTime.value = new Date(c.end)
        } else {
          this.nMBeginDate.set('value', new Date(this.reservation.get('trueBegin')))
          this.MBeginTime.value = new Date(this.reservation.get('trueBegin'))
          this.nMEndDate.set('value', new Date(this.reservation.get('trueEnd')))
          this.MEndTime.value = new Date(this.reservation.get('trueEnd'))
          this.nMFollow.set('value', 'on')
        }

        this.nMComment.set('value', c.comment)
        this.nAssociationType.value = c.type.id

        for (let i = event.target; i; i = i.parentNode) {
          if (i.hasAttribute('class')) {
            if (i.getAttribute('class') === 'item') {
              node = i; break
            }
          }
        }

        /* reset selection display */
        for (let i = this.complements.firstChild; i; i = i.nextSibling) {
          for (var j = i.firstChild; j; j = j.nextSibling) {
            if (j.hasAttribute('class') && j.getAttribute('class') === 'item') {
              j.style.color = ''
            }
          }
        }
        node.style.color = 'grey'
      }
    },

    doResetComplement: function (event) {
      this.nComplementId.value = ''
      this.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter')
      this.nAssociationType.value = ''
      this.nNumber.set('value', 1)
      this.nMFollow.set('value', true)
      this.nMBeginDate.set('value', this.reservation.get('trueBegin').toISOString())
      this.MBeginTime.value = this.reservation.get('trueBegin').toISOString()
      this.nMEndDate.set('value', this.reservation.get('trueEnd').toISOString())
      this.MEndTime.value = this.reservation.get('trueEnd').toISOString()
      this.nMComment.set('value', '')
      this.associationRefresh().then (() => {}, () => {KAIROS.error('Reject de l\'opération') })
    },

    doRemoveComplement: function (event) {
      if (this.Disabled) { return }
      let id = null
      for (var i = event.target; i; i = i.parentNode) {
        if (i.hasAttribute('data-artnum-id')) {
          id = i.getAttribute('data-artnum-id')
          break
        }
      }

      if (id === null) { return; }

      const url = new URL(`${KAIROS.getBase()}/store/Association/${id}}`)
      fetch(url, {method: 'DELETE'})
      .then(response => {
        if (!response.ok) { throw new Error('ERR:Server') }
        return response.json()
      })
      .then(result => {
        if (!result.success) { throw new Error('ERR:Server') }
        this.associationRefresh()
        .catch(reason => {
          throw new Error('ERR:Server')
        })
      })
      .catch(reason => {
        KAIROS.error(reason)
      })
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

                  /* complete url, use only two last parts relative to current server */
                  if (/^https?\:\/\/.*/.test(entry.type)) {
                    let type = entry.type.split('/')
                    type.splice(0, type.length - 2)
                    entry.type = type.join('/')
                  }
                  let query = fetch(new URL(`${KAIROS.getBase()}/store/${entry.type}`))
                  queries.push(new Promise((resolve, reject) => {
                    query.then (response => {
                      if (!response.ok) { resolve(null); return }
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
                    if (!types[j]) { continue }
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
      const query = {}
      const f = djDomForm.toObject(this.nComplementsForm)
      f.nMEndTime = this.MEndTime.value
      f.nMBeginTime = this.MBeginTime.value
      if (!f.nMFollow) {
        ;['nMBeginDate', 'nMBeginTime', 'nMEndDate', 'nMEndTime'].forEach(i => {
          if (f[i] === '') {
            this[i].set('state', 'Error')
          }
        })

        let begin = new Date(f.nMBeginDate)
        let end = new Date(f.nMEndDate)
        begin.setHours(f.nMBeginTime.getHours(), f.nMBeginTime.getMinutes(), f.nMBeginTime.getSeconds(), f.nMBeginTime.getMilliseconds())
        end.setHours(f.nMEndTime.getHours(), f.nMEndTime.getMinutes(), f.nMEndTime.getSeconds(), f.nMEndTime.getMilliseconds())

        query['begin'] = begin.toISOString()
        query['end'] = end.toISOString()
        query['follow'] = 0
      } else {
        query['begin'] = ''
        query['end'] = ''
        query['follow'] = 1
      }
      query['number'] = f.number ? f.number : 1
      query['target'] = null
      query['comment'] = f.nMComment ? f.nMComment : ''
      query['type'] = this.nAssociationType.value
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
        resync: new MButton(this.nResync),
        del: new MButton(this.nDelete),
        addVisit: new MButton(this.nAddVisit, { set: () => (new Date()).toISOString(), unset: '' }),
        addVReport: new MButton(this.nAddReport, { set: () => (new Date()).toISOString(), unset: '' }),
        addArrivalInProgress: new MButton(this.nArrivalInprogress, { set: () => (new Date()).toISOString(), unset: '' }),
        addArrivalDone: new MButton(this.nArrivalDone, { set: () => (new Date()).toISOString(), unset: '' }),
        addControl: new MButton(this.nControl, {set:true, unset: false}),
        addEnd: new MButton(this.nConfirmed, { set: () => (new Date()).toISOString(), unset: '' }),
        addEndAndDone: new MButton(this.nConfirmedAndReturned),
        addConfReturnAndChecked: new MButton(this.nConfReturnAndChecked),
        addFault: new MButton(this.nFault),
        addBreak: new MButton(this.nBreak),
        addDiesel: new MButton(this.nDiesel),
        addDiesel2: new MButton(this.nDiesel2)
      }

      this.Buttons.resync.addEventListener('click', _ => {
        this.reservation.resync()
        .then(_ => {
          this.domNode.classList.remove('outofsync')
          this.Buttons.resync.setDisabled(true)
        })
      })
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
      this.Buttons.addArrivalDone.linkDisabledState(this.Buttons.addDiesel)
      this.Buttons.addVisit.linkDisabledState(this.Buttons.addVReport)

      this.Buttons.addEndAndDone.addEventListener('click', event => {
        this.Buttons.addEnd.setValue(true)
        this.Buttons.addArrivalInProgress.setValue(true)
        this.Buttons.addArrivalDone.setValue(true)
      })
      this.Buttons.addConfReturnAndChecked.addEventListener('click', event => {
        this.Buttons.addEnd.setValue(true)
        this.Buttons.addArrivalInProgress.setValue(true)
        this.Buttons.addArrivalDone.setValue(true)
        UserStore.getCurrentUser().then(current => {
          this.doSave()
          .then((done) => {
            if (done) {
              KairosEvent('autoCheck', {
                reservation: this.reservation.id,
                type: KAIROS.events.autoCheck[0],
                technician: current.getUrl(),
                comment: '',
                append: true
              })
              .then(() => { this.interventionReload() })
            }
          })
        })
      })

      this.Buttons.addEnd.addEventListener('set', event => {
        let url = new URL(`${KAIROS.getBase()}/store/Arrival`)
        url.searchParams.append('search.target', this.reservation.id)
        
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
        Promise.all([fetchArrival, UserStore.getCurrentUser()]).then(([arrival, user]) => {
          if (arrival !== null) {
            if (arrival.inprogress) {
              this.Buttons.addArrivalInProgress._setValue(true)
            }
            if (arrival.done) {
              this.Buttons.addArrivalDone._setValue(true)
            }
            this.nArrivalDate.set('value', arrival.reported)
            this.nArrivalTime.set('value', arrival.reported)
            this.nArrivalCreator.value = arrival.creator
          } else {
            this.nArrivalDate.set('value', new Date())
            this.nArrivalTime.set('value', new Date())
            this.nArrivalCreator.value = user.getUrl()
          }
          KAIROSAnim.push(() => {
            this.nBack.style.removeProperty('display')
          })
        })
      })

      this.Buttons.addEnd.addEventListener('unset', event => {
        UserStore.getCurrentUser().then(user => {
          this.Buttons.addArrivalDone.setValue(false)
          this.Buttons.addArrivalInProgress.setValue(false)

          KAIROSAnim.push(() => {
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
          this.Buttons.addArrivalDone.setValue(false)
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
      const AddDieselBox = `
      <form>
      Quantité [lt]: <input type="text" name="comment" value="" /><br>
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

      this.Buttons.addDiesel.addEventListener('click', event => {
        let popup = new KPopup('Remplissage diesel', {
          content: AddDieselBox,
          reference: this.Buttons.addDiesel
        })
        popup.open()
        popup.addEventListener('submit', event => {
          event.preventDefault()
          AddEventFunction(event.target, KAIROS.events.addDiesel, popup)
        })
      })
      this.Buttons.addDiesel2.addEventListener('click', event => {
        let popup = new KPopup('Remplissage diesel', {
          content: AddDieselBox,
          reference: this.Buttons.addDiesel2
        })
        popup.open()
        popup.addEventListener('submit', event => {
          event.preventDefault()
          AddEventFunction(event.target, KAIROS.events.addDiesel, popup)
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
          KAIROSAnim.push(() => inputs[k].value = (new Date()).toISOString().split('T')[0])
        } else if (inputs[k].name === 'iPerson') {
          this.Intervention.person.clear()
        } else if (inputs[k].name === 'iType') {
          this.Intervention.type.clear()
        } else {
          KAIROSAnim.push(() => inputs[k].value = '')
        }
      }
      fset.dataset.previous = ''
    },

    interventionReload: function (fset = null) {
      if (!fset) {
        fset = this.interventionGetDomNode()
        if (!fset) { return }
      }

      const url = new URL(`${KAIROS.getBase()}/store/Evenement/.unified`)
      url.searchParams.append('search.reservation', this.reservation.get('uid'))
      url.searchParams.append('sort.date', 'DESC')
      fetch(url)
      .then(response => {
        if (!response.ok) { throw new Error('ERR:Server') }
        return response.json()
      })
      .then(result => {     
        let div = fset.getElementsByTagName('DIV')
        for (let i = 0; i < div.length; i++) {
          if (div[i].getAttribute('name') === 'iContent') {
            div = div[i]
            break
          }
        }
        if (!div) { return }
        
        const promises = []
        for (let i = 0; i < result.length; i++) {
          promises.push(new Promise((resolve, reject) => {
            const evenement = result.data[i]
            if (!evenement.technician) { resolve([evenement, null, null]); return }
            Promise.allSettled([
              this.Stores.User.get(evenement.technician),
              this.Stores.Status1.get(evenement.type)
            ])
            .then(([pUser, pStatus]) => {
              resolve([evenement, pUser.value, pStatus.value])
            })
          }))
        }
        
        Promise.allSettled(promises)
        .then(promises => {
          let frag = document.createDocumentFragment()
          for (const promise of promises) {
            if (promise.status !== 'fulfilled') { continue }
            const [evenement, technician, status] = promise.value
            let n = document.createElement('DIV')
            n.classList.add('event')
            n.dataset.id = evenement.id
            let date = new Date(evenement.date)

            n.style.color = status?.color || 'black'
            n.innerHTML = `<span class="date">${date.fullDate()}</span><span class="type">${status?.name || ''}</span><span class="technician">${technician?.name || ''}</span><span class="buttons"><span class="reply"><i class="fas fa-reply"></i></span><span class="delete"><i class="far fa-trash-alt"> </i></span></span>${evenement.comment === '' ? '' : '<span class="comment">' + evenement.comment + '</span>'}`
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
          div.innerHTML = ''
          div.appendChild(frag)
        })
      })
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
        KAIROSAnim.push(() => node.classList.remove('replying'))
        let a = fset.dataset.previous.split(',')
        let b = []
        a.forEach((e) => {
          if (String(e).trim() !== String(node.dataset.id).trim()) {
            b.push(String(e).trim())
          }
        })
        fset.dataset.previous = b.join(',')
      } else {
        KAIROSAnim.push(() => node.classList.add('replying'))
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
      fetch(new URL(`${KAIROS.getBase()}/store/Evenement/${id}`), {
        method: 'delete'
      })
      .then((result) => {
        if (!result.ok) {
          KAIROS.error(`Suppression de l'évènmenent ${id} a échoué`)
        }
        this.interventionReload(fset)
        this.interventionClearForm(fset)
      })
    },

    affaireCreate: function (event) {
      event.preventDefault()
      KAffaire.create()
      .then(affaire => {
        window.KCurrentAffaire = affaire
        return affaire.add(this.reservation.get('uid'))
      })
      .then(() => {
        KAIROS.info(`Affaire #${window.KCurrentAffaire.get('uid')} créée`)
        const affaireUI = new KAffaireUI(window.KCurrentAffaire)
        affaireUI.render()
        this.affaireButton()
      })
      .catch(reason => {
        KAIROS.error(`Impossible de créer l'affaire, message "${reason instanceof Error ? reason.message : reason}"`)
      })
    },

    affaireAdd: function (event) {
      event.preventDefault()
      if (!window.KCurrentAffaire) { return }
      window.KCurrentAffaire.add(this.reservation.get('uid'))
    },

    affaireRemove: function (event) {
      event.preventDefault()
    },

    affaireButton: function () {
      const currentAffaire = window.KCurrentAffaire
      if (!currentAffaire) {
        KAIROSAnim.push(() => { this.nCreateAffaire.innerHTML = 'Créer une affaire' })
        this.nCreateAffaire.addEventListener('click', this.affaireCreate.bind(this))
      } else {
        if (currentAffaire.has(this.reservation.get('uid'))) {
          KAIROSAnim.push(() => { this.nCreateAffaire.innerHTML = `Retier de l'affaire` })
          this.nCreateAffaire.addEventListener('click', this.affaireRemove.bind(this))
        } else {
          KAIROSAnim.push(() => { this.nCreateAffaire.innerHTML = `Ajouter à l'affaire` })
          this.nCreateAffaire.addEventListener('click', this.affaireAdd.bind(this))
        }
      }
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

        //const Contacts = new KContactStore(`${KAIROS.getBase()}/store/Contacts`)
        const L = new KLocalityStore()
        const M = new Machine()
        const S = new Status({type: '0'})
        this.Stores = {
          Contacts: new KContactStore(`${KAIROS.getBase()}/store/Contacts`),
          Locality: L,
          OnlyLocality: new KLocalityStore('locality'),
          User: new UserStore(),
          Machine: new Machine(),
          Unit: new Unit()
        }
        this.nLocality = new Select(this.nLocality, L, {allowFreeText: true, realSelect: true})
        this.nStatus = new Select(this.nStatus, S, {allowFreeText: false, realSelect: true})
        this.nArrivalLocality = new Select(this.nArrivalLocality, L)
        this.nArrivalCreator = new Select(this.nArrivalCreator, this.Stores.User, { allowFreeText: false, realSelect: true })
        this.nCreator = new Select(this.nCreator, this.Stores.User, { allowFreeText: false, realSelect: true })
        this.nTechnician = new Select(this.nTechnician, this.Stores.User, { allowFreeText: true, realSelect: true })
        this.nMachineChange = new Select(this.nMachineChange, this.Stores.Machine, { allowFreeText: false, realSelect: true })
        this.nAssociationType = new Select(this.nAssociationType, new Status({type: 1}), { allowFreeText: false, realSelect: true })

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

        this.domNode.addEventListener('keyup', this.handleFormEvent.bind(this), { capture: true })
        this.domNode.addEventListener('blur', this.handleFormEvent.bind(this), { capture: true })
        this.domNode.addEventListener('focus', this.handleFormEvent.bind(this), { capture: true })

        const contactTypeSelect = new KFlatList(KAIROS.contact.type, '_client')
        const cLiveSearch = this.domNode.querySelector('[name="contactLiveSearch"]')
        const contactStore = new KContactStore(`${KAIROS.getBase()}/store/Contacts/`, {limit: 50})
        cLiveSearch.parentNode.insertBefore(contactTypeSelect.domNode, cLiveSearch)
        const contactLiveSearch = new KLiveSearch(
          cLiveSearch,
          contactStore,
          this.Stores.OnlyLocality,
          {typeSelect: true}
        )
        contactLiveSearch.setTargetType('_client')
        contactTypeSelect.addEventListener('change', event => {
          contactLiveSearch.setTargetType(event.detail)
        })

        contactLiveSearch.addEventListener('change', event => {
          const address = event.detail
          const target = this.domNode.querySelector('[name="contactEntries"]')
          const fieldset = new KFieldset(contactTypeSelect.getSelected(), KAIROS.contact.type, false)
          fieldset.addEventListener('delete', event => { 
            this.deleteContact(event.detail)
            .then(result => {
              if (!result) { event.preventDefault() }
            }) 
          })
          /*fieldset.addEventListener('modify', event => {
            this.editContact(event.detail)
          })*/
          fieldset.addEventListener('change', event => {
            this.changeContactType(event.detail)
          })
          if (KAIROS?.contact?.relation) {
            const type = contactTypeSelect.getSelected()
            this.extendWithRelation(address, type, [type], target)
          }
          
          this.saveContact(address, contactTypeSelect)
          .then(linkId => {
            fieldset.appendChild(address.getDOMLabel({postaladdress: true, locality: true}, true))
            fieldset.set('address', address)
            fieldset.set('type', contactTypeSelect.getSelected())
            fieldset.set('link', linkId)
            target.appendChild(fieldset.domNode)

            contactTypeSelect.nextItem()
          })
          .catch(error => {
            KAIROS.error(error)
          })
        })

        this.nMBeginDate.set('value', this.beginDate.get('value'))
        this.MBeginTime = new HourBox(this.nMBeginTime)
        this.MBeginTime.value = this.beginTime.value
        this.nMEndDate.set('value', this.endDate.get('value'))
        this.MEndTime = new HourBox(this.nMEndTime)
        this.MEndTime.value = this.endTime.value

        this.dtable = new Artnum.DTable({ table: this.nCountTable, sortOnly: true })
        djOn(this.nForm, 'click', this.clickForm.bind(this))

        const url = new URL(`${KAIROS.getBase()}/store/Mission`)
        url.searchParams.append('search.reservation', this.reservation.uid)

        fetch(url)
        .then(response => {
          if (!response.ok) { return null }
          return response.json()
        })
        .then(result => {
          if (!result) { return null }
          if (result.length <= 0) { return null }
          this.nMissionDisplay.dataset.uid = result.data[0].uid
          return result.data[0].uid
        })
        .then(uid => {
          if (!uid) { return null }
          const url = new URL(`${KAIROS.getBase()}/store/MissionFichier`)
          url.searchParams.append('search.mission', uid)
          return fetch(url)
        })
        .then(response => {
          if (!response) { return null }
          if (!response.ok) { return null }
          return response.json()
        })
        .then(result => {
          if (!result) { return null }
          if (result.length <= 0) { return }
          let images = result.data
          images = images.sort((a, b) => {
            return parseInt(a.ordre) - parseInt(b.ordre)
          })
          let chain = Promise.resolve()
          for (let i = 0; i < images.length; i++) {
            chain = chain.then(() => { return  this.addMissionImage(images[i], true) })
          }       
        })
        .catch(reason => {
          console.log(reason)
        })
        this.buttonCreate()
        for (let i in this.Sections) {
          this.Sections[i].bind(this)()
        }

        this.loadDefaults()
        resolve()
      })
      .then(() => {
        this.load()
        this.affaireButton()
      })
      this.reservation.KReservation.inited.then(kres => {
        const affaireDom = this.domNode.querySelector('*[name="affaire"]')
        const affaireId = kres.getAffaire()
        if (affaireId === null) {
          const newAffaireButton = new MButton(document.createElement('button'))
          newAffaireButton.setLabel('Ouvrir une affaire')
          affaireDom.appendChild(newAffaireButton.getDomNode())
          newAffaireButton.addEventListener('click', event => {
            this.reservation.KReservation.createAffaire()
            .then(affaire => {
              fetch(`${KAIROS.getBase()}/store/Reservation/${this.reservation.id}`, {method: 'PUT', body: JSON.stringify({id: this.reservation.id, affaire: affaire.getId()})})
              .then(result => {
              })
            })
          })
        } else {
          const legendDom = affaireDom.querySelector('legend')
          window.requestAnimationFrame(() => legendDom.innerHTML = `Affaire ${affaireId}`)
        }
      })
    },

    loadDefaults: function () {
      this.Stores.Machine.get(this.reservation.target)
      .then(machine => {
        for (const key in machine) {
          if (key.substr(0, 8) !== 'default.') { continue }

          const name = key.substr(8)
          const node = this.domNode.querySelector(`[name="${name}"]`)
          if (!node) { continue }
          if (this.reservation.equipment !== null) { continue }
          node.value = machine[key].value
        }
      })
      .catch(reason => {
        console.log(reason)
        KAIROS.error('Impossible de charger l\'équipement par défaut pour la machine')
      })
    },

    extendWithRelation: function (address, addrType, typeOrigin, target) {
      if (KAIROS.contact.relation[addrType]) {
        address.getRelated(KAIROS.contact.relation[addrType])
        .then(addresses => {
          for (const type in addresses) {
            if (typeOrigin.indexOf(type) !== -1) { continue }
            typeOrigin.push(type)
            const nextFieldset = new KFieldset(type, KAIROS.contact.type, false)
            nextFieldset.addEventListener('delete', event => { 
              this.deleteContact(event.detail)
              .then(result => {
                if (!result) { event.preventDefault() }
              }) 
            })
            nextFieldset.set('address', addresses[type])
            nextFieldset.set('type', type)
            nextFieldset.appendChild(addresses[type].getDOMLabel({postaladdress: true, locality: true}, true))
            target.appendChild(nextFieldset.domNode)
            this.saveContact(addresses[type], type).
            then(e => {
              this.extendWithRelation(addresses[type], type, typeOrigin, target)
            })
          }
        })
      }
    },

    saveContact: function (address, type) {
      return this.reservation.addContact(address, type)
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

    load: function () {
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
        node.dataset.href = KAIROS.maps.direction.replace('$FROM', KAIROS.maps.origin.replace("\s", '+')).replace('$TO', String(this.reservation.get('gps')).replace(/\s/g, '+'))
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

      this.loaded.association = true
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

      const url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
      url.searchParams.set('search.reservation', this.reservation.uid)
      fetch(url)
      .then(response => {
        if (!response.ok) { return null }
        return response.json()
      })
      .then(result => {
        if (!result) { return }
        if (!result.length) { return }
        if (!result.data) { return }
        for (let i = 0; i < result.length; i++) {
          const contact = result.data[i]
          if (contact.freeform) {
            this.createContact(new KContactText(contact.id, contact.freeform), contact.comment, contact.id)
            continue
          }
          if (contact.target === null) { continue }
          this.Stores.Contacts.get(contact.target)
          .then(kcontact => {
            this.createContact(kcontact, contact.comment, contact.id)
          })
        }
      })

      djAll(this.initRequests).then(djLang.hitch(this, () => {
        this.doResetComplement()
        this.refresh()
        this.initRequests = []
        this.reservation.updateVersionId()
      }))

      const inputs = this.domNode.getElementsByTagName('input')
      for (var j = 0; j < inputs.length; j++) {
        const name = inputs[j].getAttribute('name')
        if (name && name.substr(0, 2) === 'o-') {
          const other = this.get('other')
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
          this.nConfirmed._value = true
        }

        this.nArrivalInprogress.value = retval.inprogress
        if (this.nArrivalInprogress.value) {
          this.nArrivalDone.disabled = false
          this.nArrivalDone._value = retval.done
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

    createContact: function (address, type, linkId) {
      const target = this.domNode.querySelector('[name="contactEntries"]')
      const previous = target.querySelector(`[name="${linkId}"]`)
      const fieldset = new KFieldset(type, KAIROS.contact.type, false)
      fieldset.domNode.setAttribute('name', linkId)

      fieldset.appendChild(address.getDOMLabel({postaladdress: true, locality: true}, true))
      fieldset.set('address', address)
      fieldset.set('type', type)
      fieldset.set('link', linkId)
      fieldset.domNode.style.setProperty('order', `${KAIROS?.contact?.order[type] || 1000}`)
      fieldset.addEventListener('delete', event => { 
        this.deleteContact(event.detail)
        .then(result => {
          if (!result) { event.preventDefault() }
        }) 
      })
      /*fieldset.addEventListener('modify', event => {
        this.editContact(event.detail)
      })*/
      fieldset.addEventListener('change', event => {
        this.changeContactType(event.detail)
      })
      if (previous) {
        target.replaceChild(fieldset.domNode, previous)
      } else {
        target.appendChild(fieldset.domNode)
      }
    },

    deleteContact: function (fieldset) {
      return new Promise ((resolve) => {
        this.reservation.delContact(fieldset.get('address'), fieldset.get('type'))
        .then(result => {
          resolve(result)
        })
        .catch(reason => {
          KAIROS.syslog(reason)
          KAIROS.error(reason)
          resolve(false)
        })
      })
    },

    changeContactType: function (kfieldset) {
      const newType = kfieldset.getLegend()
      const linkId = kfieldset.get('link')
      fetch(`${KAIROS.getBase()}/store/ReservationContact/${linkId}`, {method: 'PUT', body: JSON.stringify({id: linkId, comment: newType})})
      .then(response => {
        if (!response.ok) { throw new Error('Erreur')}
        return response.json()
      })
      .then(result => {
      })
      .catch(error => {
        KAIROS.error(error)
      })
    },

    editContact: function (kfieldset) {
      const address = kfieldset.get('address')
      address.edit(kfieldset.domNode)
    },

    show: function () {
      KAIROSAnim.push(() => { this.domNode.parentNode.style.setProperty('display', 'block') })
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
      const type = params.forceType ? params.forceType : file
      return new Promise((resolve, reject) => {
        this.doSave()
        .then(done => {
          if (!done) { throw new Error('ERR:Server') }
          const url = new URL(`${KAIROS.getBase()}/exec/auto-print.php`)
          url.searchParams.append('type', type)
          url.searchParams.append('file', `pdfs/${file}/${this.reservation.uid}`)
          return fetch(url)
          .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
          })
          .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            KAIROS.info(`Impression (${type}) pour la réservation ${this.reservation.uid} en cours`)
          })
        })
        .catch(reason => {
          KAIROS.error(`Erreur d'impression (${type}) pour la réservation ${this.reservation.uid} <${reason instanceof Error ? reason.message : reason}>`)
        })
      })
    },

    showPrint: function (type, params = {}) {
      this.doSave()
      .then((done) => {
        if (done) {
          let url = new URL(`${KAIROS.getBase()}/pdfs/${type}/${this.reservation.uid}`)
          for (let k in params) {
            url.searchParams.append(k, params[k])
          }
          window.open(url)
        }
      })
    },

    doDelete: function (event) {
      this.reservation.remove().then(() => {
        this.hide()
      })
    },

    validate: function () {
      [ this.nDeliveryBeginDate, this.nDeliveryEndDate, this.beginDate, this.endDate, this.nDeliveryRemark ].forEach(function (c) {
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
      let mustCheckDeliveryRemark = true
      if(this.nStatus.value === 'Status/3') { mustCheckDeliveryRemark = false }
      if (begin.getTime() < (new Date()).getTime()) { mustCheckDeliveryRemark = false }
      for (let i = 0; i < this.reservation.complements.length; i++) {
        if (this.reservation?.complements[i]?.type?.id == 4) {
          mustCheckDeliveryRemark = false;
          break
        }
      }
      if (mustCheckDeliveryRemark && !/[a-zA-Z0-9]{3}.*/.test(f.deliveryRemark)) {
        if (!this.nLocality.value.startsWith('Warehouse/')) {
          this.nDeliveryRemark.set('state', 'Error')
          return [ 'Livraison la veille doit être renseignée', false]
        }
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
      this.reservation.copy().then((reservation) => {
        KAIROS.info(`Succès de la duplication de ${this.reservation.id} vers ${reservation.id}`)
        reservation.popMeUp()
        this.hide()
      })
    },

    doSaveAndQuit: function (event) {
      this.doSave()
      .then(done => {
        if (done) {
          this.hide()
        }
      })
      .catch (reason => {
        KAIROS.error(reason)
        this.hide()
      })
    },

    doSave: function (event) {
      return new Promise((resolve, reject) => {
        this.doNumbering()
        let lastModificationTest
        if (this.reservation.id) {
          lastModificationTest = this.reservation.KReservation?.serverCompare() ?? Promise.resolve(true)
        } else {
          lastModificationTest = Promise.resolve(true)
        }
        var err = this.validate()
        if (!err[1]) {
          KAIROS.error(err[0])
          resolve(false)
          return
        }
        let move = false
        if (this.reservation.get('target') !== this.nMachineChange.value) {
          this.reservation.set('target', this.nMachineChange.value)
          this.reservation.set('previous', this.reservation.get('target'))
          move = true
        }

        let f = this.nForm.get('value')
        f.beginTime = this.beginTime.value
        f.endTime = this.endTime.value
        let other = {}
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

        (new Promise((resolve, reject) => {
          lastModificationTest
          .then(same => {
            if (!same || this.domNode.classList.contains('outofsync')) {
              KAIROS.confirm(
                `Réservation modifiée`,
                `La réservation a été modifiée sur un autre poste, forcer l'enrgistrement`, {reference: this.Buttons.save, placement: 'top'})
              .then(confirmed => resolve([confirmed, true]))
              return
            }
            resolve([true, false])
          })
        }))
        .then(([carryon, force]) => {
          if (force) { this.reservation.set('version', 'force')}
          if (!carryon) { return {ok: false}; }
          let url = new URL(`${KAIROS.getBase()}/store/Arrival`)
          url.searchParams.append('search.target', this.reservation.uid)
          return fetch(url)
        })
        .then(response => {
          if (!response.ok) { return null }
          return response.json()
        }).then(res => {
          if (!res) { return }
          let arrival = {}
          if(res.length > 0) {
            arrival = Object.assign(arrival, res.data[0])
          }

          if (this.Buttons.addEnd.getValue()) {
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
            arrival.done = this.Buttons.addArrivalDone.getValue()
            arrival.inprogress = this.Buttons.addArrivalInProgress.getValue()
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
          this.reservation.set('equipment', f.equipment || '%')
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

          this.reservation.save()
          .then((id) => {
            fetch(new URL(`${KAIROS.getBase()}/store/DeepReservation/${this.reservation.id}`))
            .then(response => {
              if (!response.ok) { return null }
              return response.json()
            }).then(result => {
              if (!result) { return null }
              let data = Array.isArray(result.data) ? result.data[0] : result.data
              this.reservation.fromJson(data)
              .then(_ => {
                this.domNode.classList.remove('outofsync')
                this.Buttons.resync.setDisabled(true)
              })
              if (data.modification) {
                this.lastModified = parseInt(data.modification)
                this.reservation.lastModified = parseInt(data.modification)
              }
            })
            if (move) {
              this.reservation.toObject()
              .then((reservation) => {
                this.reservation.sup.KEntry.move(reservation[0])
              })
            }
            this.onSave = null
            resolve(true)
          })
          .catch(reason => {
            KAIROS.syslog(reason)
            this.onSave = null
            resolve(false)
          })
        })
      })
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
      new Count({reservation: this.reservation.uid})
    },
    openAddCount: async function () {
      new CountList({addReservation: this.reservation.uid, integrated: true}) // eslint-disable-line
    },
    clickExport: function () {
      this.reservation.export()
    },

    dropToDeleteBegin: function () {
      KAIROSAnim.push(() => {
        this.nMissionDrop.classList.add('dragToDelete')
        this.nMissionDrop.innerText = 'Glisser pour supprimer !'
      })
    },
    dropToDeleteEnd: function () {
      KAIROSAnim.push(() => {
        this.nMissionDrop.classList.remove('dragToDelete')
        this.nMissionDrop.innerText = 'Glisser ou copier des images pour ajouter !'
      })
    },
    doNumbering: async function () {
      const parent = this.nMissionDisplay
      for (let i = 0, n = parent.firstElementChild; n; n = n.nextElementSibling) {
        n.dataset.number = i
        fetch(new URL(`${KAIROS.getBase()}store/MissionFichier/${n.dataset.hash},${this.nMissionDisplay.dataset.uid}`))
        .then((response) => {
          if (!response.ok) { throw new Error('ERR:Server') }
          return response.json()
        })
        .then(result => {
          if (!result.success) { throw new Error('ERR:Server') }
          if (result.length < 1) {
            fetch(new URL(`${KAIROS.getBase()}/store/MissionFichier/`), {
              method: 'POST',
              body: JSON.stringify({
                mission: this.nMissionDisplay.dataset.uid,
                fichier: n.dataset.hash,
                ordre: i
              })
            })
          } else {
            fetch(new URL(`${KAIROS.getBase()}/store/MissionFichier/${n.dataset.hash},${this.nMissionDisplay.dataset.uid}`), {
              method: 'patch',
              body: JSON.stringify({
                fichier: n.dataset.hash,
                mission: this.nMissionDisplay.dataset.uid,
                ordre: i
              })
            })
          }
        })
        .catch(reason => {
          KAIROS.error(reason)
        })
        i++
      }
    },
    deleteImage: function (hash) {
      const url = new URL(`${KAIROS.getBase()}/store/MissionFichier/${hash},${this.nMissionDisplay.dataset.uid}`)
      fetch(url, {method: 'DELETE'})
      .then(response => {
        if (!response.ok) { throw new Error('ERR:Server') }
        return response.json()
      })
      .then(result => {
        if (!result.success) { throw new Error('ERR:Server') }
        for (let n = this.nMissionDisplay.firstElementChild; n; n = n.nextElementSibling) {
          if (n.dataset.hash !== hash) { continue }
          n.parentNode.removeChild(n)
          break
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
                KAIROSAnim.push(() => {
                  p.removeChild(spacer)
                  p.insertBefore(spacer, n.nextElementSibling)
                })
              } else {
                KAIROSAnim.push(() => {
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
          event.dataTransfer.setData('text/uri-list', new URL(`${KAIROS.getBase()}/${KAIROS.uploader}/${hash}`))

          let p = n.parentNode
          if (p.firstElementChild === n && !n.nextElementSibling) { return }

          let spacer = document.createElement('DIV')
          spacer.classList.add('ddSpacer')
          KAIROSAnim.push(() => {
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
          KAIROSAnim.push(() => {
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
        KAIROSAnim.push(() => {
          this.nMissionDisplay.appendChild(div)
          div.style.backgroundImage = `url('${window.location.origin}/${APPConf.base}/${APPConf.uploader}/${hash}')`
          if (!skipNumbering) { this.doNumbering(this.nMissionDisplay) }
        })
        .then(() => resolve())
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
        const url = new URL(`${KAIROS.getBase()}/store/Mission`)
        url.searchParams.append('search.reservation', this.reservation.uid)
        fetch(url)
        .then(response => {
          if (!response.ok) { throw new Error('ERR:Server') }
          return response.json()
        })
        .then(result => {
          if (!result.success) { throw new Error('ERR:Server') }
          if (result.length === 1) { 
            const mission = Array.isArray(result.data) ? result.data[0] : result.data
            return mission.id
          }
          url.searchParams.delete('search.reservation')
          return fetch(url, {method: 'POST', body: JSON.stringify({reservation: this.reservation.uid})})
          .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
          })
          .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            const mission = Array.isArray(result.data) ? result.data[0] : result.data
            return mission.id
          })
        })
        .then(id => {
          this.nMissionDisplay.dataset.uid = id
        })
        .catch(reason => {
          KAIROS.error(reason)
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

    refreshCount: function () {
      return new Promise((resolve, reject) => {
        const url = new URL(`${KAIROS.getBase()}/store/CountReservation`)
        url.searchParams.append('search.reservation', this.reservation.uid)
        fetch(url)
        .then(response => {
          if (!response.ok) { throw new Error('ERR:Server') }
          return response.json()
        })
        .then(result => {
          if (!result.success) { throw new Error('ERR:Server') }
          if (result.length === 0) { return }
          const entries = result.data
          const trs = []
          for (const entry of entries) {
            trs.push(new Promise((resolve, reject) => {
              const url = new URL(`${KAIROS.getBase()}/store/Count/${entry.count}`)
              fetch(url)
              .then(response => {
                if (!response.ok) { throw new Error('ERR:Server') }
                return response.json()
              })
              .then(result => {
                if (!result.success) { throw new Error('ERR:Server') }
                const entry = Array.isArray(result.data) ? result.data[0] : result.data
                const tr = document.createElement('TR')
                tr.dataset.countId = entry.id
                const period = []

                if (entry.begin) { period.push((new Date(entry.begin)).shortDate()) }
                if (entry.end) { period.push((new Date(entry.end)).shortDate()) }
                tr.innerHTML = `<td class="clickable" data-id="${entry.id}">${entry.id}</td>
                  <td>${entry?._invoice?.winbiz || ''}</td>
                  <td>${entry?._status?.name || ''}</td>
                  <td>${period.length > 0 ? period.join(' - ') : ''}
                      ${entry.state !== 'INTERMEDIATE' ? '⯁' : ''}</td>`
                tr.dataset.sort = entry.begin ? String(new Date(entry.begin).getTime()) : '0'
                tr.addEventListener('click', event => {
                  if (!event.target) { return }
                  if (!event.target.dataset.id) { return }
                  new Count({
                    'data-id': event.target.dataset.id
                  })
                })
                resolve(tr)
              })
              .catch(reason => {
                reject(reason)
              })
            }))
          }

          Promise.allSettled(trs)
          .then(promises => {
            const frag = document.createDocumentFragment()
            const trs = []
            for (const promise of promises) {
              if (promise.status === 'fulfilled') { trs.push(promise.value) }
            }
            trs.sort((a, b) => {
              return parseInt(a.dataset.sort) - parseInt(b.dataset.sort)
            })

            trs.forEach(n => {
              frag.appendChild(n)
            })
            this.nCountList.innerHTML = ''
            this.nCountList.appendChild(frag)
          })
        })
        .catch(reason => {
          reject(reason)
        })
      })
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
