define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
	"dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	"dojo/text!./templates/entry.html",

	"dojo/dom",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/dom-class",
	"dojo/request/xhr",
	"dojo/throttle",

	"dijit/Dialog",
	"dijit/registry",

	"artnum/reservation",
	"artnum/rForm",
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
	djDomClass,
	djXhr,
	djThrottle,

	dtDialog,
	dtRegistry,

	reservation,
	rForm,

	_Cluster

) {

return djDeclare("artnum.entry", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {
	
	baseClass: "entry",
	templateString: _template,
	stores: {},
	childs: [],
	myParent: null,
	isParent: false,
  target: null,
	newReservation: null,
	power: true,

	constructor: function (args) {
		this.childs = new Object();
		this.power = true;
		this.newReservation= null;
		this.target = null;
		this.isParent = false;
		this.myParent = null;
		this.stores = {};
		this.runUpdate = 0;
	},

	postCreate: function () {
		this.inherited(arguments);
		
		djOn(this.domNode, "click", djLang.hitch(this, this.eClick));
		djOn(this.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
		djOn(this.myParent, "cancel-reservation", djLang.hitch(this, this.cancelReservation));
		this.verifyLock();
	},

	cancelReservation: function() {
		if(this.newReservation) {
			var that = this;
			this.unlock().then(function() {
				var r = that.newReservation.o;
				that.newReservation = null;
				window.requestAnimationFrame( function (){
					r.domNode.parentNode.removeChild(r.domNode);
					r.destroy();
				});
			});
		}
	},

	_getOffsetAttr: function () {
		return this.myParent.get('offset');
	},
	
	lock: function() {
		var def = new djDeferred();
		var that = this;
		djXhr.get(locationConfig.dlm,  { query: { lock: this.target }}).then(function ( r ) {
			if(r == '1') {
				window.requestAnimationFrame(function() { djDomClass.add(that.domNode, "mylock"); });	
				def.resolve(true);
			} else {
				window.requestAnimationFrame(function() { djDomClass.add(that.domNode, "lock"); });	
				setTimeout(djLang.hitch(that, that.verifyLock), 800);	
				def.resolve(false);
			}
		});

		return def;
	},

	verifyLock: function() {
		var that = this;
		djXhr.get(locationConfig.dlm, { query : { "status": that.target}}).then( function ( r ) {
			if(r == '0') {
				window.requestAnimationFrame(function() { djDomClass.remove(that.domNode, "lock"); });
				that.update();
				that.locked = false;
			} else {
				window.requestAnimationFrame(function() { djDomClass.add(that.domNode, "lock"); });	
				that.locked = true;
				setTimeout(djLang.hitch(that, that.verifyLock), 800);	
			}
		});
	},
	
	unlock: function() {
		var that = this;
		var def = new djDeferred();
		djXhr.get(locationConfig.dlm,  { query: { unlock: this.target }}).then(function () {
			window.requestAnimationFrame(function() { djDomClass.remove(that.domNode, "mylock"); def.resolve();});	
		});

		return def;
	},

	dayFromX: function (x) {
		var dayPx = Math.ceil((x - this.get('offset'))  / this.get('blockSize'))-1;
		return djDate.add(this.myParent.getDateRange().begin, "day", dayPx);
	},
	eMouseMove: function(event) {
		if(this.newReservation) {
			if(this.newReservation.o.get('start') > event.clientX) {
				this.newReservation.o.set('start', event.clientX);
				this.newReservation.o.set('stop', this.get('clickPoint'));
			} else {
				this.newReservation.o.set('stop', event.clientX);
				this.newReservation.o.set('start', this.get('clickPoint'));
			}
			this.newReservation.o.resize();
		}
	},

	eClick: function(event) {
		var d = this.dayFromX(event.clientX);
		if(event.clientX <= this.get("offset")) { return; }
		if( ! this.newReservation && event.ctrlKey) {
			this.lock().then(djLang.hitch(this, function( locked ) {
				if(locked) {
					d.setHours(8,0,0,0);
					this.newReservation = {start :  new Date() };
					this.newReservation.start.setTime(d.getTime());
					d.setHours(17,0,0,0);
					this.newReservation.o = new reservation({  myParent: this, IDent: null, status: "2" });
					this.set('clickPoint', event.clientX);
					this.newReservation.o.set('start', event.clientX);
					this.newReservation.o.set('stop', event.clientX + this.get('blockSize'));

					djOn.once(this.newReservation.o.domNode, "click", djLang.hitch(this, this.eClick));
					djOn.once(this.newReservation.o.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
					this.own(this.newReservation);
					djDomClass.add(this.newReservation.o.domNode, "selected");
					this.data.appendChild(this.newReservation.o.domNode);
				}
			}));
		} 
		if(this.newReservation) {
			var r = this.newReservation;
			this.newReservation = null;
			this._startWait();
			if(djDate.compare(d, r.start) < 0) {
				d.setHours(8,0,0,0);
				r.o.set('begin', d);
			} else {
				d.setHours(17,0,0,0);
				r.o.set('end', d);
			}
			this.store(r).then( djLang.hitch(this, function (result) {
				if(result.type == "error") {
					this.unlock();
				} else {
					r.o.set('IDent', result.data.id);	
					r.o.resize();

					djDomClass.remove(r.o.domNode, "selected");
					this.addChild(r.o, this.data);
					r.o.popMeUp();

					this._stopWait();
					this.unlock();
				}
			}));
		}
	},
	eShutdown: function(event) {
		window.requestAnimationFrame(djLang.hitch(this, function () {
			if(!this.power) {
				djDomClass.add(this.domNode, "off");
			} else {
				djDomClass.remove(this.domNode, "off");
				this.update();
			}
		}));
		this.power = !this.power;
	},

	name: "undef",
	_setNameAttr: {node: "nameNode", type: "innerHTML"},

	_getBlockSizeAttr: function () {
		return this.myParent.get('blockSize');
	},

	_getDateRangeAttr: function() {
		return this.myParent.getDateRange();	
	},
	addChild: function (child, root) {
		this.own(child);
		if(! this.childs[child.id]) {
			this.childs[child.id] = child;	
		}
		if(root && child && child.domNode) { root.appendChild(child.domNode); }
	},

	update: function () {
		var force = false;
		if(arguments[0]) {
			force = true;
		}
		if(! this.power) { return; }
		var def = new djDeferred();
	
		var w = dtRegistry.findWidgets(this.domNode);
		w.forEach( function (n) { n.resize(); } );

		this._resetError();
		this._startWait();

			if(!force && (this.locked || this.runUpdate)) {
				this._stopWait();
				return;	
			}

			this.runUpdate = true;
			var range = this.myParent.getDateRange();
			var	qParams = { 
					"search.end": ">" + djDateStamp.toISOString(range.begin, { selector: 'date'}),  
					"search.begin": "<" + djDateStamp.toISOString(range.end, { selector: 'date'}),
					"search.target": this.target
				};
		
			this.runUpdate = Date.now();
			var qXhr = djXhr.get(this.getUrl(locationConfig.store + '/Reservation'),
			{ handleAs: 'json', query: qParams });
			var that = this;
			qXhr.then(function (r) {
				this.to = null;
				if(r.type == 'results')	{
					that.displayReservations(r.data);
					window.setTimeout(function() { that.runUpdate = false; that._stopWait(); def.resolve(); }, 500);
				}
			});

		return def;
	},

	store: function(reservation) {
		var def = new djDeferred();
		var method = "POST";
		var suffix = '';
		var query = { };

		reservation.o.attrs.forEach( function (attr) {
			query[attr] = reservation.o[attr];
		});

		query.begin = djDateStamp.toISOString(reservation.o.begin);
		query.end = djDateStamp.toISOString(reservation.o.end);
		query.target = this.target;

		if(reservation.o.IDent != null) {
			query.id = reservation.o.IDent;
			method = "PUT";
			suffix = '/' + query.id;
		}	
console.log(reservation.o, query);
		djXhr(locationConfig.store + "/Reservation" + suffix, { method: method, data: query, handleAs: "json"}).then(def.resolve);
		return def;
	}, 

	_setParentAttr: function ( parent ) {
		this.myParent = parent;
		djOn(parent, "update", djLang.hitch(this, this.update));
		djOn(parent, "update-" + this.target, djLang.hitch(this, this.update));
		djOn(parent, "cancel-update", djLang.hitch(this, function () { if(this.to) { window.clearTimeout(this.to); this.to = null; } }));
	},

	_startWait: function() {
		var t = this.domNode;
		window.requestAnimationFrame(function() { djDomClass.add(t, "refresh"); });	
	},

	_stopWait: function () {
		var t = this.domNode;
		window.requestAnimationFrame(function() { djDomClass.remove(t, "refresh"); });
	},

	_setError: function() {
		var e = this.domNode;
		window.requestAnimationFrame(function() { djDomClass.add(e, "error"); });	
	},
	_resetError: function() {
		var e = this.domNode;
		window.requestAnimationFrame(function() { djDomClass.remove(e, "error"); });	
	},

	displayResults: function ( r ) {
		if(r[this.target]) {
			this.displayReservations(r[this.target]);
		}
	},
	displayReservations: function ( reservations ) {
		this._startWait();
		var frag = document.createDocumentFragment();
		for(var i = 0; i < reservations.length; i++) {
			console.log(reservations[i]);
			var r = { 
				"myParent": this,
				"IDent" : reservations[i].id,
				"id" : reservations[i].id,
				"begin": djDateStamp.fromISOString(reservations[i].begin),
				"end" : djDateStamp.fromISOString(reservations[i].end), 
				"deliveryBegin": djDateStamp.fromISOString(reservations[i].deliveryBegin),
				"deliveryEnd" : djDateStamp.fromISOString(reservations[i].deliveryEnd), 
				"status": reservations[i].status,
				"contact": reservations[i].contact,
				"address": reservations[i].address,
				"locality": reservations[i].locality,
				"comment": reservations[i].comment
				};
			if(r.end != null && r.begin != null) {
				if(dtRegistry.byId(r.id)) {
					dtRegistry.byId(r.id).destroy();		
				}
				this.addChild(new reservation(r), frag);
			}
		}
		var d = this.data, that = this;
		window.requestAnimationFrame(function () { d.appendChild(frag); that._stopWait();  });
	}

});});
