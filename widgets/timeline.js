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

	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/throttle",
	"dojo/request/xhr",
	"dijit/registry",

	"location/_Cluster",
	"location/_Request",
	"location/entry",
	"location/_Sleeper"

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

	djDate,
	djDateStamp,
	djDomConstruct,
	djOn,
	djDomAttr,
	djDomClass,
	djDomStyle,
	djDomGeo,
	djThrottle,
	djXhr,
	dtRegistry,

	_Cluster,
	request,
	entry,
	_Sleeper

) {
	
return djDeclare("location.timeline", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, _Cluster ], {

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
	
	zoomStyle: function () {
		var tl = this.timeline;
		var blockSize = this.blockSize;
		
		this.emit('zoom');

		window.requestAnimationFrame(function () {
			if(blockSize < 30) {
				djDomAttr.set(tl, "class", "timeline x1");
			} else if(blockSize < 60) {
				djDomAttr.set(tl, "class", "timeline x2");
			} else if(blockSize <= 120) {
				djDomAttr.set(tl, "class", "timeline x3");
			}
		});
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

	zoomIn: function () {
		if(this.blockSize > 14) {
			this.blockSize = Math.ceil(this.blockSize / 1.3333);
			var css = '.timeline .line span { width: '+ (this.blockSize-2) +'px !important;} ';
			if(this.blockSize < 30) {
				css += '.timeline .day { font-size: 0.8em !important }';	
			} else if(this.get('blockSize') < 14) {
				css += '.timeline .day { font-size: 0.6em !important }';	
			}
			this.zoomCss.innerHTML = css;
		}
		this.zoomStyle();
		this.update();
	},

	zoomOut: function () {
		if(this.blockSize < 120) {
			this.blockSize = Math.ceil(this.blockSize * 1.3333);
			var css = '.timeline .line span { width: '+ (this.blockSize - 2) +'px !important;}';
			
			this.zoomCss.innerHTML = css;
		}
		this.zoomStyle();
		this.update();
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
		txtDate = newDay.getDate();
		var domDay = document.createElement('SPAN')
		domDay.setAttribute('data-artnum-day', dayStamp);
		domDay.setAttribute('class', c);
		domDay.innerHTML=txtDate;
		this.own(domDay);
		return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay, _line: this.line, computedStyle: djDomStyle.getComputedStyle(domDay) };
	},

	resize: function ( ) {
		this.entries.forEach(function (e) {
			e.resize();	
		});
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
		this.inherited(arguments);
		_Sleeper.init();
	
		this.update();	
		window.Sleeper.on(this.moveright, "click", djLang.hitch(this, this.moveRight));
		window.Sleeper.on(this.moveleft, "click", djLang.hitch(this, this.moveLeft));
    window.Sleeper.on(window, "keypress", djLang.hitch(this, this.eKeyEvent));
    window.Sleeper.on(window, "resize", djLang.hitch(this, this.resize));
		window.Sleeper.on(this.domNode, "wheel", djLang.hitch(this, this.eWheel));
		window.Sleeper.on(this.domNode, "mousemove", djLang.hitch(this, this.mouseOver));
		window.Sleeper.on(window, "scroll", djLang.hitch(this, this.update));
		window.Sleeper.on(this.domNode, "mouseup, mousedown", djLang.hitch(this, this.mouseUpDown));

		this.lockEvents = new EventSource('/location/lock.php?follow=1');
		this.lockEvents.addEventListener('lock', djLang.hitch(this, this.lockChange));

		this.refresh();	
	},

	mouseUpDown: function(event) {
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
		var nodeBox = djDomGeo.getContentBox(this.domNode);
		var sight = this.sight;
		var days = this.days;

		if(document.selection && document.selection.empty) {
			document.selection.empty();
		} else if(window.getSelection) {
			var sel = window.getSelection();
			sel.removeAllRanges();
		}

		/* Move, following mouse, timeline left/right and up/down when left button is held */
		if(event.buttons == 1) {
			var xDiff = Math.abs(this.lastClientXY[0] - event.clientX);
			var yDiff = Math.abs(this.lastClientXY[1] - event.clientY);

			if((Math.abs(xDiff - yDiff) > 40 && xDiff <= yDiff) || xDiff > yDiff) {	
				var diff = 0;
				if(xDiff < this.get('blockSize') && xDiff > this.get('blockSize') / 48) {
					diff = 1;	
				} else if(xDiff < this.get('blockSize') && xDiff > this.get('blockSize') / 32) {
					diff = 2;
				} else if(xDiff > this.get('blockSize')) {
					diff = Math.round(Math.abs(xDiff / this.get('blockSize') * 8)) + 1;
				}
				if(this.lastClientXY[0] - event.clientX > 0) {
					this.moveXRight(diff);		
				}	else if(this.lastClientXY[0] - event.clientX < 0) {
					this.moveXLeft(diff);		
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
			days.forEach( function (day) {
				var pos = djDomGeo.position(day.domNode, day.computedStyle);
				if(event.clientX >= pos.x && event.clientX <= (pos.x + pos.w)) {
					sight.setAttribute('style', 'width: ' + pos.w +'px; height: ' + nodeBox.h + 'px; position: absolute; top: 0; left: ' + pos.x + 'px; z-index: 900; background-color: yellow; opacity: 0.2; pointer-events: none');	
					none = false;
				}
			});
			
			if(none) {
				sight.removeAttribute('style');	
			}
		}); 
	
		this.lastClientXY[0] = event.clientX;
		this.lastClientXY[1] = event.clientY;
	},

	eWheel: function(event) {
		if(event.deltaX < 0) {
			this.moveLeft();
		} else if(event.deltaX > 0) { 
			this.moveRight();
		}

		if(event.ctrlKey) {
			event.preventDefault();
			if(event.deltaY < 0) {
				this.zoomOut();	
			} else if(event.deltaY > 0) {
				this.zoomIn();	
			}		
		}

		this.wheelTo = null;
	},

  eKeyEvent: function (event) {
		if(event.ctrlKey) {
			switch(event.key) {
				case 'ArrowLeft': 
					this.moveLeft(); 
					break;
				case 'ArrowRight': 
					this.moveRight();
					break;
				case 'ArrowUp': 
					event.preventDefault(); 
					this.zoomOut();
					break;
				case 'ArrowDown':
					event.preventDefault(); 
					this.zoomIn();
					break;
				case 'Escape':
					event.preventDefault();
					this.emit('cancel-reservation');
					break;
			}
		}
  },
	
	getDateRange: function () {
		return { begin: this.firstDay, end: this.lastDay }

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
		this.center = djDate.add(this.center, "day", Math.floor(this.days.length / 7));
		this.update();
	},

	beginDraw: function() {
		this.newBuffer = document.createDocumentFragment();
	},

	endDraw: function() {
		var that = this;
		var node = this.domEntries;
		var newBuffer = this.newBuffer;
		this.newBuffer = null;

		window.requestAnimationFrame( function() {
			while(node.firstChild) {
				node.removeChild(node.firstChild);
			}
			node.appendChild(newBuffer);
		});
	},

	addEntry: function ( widget ) {
		if(this.odd) {
			djDomClass.add(widget.domNode, "odd");
		} else {
			djDomClass.add(widget.domNode, "even");
		}
		this.odd = !this.odd;
		this.newBuffer.appendChild(widget.domNode);
		this.entries.push(widget);
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
		this.center = djDate.add(this.center, "day", -Math.floor(this.days.length / 7));
		this.update();
	},

	drawTimeline: function() {
		var def = new djDeferred();
		window.requestAnimationFrame(djLang.hitch(this, function () {
			var box = djDomGeo.getContentBox(this.domNode, djDomStyle.getComputedStyle(this.domNode));
			var avWidth = box.w - this.get('offset') - this.get('blockSize');
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
			for(var day = this.firstDay, i = 0; i < Math.floor(avWidth / this.get('blockSize')); i++) {

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
				djDomConstruct.place(d.domNode, docFrag, "last");
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
			this.line.appendChild(docFrag);
			this.header.appendChild(hFrag);
			this.supHeader.appendChild(shFrag);
			def.resolve();
		}));
		return def.promise;
	},

	drawVerticalLine: function() {
		var def = new djDeferred();
		var that = this;

	
		var newCount = this.days.length - this.verticals.length;	
		for(var i = 0; i < newCount; i++) {
			var node  = document.createElement('DIV');
			node.setAttribute('class', 'vertical');	
			node.setAttribute('style', 'height: 100%; position: fixed; top: 0; width: ' + 
				this.get('blockSize') + 'px; display: none;');
			this.domNode.appendChild(node);
			this.verticals.push(node);	
		}
		
		var i = 0, blockSize = this.get('blockSize'), offset = this.get('offset');
		window.requestAnimationFrame(function() {
			for(i = 0; i < that.days.length; i++) {
					var vertical = that.verticals[i];
					djDomStyle.set(vertical, 'width',  blockSize + 'px');
					djDomStyle.set(vertical, 'left',  (offset + (blockSize * i)) + 'px');
					djDomStyle.set(vertical, 'display',  'block');
					if(i % 2) {
						vertical.setAttribute('class', 'vertical even');
					} else {
						vertical.setAttribute('class', 'vertical odd');
					}
			}
			
			for(; i < that.verticals.length; i++) {
				var vertical = that.verticals[i];
					djDomStyle.set(vertical, 'display',  'none');
			}
			def.resolve();
		});
		
		return def.promise;	
	},

	refresh: function() {
		var that = this;
		if(window.Sleeper.awake(function () { that.refresh(); })) {
			console.log('refresh');
			request.head('/location/store/Reservation').then( function (result) { 
				if(that.lastId != result['last-id']) {
					that.update().then(function () {
						that.lastId = result['last-id'];
					});
				}
			});
			window.setTimeout(djLang.hitch(that, that.refresh), 1200);	
		}
	},

	run: function () {
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
				whole.forEach( function ( machine ) {
					var groupName = "group" + (inc % 2);
					var name =  machine.description;
					if(name) {
						if(machine.cn ) {
							name += '<div class="name">' + machine.cn + '</div>'; 	
						}
						var e = new entry({name: name, sup: that, isParent: true, target: machine.description });
						djDomClass.add(e.domNode, groupName);
						e.setServers(locationConfig.servers);
						that.addEntry(e);
						if(machine.airaltref && djLang.isArray(machine.airaltref)) {
							machine.airaltref.forEach( function (altref ) {
									var name = altref + '<div class="name">' + machine.cn + '</div>'; 	
									var e = new entry({name: name, sup: that, isParent: false, target: altref.trim() });
									djDomClass.add(e.domNode, groupName);
							
									e.setServers(locationConfig.servers);
									that.addEntry(e);
								});
							} else if(machine.airaltref) {
								var name = machine.airaltref + '<div class="name">' + machine.cn + '</div>'; 	
								var e = new entry({name: name, sup: that, isParent: false, target: machine.airaltref.trim() });
								djDomClass.add(e.domNode, groupName);
								e.setServers(locationConfig.servers);
								that.addEntry(e);
							}
					
							inc++;
						}
					});
			}
			that.endDraw();
		});
	},
	
	update: function () {
		this.lastUpdate = new Date();
		var def = new djDeferred();
		var that = this;

		this.drawTimeline().then(function () {
			that.drawVerticalLine().then(function() {
				that.entries.forEach( function ( entry ) {
					if(intoYView(entry.domNode)) {
						that.emit("update-" + entry.target);
					}			
				});

				def.resolve();		
			});
		});
		return def.promise;
	},

	lockChange: function (event) {
		var that = this;
		var data = JSON.parse(event.data);
		this.entries.forEach( function (entry) {
			if(entry.get('target') == data.target) {
				if(data.status == "0") {
					entry.setLocked(false);
				}	else {
					entry.setLocked(true);
				}
			}	
		})
	}

});});
