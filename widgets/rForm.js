define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
  "dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	"dojo/text!./templates/rForm.html",

	"dojo/dom",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom-construct",
	"dojo/on",
  "dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-form",
	"dojo/request/xhr",

	"dijit/form/Form",
	"dijit/form/DateTextBox",
	"dijit/form/TimeTextBox",
	"dijit/form/Textarea",
	"dijit/form/TextBox",
	"dijit/form/Button",
	"dijit/form/Select",
	"dijit/Dialog",

	"artnum/contacts"


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

	djXhr,
	dtForm,
	dtDateTextBox,
	dtTimeTextBox,
	djTextarea,
	djTextBox,
	dtButton,
	dtSelect,
	dtDialog,

	contacts
) {

return djDeclare("artnum.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "rForm",
	templateString: _template,
	editor: null,

	_setDescriptionAttr: function (value) {
		this.description = value;
	},
	_setBeginAttr: function (value) {
		this.beginDate.set('value', value.toISOString());
		this.beginTime.set('value', value.toISOString());
		this.begin = value;
	},
	_setEndAttr: function (value) {
		this.endDate.set('value', value.toISOString());
		this.endTime.set('value', value.toISOString());
		this.end = value;
	},

	_setAddressAttr:function (value) {
		console.log(value);
		if(value) {
			this.nAddress.set('value', value);
		}
	},
	_setLocalityAttr: function (value) {
		console.log(value);
		if(value) {
			this.nLocality.set('value', value);	
		}
	},

	postCreate: function () {
		this.inherited(arguments);
		var select = this.status;
		var that = this;
		ClassicEditor.create(this.textEditor, { config: { height: 600} }).then(editor => {
			that.editor = editor;
		});
		djXhr(locationConfig.store + '/Status/', { handleAs: 'json' }).then( function (results) {
			if(results.type = "results") {
				let def = 0;
				results.data.forEach(function (d) {
					if(d.default == '1') { def = d.id; }
					select.addOption({
						label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
						value: ""+d.id
					});
				});
				if(that.get('status')) {
					select.set('value', that.get('status'));
				} else {
					select.set('value', def);
				}
			}	
		});
		
  },

	saveContact: function (id) {
		console.log(id);	
		this.reservation.set('contact', id);
	},

	doAddContact: function (event) {
		var c = new contacts({ target: this });
		var dialog = new dtDialog({title: "Ajout contact", style: "width: 600px; height: 600px; background-color: white;", content: c});
		c.set('dialog', dialog);
		dialog.show();		
	},

	doSave: function (event) {
		console.log(this.editor.getData());
		var now = new Date();

		let f = djDomForm.toObject(this.domNode);
		let begin = djDateStamp.fromISOString(f.beginDate + f.beginTime);
		let end = djDateStamp.fromISOString(f.endDate + f.endTime);
		var that = this;

		this.reservation.set('status', f.status);
		this.reservation.set('begin', begin);
		this.reservation.set('end', end);
		this.reservation.set('address', f.nAddress);
		this.reservation.set('locality', f.nLocality);
		this.reservation.myParent.store({ o: this.reservation });
		this.reservation.resize();

			//djXhr.post(locationConfig.store  + '/Comments/', { handleAs: 'json', data: { content: that.editor.getData(), datetime: now.toISOString(), reservation: that.reservation  } });
	}

});});