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

	resize: function ( event ) {
		this.update();
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
	},

	mouseOver: function (event) {
		var nodeBox = djDomGeo.getContentBox(this.domNode);
		var sight = this.sight;
		var days = this.days;

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
		var verticals = new Array();

		var frag = document.createDocumentFragment();
		var even = false;
		that.days.forEach( function (d) {
			var node  = document.createElement('DIV');
			if(even) {
				node.setAttribute('class', 'vertical even');	
			}	else {
				node.setAttribute('class', 'vertical odd');	
			}
			
			box = djDomGeo.getContentBox(d.domNode, d.computedStyle);
			node.setAttribute('style', 'height: 100%; position: fixed; top: 0; left: ' + box.l + 'px; width: ' + box.w + 'px;');

			frag.appendChild(node);
			verticals.push(node);
			even = !even;
		});
		
		window.requestAnimationFrame(function () {
			that.verticals.forEach( function (v){
				that.domEntries.removeChild(v);	
			});
			that.domEntries.appendChild(frag);	
			that.verticals = verticals;
			def.resolve();
		});

		
		return def;	
	},
	
	update: function () {
		var def = new djDeferred();
		var that = this;
		this.emit('cancel-update');

		this.drawTimeline().then(function () {
			that.drawVerticalLine().then(function() {
				var lateUpdate = new Array();	
				that.entries.forEach( function ( entry ) {
					if(rectsIntersect(getPageRect(), getElementRect(entry.domNode))) {
						that.emit("update-" + entry.target);
					} else {
						lateUpdate.push(entry.target);	
					}			
				});

				lateUpdate.forEach(function ( target ) {
					window.setTimeout(that.emit("update-" + target), 150);
				});
				def.resolve();		
			});
		});
		return def;
	}

});});
