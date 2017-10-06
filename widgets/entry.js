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
	"dojo/debounce",

	"dijit/Dialog",

	"artnum/reservation",
	"artnum/rForm"


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
	djDebounce,

	dtDialog,

	reservation,
	rForm

) {

return djDeclare("artnum.entry", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	
	baseClass: "entry",
	templateString: _template,
	stores: {},
	childs: [],
	myParent: null,
	isParent: false,
  target: null,
	newReservation: null,
	power: true,

	constructor: function () {

		this.childs = [];
		this.power = true;
		this.newReservation= null;
		this.target = null;
		this.isParent = false;
		this.myParent = null;
		this.stores = {};
		
		this.inherited(arguments);
	},

	postCreate: function () {
		this.inherited(arguments);
		
		
		if(this.isParent) {
			djDomClass.remove(this.extend, "invisible");
		}

		djOn(this.domNode, "click", djLang.hitch(this, this.eClick));
		djOn(this.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
	},

	_getOffsetAttr: function () {
		return this.myParent.get('offset');
	},

	dayFromX: function (x) {
		var dayPx = Math.ceil((x - this.get('offset'))  / this.get('blockSize'))-1;
		return djDate.add(this.myParent.getDateRange().begin, "day", dayPx);
	},
	eMouseMove: function(event) {
		if(this.newReservation) {
			var d = this.dayFromX(event.clientX);
			if(djDate.compare(this.dayFromX(event.clientX), this.newReservation.start, "date") <= 0) {
				d.setHours(8, 0, 0, 0);
				this.newReservation.start.setHours(17,0,0,0);
				this.newReservation.o.set('begin', d);
				this.newReservation.o.set('end', this.newReservation.start);
			} else {
				d.setHours(17, 0, 0, 0);
				this.newReservation.start.setHours(8,0,0,0);
				this.newReservation.o.set('begin', this.newReservation.start);
				this.newReservation.o.set('end', d);
			}
			console.log(d, this.newReservation.o.get('begin'), this.newReservation.o.get('end'), this.newReservation.start, this.dayFromX(event.clientX), event.clientX);

			this.newReservation.o.resize();		
		}
	},

	eClick: function(event) {
		var d = this.dayFromX(event.clientX);
		if(event.clientX <= this.get("offset")) { return; }
		if( ! this.newReservation) {
			d.setHours(8,0,0,0);
			this.newReservation = {start :  new Date() };
			this.newReservation.start.setTime(d.getTime());
			d.setHours(17,0,0,0);
			this.newReservation.o = new reservation({ begin: this.newReservation.start, end: d, myParent: this, IDent: null, status: "2" });
			djOn.once(this.newReservation.o.domNode, "click", djLang.hitch(this, this.eClick));
			djOn.once(this.newReservation.o.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
			this.own(this.newReservation);
			djDomClass.add(this.newReservation.o.domNode, "selected");
			this.data.appendChild(this.newReservation.o.domNode);
		} else {
			this._startWait();
			if(djDate.compare(d, this.newReservation.start) < 0) {
				d.setHours(8,0,0,0);
				this.newReservation.o.set('begin', d);
			} else {
				d.setHours(17,0,0,0);
				this.newReservation.o.set('end', d);
			}
			this.store(this.newReservation).then( djLang.hitch(this, function (result) {
				if(result.type == "error") {

				} else {
					this.newReservation.o.set('IDent', result.data.id);	
					this.newReservation.o.resize();

					djDomClass.remove(this.newReservation.o.domNode, "selected");
					this.addChild(this.newReservation.o, this.data);
					this.newReservation = null;

					var f = new rForm();
					var dialog = new dtDialog({ title: "Reservation", content: f, style: "width: 600px;" });
					dialog.show();

					this._stopWait();
				}
			}));
		}
	},
	eShutdown: function(event) {
		window.requestAnimationFrame(djLang.hitch(this, function () {
			if(!this.power) {
				djDomClass.add(this.domNode, "off");
				this.childs.forEach(function (c) { c.destroy(); });
				this.childs = [];
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
		this.childs.push(child);
		this.own(child);
		root.appendChild(child.domNode);
	},

	update: function () {
		if(this.timeout) {
			window.clearTimeout(this.timeout);
		}
		this.childs.forEach(function (c) { c.resize();  });

		this.timeout = window.setTimeout(djLang.hitch(this, this._update), 12);
	},

	_update: function () {
		if(! this.power) { return; }
		var def = new djDeferred();
		
	
			this._resetError();
			this._startWait();

			var dRange = this.myParent.getDateRange(), qParams = { 
					"search.end": ">" + djDateStamp.toISOString(dRange.begin, { selector: 'date'}),  
					"search.begin": "<" + djDateStamp.toISOString(dRange.end, { selector: 'date'}), 
					"search.target": this.target
				};
		
		
			if(this.request && ! this.request.isFulfilled()) { return; }
			this.request = djXhr.get('/location/store/Reservation', 
				{ handleAs: "json", method: "GET", query: qParams })
				.then( djLang.hitch(this, function (result) {
					if(result.type == 'results' && result.data && result.data.length > 0) {
						this.displayResults(result.data);	
					}
					this._stopWait();
					def.resolve();
				}), djLang.hitch(this, function (err) {
					if(! this.request.isCanceled()) {
						this._stopWait();
						this._setError();
						def.resolve();
					}
				}));
		

		return def;
	},

	store: function(reservation) {
		var def = new djDeferred();
		var method = "POST";
		var query = { begin: djDateStamp.toISOString(reservation.o.begin), end: djDateStamp.toISOString(reservation.o.end), status: reservation.o.status, target: this.target  };
		if(reservation.IDent != null) {
			query.id = reservation.IDent;
			method = "PUT";
		}	

		djXhr("/location/store/Reservation", { method: method, data: query, handleAs: "json"}).then(def.resolve);
		return def;
	}, 

	_setParentAttr: function ( parent ) {
		this.myParent = parent;
		djOn(parent, "update", djLang.hitch(this, this.update));
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

	displayResults: function ( reservations ) {
		window.requestAnimationFrame(djLang.hitch(this, function () {
			var frag = document.createDocumentFragment();
			for(var i = 0; i < reservations.length; i++) {
				var IDent = reservations[i].id;
				var begin = djDateStamp.fromISOString(reservations[i].begin);
				var end = djDateStamp.fromISOString(reservations[i].end);
				if(end != null && begin != null) {
					if(this.childs.findIndex(
						function (e) { 
							if(e && e.IDent == IDent) { return true; } 
							return false; 
						}) == -1) {
						var r = new reservation({ begin: begin, end: end, myParent: this, IDent: IDent, status: reservations[i].status });
						this.addChild(r, frag);
					}
				}
			}
			console.log(this);
			this.data.appendChild(frag);
		}));
	},

	abortChild: function (child) {
		var idx = this.childs.findIndex	(function (e) { if(e && e.IDent == child.IDent) { return true; } return false; });
		this.childs.splice(idx, 1);
	}

	

});});
