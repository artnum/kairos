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
	"dijit/form/Select"


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
	dtSelect
) {

return djDeclare("artnum.contacts", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "contacts",
	templateString: _template,


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
				this.cache.setItem('/Contacts/' + entry.IDent, JSON.stringify(entry));
				if(entry.givenname) { x += '<span class="name">' + flatten(entry.givenname) + "</span> "; }
				if(entry.sn) { x += '<span class="family">' + flatten(entry.sn) + "</span> "; }
				if(entry.o) { x += '<span class="company">' + flatten(entry.o) + "</span> "; }

				var y = '';
				if(entry.postalcode) { y += '<span class="code">' + entry.postalcode + "</span> "; }
				if(entry.l) { y += '<span class="code">' + entry.l + "</span>"; }
					
				var n = djDomConstruct.toDom('<div class="contact" data-artnum-ident="/Contacts/' + entry.IDent + '"><div>' + x + "</div><div>" + y +"</div></div>");
				djOn(n, "click", djLang.hitch(this, function (event) {
						var id = '';
						var n = event.target;
						while(id == '' && n) {
							console.log(n);
							if(djDomAttr.has(n, 'data-artnum-ident')) {
								id = djDomAttr.get(n, 'data-artnum-ident');	
							}
							n = n.parentNode;
						}

						console.log(id);
						if(id != '') {
							this.myParent.saveContact(id);
							this.dialog.destroy();
						}
					}));
				frag.appendChild(n);

			}));
			var d = this.results;
			window.requestAnimationFrame(function () { d.set('content', frag); });
		}));

		return false;
	}

});});
