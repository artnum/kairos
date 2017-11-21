define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
  "dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	"dojo/text!./templates/card.html",

	"dojo/dom",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom-construct",
	"dojo/on",
  "dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-form",
	"dojo/dom-attr",
	"dojo/request/xhr"

], function(
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
	djDomAttr,

	djXhr
) {

return djDeclare("artnum.card", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "card",
	templateString: _template,
	mapping: { firstname: [ 'givenname', ' '] , familyname: [ 'sn', ' '],
		organization: ['o', ' '], locality : [ 'l', null ], npa: [ 'postalcode', null],
		address: ['postaladdress', null ], identity: [ 'IDent', null ] },
	constructor: function(idprefix) {
		this._set('idprefix', idprefix);
	},

	getType: function (value) {
		switch(value) {
			case 'client': value = 'Client'; break;
			case 'responsable': value = 'Responsable'; break;
			case 'place': value = 'Contact sur place'; break;
		}
		return value;
	},
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
		var id = this._get('identity');
		if(id) {
			return this._get('idprefix') + id;	
		}
		return null;
	},
	entry: function(entry) {
		for(var k in this.mapping) {
			if(entry[this.mapping[k][0]]) {
				if(this.mapping[k][1] != null) {
					this.set(k, flatten(entry[this.mapping[k][0]], this.mapping[k][1]));
				} else {
					this.set(k, entry[this.mapping[k][0]]);
				}
			}
		}
	}
});});
