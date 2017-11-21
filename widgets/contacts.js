define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
  "dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	"dojo/text!./templates/contacts.html",

	"dojo/dom",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom-construct",
	"dojo/on",
  "dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-form",
	"dojo/dom-attr",
	"dojo/request/xhr",

	"dijit/form/Form",
	"dijit/form/DateTextBox",
	"dijit/form/TimeTextBox",
	"dijit/form/Button",
	"dijit/form/RadioButton",
	"dijit/form/Select",
	"dijit/registry",

	"artnum/card"


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

	djXhr,
	dtForm,
	dtDateTextBox,
	dtTimeTextBox,
	dtButton,
	dtRadioButton,
	dtSelect,
	dtRegistry,

	card
) {

return djDeclare("artnum.contacts", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "contacts",
	templateString: _template,
	mapping: { firstname: [ 'givenname', ' '] , familyname: [ 'sn', ' '],
		organization: ['o', ' '], locality : [ 'l', null ], npa: [ 'postalcode', null],
		address: ['postaladdress', null ] },

	constructor: function(p) {
		this.myParent = p.target;
		this.cache = window.sessionStorage;
		this.inherited(arguments);		
	},
	doSearch: function (event) {
		var f = djDomForm.toObject(this.form.domNode);
		djXhr(locationConfig.store + '/Contacts/',
			{ handleAs: 'json', query: { "search.sn": f.search + "*", "search.givenname": f.search + "*", "search.o": f.search + "*" } }).then(djLang.hitch(this, function (res) {
			var frag = document.createDocumentFragment();
			res.data.forEach(djLang.hitch(this, function (entry) {
				var x = '<i class="fa fa-user-circle-o" aria-hidden="true"></i> ';
				var c = new card('/Contacts/');
				
				c.entry(entry);			
				this.cache.setItem(c.get('identity'), JSON.stringify(entry));
					
				djOn(c.domNode, "click", djLang.hitch(this, function (event) {
						var id = dtRegistry.getEnclosingWidget(event.target).get('identity');
						if(id != null) {
							this.myParent.saveContact(id, { type: f.cType, comment: f.details });
							this.dialog.destroy();
						}
					}));
				frag.appendChild(c.domNode);

			}));
			var d = this.results;
			var dialog = this.dialog;
			window.requestAnimationFrame(function () { d.set('content', frag); d.resize(); dialog.resize();});
		}));
		return false;
	}
});});
