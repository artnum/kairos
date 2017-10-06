define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
  "dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	"dojo/text!./templates/reservation.html",

	"dojo/dom",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/dom-construct",
	"dojo/on",
  "dojo/dom-style",
	"dojo/dom-class",
	"dojo/request/xhr"


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
  djDomStyle,
	djDomClass,

	djXhr

) {

return djDeclare("artnum.reservation", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
  events: [],	
	baseClass: "reservation",
	templateString: _template,

	postCreate: function () {
		this.inherited(arguments);
	  this.resize();
		djOn(this.domNode, "click", djLang.hitch(this, this.eClick));
  },

	_setIDentAttr: function(value) {
		this.IDent = value;
		this.setTextDesc();
	},

	setTextDesc: function () {
		if(this.description) {
			this.txtDesc.innerHTML = this.description;
		} else {
			if(this.IDent == null) {
				this.txtDesc.innerHTML = "[Nouvelle réservation]";	
			} else {
				this.txtDesc.innerHTML = "N° " + this.IDent;	
			}
		}		
	},

	eClick: function (event) {
		event.stopPropagation();	
	},
	_getOffsetAttr: function() {
		return this.myParent.get('offset');	
	},
	_getBlockSizeAttr: function() {
		return this.myParent.get('blockSize');	
	},
  suicide: function () {
    var p = this.myParent;
    this.events = [];
    this.myParent = null;
    window.requestAnimationFrame(djLang.hitch(this, function () { 
			this.destroyRecursive(false);
		}));
  },
  resize: function() {
    var def = new djDeferred();
			if( ! this.myParent) { def.resolve(); return; }
      var currentWidth = this.myParent.get('blockSize');
      var dateRange = this.myParent.get('dateRange');
   
      if(djDate.compare(this.begin, dateRange.end, "date") > 0) { this.destroyRecursive(false); return; }
      if(djDate.compare(this.end, dateRange.begin, "date") < 0) { this.destroyRecursive(false); return; }

      var daySize = Math.abs(djDate.difference(this.begin, this.end));
			if(daySize == 0) { daySize = 1; }
			var l = this.longerRight;
      if(djDate.compare(this.end, dateRange.end) > 0) {
        daySize -= Math.abs(djDate.difference(this.end, dateRange.end));
				window.requestAnimationFrame(function () { djDomClass.remove(l, "hidden");});
      } else {
				window.requestAnimationFrame(function () { djDomClass.add(l, "hidden");});
			}

    	var startDiff = 0;
			l = this.longerLeft;
     	if(djDate.compare(this.begin, dateRange.begin) < 0) {
        startDiff = Math.abs(djDate.difference(this.begin, dateRange.begin));
      	daySize -= startDiff;
				window.requestAnimationFrame(function () { djDomClass.remove(l, "hidden");});
     	}  else {
				window.requestAnimationFrame(function () { djDomClass.add(l, "hidden");});
			}

			/* Last day included */
      daySize = (daySize + 1) * currentWidth;

      var leftSize = Math.abs(djDate.difference(dateRange.begin, this.begin) + startDiff ) * currentWidth + this.get('offset') -1; 
			hourDiff = Math.ceil((this.begin.getHours() + (this.begin.getMinutes() / 10)) / ( 24 / this.get('blockSize')));
 			daySize -= Math.ceil((this.end.getHours() + (this.end.getMinutes() / 10)) / ( 24 / this.get('blockSize'))) + hourDiff; 

			console.log(daySize);
			window.requestAnimationFrame(djLang.hitch(this, function() {
				switch(this.status) {
					case "1":
						djDomClass.add(this.tools, "reserved"); break;
					case "2":
						djDomClass.add(this.tools, "prereserved"); break;
				} 

				this.main.setAttribute('style', 'width: ' + daySize + 'px; position: absolute; left: ' + (leftSize+hourDiff) + 'px'); 
			}));
			
			def.resolve();
    return def;
  }

});});
