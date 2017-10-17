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

	djXhr,
	dtForm,
	dtDateTextBox,
	dtTimeTextBox,
	dtButton,
	dtSelect
) {

return djDeclare("artnum.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "rForm",
	templateString: _template,
	editor: null,

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

	postCreate: function () {
		this.inherited(arguments);
		var that = this;
		ClassicEditor.create(this.textEditor, { config: { height: 300} }).then(editor => {
			that.editor = editor;
		});
		
		var select = this.status;
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
		this.reservation.myParent.store({ o: this.reservation });
		this.reservation.resize();

			console.log(results);
			djXhr.post(locationConfig.store  + '/Comments/', { handleAs: 'json', data: { content: that.editor.getData(), datetime: now.toISOString(), reservation: that.reservation  } });
	}

});});
