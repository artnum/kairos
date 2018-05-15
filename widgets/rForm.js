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
		this.initRequests = new Array();
		this.loaded = { status: false };
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
		var frag = document.createDocumentFragment(), byType = new Object();

		for(var i = 0; i < entries.length; i++) {
			if(! byType[entries[i].type.id]) {
				byType[entries[i].type.id] = new Array();
			}
			byType[entries[i].type.id].push(entries[i]);
		}

		for(var k in byType) {
			var divType = document.createElement('DIV');
			var color = '#FFFFFF';
			if(byType[k][0].type.color) {
				color = '#' + byType[k][0].type.color;
			}
			var name = byType[k][0].type.name;

			divType.setAttribute('class', 'association type');
			divType.setAttribute('data-association-type-id', k);
			divType.appendChild(document.createElement('DIV'));
			divType.lastChild.setAttribute('style', 'background: linear-gradient(0.25turn, ' + pSBC(0.75, color) +', ' + (color) + ',' + pSBC(0.75, color) + ');');
			divType.lastChild.setAttribute('class', 'name');
			divType.lastChild.appendChild(document.createTextNode(name));

			for(var i = 0; i < byType[k].length; i++)  {
				var divLine = document.createElement('DIV');
				divLine.setAttribute('class', 'item');

				var begin = djDateStamp.fromISOString(byType[k][i].begin);
				var end = djDateStamp.fromISOString(byType[k][i].end);

				var line = document.createElement('DIV');
				line.setAttribute('class', 'description');

				line.appendChild(document.createElement('SPAN'));
				line.lastChild.setAttribute('class', 'number value');
				line.lastChild.appendChild(document.createTextNode(byType[k][i].number));

				line.appendChild(document.createElement('I'));
				line.lastChild.setAttribute('class', 'fas fa-times');

				if( ! Number(byType[k][i].follow)) {
					line.appendChild(document.createElement('SPAN'));
					line.lastChild.setAttribute('class', 'date begin value');
					line.lastChild.appendChild(document.createTextNode(begin.fullDate()));

					line.appendChild(document.createElement('SPAN'));
					line.lastChild.setAttribute('class', 'hour begin value');
					line.lastChild.appendChild(document.createTextNode(begin.shortHour()));

					line.appendChild(document.createElement('SPAN'));
					line.lastChild.setAttribute('class', 'date end value');
					line.lastChild.appendChild(document.createTextNode(end.fullDate()));

					line.appendChild(document.createElement('SPAN'));
					line.lastChild.setAttribute('class', 'hour end value');
					line.lastChild.appendChild(document.createTextNode(end.shortHour()));
				} else {
					line.appendChild(document.createElement('SPAN'));
					line.lastChild.setAttribute('class', 'follow value');
					line.lastChild.appendChild(document.createTextNode(' durant toute la réservation'));
				}
				line.appendChild(document.createElement('DIV'));
				line.lastChild.setAttribute('class', 'toolbox');


				line.lastChild.appendChild(document.createElement('I'));
				line.lastChild.lastChild.setAttribute('class', 'far fa-edit');
				line.lastChild.lastChild.setAttribute('data-artnum-id', byType[k][i].id);
				djOn(line.lastChild.lastChild, 'click', djLang.hitch(this, this.doEditComplement));

				line.lastChild.appendChild(document.createElement('I'));
				line.lastChild.lastChild.setAttribute('class', 'far fa-trash-alt');
				line.lastChild.lastChild.setAttribute('data-artnum-id', byType[k][i].id);
				djOn(line.lastChild.lastChild, 'click', djLang.hitch(this, this.doRemoveComplement));


				divLine.appendChild(line);

				if(byType[k][i].comment != "") {
					divLine.appendChild(document.createElement('DIV'));
					divLine.lastChild.setAttribute('class', 'comment');
					divLine.lastChild.appendChild(document.createTextNode(byType[k][i].comment));
				}

				divType.appendChild(divLine);
			}

			frag.appendChild(divType);
		}

		var complements = this.complements;
		window.requestAnimationFrame( () => {
			while(complements.firstChild) {
				complements.removeChild(complements.firstChild);
			}
			complements.appendChild(frag);
		});

		this.reservation.drawComplement();
	},

	doEditComplement: function (event) {
		var id = null, that = this, node, c;
		for(var i = event.target; i; i = i.parentNode) {
			if(i.hasAttribute('data-artnum-id')) {
				id = i.getAttribute('data-artnum-id');
				break;
			}
		}

		if(id) {
			for(var i = 0; i < this.reservation.complements.length; i++) {
				if(this.reservation.complements[i].id == id) {
					c = this.reservation.complements[i];
					break;
				}
			}

			this.nComplementId.value = id;
			this.nAddEditComplementButton.set('label', '<i class="fas fa-edit"> </i> Éditer');
			this.nNumber.set('value', c.number);
			if(! Number(c.follow)) {
				this.nMFollow.set('value', false);
				this.nMBeginDate.set('value',  djDateStamp.toISOString(c.range.begin, { selector: 'date'}));
				this.nMBeginTime.set('value',  djDateStamp.toISOString(c.range.begin, { selector: 'time'}));
				this.nMEndDate.set('value',  djDateStamp.toISOString(c.range.end, { selector: 'date'}));
				this.nMEndTime.set('value',  djDateStamp.toISOString(c.range.end, { selector: 'time'}));
			} else {
				this.nMBeginDate.set('value',  djDateStamp.toISOString(this.reservation.get('trueBegin'), { selector: 'date'}));
				this.nMBeginTime.set('value',  djDateStamp.toISOString(this.reservation.get('trueBegin'), { selector: 'time'}));
				this.nMEndDate.set('value',  djDateStamp.toISOString(this.reservation.get('trueEnd'), { selector: 'date'}));
				this.nMEndTime.set('value',  djDateStamp.toISOString(this.reservation.get('trueEnd'), { selector: 'time'}));
				this.nMFollow.set('value', 'on');
			}

			this.nMComment.set('value', c.comment);
			this.nAssociationType.set('value', locationConfig.store + '/Status/' + c.type.id);

			for(var i = event.target; i; i = i.parentNode) {
				if(i.hasAttribute('class')) {
					if(i.getAttribute('class') == 'item') {
						node = i; break;
					}
				}
			}

			/* reset selection display */
			for(var i = this.complements.firstChild; i; i = i.nextSibling) {
				for(var j = i.firstChild; j; j = j.nextSibling) {
					if(j.hasAttribute('class') && j.getAttribute('class') == 'item') {
						djDomStyle.set(j, 'color', '');
					}
				}
			}

			djDomStyle.set(node, 'color', 'grey');
		}
	},

	doResetComplement: function (event) {
		this.nComplementId.value = '';
		this.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter');
		this.nAssociationType.set('value', '');
		this.nNumber.set('value', 1);
		this.nMFollow.set('value', true);
		this.nMBeginDate.set('value',  djDateStamp.toISOString(this.reservation.get('trueBegin'), { selector: 'date'}));
		this.nMBeginTime.set('value',  djDateStamp.toISOString(this.reservation.get('trueBegin'), { selector: 'time'}));
		this.nMEndDate.set('value',  djDateStamp.toISOString(this.reservation.get('trueEnd'), { selector: 'date'}));
		this.nMEndTime.set('value',  djDateStamp.toISOString(this.reservation.get('trueEnd'), { selector: 'time'}));
		this.nMComment.set('value', '');
		this.associationRefresh();
	},

	doRemoveComplement: function(event) {
		var id = null;
		var that = this;
		for(var i = event.target; i; i = i.parentNode) {
			if(i.hasAttribute('data-artnum-id')) {
				id = i.getAttribute('data-artnum-id');
				break;	
			}	
		}

		if(id != null) {
			request.del(locationConfig.store + '/Association/' + id).then( function() {
				that.associationRefresh();
			});
		}
	},

	associationRefresh: function () {
		var def = new djDeferred();
		var that = this;
		Req.get(locationConfig.store + '/Association/', { query: { "search.reservation": this.reservation.get('id') } }).then( function (results) {
			if(results && results.data && results.data.length > 0) {
				var types = new Array();
				results.data.forEach( function ( r ) {
					if(types.indexOf(r.type) == -1) { types.push(r.type); }
				});

				var t = new Object();
				types.forEach( function (type) {
					if(type != '') {
						t[type] = Req.get(type);	
					}
				});
				var complements = new Array();
				djAll(t).then( function (types) {
					for(var k in types) {
						for(var i = 0; i < results.data.length; i++) {
							if(results.data[i].type == k) {
								if(types[k] && types[k].data ) {
									results.data[i].type =	types[k].data;
								}
							}
						}
					}

					that.reservation.complements = results.data;
					that.associationEntries(that.reservation.complements);
					def.resolve();
				});
			} else {
				that.reservation.complements = new Array();
				that.associationEntries(new Array());
				def.resolve();
			}
		});
	
		return def.promise;
	},

	doAddEditComplement: function () {
		var that = this, query = new Object();
		var f = djDomForm.toObject(this.nComplementsForm);
		
		if(! f.nMFollow) {
			[ 'nMBeginDate', 'nMBeginTime', 'nMEndDate', 'nMEndTime'].forEach( function (i) {
				if(f[i] == '') {
					that[i].set('state', 'Error');
					return;
				}
			});

			query['begin'] = djDateStamp.toISOString(djDateStamp.fromISOString(f.nMBeginDate + f.nMBeginTime), { zulu: true});
			query['end'] = djDateStamp.toISOString(djDateStamp.fromISOString(f.nMEndDate + f.nMEndTime), { zulu: true});
			query['follow'] = 0;
		} else {
			query['begin'] = '';
			query['end'] = '';
			query['follow'] = 1;

		}
		query['number'] = f.number ? f.number : 1;
		query['target'] = null;
		query['comment'] = f.nMComment ? f.nMComment : '';
		query['type'] = f.associationType;
		query['reservation'] = this.reservation.get('id');

		if(this.nComplementId.value != '') {
			query['id'] = this.nComplementId.value;
		} else {
			query['id'] = null;
		}

		if(query['id'] == null) {
			request.post('/location/store/Association/', { query: query}).then(function () {
				that.associationRefresh().then( () => { that.reservation.resize(); } );
			});
		} else {
			request.put(locationConfig.store + '/Association/' + query['id'], { query: query }).then( () => {
				that.associationRefresh().then( () => { that.reservation.resize(); } );

				that.nComplementId.value = '';
				that.nAddEditComplementButton.set('label', '<i class="fa fa-plus"> </i> Ajouter');
			});
		}
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
				var query = { id: that.reservation.get('id'), target: newMachine };
				if(that.get('originalTitle')) {
					query.title = that.get('originalTitle');
				}

				Req.put(locationConfig.store + '/Reservation/' + that.reservation.get('id'), { query: query}).then( function ( res ) {
					if(res && res.data && res.data.success) {
						window.App.info('Déplacement de machine correctement effectué');
						that.reservation.destroyMe();
						that.hide();
					}
				});
			}
		});
	},

	postCreate: function () {
		this.inherited(arguments);
		djOn(this.nForm, "mousemove", function(event) { event.stopPropagation(); });
	},
	
	startup: function() {
		this.inherited(arguments);
		this.load();
	},

	load: function () {
		this.initCancel();

		var select = this.status, that = this,  r;
		var entries = this.reservation.get('entries');
		for(var i = 0; i < entries.length; i++) {
			this.nMachineChange.addOption({
				label: entries[i].target + ' - ' + entries[i].label,
				value: entries[i].target
			});
		}
		this.nMachineChange.set('value', this.reservation.get('target'));
		this.nChangeMachine.set('disabled', true);

		if(this.reservation.get('title') == null) {
			this.nTitle.set('placeholder', this.nMachineChange.getOptions(this.nMachineChange.get('value')).label);
			this.set('originalTitle', this.nMachineChange.getOptions(this.nMachineChange.get('value')).label);
		} else {
			this.nTitle.set('value', this.reservation.get('title'));
			this.set('originalTitle', null);
		}

		if(this.reservation.get('folder')) {
			var folder = this.reservation.get('folder');
			this.nFolder.set('value', this.reservation.get('folder'));
			var url = folder;
			if(! folder.match(/^[a-zA-Z]*:\/\/.*/)) {
				url = 'file://' + encodeURI(url.replace('\\', '/')).replace(',', '%2C');
			}

			var a = document.createElement('A');
			a.setAttribute('href', url); a.setAttribute('target', '_blank');
			a.appendChild(document.createElement('I'));
			a.firstChild.setAttribute('class', 'fas fa-external-link-alt');
			this.nFolder.domNode.parentNode.insertBefore(a, this.nFolder.domNode.nextSibling);
			this.nFolder.domNode.parentNode.insertBefore(document.createTextNode(' '), this.nFolder.domNode.nextSibling);
		}	

		if(this.reservation.get('gps')) {
			this.nGps.set('value', this.reservation.get('gps'));
			
			var a = document.createElement('A');
			a.setAttribute('href', 'https://www.google.com/maps/place/' + String(this.reservation.get('gps')).replace(/\s/g, '')); a.setAttribute('target', '_blank');
			a.appendChild(document.createElement('I'));
			a.firstChild.setAttribute('class', 'fas fa-external-link-alt');
			this.nGps.domNode.parentNode.insertBefore(a, this.nGps.domNode.nextSibling);
			this.nGps.domNode.parentNode.insertBefore(document.createTextNode(' '), this.nGps.domNode.nextSibling);
		}


		r = request.get(locationConfig.store + '/Status/', { query : {'search.type': 0 }});
		this.initRequests.push(r);
	
		if(! this.loaded.status) {
			r.then( djLang.hitch(this, function (results) {
				if(results.type = "results") {
					var def;
					for(var i = 0; i < results.data.length; i++) {
						var d = results.data[i];
						if(d.default == '1') { def = d.id; }
						console.log(this, this.nStatus);
						this.nStatus.addOption({ label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name, value: d.id });
					}
				}
				if(def) {
					this.nStatus.set('value', def);
				}
				this.loaded.status = true;
			}));
		}

		r = request.get(locationConfig.store + '/Status/', { query : { 'search.type': 1 }});
		this.initRequests.push(r);
		r.then( function (results) {
			if(results.type = 'results') {
				results.data.forEach(function (d) {
					that.nAssociationType.addOption({
						label: '<i aria-hidden="true" class="fa fa-square" style="color: #' + d.color + ';"></i> ' + d.name,
						value: locationConfig.store + '/Status/' + d.id 
					});
				});
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
		
		this.nContactsContainer.addChild(new dtContentPane({ title: 'Nouveau contact', content: new contacts({ target: this}) }));

		r = request.get(locationConfig.store + '/ReservationContact/', { query: { "search.reservation": this.reservation.get('id') }});
		this.initRequests.push(r);
		r.then(djLang.hitch(this, function (res) {
			if(res.success()) {
				res.whole().forEach(djLang.hitch(this, function (contact) {
					if(contact.freeform) {
						contact.linkId = contact.id;
						this.createContact(contact, contact.comment);	
					} else {
						var linkId = contact.id, comment = contact.comment;
						r = request.get(locationConfig.store + contact.target);
						this.initRequests.push(r);
						r.then(djLang.hitch(this, function( entry ) {
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
		
		djAll(this.initRequests).then( djLang.hitch(this, () => {
			if(this.reservation.get('status')) {
				this.nStatus.set('value', this.reservation.get('status'));
			}

			that.doResetComplement();
			that._pane[0].set('title', 'Réservation ' + that.reservation.get('id'));
			window.App.info('Réservation ' + that.reservation.get('id') + ' chargée.');
			that.initRequests = new Array();
		}));
  },

	toggleDelivery: function () {
		if(this.nDelivery.get('checked')) {
			djDomStyle.set(this.nDeliveryFields, 'display', '');
			
			if(!this.deliveryBegin) {
				this.nDeliveryBeginTime.set('value', this.beginTime.get('value'));
				this.nDeliveryBeginDate.set('value', this.beginDate.get('value'));
			}
			if(!this.deliveryEnd) {
				this.nDeliveryEndTime.set('value', this.endTime.get('value'));
				this.nDeliveryEndDate.set('value', this.endDate.get('value'));
			}
		} else {
			djDomStyle.set(this.nDeliveryFields, 'display', 'none');
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
						'search.reservation': this.reservation.get('id'),
						'search.target': id,
						'search.comment': type
					}}).then(djLang.hitch(this, function(results){
						if(results.count() == 0) {
							request.post(locationConfig.store + '/ReservationContact/', { method: 'post', query: { reservation: that.reservation.get('id'), comment: type, freeform: null, target: id }})
								.then(djLang.hitch(this, function ( results) {
										request.get(locationConfig.store + '/' + id, { skipCache: true }).then(djLang.hitch(this, function (c) {
											var e = c.first();
											e.linkId =  results.first().id;
											that.createContact(e, type, true);
											that.reservation.refresh();
										}));
								}));
						}
					}));
			} else {
				request.get(locationConfig.store + '/ReservationContact', { query: {
					'search.reservation': this.reservation.get('id'),
					'search.comment': type,
					'search.freeform': options.freeform}}).then(djLang.hitch(this, function (results) {
						if(results.count() == 0) {
							request.post(locationConfig.store + '/ReservationContact/', { query: {
								reservation: this.reservation.get('id'), comment: type, freeform: options.freeform, target: null}}).then(function(result) {	
									if(result.success()) {
										options.linkId = result.first().id;
										that.createContact(options, type, true);
										that.reservation.refresh();
									}
								});
						}
				}));
			}
	},

	show: function () {
		var that = this;
		window.requestAnimationFrame(function() { djDomStyle.set(that.domNode.parentNode, 'display', 'block'); });
	},

	initCancel: function() {
		for(var i = 0; i < this.initRequests.length; i++) {
			if(! this.initRequests[i].isFulfilled()) {
				this.initRequests[i].cancel();
			}
		}
		this.initRequests = new Array();
	},

	destroy: function() {
		this.initCancel();
		this.inherited(arguments);
	},

	hide: function() {
		this.get('_pane')[1].removeChild(this.get('_pane')[0]);	
		this.get('_pane')[0].destroy();
		this.reservation.myForm = null;
		this.reservation.myContentPane = null;
		this.destroy();
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
			window.App.error('La fin de réservation est avant le début');
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
				window.App.error('La fin de la livraison est avant le début');
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
				window.App.error('La fin de la livraison est avant la fin de la location');
				return false;
			}

			if(djDate.compare(deliveryEnd, end) < 0) {
				this.nDeliveryEndDate.set('state', 'Error');
				this.endDate.set('state', 'Error');
				window.App.error('Début de livraison est après le début de la location')
				return false;
			}
		}

		return true;	
	},

	dropFile: function (event) {
		event.preventDefault();
		var dt = event.dataTransfer;
		if(dt.items) {
			for(var i = 0; i < dt.items.length; i++) {
				var f = dt.items[i].getAsFile();
			}
		} else {
			for(var i=0; i < dt.files.lenght; i++) {
			}
		}

	},

	doCopy: function (event) {
		this.reservation.copy();
	},

	doSave: function (event) {
		var now = new Date();
		var that = this;

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
		this.reservation.set('folder', f.folder);
		this.reservation.set('gps', f.gps);
		
		if(f.title != "") {
			this.reservation.set('title', f.title);
		} else {
			if(! this.get('originalTitle')) {
				this.reservation.set('title', '');
			}
		}

		this.reservation.save().then( () => { 
			that.hide();
			that.reservation.highlight();
		});
	
	},

	destroyReservation: function(reservation) {
		this.reservation.destroyReservation(reservation);
	}

});});
