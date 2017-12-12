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
	"dojo/promise/all",

	"dijit/Dialog",
	"dijit/registry",

	"artnum/reservation",
	"artnum/rForm",
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
	djDomClass,
	djXhr,
	djAll, 

	dtDialog,
	dtRegistry,

	reservation,
	rForm,

	_Cluster,
	request

) {

return djDeclare("artnum.entry", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {
	
	baseClass: "entry",
	templateString: _template,
	stores: {},
	childs: {},
	sup: null,
	isParent: false,
  target: null,
	newReservation: null,
	intervalZoomFactors : [],
	power: true,

	constructor: function (args) {
		this.childs = new Object();
		this.power = true;
		this.newReservation= null;
		this.target = null;
		this.isParent = false;
		this.sup = null;
		this.stores = {};
		this.runUpdate = 0;
		/* Interval zoom factor is [ Hour Begin, Hour End, Zoom Factor ] */
		this.intervalZoomFactors = new Array( [ 7, 17, 10 ]);
	},
	computeIntervalOffset: function ( date ) {
		var offset = 0;
		var days = 24, sub = 0;

		this.intervalZoomFactors.forEach( function ( izf ) {
			days -= izf[1] - izf[0];
			sub += (izf[1] - izf[0]) * izf[2];
		});
		sub += days;

		var hour = date.getHours();
		var within = 0, without = 0;
		var offset = 0;
		this.intervalZoomFactors.forEach ( function ( izf ) {
			if(hour >= izf[0]) {
				within = hour - izf[0];
				if(hour > izf[1]) {
					without =  24 - izf[1];
					within -= without;
				}
				without += izf[0]
			}	
			offset = (within * izf[2]) + without;
		});
		
		return (this.get('blockSize') / sub *  offset);
	},
	postCreate: function () {
		this.inherited(arguments);
		
		djOn(this.domNode, "click", djLang.hitch(this, this.eClick));
		djOn(this.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
		djOn(this.sup, "cancel-reservation", djLang.hitch(this, this.cancelReservation));
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
		return this.sup.get('offset');
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
		var datehour = null;
		if(x > this.get('offset')) {
			/* add 1px borders */
			datehour = djDate.add(this.get('dateRange').begin, 'day', Math.ceil((x + 1 - this.get('offset')) / this.get('blockSize')) - 1);
		}

		return datehour;
	},
	eMouseMove: function(event) {
		if(this.newReservation) {
			this.newReservation.o.animate(event.clientX);
		}
	},

	eClick: function(event) {
		if(event.clientX <= this.get("offset")) { return; }
		if( ! this.newReservation && event.ctrlKey) {
			this.lock().then(djLang.hitch(this, function( locked ) {
				if(locked) {
					var dBegin = this.dayFromX(event.clientX), dEnd = new Date(dBegin);
					dBegin.setHours(8,0,0,0);
					dEnd.setHours(17,0,0,0);
					this.newReservation = {start :  dBegin };
					this.newReservation.o = new reservation({  sup: this, IDent: null, status: "2", begin: dBegin, end: dEnd, clickPoint: event.clientX });

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

			var currentDay = this.dayFromX(event.clientX);
			if(djDate.compare(currentDay, r.start) < 0) {
				currentDay.setHours(8,0,0,0);
				r.o.set('begin', currentDay);
				r.o.set('end', r.start);
			} else {
				currentDay.setHours(17,0,0,0);
				r.o.set('begin', r.start);
				r.o.set('end', currentDay);
			}
			
			this.store(r).then(djLang.hitch(this, function (result) {
				if(result.type == "error") {
					this.unlock();
				} else {
					this.update().then(djLang.hitch(this, function () {
						this.emit('show-' + result.data.id);
						this._stopWait();
						this.unlock();
					}))
				}
			}));
		}
	},
	eShutdown: function(event) {
		window.requestAnimationFrame(djLang.hitch(this, function () {
			if(!this.power) {
				for(var i in this.childs) {
					this.childs[i].destroy();	
				}
				this.childs = new Object();
				djDomClass.add(this.domNode, "off");
			} else {
				this.update(); 
				djDomClass.remove(this.domNode, "off");
			}
		}));
		this.power = !this.power;
	},

	name: "undef",
	_setNameAttr: {node: "nameNode", type: "innerHTML"},
	_getBlockSizeAttr: function () {
		return this.sup.get('blockSize');
	},

	_getDateRangeAttr: function() {
		return this.sup.getDateRange();	
	},
	addChild: function (child, root) {
		this.own(child);
		if(! this.childs[child.id]) {
			this.childs[child.id] = child;	
		}
		if(root && child && child.domNode) { root.appendChild(child.domNode); }
	},
	resize: function () {
		if(intoYView(this.domNode)) {
			for(var i in this.childs) {
				this.childs[i].resize();		
			}
		}
	},
	update: function () {
		var force = false;
		if(arguments[0]) {
			force = true;
		}
		if(! this.power) { return; }
		var def = new djDeferred();
	
		this._resetError();
		this._startWait();

		var w = dtRegistry.findWidgets(this.domNode);
		w.forEach( function (n) { n.resize(); } );

			if(!force && (this.locked || this.runUpdate)) {
				this._stopWait();
				return;	
			}

			this.runUpdate = true;
			var range = this.get('dateRange');
			var months = new Array();
			var qParamsS = new Array();

			for(var d = range.begin; djDate.compare(d, range.end, "date") < 0; d = djDate.add(d, "day", 1)) {
				var m = d.getMonth();
				if(months.indexOf(m) < 0) {
					months.push(m);
					qParamsS.push({
						"search.end": '>' + djDateStamp.toISOString(new Date(d.getFullYear(), m, 1), { selector: 'date'}),
						"search.begin": '<' + djDateStamp.toISOString(new Date(d.getFullYear(), m + 1, 0), { selector: 'date'}),
						"search.target" : this.target
					});
				}	
			}
			this.runUpdate = Date.now();
			var requests = new Array();
			var that = this;
			qParamsS.forEach(function (	qParams ){ 
				requests.push(request.get(that.getUrl(locationConfig.store + '/Reservation'), { query: qParams }));
			});

			requests.forEach(function (r) {
				r.then(function (result) {
					if(result.success()) {
						that.displayReservations(result.whole());
					}
				});
			});
		djAll(requests).then(function(r) {
			that.runUpdate = false;
			that._stopWait();
			def.resolve(); 
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
		if(reservation.o.deliveryEnd) { 
			query.deliveryEnd = djDateStamp.toISOString(reservation.o.deliveryEnd);
		}
		if(reservation.o.deliveryBegin) {
			query.deliveryBegin = djDateStamp.toISOString(reservation.o.deliveryBegin);
		}
		query.target = this.target;

		if(reservation.o.IDent != null) {
			query.id = reservation.o.IDent;
			method = "PUT";
			suffix = '/' + query.id;
		}
		djXhr(locationConfig.store + "/Reservation" + suffix, { method: method, data: query, handleAs: "json"}).then(def.resolve);
		return def;
	}, 

	_setSupAttr: function ( sup ) {
		this.sup = sup;
		djOn(this.sup, "update-" + this.target, djLang.hitch(this, this.update));
		djOn(this.sup, "cancel-update", djLang.hitch(this, function () { if(this.to) { window.clearTimeout(this.to); this.to = null; } }));
			
	},
	_setParentAttr: function ( parent ) {
		console.log('This function is deprecated');
		this.set('sup', parent);
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
		var range = this.get('dateRange');
		var frag = document.createDocumentFragment();
		var that = this;
		reservations.forEach(function (reserv) {
			if(	
				djDate.compare(djDateStamp.fromISOString(reservation.begin), range.end, 'date') <= 0 ||
				djDate.compare(djDateStamp.fromISOString(reservation.end), range.begin, 'date') > 0
				) {
				var r = { 
					"sup": that,
					"IDent" : reserv.id,
					"id" : reserv.id,
					"begin": djDateStamp.fromISOString(reserv.begin),
					"end" : djDateStamp.fromISOString(reserv.end), 
					"deliveryBegin": djDateStamp.fromISOString(reserv.deliveryBegin),
					"deliveryEnd" : djDateStamp.fromISOString(reserv.deliveryEnd), 
					"status": reserv.status,
					"contact": reserv.contact,
					"address": reserv.address,
					"locality": reserv.locality,
					"comment": reserv.comment,
					"special": reserv.special
					};
				if(r.end != null && r.begin != null) {
					if(dtRegistry.byId(r.id)) {
						dtRegistry.byId(r.id).resize();		
					} else {
						that.addChild(new reservation(r), frag);
					}
				}
			}
		});
		var d = this.data, that = this;
		window.requestAnimationFrame(function () { d.appendChild(frag); that._stopWait();});
	}

});});
