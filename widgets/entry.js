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
	waiters: 0, /* number of nested "waiting" func */

	constructor: function (args) {
		this.waiters = 0;
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
	warn: function(txt, code) {
		this.sup.warn(txt, code);	
	},
	error: function(txt, code) {
		this.sup.error(txt, code);	
	},
	info: function(txt, code) {
		this.sup.info(txt, code);	
	},
	computeIntervalOffset: function ( date ) {
		var hour = date.hours ? date.hours() : date.getHours();
		var px_h = this.get('blockSize') / 24;
		var virtual_hour = 24;
		var c_hour = 24 - hour;

		if(hour == 0)  { return 0; }
		if(hour > 23.9833 ) { return this.get('blockSize'); }
	
		this.intervalZoomFactors.forEach( function ( izf ) {
			var x = Math.abs(izf[1] - izf[0]);
			virtual_hour += (x * izf[2]) - x;
			if(hour >= izf[1]) {
				c_hour += (x * izf[2]) - x;
			} else if(hour < izf[1] && hour > izf[0]) {
				c_hour += ((hour - izf[0]) * izf[2]) - (hour - izf[0]);
			}
		});
		var px_h = this.get('blockSize') / virtual_hour;
		return c_hour * px_h;
	},
	postCreate: function () {
		this.inherited(arguments);
		
		djOn(this.domNode, "click", djLang.hitch(this, this.eClick));
		djOn(this.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
		djOn(this.sup, "cancel-reservation", djLang.hitch(this, this.cancelReservation));
		djOn(this.domNode, "dblclick", djLang.hitch(this, this.evtDblClick));
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

	evtDblClick: function(event) {
		var n = event.target;
		while(n) {
			if(n.getAttribute('widgetid')) { break; }
			n = n.parentNode;	
		}
		
		if(n) {
			var w = dtRegistry.byId(n.getAttribute('widgetid'));
			if(w.baseClass == "reservation") {
				w.popMeUp();
			} else if(w.baseClass == "entry") {
				w.createReservation(this.dayFromX(event.clientX));	
			}
		}
	},

	createReservation: function(day) {
		var that = this;
		this.lock().then(function () {
			if(!day) {
				day = that.get('dateRange').begin;	
			}
			var end = new Date(day.getTime());
			end.setHours(17,0,0,0);
			day.setHours(8,0,0,0);

			var r = { start: day,
				o: new reservation({ sup: that, status: "2", begin: day, end: end	})
			}
			
			that.store(r).then(function (result) {
				that.unlock();
				if(result.type == 'error') {
					that.error("Impossible d'enregistrer les données", 300);
				} else {
					window.requestAnimationFrame(function() {
						that.data.appendChild(r.o.domNode);
					});
					var oldId = r.o.get('id');
					dtRegistry.remove(oldId);
					r.o.set('IDent', result.data.id);
					dtRegistry.add(r.o);
					r.o.domNode.setAttribute('widgetid', result.data.id);
					r.o.domNode.setAttribute('id', result.data.id);
					r.o.popMeUp();
				}				
			});
		});

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
				that.myLock = true;
				def.resolve(true);
			} else {
				window.requestAnimationFrame(function() { djDomClass.add(that.domNode, "lock"); });	
				def.resolve(false);
			}
		});

		return def;
	},

	setLocked: function ( lock ) {
		var that = this;
		if(this.myLock) { return; }
		if(lock) {
				window.requestAnimationFrame(function() { djDomClass.add(that.domNode, "lock"); });	
				that.locked = true;
		}	else {
				window.requestAnimationFrame(function() { djDomClass.remove(that.domNode, "lock"); });
				that.update();
				that.locked = false;
		}
	},

	verifyLock: function() {
		var that = this;
		if(this.myLock) {
			return;	
		}
		djXhr.get(locationConfig.dlm, { query : { "status": that.target}}).then( function ( r ) {
			if(r == '0') {
				that.setLocked(false);
			} else {
				that.setLocked(true);
			}
		}, function(err) {
			that.warning("L'état du verrouillage n'a pas pu être déterminé correctement.", 201);
		});
	},
	
	unlock: function() {
		var that = this;
		var def = new djDeferred();
		djXhr.get(locationConfig.dlm,  { query: { unlock: this.target }}).then(function () {
			window.requestAnimationFrame(function() {
				djDomClass.remove(that.domNode, "mylock"); 
				def.resolve();});
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
		var that = this;
		if(event.clientX <= this.get("offset")) { return; }
		if( ! this.newReservation && event.ctrlKey) {
			this.lock().then(djLang.hitch(this, function( locked ) {
				if(locked) {
					var dBegin = this.dayFromX(event.clientX), dEnd = new Date(dBegin);
					dBegin.setHours(8,0,0,0);
					dEnd.setHours(17,0,0,0);
					this.newReservation = {start :  dBegin };
					this.newReservation.o = new reservation({  sup: that, status: "2", begin: dBegin, end: dEnd, clickPoint: event.clientX });

					djOn.once(this.newReservation.o.domNode, "click", djLang.hitch(this, this.eClick));
					djOn.once(this.newReservation.o.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
					this.own(this.newReservation);
					djDomClass.add(this.newReservation.o.domNode, "selected");
					this.data.appendChild(this.newReservation.o.domNode);
				}
			}));
		} 
		if(this.newReservation) {
			this._startWait();
			var r = this.newReservation;
			this.newReservation = null;

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
					this.error("Impossible d'enregistrer les données", 300);
					this.unlock();
				} else {
					var oldId = r.o.get('id');
					dtRegistry.remove(oldId);
					r.o.set('IDent', result.data.id);
					dtRegistry.add(r.o);
					r.o.domNode.setAttribute("widgetid", result.data.id);
					r.o.domNode.setAttribute("id", result.data.id);
					djDomClass.remove(r.o.domNode, "selected");
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
				/*for(var i in this.childs) {
					this.childs[i].destroy();	
				}
				this.childs = new Object(); */
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

	_getTargetAttr: function () {
		var t = this._get('target');
		if(djLang.isArray(t)) {
			return t[0];	
		}

		return t;
	},

	_getDateRangeAttr: function() {
		return this.sup.getDateRange();	
	},
	addChild: function (child, root) {
		/*this.own(child);
		if(! this.childs[child.id]) {
			this.childs[child.id] = child;	
		}
		if(root && child && child.domNode) {
				root.appendChild(child.domNode);
		}*/
	},
	resize: function () {
		var def = new djDeferred();
		var that = this;

		window.setTimeout(function (){
			if(intoYView(that.domNode)) {
				that._startWait();
				dtRegistry.findWidgets(that.domNode).forEach(function(child) {				
					if(child.get('enabled')) {
						child.resize();
					}
				});
				that._stopWait();
			}

			def.resolve();
		}, 0);

		return def;
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

		var resizing = this.resize();

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
			resizing.then(function() {
				that.runUpdate = false;
				that._stopWait();
				def.resolve(); 
			});
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
		this.waiters++;
		window.requestAnimationFrame(function() { djDomClass.add(t, "refresh"); });	
	},

	_stopWait: function () {
		var t = this.domNode;
		this.waiters--;
		if(this.waiters <= 0) {
			window.requestAnimationFrame(function() { djDomClass.remove(t, "refresh"); });
			this.waiters = 0;
		}
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
					"special": reserv.special,
					"withWorker": reserv.withWorker
					};
				if(r.end != null && r.begin != null) {
					if(dtRegistry.byId(r.id)) {
						dtRegistry.byId(r.id).resize();		
					} else {
						frag.appendChild(new reservation(r).domNode);
					}
				}
			}
		});
		var d = this.data, that = this;
		window.requestAnimationFrame(function () { d.appendChild(frag); that._stopWait();});
	}

});});
