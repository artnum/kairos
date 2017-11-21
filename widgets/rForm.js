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
	"dijit/form/CheckBox",
	"dijit/Dialog",

	"artnum/contacts",
	"artnum/card",
	"artnum/_Cluster"


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
	dtCheckBox,
	dtDialog,

	contacts,
	card,
	_Cluster
) {

return djDeclare("artnum.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {
	baseClass: "rForm",
	templateString: _template,

	_setDescriptionAttr: function (value) {
		this.description = value;
	},
	_setBeginAttr: function (value) {
		this.beginDate.set('value', value.toISOString());
		this.beginTime.set('value', value.toISOString());
		this._set('begin',  value);
		if(! this.get('deliveryBegin')) {
			this.set('deliveryBegin', value);	
		}

	},
	_setEndAttr: function (value) {
		this.endDate.set('value', value.toISOString());
		this.endTime.set('value', value.toISOString());
		this._set('end', value);
		if(! this.get('deliveryEnd')) {
			this.set('deliveryEnd', value)
		}
	},
	_setDeliveryBeginAttr: function (value) {
		if(! value) { return; }
		this.nDeliveryBeginDate.set('value', value.toISOString());
		this.nDeliveryBeginTime.set('value', value.toISOString());
		this._set('deliveryBegin', value);
	},
	_setDeliveryEndAttr: function(value) {
		if(! value) { return; }
		this.nDeliveryEndDate.set('value', value.toISOString());
		this.nDeliveryEndTime.set('value', value.toISOString());
		this._set('deliveryEnd', value);
	},
	_setAddressAttr:function (value) {
		if(value) {
			this.nAddress.set('value', value);
		}
	},
	_setLocalityAttr: function (value) {
		if(value) {
			this.nLocality.set('value', value);	
		}
	},
	_setCommentAttr: function (value) {
		if(value) {
			this.nComments.set('value', value);
		}	
	},
	_setContactAttr: function(value)  {
		var that = this;
		this.reservation.lookupContact(value).then(function (entry) {
			c = new card();
			c.entry(entry);
			c.set('type', 'client');
			that.nContacts.appendChild(c.domNode);
		});
	},
	postCreate: function () {
		this.inherited(arguments);
		var select = this.status;
		var that = this;
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
		if(this.reservation.is('confirmed')) {
			this.nConfirmed.set('checked', true);
		}
		this.toggleConfirmed();
		
		if(this.reservation.is('deliverydate')) {
			this.nDelivery.set('checked', true);
		}
		this.toggleDelivery();
  },
	toggleDelivery: function () {
		if(this.nDelivery.get('checked')) {
			this.nDeliveryFields.style ='display: block;';
			
			if(!this.deliveryBegin) {
				this.nDeliveryBeginTime.set('value', this.beginTime.get('value'));
				this.nDeliveryBeginDate.set('value', this.beginDate.get('value'));
			}
			if(!this.deliveryEnd) {
				this.nDeliveryEndTime.set('value', this.endTime.get('value'));
				this.nDeliveryEndDate.set('value', this.endDate.get('value'));
			}
		} else {
			this.nDeliveryFields.style= 'display: none;';	
		}
	},
	toggleConfirmed: function() {
		if(this.nConfirmed.get('checked')) {
			this.endTime.set('readOnly', true);
			this.endDate.set('readOnly', true);	
			this.nDeliveryEndTime.set('readOnly', true);
			this.nDeliveryEndDate.set('readOnly', true);	
		} else {
			this.endTime.set('readOnly', false);
			this.endDate.set('readOnly', false);	
			this.nDeliveryEndTime.set('readOnly', false);
			this.nDeliveryEndDate.set('readOnly', false);	
		}
	},
	saveContact: function (id, options) {
		if(options.type && options.type == "client") {
			this.reservation.set('contact', id);
		} else {
			
		}
		if(djDom.byId(this.id + '/' + id)) {
			var x = djDom.byId(this.id + '/' + id);
			x.parentNode.removeChild(x);
		}

		var entry = JSON.parse(window.sessionStorage.getItem(id));
		var c = new card();
		c.entry(entry);
		c.set('type', options.type);
		this.nContacts.appendChild(c.domNode);
	},
	doAddContact: function (event) {
		var c = new contacts({ target: this });
		var dialog = new dtDialog({title: "Ajout contact", style: "width: 600px; height: 600px; background-color: white;", content: c});
		c.set('dialog', dialog);
		dialog.show();		
	},
	doDelete: function (event) {
		if(this.reservation.remove()) {
			var that = this;
			djXhr(locationConfig.store + '/Reservation/' + this.reservation.get('IDent'), { handleAs: "json", method: "delete" }).then(function() {
				that.dialog.destroy();
			});
		}
	},
	doSave: function (event) {
		var now = new Date();

		let f = djDomForm.toObject(this.domNode);
		let begin = djDateStamp.fromISOString(f.beginDate + f.beginTime);
		let end = djDateStamp.fromISOString(f.endDate + f.endTime);
	
		this.reservation.setIs('deliverydate', this.nDelivery.get('checked'));
	
		let deliveryBegin = begin;
		let deliveryEnd = end;
		if(this.reservation.is('deliverydate')) {
			deliveryBegin = djDateStamp.fromISOString(f.deliveryBeginDate + f.deliveryBeginTime);
			deliveryEnd = djDateStamp.fromISOString(f.deliveryEndDate + f.deliveryEndTime);
		}

		this.reservation.setIs('confirmed', this.nConfirmed.get('checked'));
		this.reservation.set('status', f.status);
		this.reservation.set('begin', begin);
		this.reservation.set('end', end);
		this.reservation.set('deliveryBegin', deliveryBegin);
		this.reservation.set('deliveryEnd', deliveryEnd);
		this.reservation.set('address', f.nAddress);
		this.reservation.set('locality', f.nLocality);
		this.reservation.set('comment', f.nComments);
		this.reservation.myParent.store({ o: this.reservation });
		this.reservation.myParent.update(true);
		this.dialog.destroy();
	}
});});
