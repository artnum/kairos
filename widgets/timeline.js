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

	"artnum/_Cluster"

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

	_Cluster

) {
	
return djDeclare("artnum.timeline", [
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

	constructor: function (args) {
		djLang.mixin(this, arguments);
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

		this.zoomCss = document.createElement('style');
		document.body.appendChild(this.zoomCss);

		var sStore = window.sessionStorage;
		djXhr.get(locationConfig.store + '/Status/', { handleAs: "json"}).then( function (results){
			if(results && results.type == 'results') {
				for(var i = 0; i < results.data.length; i++) {
					sStore.setItem('/Status/' + results.data[i].id, JSON.stringify(results.data[i]));
				}
			}
		});

	},

	zoomStyle: function () {
		var tl = this.timeline;
		var blockSize = this.blockSize;

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
	
		this.update();	
		
		djOn(this.moveright, "click", djLang.hitch(this, this.moveRight));
		djOn(this.moveleft, "click", djLang.hitch(this, this.moveLeft));
    djOn(window, "keypress", djLang.hitch(this, this.eKeyEvent));
    djOn(window, "resize", djLang.hitch(this, this.resize));
		djOn(window, "wheel", djLang.hitch(this, this.eWheel));
		djOn(window, "mousemove", djLang.hitch(this, this.mouseOver));
		djOn(window, "scroll", djLang.hitch(this, this.update));
		djOn(window, "mouseup, mousedown", djLang.hitch(this, this.mouseUpDown));
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
		return def;
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
		
		return def;	
	},

	refresh: function() {
		if(new Date().getTime() - this.lastUpdate.getTime() > 5000) {
			this.update();
		}	
		window.setTimeout(djLang.hitch(this, this.refresh), 250);	
	},
	
	update: function () {
		this.lastUpdate = new Date();
		var def = new djDeferred();
		var that = this;

		this.drawTimeline().then(function () {
			that.drawVerticalLine().then(function() {
				that.entries.forEach( function ( entry ) {
					if(intoYView(entry.domNode)) {
						entry.verifyLock();
						that.emit("update-" + entry.target);
					}			
				});

				def.resolve();		
			});
		});
		return def;
	}

});});
