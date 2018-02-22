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
	"dojo/store/Memory",
	"dojo/promise/all",

	"dijit/form/Form",
	"dijit/form/DateTextBox",
	"dijit/form/TimeTextBox",
	"dijit/form/Textarea",
	"dijit/form/TextBox",
	"dijit/form/Button",
	"dijit/form/Select",
	"dijit/form/FilteringSelect",
	"dijit/form/CheckBox",
	"dijit/Dialog",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"dijit/registry",

	"location/contacts",
	"location/card",
	"location/_Cluster",
	"location/_Request",
	"location/bitsfield",
	"location/dateentry",

	"artnum/Request",
	"artnum/Join"


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
	djMemory,
	djAll,

	dtForm,
	dtDateTextBox,
	dtTimeTextBox,
	djTextarea,
	djTextBox,
	dtButton,
	dtSelect,
	dtFilteringSelect,
	dtCheckBox,
	dtDialog,
	dtTabContainer,
	dtContentPane,
	dtRegistry,

	contacts,
	card,
	_Cluster,
	request,
	bitsfield,
	dateentry,

	Req,
	Join
) {

return djDeclare("location.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {
	baseClass: "rForm",
	templateString: _template,
	contacts: {},
	isLayoutContainer: true,

	resize: function() {
		this.nContactsContainer.resize();
	},

	constructor: function(args) {
		this.reservation = args.reservation;
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

	_setReferenceAttr:function (value) {
		if(value) {
			this.nReference.set('value', value);
		}
	},

	_setEquipmentAttr:function (value) {
		if(value) {
			this.nEquipment.set('value', value);
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

	associationEntries: function(entries) {
		var frag = document.createDocumentFragment();
		for(var i = 0; i < entries.length; i++) {	
			var entry = entries[i];
			var value = entries[i].type;
			var d = document.createElement('DIV');
			d.setAttribute('class', 'machinist');

			if(value) {
				var name = document.createElement('DIV');
				if(value.color) {
					var x = document.createElement('I');
					x.setAttribute('aria-hidden', 'true'), x.setAttribute('class', 'fa fa-square'); x.setAttribute('style', 'color: #' + value.color + ';');
					name.appendChild(x); name.appendChild(document.createTextNode(' '));
				}

				name.appendChild(document.createTextNode(value.name));
				d.appendChild(name);
			}
			
			var s = document.createElement('DIV');
			s.setAttribute('class', 'delete icon');
			s.setAttribute('data-artnum-id', entry.id);
			s.appendChild(djDomConstruct.toDom('<i class="fa fa-trash-o" aria-hidden="true"> </i>'));
			djOn(s, "click", djLang.hitch(this, this.doRemoveMachinist));
			d.appendChild(s);

			var begin = djDateStamp.fromISOString(entry.begin);
			var end = djDateStamp.fromISOString(entry.end);

			var x = document.createElement('DIV');
			x.setAttribute('class', 'dates');

			var s = document.createElement('SPAN');
			s.appendChild(document.createTextNode('Du ' + begin.fullDate() + ' ' + begin.shortHour()));		
			x.appendChild(s);
		
			var s = document.createElement('SPAN');
			s.appendChild(document.createTextNode(' au ' + end.fullDate() + ' ' + end.shortHour()));	
			x.appendChild(s);
		
			d.appendChild(x);

			if(entry.comment) {
				var s = document.createElement('DIV');
				s.setAttribute('class', 'comment')
				s.appendChild(document.createTextNode(entry.comment));
				d.appendChild(s);		
			}

			frag.appendChild(d); 
		}
		this.own(frag);
		return frag;
	},

	getMachinist: function() {
		var def = new djDeferred();
		var that = this;
		Join({ url: locationConfig.store + '/Association', options: { query: { "search.reservation": this.reservation.get('id')}}}, { attribute: 'type' }, function ( data ) { if(data && data.data && data.data.length > 0) { return data.data; } else { return new Array(); } }).then( function ( entries ) {
			for(var i = that.listMachinist.firstChild; i; i = that.listMachinist.firstChild) {
				that.listMachinist.removeChild(i);
			}	
			that.listMachinist.appendChild(that.associationEntries(entries));
		});
		
		return def.promise;
	},

	doRemoveMachinist: function(event) {
		var id = null;
		var that = this;
		for(var i = event.target; i; i = i.parentNode) {
			if(i.getAttribute('data-artnum-id')) {
				id = i.getAttribute('data-artnum-id');
				break;	
			}	
		}

		if(id != null) {
			request.del(locationConfig.store + '/Association/' + id).then( function() {
				that.getMachinist();
			});
		}
	},

	loadMachinist: function() {
		var def = new djDeferred();
		request.get(locationConfig.extStore['Machinist']).then( function (results) {
			if(results.count()>0) {
				def.resolve(results.whole());
			}	else {
				def.resolve([]);
			}
		});

		return def.promise;
	},

	refreshMachinist: function() {
		var that = this;

		this.nMBeginDate.set('value', this.beginDate.get('value'));
		this.nMBeginTime.set('value', this.beginTime.get('value'));
		this.nMEndDate.set('value', this.endDate.get('value'));
		this.nMEndTime.set('value', this.endTime.get('value'));

		this.loadMachinist().then( function(res) {
			var options = new djMemory();
			res.forEach( function (entry) {
				options.data.push({name: entry.commonName, id: locationConfig.extStore['Machinist'] + '/' + entry.id});
			});	

			that.nMachinist.set('store',options);
		});
	},

	doAddMachinist: function () {
		var that = this;
		var f = djDomForm.toObject(this.nMachinistForm);

		for (var i in [ 'nMachinist', 'nMBeginDate', 'nMBeginTime', 'nMEndDate', 'nMEndTime']) {
			if(f[i] == '') {
				this[i].set('state', 'Error');
				return;		
			}	
		}

		var begin = djDateStamp.toISOString(djDateStamp.fromISOString(f.nMBeginDate + f.nMBeginTime), { zulu: true});
		var end = djDateStamp.toISOString(djDateStamp.fromISOString(f.nMEndDate + f.nMEndTime), { zulu: true});

		request.post('/location/store/Association/', { query: {
			'reservation': this.reservation.get('id'),
			'target': null,
			'type': f.associationType,
			'begin': begin,
			'end': end,
			'comment': f.nMComment ? f.nMComment : '' 
		}}).then(function () {
			that.getMachinist();
			that.reservation.resize();
		});

	},

	doSelectMachine: function (value) {
		if(this.reservation.get('target') != value) {
			this.nChangeMachine.set('disabled', false);
		} else {
			this.nChangeMachine.set('disabled', true);
		}
	},
	doChangeMachine: function (event) {
		var newMachine = this.nMachineChange.get('value');
		var oldMachine = this.reservation.get('target');
		var that = this;

		Req.get(locationConfig.store + '/Reservation/', { query: {
			"search.target" : newMachine,
			"search.begin": "<" + djDateStamp.toISOString(that.reservation.get('trueEnd')),
			"search.end": ">" + djDateStamp.toISOString(that.reservation.get('trueBegin'))
		}}).then(function (reservation) {
			var change = true;
			if(reservation && reservation.data.length > 0) {
				change = confirm('La machine est occupée durant la période de réservation, changer quand même ?');
			}

			if(change) {
				Req.put(locationConfig.store + '/Reservation/' + that.reservation.get('id'), { query: {
					'id' : that.reservation.get('id'),
					target: newMachine
				}}).then( function ( res ) {
					if(res && res.data && res.data.success) {
						var id= that.reservation.get('id');
						dtRegistry.byId(id).destroy();
						dtRegistry.byId('location_entry_' + newMachine).update(true).then( function() {
							that.hide();
							that.destroy();
							if(dtRegistry.byId(id)) {
								dtRegistry.byId(id).popMeUp();
							}
						});
					}
				});
			}
		});

	},

	postCreate: function () {
		this.inherited(arguments);
		var select = this.status;
		var that = this;
		
		// Not used yet ... might be in the futur
		//this.refreshMachinist();
		this.getMachinist();

		this.reservation.get('entries').forEach( function (entry) {
			that.nMachineChange.addOption({
				label: entry.target + ' - ' + entry.label,
				value: entry.target
			});
		});
		this.nMachineChange.set('value', this.reservation.get('target'));
		this.nChangeMachine.set('disabled', true);

		djOn(this.nForm, "mousemove", function(event) { event.stopPropagation(); });
		request.get(locationConfig.store + '/Status/', { query : {'search.type': 0 }}).then( function (results) {
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

		request.get(locationConfig.store + '/Status/', { query : { 'search.type': 1 }}).then( function (results) {
			if(results.type = 'results') {
				results.data.forEach(function (d) {
					that.nAssociationType.addOption({
						label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
						value: locationConfig.store + '/Status/' + d.id 
					});
				});
			}
		});


/*		this.dialog = new dtDialog({
			title: 'Réservation ' + this.reservation.get('id') + ', machine ' + this.reservation.get('target'),
			id: 'DIA_RES_' + this.reservation.get('id'),
			content: this.domNode	
		}); */

		/*var div = document.createElement('DIV');
		div.setAttribute('style', 'width: 40%; position: fixed; top: 0; right:0; bottom: 0; z-index: 4000; background-color: white;');
		div.appendChild(this.domNode);
	 	*/

		var cp = new dtContentPane({
			title: 'Réservation ' + this.reservation.get('id'),
			closable: true,
			id: 'DIA_RES_' + this.reservation.get('id'),
			content: this.domNode});
		this.reservation.highlight();
		dtRegistry.byId('tContainer').addChild(cp);
		dtRegistry.byId('tContainer').resize();
		dtRegistry.byId('tContainer').selectChild(cp.id);
		this.contentPane = cp;

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
						contact.linkId = contact.id;
						this.createContact(contact, contact.comment);	
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
		var that = this;
		if(arguments[2]) { show = true; }
		c = new card('/Contacts/');
		c.entry(entry);
		
		this.contacts[type] = new dtContentPane({
		  	title: '<i class="fa fa-user-circle-o" aria-hidden="true"></i> ' + c.getType(type),
				content: c.domNode,
				closable: true,
				contactType: type,
				contactCard: c,
				contactLinkId: entry.linkId,
				style: "height: 80px;",
				onClose: djLang.hitch(this, function (event) {
						if(confirm('Supprimer le contact ' + c.getType(type))) {
							var tab = event.selectedChildWidget;
							if(tab) {
								if(tab.contactType) {
									that.contacts[tab.contactType] = null;
									request.del(locationConfig.store + '/ReservationContact/' + tab.contactLinkId);
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

		this.nMBeginDate.set('value', this.beginDate.get('value'));
		this.nMBeginTime.set('value', this.beginTime.get('value'));
		this.nMEndDate.set('value', this.endDate.get('value'));
		this.nMEndTime.set('value', this.endTime.get('value'));
	},

	saveContact: function (id, options) {
		var that = this;
		var type = options.type ? options.type : '';
		if(options.type == '_autre') {
			type = options.comment;
		} 
	
		if(id != null) {
				request.get(locationConfig.store + '/ReservationContact/', { query: {
						'search.reservation': this.reservation.get('IDent'),
						'search.target': id,
						'search.comment': type
					}}).then(djLang.hitch(this, function(results){
						if(results.count() == 0) {
							request.post(locationConfig.store + '/ReservationContact/', { method: 'post', query: { reservation: that.reservation.get('IDent'), comment: type, freeform: null, target: id }})
								.then(djLang.hitch(this, function ( results) {
										request.get(locationConfig.store + '/' + id, { skipCache: true }).then(djLang.hitch(this, function (c) {
											var e = c.first();
											e.linkId =  results.first().id;
											that.createContact(e, type, true);
											that.reservation.set('contact',''); 
										}));
								}));
						}
					}));
			} else {
				request.get(locationConfig.store + '/ReservationContact', { query: {
					'search.reservation': this.reservation.get('IDent'),
					'search.comment': type,
					'search.freeform': options.freeform}}).then(djLang.hitch(this, function (results) {
						if(results.count() == 0) {
							request.post(locationConfig.store + '/ReservationContact/', { query: {
								reservation: this.reservation.get('id'), comment: type, freeform: options.freeform, target: null}}).then(function(result) {	
									if(result.success()) {
										options.linkId = result.first().id;
										that.createContact(options, type, true);
										that.reservation.set('contact',''); 
									}
								});
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

	show: function () {
		var that = this;
		this.getMachinist();
		window.requestAnimationFrame(function() { djDomStyle.set(that.domNode.parentNode, 'display', 'block'); });
	},

	hide: function() {
		var that = this;
		window.requestAnimationFrame(function() { dtRegistry.byId('tContainer').removeChild(that.contentPane); });
	},

	doPrint: function (event) {
		window.open('pdf.php?id=' + this.reservation.get('IDent'));
	},

	doDelete: function (event) {
		if(this.reservation.remove()) {
			var that = this;
			request.put(locationConfig.store + '/Reservation/' + this.reservation.get('IDent'), { data: { 'deleted' : new Date().toISOString(), 'id': this.reservation.get('IDent') } }).then(function() {
				that.hide();
			});
		}
	},

	validate: function () {
		[ this.nDeliveryBeginDate, this.nDeliveryEndDate, this.beginDate, this.endDate ].forEach( function (c) {
			c.set('state', 'Normale');
		});
		
		var f = this.nForm.get('value');
	
		if( f.beginDate == null || f.endDate == null || f.beginTime == null || f.endTime == null) {
			this.beginDate.set('state', 'Error');
			this.endDate.set('state', 'Error');
			return false;
		}
			
		var begin = f.beginDate.join(f.beginTime);
		var end = f.endDate.join(f.endTime);
		
		if(djDate.compare(begin, end) >= 0) {
			this.beginDate.set('state', 'Error');
			this.endDate.set('state', 'Error');
			return false;
		}


		if(this.nDelivery.get('checked')) {
			var deliveryBegin =f.deliveryBeginDate.join(f.deliveryBeginTime);
			var deliveryEnd =f.deliveryEndDate.join(f.deliveryEndTime);

			if(djDate.compare(deliveryBegin, deliveryEnd) >= 0) {
				this.nDeliveryBeginDate.set('state', 'Error');
				this.nDeliveryEndDate.set('state', 'Error');
				return false;	
			}

			if(djDate.compare(deliveryBegin, begin) == 0 &&
				djDate.compare(deliveryEnd, end) == 0	
			) {
				this.nDelivery.set('checked', false);
				this.toggleDelivery();
				return false;	
			}

			if(djDate.compare(deliveryBegin, begin) > 0) {
				this.beginDate.set('state', 'Error');
				this.nDeliveryBeginDate.set('state', 'Error');
				return false;
			}

			if(djDate.compare(deliveryEnd, end) < 0) {
				this.nDeliveryEndDate.set('state', 'Error');
				this.endDate.set('state', 'Error');
				return false;
			}
		}

		return true;	
	},

	dropFile: function (event) {
		event.preventDefault();
		console.log(event);
		var dt = event.dataTransfer;
		if(dt.items) {
			for(var i = 0; i < dt.items.length; i++) {
				var f = dt.items[i].getAsFile();
				console.log(f);
			}
		} else {
			for(var i=0; i < dt.files.lenght; i++) {
				console.log(dt.files[i]);
			}
		}

	},

	doSave: function (event) {
		var now = new Date();

		if(! this.validate()) { return; }


		let f = this.nForm.get('value');
		let begin = f.beginDate.join(f.beginTime);
		let end = f.endDate.join(f.endTime);

		this.reservation.setIs('deliverydate', this.nDelivery.get('checked'));
	
		let deliveryBegin = begin;
		let deliveryEnd = end;
		if(this.reservation.is('deliverydate')) {
			deliveryBegin =f.deliveryBeginDate.join(f.deliveryBeginTime);
			deliveryEnd =f.deliveryEndDate.join(f.deliveryEndTime);
		} else {
			deliveryBegin = null;
			deliveryEnd = null;	
		}

		this.reservation.setIs('confirmed', this.nConfirmed.get('checked'));
		this.reservation.set('status', f.status);
		this.reservation.set('begin', begin);
		this.reservation.set('end', end);
		this.reservation.set('deliveryBegin', deliveryBegin);
		this.reservation.set('deliveryEnd', deliveryEnd);
		this.reservation.set('address', f.nAddress);
		this.reservation.set('reference', f.nReference);
		this.reservation.set('equipment', f.nEquipment);
		this.reservation.set('locality', f.nLocality);
		this.reservation.set('comment', f.nComments);
		this.reservation.store();
		this.reservation.resize();
		this.hide();
	}
});});
