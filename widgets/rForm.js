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
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",

	"artnum/contacts",
	"artnum/card",
	"artnum/_Cluster",
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
	dtTabContainer,
	dtContentPane,

	contacts,
	card,
	_Cluster,
	request
) {

return djDeclare("artnum.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {
	baseClass: "rForm",
	templateString: _template,
	contacts: {},
	isLayoutContainer: true,

	resize: function() {
		this.nContactsContainer.resize();
	},

	constructor: function() {
		this.contacts = new Object();
	},

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
			that.createContact(entry, '_client');
		});
	},

	postCreate: function () {
		this.inherited(arguments);
		var select = this.status;
		var that = this;
		request.get(locationConfig.store + '/Status/').then( function (results) {
			if(results.type = "results") {
				let def = 0;
				results.data.forEach(function (d) {
					if(d.default == '1') { def = d.id; }
					select.addOption({
						label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
						value: d.id
					});
				});
				if(that.reservation.get('status')) {
					select.set('value', that.reservation.get('status'));
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
		
		request.get(locationConfig.store + '/ReservationContact/', { query: { "search.reservation": this.reservation.get('IDent') }}).then(djLang.hitch(this, function (res) {
			if(res.success()) {
				res.whole().forEach(djLang.hitch(this, function (contact) {
					if(contact.freeform) {
						
					} else {
						var linkId = contact.id, comment = contact.comment;
						request.get(locationConfig.store + contact.target).then(djLang.hitch(this, function( entry ) {
							if(entry.success()) {
								var e = entry.first();
								e.linkId = linkId;
								this.createContact(e, comment);
							}
						}));
					}
				}));
			}
		}));
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

	createContact: function (entry, type) {
		var show = false;
		if(arguments[2]) { show = true; }
		var c = new card('/Contacts/');
		c.entry(entry);
		if(this.contacts[type]) {
			this.nContactsContainer.removeChild(this.contacts[type]);	
		}
		
		this.contacts[type] = new dtContentPane({
		  	title: '<i class="fa fa-user-circle-o" aria-hidden="true"></i> ' + c.getType(type),
				content: c.domNode,
				closable: true,
				contactType: type,
				contactCard: c,
				style: "height: 80px;",
				onClose: djLang.hitch(this, function (event) {
						if(confirm('Supprimer le contact ' + c.getType(type))) {
							var tab = event.selectedChildWidget;
							if(tab) {
								if(tab.contactType) {
									if(tab.contactType == '_client') {
										this.reservation.set('contact', '');
									}	else {
										request.del(locationConfig.store + '/ReservationContact/' + entry.linkId);
									}
									
									event.removeChild(tab);
								}	
							}
						}
					})
			});
		
		this.nContactsContainer.addChild(this.contacts[type]);
		if(this.contacts['_client']) {
			this.nContactsContainer.selectChild(this.contacts['_client']);
		} else { 
			this.nContactsContainer.selectChild(this.contacts[type]);
		}
		if(show) {
			this.nContactsContainer.selectChild(this.contacts[type]);
		}
	},

	saveContact: function (id, options) {
		var type = options.type ? options.type : '_client';
		if(options.type == '_autre') {
			type = options.comment;
		} 
	
		if(options.type == "_client") {
			this.reservation.set('contact', id);
			request.get(locationConfig.store + '/' + id, { skipCache: true }).then(djLang.hitch(this, function (c) {
				var e = c.first();
				e.linkId=null;
				this.createContact(e, type, true);
			}));
		} else {
			request.get(locationConfig.store + '/ReservationContact/', { query: {
					'search.reservation': this.reservation.get('IDent'),
					'search.target': id,
					'search.comment': type
				}}).then(djLang.hitch(this, function(results){
					if(results.count() == 0) {
						request.post(locationConfig.store + '/ReservationContact/', { method: 'post', query: { reservation: this.reservation.get('IDent'), comment: type, freeform: null, target: id }})
							.then(djLang.hitch(this, function ( results) {
									request.get(locationConfig.store + '/' + id, { skipCache: true }).then(djLang.hitch(this, function (c) {
										var e = c.first();
										e.linkId =  results.id;
										this.createContact(e, type, true);
									}));
							}));
					}
				}));
			}
	},

	doAddContact: function (event) {
		var c = new contacts({ target: this });
		var dialog = new dtDialog({title: "Ajout contact", style: "width: 600px; background-color: white;", content: c});
		c.set('dialog', dialog);
		dialog.show();		
	},

	doDelete: function (event) {
		if(this.reservation.remove()) {
			var that = this;
			request.del(locationConfig.store + '/Reservation/' + this.reservation.get('IDent')).then(function() {
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
		this.reservation.sup.store({ o: this.reservation });
		this.reservation.sup.update(true);
		this.dialog.destroy();
	}
});});
