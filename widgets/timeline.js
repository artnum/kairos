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
	"dojo/debounce"


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
	djDebounce

) {
	
return djDeclare("artnum.timeline", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {

	center: new Date(),
	offset: 138,
	blockSize: 42,
	baseClass: "timeline",
	templateString: _template,
	zoomCss: null,
	lines: null,
	moveQueue: null,
	throttle: 80,

	constructor: function (args) {
		djLang.mixin(this, arguments);
		this.days = new ExtArray();
		this.weekNumber = new Array();
		this.entries = new ExtArray();
		this.lines = null;
		this.todayOffset = -1;
		this.months = new Array();
		this.moveQueue = new Array();
		this.throttle = 250;

		this.zoomCss = document.createElement('style');
		document.body.appendChild(this.zoomCss);
		console.log("start timeline");
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
			this.update();
		}
	},

	zoomOut: function () {
		if(this.blockSize < 120) {
			this.blockSize = Math.ceil(this.blockSize * 1.3333);
			var css = '.timeline .line span { width: '+ (this.blockSize - 2) +'px !important;}';
			
			this.zoomCss.innerHTML = css;
			this.update();
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
		txtDate = newDay.getDate();
		var domDay = document.createElement('SPAN')
		domDay.setAttribute('data-artnum-day', dayStamp);
		domDay.setAttribute('class', c);
		domDay.innerHTML=txtDate;
		this.own(domDay);
		return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay, _line: this.line };
	},

	resize: function ( event ) {
		this.update;
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
		this.drawTimeline();
		djOn(this.moveright, "click", djLang.hitch(this, this.moveRight));
		djOn(this.moveleft, "click", djLang.hitch(this, this.moveLeft));
    djOn(window, "keypress", djLang.hitch(this, this.eKeyEvent));
    djOn(window, "resize", djLang.hitch(this, this.resize));
		djOn(window, "wheel", djLang.hitch(this, this.eWheel));
   },

	eWheel: function(event) {
		if(event.deltaX < 0) {
			this.moveLeft();
		} else if(event.deltaX > 0) { 
			this.moveRighti();
		}
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

		}
  },
	getDateRange: function () {
		var b = djDateStamp.fromISOString(djDomAttr.get(this.line.firstChild, "data-artnum-day"));
		var e = djDateStamp.fromISOString(djDomAttr.get(this.line.lastChild, "data-artnum-day"));
		return { begin: b, end: e }

	},

	moveRight: function () {
		this.center = djDate.add(this.center, "day", Math.floor(this.days.width() / 7));
		this.update();
	},

	addEntry: function ( widget ) {
		window.requestAnimationFrame(
			djLang.hitch(this, function() {
				this.domEntries.addChild(widget)
			})
		);
	},

	moveLeft: function () {
		this.center = djDate.add(this.center, "day", -Math.floor(this.days.width() / 7));
		this.update();
	},

	drawTimeline: function() {
		var def = new djDeferred();
		djDebounce(window.requestAnimationFrame(djLang.hitch(this, function () {
			var box = djDomGeo.getContentBox(this.domNode, djDomStyle.getComputedStyle(this.domNode));
			var avWidth = box.w - this.get('offset') - this.get('blockSize');
			var currentWeek = 0, dayCount = 0, currentMonth = -1, dayMonthCount = 0, currentYear = -1, months = new Array(), weeks = new Array();
			this.todayOffset = -1;

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

			for(var day = djDate.add(this.center, "day", -Math.floor(avWidth / this.get('blockSize') / 2)), i = 0; i < Math.floor(avWidth / this.get('blockSize')); i++) {

				if(djDate.compare(day, new Date(), "date") == 0) {
					this.todayOffset = i;	
				}

				if(currentWeek != day.getWeek()) {
					if(currentWeek == 0) {
						currentWeek = day.getWeek();	
					} else {
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
				this.days.add(d , this.isBefore);	
				djDomConstruct.place(d.domNode, docFrag, "last");
				day = djDate.add(day, "day", 1);
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

			this.drawCanvas(months, weeks);
			def.resolve();
		})), 10);
		return def;
	},

	drawCanvas: function(months, weeks) {
		var box = djDomGeo.getContentBox(this.domNode, djDomStyle.getComputedStyle(this.domNode));
		var posX = this.get('offset');
		if(! this.lines) {
			this.lines = document.createElement('canvas');
			document.body.appendChild(this.lines)
		}
		this.lines.setAttribute('style', "top:" + box.t + "px; left:" + box.l + "px; position: absolute; z-index: -1; background-color: transparent;");
		this.lines.setAttribute("width", box.w);
		this.lines.setAttribute("height", box.h);
		var ctx = this.lines.getContext("2d");
		ctx.clearRect(0,0,box.w, box.h);
		ctx.lineWidth = 1.5;
		ctx.lineCap = "round";
		ctx.globalAlpha = 0.2;
		for(var i = 0; i <= this.days.width(); i++) {
			if(this.todayOffset != - 1 && this.todayOffset == i) {
				ctx.fillStyle="#EC0000";
				ctx.beginPath();
				ctx.moveTo(posX, box.t);
				ctx.lineTo(posX, box.h);
				ctx.lineTo(posX-this.get('blockSize'), box.h);
				ctx.lineTo(posX-this.get('blockSize'), box.t);
				ctx.lineTo(posX, box.t);
				ctx.fill();
			} 
			ctx.beginPath();
			ctx.strokeStyle="black";	
			ctx.moveTo(posX, box.t);
			ctx.lineTo(posX, box.h);
			ctx.stroke();
			ctx.closePath();
			posX += this.get('blockSize');	
		}
	},

	update: function () {
		var def = new djDeferred();
		this.drawTimeline().then(djLang.hitch(this, function() {
			this.emit("update", this.getDateRange());
			def.resolve();
		}));
		return def;
	}

});});
