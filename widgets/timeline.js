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
	"dojo/dom-geometry"


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
	djDomGeo

) {
	
return djDeclare("artnum.timeline", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {

	center: new Date(),
	offset: 146,
	blockSize: 42,
	baseClass: "timeline",
	templateString: _template,
	zoomCss: null,
	lines: null,

	constructor: function (args) {
		djLang.mixin(this, arguments);
		this.days = new ExtArray();
		this.weekNumber = new Array();
		this.entries = new ExtArray();
		this.lines = null;
		this.todayOffset = -1;

		this.zoomCss = document.createElement('style');
		document.body.appendChild(this.zoomCss);
		console.log("start timeline");
	},

	zoomIn: function () {
		if(this.blockSize > 16) {
			this.blockSize = Math.ceil(this.blockSize / 1.3333);
			var css = '.timeline .line span { width: '+ (this.blockSize-2) +'px !important;} ';
			if(this.blockSize < 30) {
				css += '.timeline .day { font-size: 0.8em !important }';	
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
		var txtDate = newDay.getDate() + "." + (newDay.getMonth() + 1);
		if(this.blockSize < 30) {
			txtDate = newDay.getDate();
		}
		var domDay = djDomConstruct.toDom('<span data-artnum-day="' + dayStamp + '" class="'+ c +'">' +txtDate + '</span>');
		this.own(domDay);
		return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay, _line: this.line };
	},

	resize: function ( event ) {
		this.update();
	},

	createWeekNumber: function (number, days) {
		var n = djDomConstruct.toDom('<div class="weekNumber"></div>');
		djDomStyle.set(n, { "width": (days * this.get('blockSize')) + "px" });
		n.innerHTML = 'Semaine' + number;
		if(number % 2) { 
			djDomClass.add(n, "even");
		} else {
			djDomClass.add(n, "odd");
		}
		djDomConstruct.place(n, this.header);
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
		djOn(this.domEntries.domNode, "scroll", djLang.hitch(this, this.eScroll));
   },

	eScroll: function(event) {
		console.log(event);	
	},

	eWheel: function(event) {
		if(event.deltaX < 0) {
			this.moveLeft();		
		} else if(event.deltaX > 0) { 
			this.moveRight();
		}
		console.log(event);
	},

  eKeyEvent: function (event) {
		console.log(event);
    switch(event.key) {
      case 'ArrowLeft': this.moveLeft(); break;
      case 'ArrowRight': this.moveRight(); break;
			case 'ArrowUp': event.preventDefault(); this.zoomOut(); break;
			case 'ArrowDown': event.preventDefault(); this.zoomIn(); break;

    }    
  },
	getDateRange: function () {
		var b = djDateStamp.fromISOString(djDomAttr.get(this.line.firstChild, "data-artnum-day"));
		var e = djDateStamp.fromISOString(djDomAttr.get(this.line.lastChild, "data-artnum-day"));
		return { begin: b, end: e }

	},

	moveRight: function () {
		this.center = djDate.add(this.center, "day", -5);
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
		this.center = djDate.add(this.center, "day", 5);
		this.update();
	},

	drawTimeline: function() {
		window.requestAnimationFrame(djLang.hitch(this, function () {
			var box = djDomGeo.getContentBox(this.domNode, djDomStyle.getComputedStyle(this.domNode));
			var avWidth = box.w - this.get('offset') - this.get('blockSize');
			var currentWeek = 0, dayCount = 0;
			this.todayOffset = -1;

			this.destroyWeekNumber();
			for(var x = this.days.pop(); x!=null; x = this.days.pop()) {
				if(x.domNode.parentNode) {
					x.domNode.parentNode.removeChild(x.domNode);
				}
			}

			for(var day = djDate.add(this.center, "day", -Math.floor(avWidth / this.get('blockSize') / 2)), i = 0; i < Math.floor(avWidth / this.get('blockSize')); i++) {

				if(djDate.compare(day, new Date(), "date") == 0) {
					this.todayOffset = i;	
					console.log(this.todayOffset);
				}

				if(currentWeek != day.getWeek()) {
					if(currentWeek == 0) {
						currentWeek = day.getWeek();	
					} else {
						this.createWeekNumber(currentWeek, dayCount);
						dayCount = 0;
						currentWeek = day.getWeek();
					}
				}
				var d = this.makeDay(day);
				this.days.add(d , this.isBefore);	
				djDomConstruct.place(d.domNode, this.line, "last");
				day = djDate.add(day, "day", 1);
				dayCount++;
			}
			if(dayCount > 0) {
				this.createWeekNumber(currentWeek, dayCount);
			}
			djDomStyle.set(this.domEntries.domNode, { "padding-top": "60px"})	
		}));
				
	},

	drawCanvas: function() {
		window.requestAnimationFrame(djLang.hitch(this, function() {
			var box = djDomGeo.getContentBox(this.domNode, djDomStyle.getComputedStyle(this.domNode));
			var posX = 138;
			if(this.lines) {
				this.lines.parentNode.removeChild(this.lines);	
			}
			this.lines = document.createElement('canvas');
			djDomStyle.set(this.lines, { "top": box.t + "px", "left": box.l + "px", "position": "absolute", "z-index": "-1", "background-color" : "transparent"});
			djDomAttr.set(this.lines, "height",  box.h);
			djDomAttr.set(this.lines, "width", box.w);
			document.body.appendChild(this.lines)
			var ctx = this.lines.getContext("2d");
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
		}));
	},

	update: function () {
		var def = new djDeferred();
		this.drawTimeline();
		this.drawCanvas();
		this.emit("update", this.getDateRange());
		return def;
	}

});});
