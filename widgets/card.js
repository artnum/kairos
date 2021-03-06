/* eslint-env browser, amd */
/* global flatten */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/card.html',

  'dojo/dom',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-class',
  'dojo/dom-form',
  'dojo/dom-attr'

], function (
  djDeclare,
  djLang,
  djEvented,
  djDeferred,

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
  djDomAttr

) {
  return djDeclare('location.card', [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
    baseClass: 'card',
    templateString: _template,
    mapping: { firstname: ['givenname', ' '],
      displayname: ['displayname', ' '],
      familyname: ['sn', ' '],
      organization: ['o', ' '],
      locality: ['l', null],
      npa: ['postalcode', null],
      address: ['postaladdress', null],
      identity: [ 'IDent', null ] },
    constructor: function (idprefix) {
      this._set('idprefix', idprefix)
      return this
    },

    getType: function (value) {
      switch (value) {
        case '_client': value = 'Client'; break
        case '_responsable': value = 'Responsable'; break
        case '_place': value = 'Contact sur place'; break
        case '_facturation': value = 'Facturation'; break
        case '_retour': value = 'Retour'; break
      }
      return value
    },
    displayname: '',
    _setDisplaynameAttr: { node: 'nDisplayname', type: 'innerHTML' },
    organization: '',
    _setOrganizationAttr: { node: 'nOrganization', type: 'innerHTML' },
    familyname: '',
    _setFamilynameAttr: { node: 'nFamilyname', type: 'innerHTML' },
    firstname: '',
    _setFirstnameAttr: { node: 'nFirstname', type: 'innerHTML' },
    address: '',
    _setAddressAttr: { node: 'nAddress', type: 'innerHTML' },
    npa: '',
    _setNpaAttr: { node: 'nNpa', type: 'innerHTML' },
    locality: '',
    _setLocalityAttr: { node: 'nLocality', type: 'innerHTML' },
    _getIdentityAttr: function () {
      var id = this._get('identity')
      if (id) {
        return this._get('idprefix') + id
      }
      return null
    },
    _getTypeAttr: function () {
      if (!this.Type) { return null }
      return this.Type
    },
    _setTypeAttr: function (value) {
      this.Type = value
    },
    entry: function (entry) {
      if (!entry) { return }
      this.Entry = entry
      if (!entry.freeform) {
        for (var k in this.mapping) {
          if (entry[this.mapping[k][0]]) {
            if (this.mapping[k][1] != null) {
              this.set(k, flatten(entry[this.mapping[k][0]], this.mapping[k][1]))
            } else {
              this.set(k, entry[this.mapping[k][0]])
            }
          }
        }
        if (entry['telephonenumber'] || entry['mobile']) {
          this.domNode.appendChild(document.createElement('br'))
          var num = entry['mobile'] ? entry['mobile'] : entry['telephonenumber']
          var s = document.createElement('span')
          s.appendChild(document.createTextNode(num))
          this.domNode.appendChild(s)
        }
        if (entry['mail']) {
          this.domNode.appendChild(document.createElement('br'))
          num = entry['mobile'] ? entry['mobile'] : entry['telephonenumber']
          s = document.createElement('span')
          s.appendChild(document.createElement('a'))
          s.firstChild.setAttribute('href', 'mailto:' + entry['mail'])
          s.firstChild.appendChild(document.createTextNode(entry['mail']))
          this.domNode.appendChild(s)
        }
      } else {
        this.raw(entry.freeform)
      }
    },
    raw: function (txt) {
      var e = document.createElement('DIV')
      var first = true
      txt.split(/(?:\r\n|\r|\n)/g).forEach(function (line) {
        if (!first) { e.appendChild(document.createElement('BR')) }
        e.appendChild(document.createTextNode(line))
        first = false
      })
      this.domNode = e
    }
  })
})
