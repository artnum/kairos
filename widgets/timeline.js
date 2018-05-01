define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
	"dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/layout/ContentPane",

	"dojo/text!./templates/timeline.html",

	"dojo/aspect",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/throttle",
	"dojo/request/xhr",
	"dojo/window",
	"dojo/promise/all",
	"dijit/registry",
	"dijit/form/NumberTextBox",
	"dijit/form/Button",
	"dijit/MenuBar",
	"dijit/MenuBarItem",
	"dijit/PopupMenuBarItem",
	"dijit/DropDownMenu",
	"dijit/MenuItem",
	"dijit/MenuSeparator",
	"dijit/CheckedMenuItem",
	"dijit/RadioMenuItem",
	"dijit/PopupMenuItem",
	"dijit/Calendar",
	"dijit/Dialog",

	"location/_Cluster",
	"location/_Request",
	"location/entry",
	"location/_Sleeper",
	"location/timeline/popup",
	"location/timeline/keys",
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
	dtContentPane,

	_template,
	djAspect,
	djDate,
	djDateStamp,
	djDom,
	djDomConstruct,
	djOn,
	djDomAttr,
	djDomClass,
	djDomStyle,
	djDomGeo,
	djThrottle,
	djXhr,
	djWindow,
	djAll,
	dtRegistry,
	dtNumberTextBox,
	dtButton,
	dtMenuBar,
	dtMenuBarItem,
	dtPopupMenuBarItem,
	dtDropDownMenu,
	dtMenuItem,
	dtMenuSeparator,
	dtCheckedMenuItem,
	dtRadioMenuItem,
	dtPopupMenuItem,
	dtCalendar,
	dtDialog,

	_Cluster,
	request,
	entry,
	_Sleeper,
	
	tlPopup, tlKeys, update,

	Req
) {
	
return djDeclare("location.timeline", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster, 
	tlPopup, tlKeys, update ], {

	center: null,
	offset: 220,
	blockSize: 42,
	baseClass: "timeline",
	templateString: _template,
	zoomCss: null,
	lines: null,
	moveQueue: null,
	timeout: null,
	lastDay: null,
	firstDay: null,
	verticals: null,
	lastClientXY: [0, 0],
	logs: null,
	lockEvents: null,
	lastId: 0,
	lastMod: 0,
	inputString: '',
	eventStarted: null,
	daysZoom: 0,
	compact: false,
	currentVerticalLine: 0,

	constructor: function (args) {
		djLang.mixin(this, arguments);
		this.lastId = 0;
		this.verticals = new Array();
		this.days = new Array();
		this.weekNumber = new Array();
		this.entries = new Array();
		this.lines = null;
		this.todayOffset = -1;
		this.months = new Array();
		this.moveQueue = new Array();
		this.timeout = null;
		this.lastDay = null;
		this.firstDay = null;
		this.odd = true;
		this.center = new Date();
		this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0);
		var verticals = new Array();
		this.lastClientXY = new Array(0,0);
		this.logs = new Array();
		this.inputString = '';
		this.lastMod = '';
		this.lastId = '';
		this.xDiff = 0;
		this.daysZoom = 30;
		this.compact = false;
		this.currentVerticalLine = 0;
		this.displayOrder = new Array();
		this.runningRequest = new Array();

		this.zoomCss = document.createElement('style');
		document.body.appendChild(this.zoomCss);

		var sStore = window.sessionStorage;
    djXhr.get(locationConfig.store + '/Status/', { handleAs: "json", query: { 'search.type': 0}}).then( function (results){
			if(results && results.type == 'results') {
				for(var i = 0; i < results.data.length; i++) {
					sStore.setItem('/Status/' + results.data[i].id, JSON.stringify(results.data[i]));
				}
			}
		});
	},

	defaultStatus: function () {
		var def = new djDeferred();
		request.get(locationConfig.store + '/Status/', { query: { 'search.default': 1, 'search.type': 0}}).then(function(result){
			if(result.success()) {
				def.resolve(result.whole()[0].id);	
			}
			def.resolve("0");
		});
		return def.promise;
	},
	
	info: function(txt, code) {
		this.log('info', txt, code);
	},
	warn: function(txt, code) {
		this.log('warning', txt, code);
	},
	error: function(txt, code) {
		this.log('error', txt, code);
	},
	log: function (level, txt, code) {
		var entry = new Object({ level: level, message: txt, date: new Date(), code: code }), that = this;
			
		this.logs.push(entry);

		window.requestAnimationFrame(function (){
			if(that.logline.firstChild) {
				that.logline.removeChild(that.logline.firstChild);
			}

			var frag = document.createDocumentFragment();
			var span = document.createElement('SPAN');
			span.setAttribute('class', entry.level);
			span.appendChild(document.createTextNode(entry.message + ' (' + entry.code + ')'));
			frag.appendChild(span);
			that.logline.appendChild(frag);
			that.logline.setAttribute('class', 'logline ' + entry.level);
		});
		window.setTimeout(function () {
			window.requestAnimationFrame( function() {
				if(that.logline.firstChild) {
					that.logline.removeChild(that.logline.firstChild);
				}
				that.logline.setAttribute('class', 'logline');
			})
		}, 10000);
	},

	_setCenterAttr: function (date) {
		this.center = date;
		this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0);
	},

	_setZoomAttr: function (zoomValue) {
		var style = '';
		var page = getPageRect();
		var days = 1;
		switch(zoomValue) {
			case 'day':
				days = 2;
				style = ' #Sight { display: none; }';
				break;
			case 'month':
				days = 31;
				break;
			case 'week':
				days = 7 
				break;
			case 'quarter':
				days = 91;
				break;
			case 'semester':
				days = 181;
				break;
			default: 
				days = zoomValue;
				break;
		}

		this.daysZoom = days;
		this.set('blockSize', (page[2] - 240) / days);
		this.zoomCss.innerHTML = '.timeline .line span { width: '+ (this.get('blockSize')-2) +'px !important;} ' + style;
		this.resize();
		this.update(true);
	},

	_setFilterAttr: function (value) {
		for(var i = 0; i < this.entries.length; i++) {
			var entry = this.entries[i]; 
			if(entry.tags.length > 0) {
				if(entry.tags.find( (element) => {
					if(element.toLowerCase() == value.toLowerCase()) {
						return true;
					}
					return false;
				})) {
					entry.set('active', true);
				} else {
					entry.set('active', false);
				}
			} else {
				entry.set('active', false);
			}
		}
	},

	_getZoomAttr: function () {
		return this.daysZoom;
	},

	zoomIn: function () {
		if(this.get('zoom') > 7) {
			this.set('zoom', this.get('zoom') - 5);
		}
	},

	zoomOut: function () {
		if(this.get('zoom') < 180) {
			this.set('zoom', this.get('zoom') + 5);
		}
	},

	isBefore: function ( a, b ) {
		if(djDate.compare(a, b, "date")<=0) {
			return true;
		}
		return false;
	},

	makeDay: function ( newDay ) {
		var dayStamp = djDateStamp.toISOString(newDay, {selector: "date"});
		var c = "day";
		if(newDay.getDay() == 0 || newDay.getDay() == 6) { c = "day weekend"}

		switch(newDay.getDay()) {
			case 0: txtDate = 'Dim ' + newDay.getDate(); break;
			case 1: txtDate = 'Lun ' + newDay.getDate(); break;
			case 2: txtDate = 'Mar ' + newDay.getDate(); break;
			case 3: txtDate = 'Mer ' + newDay.getDate(); break;
			case 4: txtDate = 'Jeu ' + newDay.getDate(); break;
			case 5: txtDate = 'Ven ' + newDay.getDate(); break;
			case 6: txtDate = 'Sam ' + newDay.getDate(); break;
		}

		var domDay = document.createElement('SPAN')
		domDay.setAttribute('data-artnum-day', dayStamp);
		domDay.setAttribute('class', c);
		domDay.innerHTML=txtDate;
		return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay, _line: this.line, computedStyle: djDomStyle.getComputedStyle(domDay) };
	},

	resize: function ( ) {
		var that = this;
		var opts = arguments[0] ? arguments[0] : {} ;

		this.drawTimeline();
		this.drawVerticalLine();
		for(var i = 0; i < this.entries.length; i++) {
			this.entries[i].resize();
		}
	},

	createMonthName: function (month, year, days, frag) {
		var n = document.createElement('DIV');
		n.setAttribute('style', 'width: ' + (days * this.get('blockSize')) + 'px');
		switch(month+1) {
			case 1: n.innerHTML = 'Janvier&nbsp;' + year; break;	
			case 2: n.innerHTML = 'Février&nbsp;' + year; break;	
			case 3: n.innerHTML = 'Mars&nbsp;' + year; break;	
			case 4: n.innerHTML = 'Avril&nbsp;' + year; break;	
			case 5: n.innerHTML = 'Mai&nbsp;' + year; break;	
			case 6: n.innerHTML = 'Juin&nbsp;' + year; break;	
			case 7: n.innerHTML = 'Juillet&nbsp;' + year; break;	
			case 8: n.innerHTML = 'Août&nbsp;' + year; break;	
			case 9: n.innerHTML = 'Septembre&nbsp;' + year; break;	
			case 10: n.innerHTML = 'Octobre&nbsp;' + year; break;	
			case 11: n.innerHTML = 'Novembre&nbsp;' + year; break;	
			case 12: n.innerHTML = 'Décembre&nbsp;' + year; break;	
		}
		if(month % 2) { 
			n.setAttribute('class', 'monthName even');
		} else {
			n.setAttribute('class', 'monthName odd');
		}	
		frag.appendChild(n);
		this.months.push(n);
	},
	destroyMonthName: function() {
		for(var x = this.months.pop(); x; x = this.months.pop()) {
			x.parentNode.removeChild(x);
		}
	},

	createWeekNumber: function (number, days, frag) {
		var n = document.createElement('DIV');
		n.setAttribute('style', 'width: ' + (days * this.get('blockSize')) + 'px');
		n.innerHTML = 'Semaine ' + number;
		if(days * this.get('blockSize') < 80) {
			n.innerHTML = number;
		}
		if(number % 2) { 
			n.setAttribute('class', 'weekNumber even');
		} else {
			n.setAttribute('class', 'weekNumber odd');
		}
		frag.appendChild(n);
		this.weekNumber.push(n);
	},
	destroyWeekNumber: function() {
		for(var x = this.weekNumber.pop(); x; x = this.weekNumber.pop()) {
			x.parentNode.removeChild(x);
		}
	},

	postCreate: function () {
		var that = this;
		var tContainer = dtRegistry.byId('tContainer')
		this.set('zoom', 'week');
		tContainer.startup();

		djAspect.after(tContainer, 'addChild', function () {
			if(this.hasChildren()) {
				djDomStyle.set(this.domNode, 'display', 'block');
			}
		}, true);
		tContainer.watch('selectedChildWidget', function (method, prev, current) {
			var rid = current.get('id').split('_')[2];
			Req.get(locationConfig.store + '/Reservation/' + rid, { query: { 'search.delete': '-' }}).then(function (result) {
				if(result && result.data && result.data.length > 0) {
					data = result.data[0];
					var date = data.deliveryBegin ? new Date(data.deliveryBegin) : new Date(data.begin);
					that.goToReservation(data['target'], date).then(function (widget) {
						that.highlight(widget.domNode);
					});
				}
			});
		});

		djAspect.after(tContainer, 'removeChild', function (child) {
			if(! this.hasChildren()) {
				djDomStyle.set(this.domNode, 'display', 'none');
			}
		}, true);

    djOn(window, "keypress", djLang.hitch(this, this.keys));
		djOn(this.domNode, "mouseup, mousedown", djLang.hitch(this, this.mouseUpDown));
		window.addEventListener('resize', () => { this.set('zoom', this.get('zoom')); }, { passive: true});
		window.addEventListener('wheel', djLang.hitch(this, this.eWheel), { passive: true });
		window.addEventListener('mousemove', djLang.hitch(this, this.mouseOver), { passive: true});
		window.addEventListener('scroll', djThrottle(djLang.hitch(this, this.scroll), 15), { passive: true });

		this.update();

		djOn(window, 'hashchange, load', djLang.hitch(this, () => {
			var that = this;
			window.setTimeout( () => { /* hack to work in google chrome */
				if(window.location.hash) {
					if(Number(window.location.hash.substr(1))) {
						that.doSearchLocation(window.location.hash.substr(1));
					} else {
						that.set('filter', decodeURI(window.location.hash.substr(1)));
					}
				}
			}, 500);
		}));
	},

	mask: function(state, callback) {
		if(state) {
			var mask = document.createElement('DIV');
			this._mask = true;
			this._maskDom = mask;
			mask.setAttribute('style', 'background-color: black; opacity: 0.6; margin: 0; padding: 0; top: 0; left: 0; bottom: 0; right: 0; position: fixed; width: 100%; height: 100%; z-index: 99999998');
			djOn(mask, 'click', (e) => { this.mask(false); callback(e); }); 
			window.requestAnimationFrame( () => {
				document.getElementsByTagName('BODY')[0].appendChild(mask);
			});
		} else {
			this._mask = false;
			this._maskDom.parentNode.removeChild(this._maskDom);
		}
	},

	buildMenu: function() {
		var that = this;
		this.menu.startup();

		var item = new dtMenuItem({ label: 'Tout', disabled: true});
		djOn(item, 'click', djLang.hitch(that, that.filterNone));
		that.searchMenu.addChild(item);
		that.searchMenu.filterNone = item;
		
		that.searchMenu.addChild(new dtMenuSeparator());

		Req.get('https://aircluster.local.airnace.ch/store/Category').then((response)  => {
			if(response && response.data && response.data.length > 0) {
				var names = new Object();
				for(var i = 0; i < response.data.length; i++) {
					names[response.data[i]['uniqueidentifier']] = response.data[i]['cn;lang-fr'];
				}

				for(var key in that.categories) {
					if(names[key]) {
						var item = new dtPopupMenuItem({ label: names[key], popup: new dtDropDownMenu()});
						that.searchMenu.addChild(item);

						var all = new dtMenuItem({ label: 'Tout', value: { name: key, content: new Array() } });
						djOn(all, 'click', djLang.hitch(that, that.filterFamily));
						item.popup.addChild(all);
						item.popup.addChild(new dtMenuSeparator());

						for(var subkey in that.categories[key]) {
							if(names[subkey]) {
								var subitem = new dtMenuItem({ label: names[subkey], value : { name: subkey, content: that.categories[key][subkey]} });
								djOn(subitem, 'click', djLang.hitch(that, that.filterFamily));
								all.value.content = all.value.content.concat(that.categories[key][subkey]);
								item.popup.addChild(subitem);
							}
						}
					}
				}

			}
			
			that.searchMenu.addChild(new dtMenuSeparator());

			/* */

			Req.get(locationConfig.store + '/Status/').then((results) => {
				if(results && results.data && results.data.length > 0) {


					var p = new dtPopupMenuItem({label: 'Par status', popup: new dtDropDownMenu()});
					results.data.forEach( (entry) => {
						if(entry.type == 0) {
							var html = '<li class="fa fa-square" style="color: #' + entry.color +'"></li> ' + entry.name;
							var item = new dtMenuItem({label: html, value: entry});
							djOn(item, 'click', djLang.hitch(that, that.filterStatus));
							p.popup.addChild(item);
						}
					});
					that.searchMenu.addChild(p);
					
					p = new dtPopupMenuItem({label: 'Par complément', popup: new dtDropDownMenu()});
					results.data.forEach( (entry) => {
						if(entry.type == 1) {
							var html = '<li class="fa fa-square" style="color: #' + entry.color +'"></li> ' + entry.name;
							var item = new dtMenuItem({ label: html, value: entry });
							djOn(item, 'click', djLang.hitch(that, that.filterComplement));
							p.popup.addChild(item);
						}
					});
					that.searchMenu.addChild(p);
				}

				that.searchMenu.addChild(new dtMenuSeparator());

				var item = new dtMenuItem({ label: 'Commence demain' });
				djOn(item, 'click', djLang.hitch(that, () => {
					var now = new Date();
					now = djDate.add(now, 'day', 1);
					that.filterDate(now);
				}));
				that.searchMenu.addChild(item);
				
				var item = new dtMenuItem({ label: 'Termine demain' });
				djOn(item, 'click', djLang.hitch(that, () => {
					var now = new Date();
					now = djDate.add(now, 'day', 1);
					that.filterDate(now, 'trueEnd');
				}));
				that.searchMenu.addChild(item);


			});
		});
	},

	filterNone: function() {
		this.searchMenu.filterNone.set('disabled', true);
		for(var i = 0; i < this.entries.length; i++) {
			this.entries[i].set('active', true);
		}
	},

	filterFamily: function(event) {
		var node = dtRegistry.byNode(event.selectorTarget);
		this.searchMenu.filterNone.set('disabled', false);
		for(var i = 0; i < this.entries.length; i++) {
			if(node.value.content.indexOf(this.entries[i].target) == -1) {
				this.entries[i].set('active', false);
			} else {
				this.entries[i].set('active', true);
			}
		}
	},

	filterDate: function() {
		var date = new Date(), what = 'trueBegin';
		this.searchMenu.filterNone.set('disabled', false);
		if(arguments[0]) {
			date = arguments[0];
		}
		if(arguments[1]) {
			what = arguments[1];
		}

		for(var i = 0; i < this.entries.length; i++) {
			var active = false;
			for(var k in this.entries[i].entries) {
				if(djDate.compare(this.entries[i].entries[k].get(what), date, "date") == 0) {
					active = true; break;
				}
			}
			this.entries[i].set('active', active);
		}
	},

	filterStatus: function (event) {
		var node = dtRegistry.byNode(event.selectorTarget);
		this.searchMenu.filterNone.set('disabled', false);
		for(var i = 0; i < this.entries.length; i++) {
			var entry = this.entries[i];
			var active = entry.get('activeReservations');
			if(active.length <= 0) {
				entry.set('active', false);
			} else {
				var count = 0;
				for(var j = 0; j < active.length; j++) {
					if(active[j].status == node.value.id) {
						count++; break;
					}
				}
				if(count > 0) {
					entry.set('active', true);
				} else {
					entry.set('active', false);
				}
			}
		}	
		this.resize();
	},

	filterComplement: function (event) {
		var node = dtRegistry.byNode(event.selectorTarget);
		this.searchMenu.filterNone.set('disabled', false);
		for(var i = 0; i < this.entries.length; i++) {
			var entry = this.entries[i];
			var active = entry.get('activeReservations');
			if(active.length <= 0) {
				entry.set('active', false);
			} else {
				var count = 0;
				for(var j = 0; j < active.length; j++) {
					for(var k = 0; k < active[j].complements.length; k++) {
						if(active[j].complements[k].type.id == node.value.id) {
							count++; break;
						}
					}
				}
				if(count > 0) {
					entry.set('active', true);
				} else {
					entry.set('active', false);
				}
			}
		}
		this.resize();
	},

	mouseUpDown: function(event) {
		if(event.type=='mouseup') {
			this.eventStarted = null;
		} else {
			this.eventStarted = event;
		}
		window.requestAnimationFrame(function() {
			var domNode = document.getElementsByTagName('body')[0]
			if(event.type=='mouseup') {
				domNode.setAttribute('style', 'cursor: grab; cursor: -webkit-grab;')	
			}	else {
				domNode.setAttribute('style', 'cursor: grabbing !important; cursor: -webkit-grabbing !important;')	
			}
		});
	},

	mouseOver: function (event) {
		if(this._mask) { return; }
		var nodeBox = djDomGeo.getContentBox(this.domNode);
		var sight = this.sight;
		var days = this.days;

		if(document.selection && document.selection.empty) {
			document.selection.empty();
		} else if(window.getSelection) {
			var sel = window.getSelection();
			sel.removeAllRanges();
		}

		if(event.clientX <= 200 || (this.eventStarted != null && this.eventStarted.clientX <= 200)) { return; }

		/* Move, following mouse, timeline left/right and up/down when left button is held */
		if(event.buttons == 1) {
			var xDiff = Math.abs(this.lastClientXY[0] - event.clientX);
			var yDiff = Math.abs(this.lastClientXY[1] - event.clientY);

			if((Math.abs(xDiff - yDiff) > 40 && xDiff <= yDiff) || xDiff > yDiff) {	
				if(this.lastClientXY[0] - event.clientX > 0) {
					this.xDiff += xDiff;
				}	else if(this.lastClientXY[0] - event.clientX < 0) {
					this.xDiff += -xDiff;
				}
				if(Math.abs(this.xDiff) >= this.get('blockSize')) {
					if(this.xDiff < 0) {
						this.moveXLeft(1);
					} else {
						this.moveXRight(1);
					}
					this.xDiff = 0;
				}
			}

			if((Math.abs(yDiff - xDiff) > 40 && yDiff <= xDiff) || yDiff > xDiff) {
				var top = (window.pageYOffset || document.documentElement.scrollTop)  - (document.documentElement.clientTop || 0);
				if(this.lastClientXY[1] - event.clientY > 0) {
					window.scrollTo(0, top + (yDiff * 1.25));
				} else if(this.lastClientXY[1] - event.clientY < 0){
					window.scrollTo(0, top - (yDiff * 1.25));			
				}
			}
		}

		window.requestAnimationFrame(function() {
			var none = true;
			for(var i = 0; i < days.length; i++) {
				var pos = djDomGeo.position(days[i].domNode, days[i].computedStyle);
				if(event.clientX >= pos.x && event.clientX <= (pos.x + pos.w)) {
					sight.setAttribute('style', 'width: ' + pos.w +'px; height: ' + nodeBox.h + 'px; position: absolute; top: 0; left: ' + pos.x + 'px; z-index: 400; background-color: yellow; opacity: 0.2; pointer-events: none');	
					none = false;
				}
			}
			
			if(none) {
				sight.removeAttribute('style');	
			}
		}); 
	
		this.lastClientXY[0] = event.clientX;
		this.lastClientXY[1] = event.clientY;
	},

	eWheel: function(event) {
		if(this._mask) { return; }
		if(event.deltaX < 0) {
			this.moveLeft();
		} else if(event.deltaX > 0) { 
			this.moveRight();
		}
		this.wheelTo = null;
	},

	getDateRange: function () {
		return { begin: this.firstDay, end: this.lastDay }

	},
	_getDateRangeAttr: function() {
		return this.getDateRange();
	},

	today: function () {
		this.set('center', new Date());
		this.update(true);
	},

	chooseDay: function () {
		var calendar = new dtCalendar({ value: this.center } );
		var dialog = new dtDialog({ title: 'Choisir une date'});

		dialog.addChild(calendar);
		dialog.startup();
		dialog.show();

		djOn(calendar, 'change', djLang.hitch(this, (e) => {
			this.set('center', e); 
			this.update();
			dialog.destroy();
		}));
	},

	moveXRight: function(x) {
		this.center = djDate.add(this.center, "day", Math.abs(x));
		this.update();
	},
	moveOneRight: function () {
		this.center = djDate.add(this.center, "day", 1);
		this.update();
	},
	moveRight: function () {
		var move = 1;
		if(this.days.length > 7) {
			move = Math.floor(this.days.length / 7);
		}
		this.center = djDate.add(this.center, "day", move);
		this.update();
	},
	moveXLeft: function(x) {
		this.center = djDate.add(this.center, "day", -Math.abs(x));
		this.update();
	},
	moveOneLeft: function() {
		this.center = djDate.add(this.center, "day", -1);
		this.update();
	},
	moveLeft: function () {
		var move = 1;
		if(this.days.length > 7) {
			move = Math.floor(this.days.length / 7);
		}

		this.center = djDate.add(this.center, "day", -move);
		this.update();
	},

	beginDraw: function() {
		//this.newBuffer = document.createDocumentFragment();
	},

	/* insert into linked list */
	_lli: function(root, node) {
		node.set('nextNode', null);
		for(var current = root; current; current = current.get('nextNode')) {
			if(current.get('target') == node.get('placeAfter')) {
				node.set('nextNode', current.get('nextNode'));
				current.set('nextNode', node);
				return true;
			}
		}

		return false;
	},

	endDraw: function() {
		var newBuffer = document.createDocumentFragment(); 
	
		/* Sort nodes following 'placeAfter' property */
		var roots = new Array(), orphan = new Array();
		for(var i = 0; i < this.entries.length; i++) {
			if(! this.entries[i].get('placeAfter') || this.entries[i].get('placeAfter') == 0) {
				this.entries[i].set('nextNode', null);
				roots.push(this.entries[i]);
			}
		}

		for(var i = 0; i < this.entries.length; i++) {
			if(this.entries[i].get('placeAfter') && this.entries[i].get('placeAfter') != 0) {
				var found = false;
				for(var j = 0; j < roots.length; j++) {
					if(this._lli(roots[j], this.entries[i])) {
						found = true;
						break;
					}
				}
				if(! found) {
						orphan.push(this.entries[i]);
				}
			}
		}

		/* Scan several time the orphan list until there's no node that find a place into the ordered list */
		var insert = 0;
		do {
			insert = 0;
			for(var i = orphan.length; i > 0; i--) {
				var node = orphan.pop();
				var found = false;
				for(var j = 0; j < roots.length; j++) {
					if(this._lli(roots[j], node)) {
						found = true;
						insert++;
						break;
					}
				}
				if( !found) {
					orphan.unshift(node);
				}
			}
		} while(insert != 0);


		this.displayOrder = new Array();
		/* Add nodes followings each list */
		for(var i = 0; i < roots.length; i++) {
			for(var node = roots[i]; node; node = node.get('nextNode')) {
				newBuffer.appendChild(node.domNode);
				this.displayOrder.push(node);
			}
		}

		/* Add orphan node */
		for(var i = 0; i < orphan.length; i++) {
			newBuffer.appendChild(orphan[i].domNode);
			this.displayOrder.push(orphan[i]);
		}

		var className = 'odd';
		for(var i = newBuffer.firstChild; i; i = i.nextSibling) {
			djDomClass.add(i, className);
			className = className == 'odd' ? 'even' : 'odd';
		}

		var node = this.domEntries;
		window.requestAnimationFrame( () => {
			while(node.firstChild) {
				node.removeChild(node.firstChild);
			}
			node.appendChild(newBuffer);
		});
	},

	addEntry: function ( widget ) {
		this.entries.push(widget);
	},
	
	_getCompactAttr: function() {
		return this.compact;
	},

	toggle: function(attr) {
		switch(attr) {
			case 'compact':
				if(this.get('compact')) {
					this.set('compact', !this.get('compact'));
				} else {
					this.set('compact', true);
				}
				
				if(this.get('compact')) {
					djDomClass.add(document.getElementsByTagName('body')[0], 'compact');
				} else {
					djDomClass.remove(document.getElementsByTagName('body')[0], 'compact');
				}
				this.emit('zoom');	
				break;
		}
		this.update(true);
	},
	
	drawTimeline: function() {
		var avWidth = this.domNode.offsetWidth;
		var currentWeek = 0, dayCount = 0, currentMonth = -1, dayMonthCount = 0, currentYear = -1, months = new Array(), weeks = new Array();
		this.todayOffset = -1;
		this.weekOffset = -1;
		this.destroyWeekNumber();
		this.destroyMonthName();
		for(var x = this.days.pop(); x!=null; x = this.days.pop()) {
			if(x.domNode.parentNode) {
				x.domNode.parentNode.removeChild(x.domNode);
			}
		}

		var docFrag = document.createDocumentFragment();
		var hFrag = document.createDocumentFragment();
		var shFrag = document.createDocumentFragment();

		this.firstDay = djDate.add(this.center, "day", -Math.floor(avWidth / this.get('blockSize') / 2));
		for(var day = this.firstDay, i = 0; i < this.get('zoom'); i++) {

			if(djDate.compare(day, new Date(), "date") == 0) {
				this.todayOffset = i;	
			}

			if(currentWeek != day.getWeek()) {
				if(currentWeek == 0) {
					currentWeek = day.getWeek();	
				} else {
					if(this.weekOffset == -1) { this.weekOffset = i; }
					this.createWeekNumber(currentWeek, dayCount, hFrag);
					dayCount = 0;
					currentWeek = day.getWeek();
				}
			}
			if(currentMonth != day.getMonth()) {
				if(currentMonth == -1) {
					currentMonth = day.getMonth();
					if(currentMonth % 2) { months.push(i); }
					currentYear = day.getFullYear();
				}	else {
					this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag);
					dayMonthCount = 0;	
					currentMonth = day.getMonth();
					if(currentMonth % 2) { months.push(i); }
					currentYear = day.getFullYear();
				}
			}
			var d = this.makeDay(day);
			this.days.push(d);
			if(this.get('blockSize') > 20) {
				djDomConstruct.place(d.domNode, docFrag, "last");
			}
			day = djDate.add(day, "day", 1);
			this.lastDay = day;
			dayCount++; dayMonthCount++;
		}
		if(dayCount > 0) {
			this.createWeekNumber(currentWeek, dayCount, hFrag);
		}
		if(dayMonthCount > 0) {
			this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag);
		}
		window.requestAnimationFrame(djLang.hitch(this, function () {
			this.line.appendChild(docFrag);
			this.header.appendChild(hFrag);
			this.supHeader.appendChild(shFrag);
		}));
	},

	drawVerticalLine: function() {
		var frag = document.createDocumentFragment();
		var that = this;
	
		if(this.currentVerticalLine != this.get('blockSize')) {
			frag.appendChild(document.createElement('DIV'));	
			for(var i = 0; i < this.days.length; i++) {
				var node  = document.createElement('DIV');
				var nodeclass = '';
				if(i % 2) {
					nodeclass = 'vertical even';
				} else {
					nodeclass = 'vertical odd';
				}
				
				var style = '';

				if(djDate.compare(this.days[i]._date, new Date(), "date") == 0) {
					nodeclass = nodeclass + ' today';
				}
				node.setAttribute('class', nodeclass);
				node.setAttribute('style', style + 'height: 100%; position: fixed; top: 0; z-index: -10; width: ' + 
					this.get('blockSize') + 'px; display: block; left: ' + (this.get('offset') + (this.get('blockSize') * i)) + 'px');
				frag.firstChild.appendChild(node);
			}

			window.requestAnimationFrame( () => {
				if(that.nVerticals.firstChild) { that.nVerticals.removeChild(that.nVerticals.firstChild); }
				that.nVerticals.appendChild(frag);
			});
		}
	},

	refresh: function() {
		var that = this;
		request.head('/location/store/Reservation').then( function (result) { 
			if(that.lastMod != result['last-modification']) {
				that.update(true);
				that.lastMod = result['last-modification'];
				that.lastId = result['last-id'];
			} else if(that.lastId != result['last-id']) {
				that.update();
				that.lastMod = result['last-modification'];
				that.lastId = result['last-id'];
			} 
				
			window.setTimeout(djLang.hitch(that, that.refresh), 1200);	
		});
	},

	run: function () {
		var loaded = new Array();
		var that = this;
		request.get('https://aircluster.local.airnace.ch/store/Machine').then( function (response) {
			that.setServers(locationConfig.servers);
			if(response.success()) {
				that.beginDraw();
				var whole = response.whole();
				whole.sort(function(a,b){
					if(parseInt(a.description, 10) < parseInt(b.description, 10)) { return -1 };
					if(parseInt(a.description, 10) > parseInt(b.description, 10)) { return 1 };
					return 0;
				});
				

				var inc = 0;
				var category = new Object();
				for(var i = 0; i < whole.length; i++) {
					var machine = whole[i];
					var groupName = "group" + (inc % 2);
					var name =  machine.description;
          var label = machine.cn ? machine.cn : '';

					if(machine.family) {
						if(Array.isArray(machine.family)) {
							groupName = [];
							machine.family.forEach( (g) => {
								groupName.push( g.replace(/(\s|\-)/g, ''));
							});
						} else {
							groupName = [ machine.family.replace(/(\s|\-)/g, '') ];
						}
					}

					if(name) {
						if(machine.cn ) {
							name += '<div class="name">' + machine.cn + '</div>'; 	
						}
						var e = new entry({name: name, sup: that, isParent: true, target: machine.description, label: machine.cn, url: '/store/Machine/' + machine.description });

						var families = new Array(), types = new Array();
						if(machine.family && machine.type) {
							families = String(machine.family).split(',');
							types = String(machine.type).split(',');
							if(! djLang.isArray(families)) { families = new Array( families ); }
							if(! djLang.isArray(types)) { types = new Array( types ); }
							
							for(var j = 0; j < families.length; j++) {
								if(! category[families[j]]) {
									category[families[j]] = new Object();
								}

								for(var k = 0; k < types.length; k++) {
									if(! category[families[j]][types[k]]) {
										category[families[j]][types[k]] = new Array();
									}
									category[families[j]][types[k]].push(e.target);
								}
							}
						}

						djDomClass.add(e.domNode, groupName);
						e.setServers(locationConfig.servers);
						that.addEntry(e);
						loaded.push(e.loaded);
						if(machine.airaltref && djLang.isArray(machine.airaltref)) {
							machine.airaltref.forEach( function (altref ) {
									var name = altref + '<div class="name">' + machine.cn + '</div>'; 	
									var e = new entry({name: name, sup: that, isParent: false, target: altref.trim(), label: label, url: '/store/Machine/' + altref.trim() });
									for(var j = 0; j < families.length; j++) {
										for(var k = 0; k < types.length; k++) {
											category[families[j]][types[k]].push(e.target);
										}
									}
									djDomClass.add(e.domNode, groupName);
							
									e.setServers(locationConfig.servers);
									that.addEntry(e);
									loaded.push(e.loaded);
								});
							} else if(machine.airaltref) {
								var name = machine.airaltref + '<div class="name">' + machine.cn + '</div>'; 	
								var e = new entry({name: name, sup: that, isParent: false, target: machine.airaltref.trim(), label: label, url: '/store/Machine/' + machine.airaltref.trim() });
								for(var j = 0; j < families.length; j++) {
									for(var k = 0; k < types.length; k++) {
										category[families[j]][types[k]].push(e.target);
									}
								}
								
								djDomClass.add(e.domNode, groupName);
								e.setServers(locationConfig.servers);
								that.addEntry(e);
								loaded.push(e.loaded);
							}
					
							inc++;
						}
					}
			}
			that.categories = category;
			djAll(loaded).then( function () { that.buildMenu(); that.endDraw(); that.update(); that.refresh(); });
		});
	},

	update: function (force = false) {
		var def = new djDeferred(), r = new Array(), begin = new Date(), end = new Date(), now = new Date(), oldest = null;
		begin.setTime(this.get('dateRange').begin.getTime());
		end.setTime(this.get('dateRange').end.getTime());
		begin.setUTCMonth(begin.getMonth(), 0); begin.setUTCHours(0,0,0);
		end.setUTCMonth(end.getMonth() + 1, 1); end.setUTCHours(0,0,0);
		this.resize();

		for(var i = 0; i < this.runningRequest.length; i++) {
			if(!this.runningRequest[i].req.isFulfilled()) {
				if(oldest == null) {
					oldest = i;
				} else {
					if(this.runningRequest[oldest].time < this.runningRequest[i].time) {
						oldest = i;
					}
				}
				r.push(this.runningRequest[i]);
			}
		}
		if(oldest != null) { this.runningRequest[oldest].req.cancel(); }
		this.runningRequest = r.slice();

		var current = Req.get(this.getUrl(locationConfig.store + '/DeepReservation'), { query : {
			"search.begin": '<' + djDateStamp.toISOString(end, { selector: 'date', zulu: true }),
			"search.end" : '>' + djDateStamp.toISOString(begin, { selector: 'date', zulu: true }),
			"search.deleted" : '-' }
		});

		if(oldest != null) {
			this.runningRequest[oldest] = { req: current, time: new Date().getTime() };
		} else {
			this.runningRequest.push({ req: current, time: new Date().getTime() });
		}

		current.then(djLang.hitch(this, (results) => {
			if(results && results.data && results.data.length > 0) {
				var byTarget = new Object();
				for(var i = 0; i < results.data.length; i++) {
					if( ! byTarget[results.data[i].target]) {
						byTarget[results.data[i].target] = new Array();
					}
					byTarget[results.data[i].target].push(results.data[i]); 
				}
				for(var i = 0; i < this.entries.length; i++) {
					if(byTarget[this.entries[i].get('target')]) {
						this.entries[i].set('reservations', byTarget[this.entries[i].get('target')]);
						this.entries[i].update(true);
					}
				}
			}
			this.resize();
			def.resolve();
		}));

		this.resize();
		return def.promise;
	},

	scroll: function() {
		(async ()=> {	
			var startAt = Math.round(window.scrollY / this.displayOrder.length) - 2;
			if(startAt < 0) { startAt = 0; }

			for(var i = startAt; i < this.displayOrder.length; i++) {
				this.displayOrder[i].resize();
			}
			for(var i = startAt-1; i >= 0; i--) {
				this.displayOrder[i].resize();
			}
		})();
	},

  _getEntriesAttr: function () {
    entries = new Array();
    dtRegistry.findWidgets(this.domEntries).forEach( function (widget) {
      if(widget instanceof location.entry) {
        entries.push(widget);
      }
    });

    return entries;
  },

	highlight: function (domNode) {
		var that = this;

		if(this.Highlighting) {
			djDomStyle.set(this.Highlighting[0], 'box-shadow', '');
			window.clearTimeout(this.Highlighting[1]);
		} else {
			this.Highlighting = [];
		}

		djDomStyle.set(domNode, 'box-shadow', '0px 0px 26px 10px rgba(255,255,0,1)');
		this.Highlighting[0] = domNode;
		this.Highlighting[1] = window.setTimeout(function() {
			djDomStyle.set(domNode, 'box-shadow', '');
		}, 5000);
	},

	goToReservation: function(data, center) {
		var def = new djDeferred();
		var that = this;
		var middle =  window.innerHeight / 3;
		var widget = null;
		
		for(var k in this.entries) {
			if(this.entries[k].target == data['target']) {
				widget = this.entries[k];
				break;
			}
		}

		var tContainer = dtRegistry.byId('tContainer');
		if(djDomStyle.get(tContainer.domNode, "display") != 'none') {
			var w = djDomStyle.get(tContainer.domNode, "width");
			center = djDate.add(center, "day", Math.abs(w / this.get('blockSize')));	
		}

		that.set('center', center);
		that.resize();

		that.update(true).then( function () {
			if(widget) {
				var pos = djDomGeo.position(widget.domNode, true);
				window.scroll(0, pos.y - middle);

				widget.update(true).then(function () {
					var pos = djDomGeo.position(widget.domNode, true);
					window.scroll(0, pos.y - middle);
					that.scroll();
					var reservation = null;

					for(var k in widget.entries) {
						if(widget.entries[k].id == data.id) {
							reservation = widget.entries[k];
							break;
						}
					}
						
						if(reservation) {
							def.resolve(reservation);
						}
				});
			}
		});

		return def.promise;
	},

	doSearchLocation: function (loc) {
		var that = this;
		
		Req.get(locationConfig.store + '/Reservation/' + loc, { query: { 'search.delete': '-' }}).then(function (result) {
			if(result && result.data) {
				data = result.data;
				that.goToReservation(data, data.deliveryBegin ? new Date(data.deliveryBegin) : new Date(data.begin)).then(function (widget) {
					that.highlight(widget.domNode);
				});
			}
		});
	}

});});
