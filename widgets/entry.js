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
	"dojo/dom-style",
	"dojo/request/xhr",
	"dojo/promise/all",

	"dijit/Dialog",
	"dijit/registry",

	"location/reservation",
	"location/rForm",
	"location/_Cluster",
	"location/_Request",
	"location/_Sleeper", 

	"artnum/Request"

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
	djDomStyle,
	djXhr,
	djAll, 

	dtDialog,
	dtRegistry,

	reservation,
	rForm,

	_Cluster,
	request,
	_Sleeper,

	Req

) {

return djDeclare("location.entry", [
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
	originalHeight: 0,
	tags: [],
	entries: {},

	constructor: function (args) {
		_Sleeper.init();
		this.waiters = 0;
		this.childs = new Object();
		this.power = true;
		this.newReservation= null;
		this.target = null;
		this.isParent = false;
		this.sup = null;
		this.stores = new Object();
		this.runUpdate = 0;
		this.originalHeight = 0;
		this.tags = new Array();
		this.entries = new Object();

		/* Interval zoom factor is [ Hour Begin, Hour End, Zoom Factor ] */
		this.intervalZoomFactors = new Array( [ 7, 17, 70 ]);
    if(dtRegistry.byId('location_entry_' + args["target"])) {
      alert('La machine ' + args["target"] + ' existe à double dans la base de donnée !');
    } else {
      this.id ='location_entry_' + args["target"];
    }
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
		var hour = date.getHours(); 
		var h = (17 - 7) * 3.8 + (24 - (17 - 7)) * 1;
		var bs = this.get('blockSize') / h;
		
		if(hour <= 7) { return bs * hour; }
		if(hour > 7 && hour <= 17) { return (7 * bs) + ((hour - 7) * 3.8 * bs); }
		return (7 * bs) + ((17 -7) * 3.8 * bs) + ((hour - 17) * bs);

	},
	postCreate: function () {
		var that = this;
		this.inherited(arguments);
		
		window.Sleeper.on(this.domNode, "click", djLang.hitch(this, this.eClick));
		window.Sleeper.on(this.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
		window.Sleeper.on(this.sup, "cancel-reservation", djLang.hitch(this, this.cancelReservation));
		window.Sleeper.on(this.domNode, "dblclick", djLang.hitch(this, this.evtDblClick));
		window.Sleeper.on(this.sup, "zoom", function(event) { djDomStyle.set(that.domNode, 'height', ''); that.originalHeight = djDomStyle.get(that.domNode, "height"); that.resize(); });

		this.originalHeight = djDomStyle.get(this.domNode, 'height') ? djDomStyle.get(this.domNode, 'height') : 73; /* in chrome value here is 0, set default known value for now */
		this.verifyLock();
		Req.get(locationConfig.store + '/Tags/?!=' + this.url).then(function ( tags ) {
			if(tags && tags.data) {
				for( var i in tags.data ) {
					tags.data[i].forEach(function (tag) {
						that.tags.push(tag);
					});
				}
			}

			that.displayTags(that.tags);
		});
		
		var frag = document.createDocumentFragment();
		var s = document.createElement('SPAN');
		s.setAttribute('class', 'reference');
		s.appendChild(document.createTextNode(that.get('target')));
		frag.appendChild(s);

		s = document.createElement('SPAN');
		s.setAttribute('class', 'commonName label');
		s.appendChild(document.createTextNode(that.get('label')));
		frag.appendChild(s);

		window.requestAnimationFrame(function () { that.nameNode.appendChild(frag); });
	},

	displayTags: function (tags) {
		var def = new djDeferred();

		var notag = true;
		var that = this;
		var frag = document.createDocumentFragment();
		if(tags.length > 0) {
			tags.forEach( function ( tag ) {
				if(tag != '') {
					notag = false;
					var s = document.createElement('SPAN');
					s.setAttribute('class', 'tag');
					s.appendChild(document.createTextNode(tag));
					frag.appendChild(s);
				}
			});
		}
		if(notag) {
			frag.appendChild(document.createTextNode('Ajouter ... '));
		}
		window.requestAnimationFrame(function () { that.nTags.appendChild(frag); djOn.once(that.nTags, 'dblclick', djLang.hitch(that, that.eEditTags)); def.resolve(); });

		return def.promise;
	},

	clearTags: function () {
		var def = new djDeferred();
		var that = this;

		window.requestAnimationFrame(function () {
			while(that.nTags.firstChild) {
				that.nTags.removeChild(that.nTags.firstChild);
			}
			def.resolve();
		});

		return def.promise;
	},

	eEditTags: function (event) {
		var that = this;
		
		var form = document.createElement('FORM');
		var input = document.createElement('INPUT');
		form.appendChild(input);
		input.setAttribute("value", this.tags.join(', '));

		djOn.once(form, 'submit', function ( event ) {
			event.preventDefault();

			var tags = input.value.split(',');
			for(var i in tags) {
				tags[i] = tags[i].trim();
			}
			that.tags = tags;
			var q = new Object(); q[that.url] = tags;
			Req.post(locationConfig.store + "/Tags/?!=" + that.url, { query : q }).then(function () {
				that.clearTags();
				that.displayTags(tags);
			});
		});

		window.requestAnimationFrame(function () { that.clearTags().then( function () { that.nTags.appendChild(form); input.focus(); }); });
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

	defaultStatus: function() {
		return this.sup.defaultStatus();	
	},

	evtDblClick: function(event) {
		if(event.clientX <= 200) { return; }
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

			that.defaultStatus().then(function(s) {
				var r = { start: day,
					o: new reservation({ sup: that, status: s, begin: day, end: end	})
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

		return def.promise;
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

		return def.promise;
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
				this.defaultStatus().then(djLang.hitch(this, function (s) {
					if(locked) {
						var dBegin = this.dayFromX(event.clientX), dEnd = new Date(dBegin);
						dBegin.setHours(8,0,0,0);
						dEnd.setHours(17,0,0,0);
						this.newReservation = {start :  dBegin };
						this.newReservation.o = new reservation({  sup: that, status: s, begin: dBegin, end: dEnd, clickPoint: event.clientX });

						djOn.once(this.newReservation.o.domNode, "click", djLang.hitch(this, this.eClick));
						djOn.once(this.newReservation.o.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
						this.own(this.newReservation);
						djDomClass.add(this.newReservation.o.domNode, "selected");
						this.data.appendChild(this.newReservation.o.domNode);
					}
				}));
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
	resize: function () {
		var def = new djDeferred();
		var that = this;

		async( function () {
			if(intoYView(that.domNode)) {
				that._startWait();
				for(var i in that.entries)  {
					that.entries[i].resize();
				}
				that.overlap();
				that._stopWait();
			}

			def.resolve();
		});


		return def.promise;
	},
	update: function () {
		var that = this;
		var def = new djDeferred();
		var force = false;
		if(arguments[0]) {
			force = true;
		}
		if(! this.power) { def.resolve(); return def.promise; }
	
		this._resetError();
		this._startWait();

		if(!force && (this.locked || this.runUpdate)) {
			this._stopWait();
			return;	
		}

		this.runUpdate = true;
		var range = this.get('dateRange');
		startM = new Date(range.begin.getFullYear(),  range.begin.getMonth(), 0);
		stopM = new Date(range.end.getFullYear(), range.end.getMonth() + 1, 0);
		Req.get(this.getUrl(locationConfig.store + '/DeepReservation'), { query : {
			"search.begin": '<=' + djDateStamp.toISOString(stopM, { selector: 'date' }),
			"search.end" : '>=' + djDateStamp.toISOString(startM, { selector: 'date' }),
			"search.target": this.get('target'), 
			"search.deleted" : '-' }
		}).then( function (results) {
			if(results && results.data && results.data.length > 0) {
				that.displayReservations(results.data);
				that.resize().then(function() {
					def.resolve();
					that.runUpdate = false;
				});
			}
		});

		return def.promise;
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
		djXhr(locationConfig.store + "/Reservation" + suffix, { method: method, data: query, handleAs: "json"}).then(function (result) { def.resolve(result) });
		return def.promise;
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
		/*var t = this.domNode;
		this.waiters++;
		window.requestAnimationFrame(function() { djDomClass.add(t, "refresh"); });	 */
	},

	_stopWait: function () {
		/*
		var t = this.domNode;
		this.waiters--;
		if(this.waiters <= 0) {
			window.requestAnimationFrame(function() { djDomClass.remove(t, "refresh"); });
			this.waiters = 0;
		}*/
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

	overlap: function () {
		var that = this;
		var def = new djDeferred();
		var overlap = false;
		var dates = new Array();
		
		async(function () {	
			dtRegistry.findWidgets(that.domNode).forEach(function(child) {
				var o = false;
				if(!child.get('hidden')) { 
					dates.forEach( function (d) {
						if((
								(child.get('begin').getTime() >  d.begin  &&
								child.get('begin').getTime() < d.end) ||
								(child.get('end').getTime() > d.end &&
								child.get('end').getTime() < d.end)
							 ) ||
							 (
								(d.begin > child.get('begin').getTime() &&
								d.end < child.get('begin').getTime()) ||
								(d.end > child.get('end').getTime() &&
								d.end < child.get('end').getTime())
							 )
							 ){
							if(! d.overlap) {
								var height = djDomStyle.get(child.domNode, "height"); 
								djDomStyle.set(child.domNode, 'margin-top', height + "px"); o = true; 
							} else {
								 djDomStyle.set(child.domNode, 'margin-top', ''); o = true; 
							}
							overlap = true;
						}
					
					});
					dates.push({begin: child.get('begin').getTime(), end: child.get('end').getTime(), overlap: o, child: child});
				}
			});
		
			if(overlap) {
				djDomStyle.set(that.domNode, 'height', ''); 
				var height = djDomStyle.get(that.domNode, "height"); 
				djDomStyle.set(that.domNode, 'height', (height * 2) + "px");
			} else {
				djDomStyle.set(that.domNode, 'height', '');
			}

			def.resolve();
		});

		return def.promise;
	},

	displayReservations: function ( reservations ) {
		this._startWait();
		var range = this.get('dateRange');
		var frag = document.createDocumentFragment();
		var that = this;
		reservations.forEach(function (reserv) {
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
				"reference": reserv.reference,
				"equipment": reserv.equipment,
				"complements": reserv.complements ? reserv.complements : new Array()
			};
			if(r.end != null && r.begin != null) {
				if(that.entries[r.id]) {
					that.entries[r.id].resize();
				} else {
					that.entries[r.id] = new reservation(r);
					frag.appendChild(that.entries[r.id].domNode);
				}
			}
		});
		window.requestAnimationFrame(function() { that.data.appendChild(frag); that.resize(); that._stopWait(); });
	},

	highlight: function (domNode) {
		this.sup.highlight(domNode);
	},

  _getEntriesAttr: function() {
    return this.sup.get('entries');
  }

});});
