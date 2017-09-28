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

	eClick: function (event) {
		console.log(event);
		event.stopPropagation();	
	},
	_getOffsetAttr: function() {
		return this.myParent.get('offset');	
	},
  suicide: function () {
    var p = this.myParent;
    this.events = [];
    this.myParent = null;
    this.domNode.parentNode.removeChild(this.domNode);
    p.abortChild(this);
		this.destroyRecursive(false);
  },
  resize: function() {
    var def = new djDeferred();
    window.requestAnimationFrame(djLang.hitch(this, function() {
			if( ! this.myParent) { def.resolve(); return; }
      var currentWidth = this.myParent.get('blockSize');
      var dateRange = this.myParent.get('dateRange');
   
      if(djDate.compare(this.begin, dateRange.end, "date") > 0) { this.suicide(); return; }
      if(djDate.compare(this.end, dateRange.begin, "date") < 0) { this.suicide(); return; }

      var daySize = Math.abs(djDate.difference(this.begin, this.end));
      if(djDate.compare(this.end, dateRange.end) > 0) {
        daySize -= Math.abs(djDate.difference(this.end, dateRange.end));
      }

    	var startDiff = 0;
     	if(djDate.compare(this.begin, dateRange.begin) < 0) {
        startDiff = Math.abs(djDate.difference(this.begin, dateRange.begin));
      	daySize -= startDiff;
     	} 
			/* Last day included */
      daySize = (daySize + 1) * currentWidth;
      switch(this.status) {
        case "1":
          djDomClass.add(this.tools, "reserved"); break;
        case "2":
          djDomClass.add(this.tools, "prereserved"); break;
      } 

      if(daySize == 0) { this.suicide(); return;  }
      djDomStyle.set(this.main, "width", daySize + "px");
      djDomStyle.set(this.main, "position", "absolute");

      var leftSize = Math.abs(djDate.difference(dateRange.begin, this.begin) + startDiff ) * currentWidth + this.get('offset') -1 ;

      djDomStyle.set(this.main, "left", leftSize + "px");
			def.resolve();
    }));
    return def;
  }

});});
