define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",

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

	"artnum/reservation"


], function(
	djDeclare,
	djLang,
	djEvented,
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

	reservation

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

	constructor: function () {
		this.inherited(arguments);

		this.childs = [];
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
		console.log(dayPx);
		return djDate.add(this.myParent.getDateRange().begin, "day", dayPx);
	},
	eMouseMove: function(event) {
		if(this.newReservation) {
			if(djDate.compare(this.dayFromX(event.clientX), this.newReservation.start) < 0) {
				this.newReservation.o.set('begin', this.dayFromX(event.clientX));
				this.newReservation.o.set('end', this.newReservation.start);
			} else {
				this.newReservation.o.set('end', this.dayFromX(event.clientX));
				this.newReservation.o.set('begin', this.newReservation.start);
			}
			this.newReservation.o.resize();		
		}
	},

	eClick: function(event) {
		if( ! this.newReservation) {
			this.newReservation = {start :  this.dayFromX(event.clientX) };
			this.newReservation.o = new reservation({ begin: this.newReservation.start, end: this.newReservation.start, myParent: this, IDent: null, status: "2" });
			djOn.once(this.newReservation.o.domNode, "click", djLang.hitch(this, this.eClick));
			this.own(this.newReservation);
			djDomClass.add(this.newReservation.o.domNode, "selected");
			this.data.appendChild(this.newReservation.o.domNode);
		} else {
			if(djDate.compare(this.dayFromX(event.clientX), this.newReservation.start) < 0) {
				this.newReservation.o.set('begin', this.dayFromX(event.clientX));
			} else {
				this.newReservation.o.set('end', this.dayFromX(event.clientX));
			}
			this.newReservation.o.resize();		
			djDomClass.remove(this.newReservation.o.domNode, "selected");
			this.addChild(this.newReservation.o, this.data);
			this.newReservation = null;
		}
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

	_update: function () {
		if(this.timeout) {
			window.clearTimeout(this.timeout);	
		}
		window.setTimeout(djLang.hitch(this, this._update), 50);
	},

	update: function () {
		this.childs.forEach(function (c) { c.resize();  });

		var dRange = this.myParent.getDateRange(), qParams = { 
				"search.end": ">" + djDateStamp.toISOString(dRange.begin, { selector: 'date'}),  
				"search.begin": "<" + djDateStamp.toISOString(dRange.end, { selector: 'date'}), 
				"search.target": this.target
			};
		djDomClass.remove(this.wait, "hidden");
		djDomClass.add(this.err, "hidden");
	
	
		if(this.request && ! this.request.isFulfilled()) { this.request.cancel(); }
		this.request = djXhr.get('/location/store/Reservation', 
			{ handleAs: "json", method: "GET", query: qParams })
			.then( djLang.hitch(this, function (result) {
				if(result.type == 'results' && result.data && result.data.length > 0) {
					this.displayResults(result.data);	
				}
				this._stopWait();
			}), djLang.hitch(this, function (err) {
				if(! this.request.isCanceled()) {
					this._stopWait();
					this._onError();
				}
			}));
	},

	_setParentAttr: function ( parent ) {
		this.myParent = parent;
		djOn(parent, "update", djLang.hitch(this, this.update));
	},

	_stopWait: function () {
		var w = this.wait;
		window.requestAnimationFrame(function() { djDomClass.add(w, "hidden") });
	},

	_onError: function() {
		var e = this.err;
		window.requestAnimationFrame(function() { djDomClass.remove(e, "hidden")});	
	},

	displayResults: function ( reservations ) {
		console.log('displayResults');
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

			this.data.appendChild(frag);
		}));
	},

	abortChild: function (child) {
		var idx = this.childs.findIndex	(function (e) { if(e && e.IDent == child.IDent) { return true; } return false; });
		this.childs.splice(idx, 1);
	}

	

});});
