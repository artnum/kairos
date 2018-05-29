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
	"dojo/dom-geometry",

	"dijit/Dialog",
	"dijit/registry",

	"location/reservation",
	"location/rForm",
	"location/_Cluster",
	"location/_Request",
	"location/_Sleeper", 
	"location/update",

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
	djDomGeometry,

	dtDialog,
	dtRegistry,

	Reservation,
	rForm,

	_Cluster,
	request,
	_Sleeper,
	update,

	Req

) {

return djDeclare("location.entry", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster, update ], {
	
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
	locked: false,
	currentLocation: '',

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
		this.currentLocation = '';

		var that = this;
		this.loaded = new djDeferred();
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
	
	update: function () {
		var entries = new Array();
		var that = this;
		var idx = window.App.DB.transaction('reservations').objectStore('reservations').index('by_target');
		idx.openCursor(this.target).onsuccess = function ( e ) {
			var cursor = e.target.result;
			if(cursor) {
				entries.push(cursor.value.id);
				if(!that.entries[cursor.value.id]) {
					that.entries[cursor.value.id] = new Reservation({ sup: that });
				}
				that.entries[cursor.value.id].fromJson(cursor.value);
				cursor.continue();
			} else {
				for(var k in that.entries) {
					if(entries.indexOf(k) == -1) {
						that.entries[k].destroy();
						delete that.entries[k];
					}
				}
				that.show();
			}
		};

	},

	postCreate: function () {
		var that = this;
	
		this.update();	
		djOn(this.domNode, "click", djLang.hitch(this, this.eClick));
		djOn(this.domNode, "mousemove", djLang.hitch(this, this.eMouseMove));
		djOn(this.sup, "cancel-reservation", djLang.hitch(this, this.cancelReservation));
		djOn(this.domNode, "dblclick", djLang.hitch(this, this.evtDblClick));
		djOn(this.sup, "zoom", () => { 
			djDomStyle.set(that.domNode, 'height', ''); 
			that.originalHeight = djDomStyle.get(that.domNode, "height"); 
			that.resize();
		});

		this.originalHeight = djDomStyle.get(this.domNode, 'height') ? djDomStyle.get(this.domNode, 'height') : 73; /* in chrome value here is 0, set default known value for now */

		this.view = { rectangle: getElementRect(this.domNode) }
		this.verifyLock();
		Req.get(locationConfig.store + '/Tags/?!=' + this.url).then(( tags ) => {
			if(tags && tags.data) {
				for( var i in tags.data ) {
					tags.data[i].forEach(function (tag) {
						that.tags.push(tag);
					});
				}
			}

			that.displayTags(that.tags);

		});
	
		Req.get(locationConfig.store + '/Entry/', { query: { 'search.ref': this.target }}).then( (result) => {
			if(result && result.data) {
				result.data.forEach( function ( attrs ) {
					that[attrs.name] = attrs.value;
				})
			}
			that.loaded.resolve();
			that.displayLocation();
		});
		
		var frag = document.createDocumentFragment();
		
		var a = document.createElement('A');
		a.setAttribute('name', 'entry_' + this.get('target'));

		var s = document.createElement('SPAN');
		s.setAttribute('class', 'reference');
		s.appendChild(document.createTextNode(that.get('target')));
		a.appendChild(s);

		s = document.createElement('SPAN');
		s.setAttribute('class', 'commonName label');
		s.appendChild(document.createTextNode(that.get('label')));
		a.appendChild(s);

		frag.appendChild(a);
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
					var s = document.createElement('A');
					s.setAttribute('class', 'tag ' + tag.tagify());
					s.setAttribute('href', '#' + tag.tagify());
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

		that.nTags.setAttribute('class', 'tags');
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
		var button = document.createElement('BUTTON');
		button.setAttribute('type', 'submit'); button.appendChild(document.createTextNode('Ok'));
		form.appendChild(button);

		input.setAttribute("value", this.tags.join(', '));

		djOn.once(form, 'submit', (event) => {
			event.preventDefault();

			var tags = input.value.split(',');
			for(var i in tags) {
				tags[i] = tags[i].trim();
			}
			that.tags = tags;
			var q = new Object(); q[that.url] = tags;
			Req.post(locationConfig.store + "/Tags/?!=" + that.url, { query : q }).then(function () {
				that.clearTags().then( () => { that.displayTags(tags); });
			});
		});

		window.requestAnimationFrame(function () { that.clearTags().then( function () { that.nTags.setAttribute('class', 'tags edit'); that.nTags.appendChild(form); input.focus(); }); });
	},

	focus: function() {
		djDomClass.add(this.domNode, 'focus');
	},

	blur: function() {
		djDomClass.remove(this.domNode, 'focus');
	},

	displayLocation: function () {
		var that = this, frag = document.createDocumentFragment(), i = document.createElement('I');
		i.setAttribute('class', 'fas fa-warehouse'); frag.appendChild(i);
		frag.appendChild(document.createTextNode(' ' + this.currentLocation));

		window.requestAnimationFrame(() => {
			if(that.get('currentLocation')) {
				that.nControl.setAttribute('class', 'control ' + that.get('currentLocation').tagify());
			}
			that.nLocation.appendChild(frag); that.nLocation.setAttribute('class', 'location');
			djOn.once(that.nLocation, 'dblclick', djLang.hitch(that, that.eEditLocation));
		});
	},

	clearLocation: function () {
		var def = new djDeferred();
		var that = this;
		window.requestAnimationFrame( () => {
			while(that.nLocation.firstChild) {
				that.nLocation.removeChild(that.nLocation.firstChild);
			}

			def.resolve();
		});

		return def.promise;
	},

	eEditLocation: function ( event ) {
		var that = this, form = document.createElement('FORM'), input = document.createElement('INPUT'), button = document.createElement('BUTTON');
		form.appendChild(input); form.appendChild(button);
		button.appendChild(document.createTextNode('Ok'));
		input.setAttribute("value", this.currentLocation);
	
		djOn.once(form, 'submit', (event) => {
			event.preventDefault();

			Req.post(locationConfig.store + '/Entry', { query : { ref: that.get('target'), name: 'currentLocation', value: input.value }}).then( () => {
				that.currentLocation = input.value;
				that.clearLocation(); that.displayLocation();
			});
		});

		that.clearLocation().then( () => { that.nLocation.setAttribute('class', 'location edit'); that.nLocation.appendChild(form); });
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
	//			w.popMeUp();
			} else if(w.baseClass == "entry") {
				w.createReservation(this.dayFromX(event.clientX));	
			}
		}
	},

	createReservation: function(day) {
		if(!day) {
			day = this.get('dateRange').begin;	
		}
		var end = new Date(day.getTime());
		end.setHours(17,0,0,0);
		day.setHours(8,0,0,0);

		var r = { start: day,
			o: new Reservation({ sup: this,  begin: day, end: end })
		}
		r.o.popMeUp();
		this.defaultStatus().then( (s) => {
			r.o.set('status', s);
			this.store(r.o).then ( djLang.hitch( this, (id) => {
				window.App.info('Réservation ' + id + ' correctement créée');
			}));
		});
	},

	copy: function ( original ) {
		var copy = new Reservation({ sup: this });
		console.log(original);
		json = window.App.Reservation.get(original.get('id'));
		if(json == null) {
			/* TODO */
		}
		copy.fromJson(json);
		copy.set('status', original.get('status'));
		copy.set('color', original.get('color'));
		copy.set('IDent', null);
		copy.popMeUp();
		this.store(copy).then ( djLang.hitch( this, (id) => {
			var subRequests = new Array();
			console.log(json);
			for(var k in json.contacts) {
				for(var i = 0; i < json.contacts[k].length; i++) {
					var entry = json.contacts[k][i];
					console.log(entry);
					var q = { comment: entry.comment, reservation: id, freeform: entry.freeform };
					if(entry.target != null) {
						q.target = '/Contacts/' + entry.target.IDent;
					}
					subRequests.push(Req.post(locationConfig.store + '/ReservationContact/', { query:  q }));
				}
			}

			for(var i = 0; i < json.complements.length; i++) {
				var entry = json.complements[i];
				var q = { number: entry.number, follow: entry.follow, target: entry.target, comment: entry.comment, reservation: id, type: '/location/store//Status/' + entry.type.id, id: null };
				if(entry.begin != '') { q.begin = djDateStamp.toISOString(entry.begin); }
				if(entry.end != '') { q.end= djDateStamp.toISOString(entry.end); }
				subRequests.push(Req.post(locationConfig.store + '/Association/', { query: q }));
			}
			djAll(subRequests).then(() => { window.App.info('Réservation ' + id + ' correctement copiée'); copy.popMeUp(); original.close(); });
		}));
	},

	store: function ( reservation ) {
		var def = new djDeferred();
		var that = this;
		reservation.save().then(function (result) {
			if(result.type == 'error') {
				window.App.error("Impossible d'enregistrer les données");
			} else {
				reservation.fromJson(result.data);
				reservation.syncForm();
				window.App.Reservation.set(reservation.get('id'), result.data);
				that.entries[reservation.get('id')] = reservation;
				that.show();
				def.resolve(reservation.get('id'));
			}				
		});

		return def.promise;
	},

	_getOffsetAttr: function () {
		return this.sup.get('offset');
	},
	
	lock: function() {
		var def = new djDeferred();
		def.resolve(true);
		return def.promise;
	},

	setLocked: function ( lock ) {
		this.locked = false;
		return false;
	},

	verifyLock: function() {
		return;	
	},
	
	unlock: function() {
		var def = new djDeferred();
		def.resolve(true);	
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
						this.newReservation.o = new Reservation({  sup: that, status: s, begin: dBegin, end: dEnd, clickPoint: event.clientX });

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
			
			r.o.save().then(djLang.hitch(this, function (result) {
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

	resizeChild: function() {
		for(var k in this.entries) {
			this.entries[k].resize();
		}
	},

	resize: function () {
		this.view.rectangle = getElementRect(this.domNode);
		this.resizeChild();
	},
	
  addOrUpdateReservation: function (reservations) {
    var found = false;
    for(var i = 0; i < reservations.length; i++) {
			if( ! this.entries[reservations[i].id]) {
				this.entries[reservations[i].id] = new Reservation({ sup : this });
			}
			var json = window.App.Reservation.get(reservations[i].id);
			if(json) { this.entries[reservations[i].id].fromJson(json); }
    }

		this.show();
  },

	_setSupAttr: function ( sup ) {
		this.sup = sup;
	},

	_startWait: function() {
	},

	_stopWait: function () {
	},

	_setError: function() {
		var e = this.domNode;
		window.requestAnimationFrame(function() { djDomClass.add(e, "error"); });	
	},
	_resetError: function() {
		var e = this.domNode;
		window.requestAnimationFrame(function() { djDomClass.remove(e, "error"); });	
	},

	setCache: function ( list ) {
		try {
			window.localStorage.setItem('_entry_' + this.get('id'), JSON.stringify(list));
		} catch( e ) {
			console.log(e);
		}
	},


	show: function ( ) {
		var frag = document.createDocumentFragment();
		var that = this;
		var entries = new Array(), toCache = new Array();

		for(var k in this.entries) {
			if( ! this.entries[k].get('displayed')) {
				frag.appendChild(this.entries[k].domNode);
				this.entries[k].set('displayed', true);
			}
			this.entries[k].overlap = { elements: new Array(), level: 0, order: 0, do: false };
			entries.push(this.entries[k]);
			toCache.push(k);
		}

		this.overlap(entries);
		this.setCache(toCache);

		var that = this;
		window.requestAnimationFrame(function() { that.data.appendChild(frag); that.resize(); });
	},

	overlap: function() {
		if(arguments[0]) { entries = arguments[0]; }
		else { 
			entries = new Array();
			for (var k in this.entries) {
				entries.push(this.entries[k]);
			}
		}

		/* Overlap entries, good enough for now */
		var overlapRoot = new Array();
		for(var i = 0; i < entries.length; i++) {
			if(entries[i].deleted) { continue; }
			var root = true;
			entries[i].overlap.order = i;
			for(var j = 0; j < overlapRoot.length; j++) {
				if(overlapRoot[j].range.overlap(entries[i].range)) {
					if(overlapRoot[j].duration > entries[i].duration) {
						overlapRoot[j].overlap.elements.push(entries[i]);
					} else {
						entries[i].overlap.elements = overlapRoot[j].overlap.elements.slice();
						entries[i].overlap.elements.push(overlapRoot[j]);
						overlapRoot[j].elements = new Array();
						overlapRoot[j] = entries[i];
					}
					root = false; break;
				}
			}
			if(root) {
				overlapRoot.push(entries[i]);
			}
		}

		for(var i = 0; i < overlapRoot.length; i++) {
			overlapRoot[i].overlap.order = 1;
			overlapRoot[i].overlap.level = overlapRoot[i].overlap.elements.length + 1;
			overlapRoot[i].overlap.do = true;
			for(var j = 0; j < overlapRoot[i].overlap.elements.length; j++) {
				overlapRoot[i].overlap.elements[j].overlap.order = j+2;
				overlapRoot[i].overlap.elements[j].overlap.level = overlapRoot[i].overlap.elements.length + 1;
				overlapRoot[i].overlap.elements[j].overlap.do = true;
			}
		}
	},

	destroyReservation: function (reservation) {
		if(reservation) {
			reservation.destroy();
			delete this.entries[reservation.id];
			window.App.Reservation.remove(reservation.id);
		}
	},

	_getActiveReservationsAttr: function() {
		var active = new Array();
		for(var k in this.entries) {
			if(this.entries[k].get('active')) {
				active.push(this.entries[k]);
			}
		}

		return active;
	},

	highlight: function (domNode) {
		this.sup.highlight(domNode);
	},

  _getEntriesAttr: function() {
    return this.sup.get('entries');
  },
	_getCompactAttr: function() {
		return this.sup.get('compact');
	},

	_setActiveAttr: function(active) {
		this._set('active', active ? true : false);
		if(this.get('active')) {
			djDomStyle.set(this.domNode, 'display', '');
			this.update();
		} else {
			djDomStyle.set(this.domNode, 'display', 'none');
			for(var k in this.entries) {
				this.entries[k].set('active', false);
			}
		}
	}

});});
