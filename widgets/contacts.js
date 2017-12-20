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

	"artnum/card",
	"artnum/_Request"


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

	card,
	request
) {

return djDeclare("artnum.contacts", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "contacts",
	templateString: _template,
	mapping: { firstname: [ 'givenname', ' '] , familyname: [ 'sn', ' '],
		organization: ['o', ' '], locality : [ 'l', null ], npa: [ 'postalcode', null],
		address: ['postaladdress', null ] },

	constructor: function(p) {
		this.sup = p.target;
	},
	keyEvent: function(event) {
		var k = event.key ? event.key : event.keyCode;
	
		if(k == 'Enter') {
			if(event.target.name == 'search') {
				this.doSearch(event);	
			}
		}
	},
	doAddFreeform: function(event) {
		var f = djDomForm.toObject(this.form.domNode);
		
		if(f.freeform) {
			this.sup.saveContact(null, { 
				type: f.cType,
				comment: f.details, 
				freeform: f.freeform});
				this.dialog.destroy();
		}		
	},
	doSearch: function (event) {
		var f = djDomForm.toObject(this.form.domNode);
	
		var terms = f.search.split(/\s+/);
		for(var i = 0; i < terms.length; i++) {
			/* add = in front of searh as * means verify for presence if first letter in search term */
			terms[i] = "=*" + terms[i] + "*";	
		}
		
		request.get(locationConfig.store + '/Contacts/',
			{ query: { 
									"search.sn": terms, 
									"search.givenname": terms, 
									"search.o": terms,
									"search._sn": 'or',
									"search._givenname": 'or'
								} }).then(djLang.hitch(this, function (res) {
			var frag = document.createDocumentFragment();
			res.data.forEach(djLang.hitch(this, function (entry) {
				var x = '<i class="fa fa-user-circle-o" aria-hidden="true"></i> ';
				
				var c = new card('/Contacts/');
				c.entry(entry);
				
				djOn(c.domNode, "click", djLang.hitch(this, function (event) {
						var id = dtRegistry.getEnclosingWidget(event.target).get('identity');
						if(id != null) {
							this.sup.saveContact(id, { type: f.cType, comment: f.details });
							this.dialog.destroy();
						}
					}));
				frag.appendChild(c.domNode);

			}));
			var d = this.results;
			var dialog = this.dialog;
			window.requestAnimationFrame(function () { if(d) { d.set('content', frag); d.resize(); } ; if(dialog) { dialog.resize(); } });
		}));
		return false;
	}
});});
