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
	"dojo/request/xhr",

	"dijit/Dialog",

	"artnum/rForm"

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

	djXhr,

	dtDialog,

	rForm

) {

return djDeclare("artnum.reservation", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
  events: [],	
	baseClass: "reservation",
	templateString: _template,

	postCreate: function () {
		this.inherited(arguments);
	  this.resize();
		if(this.domNode) { djOn(this.domNode, "click", djLang.hitch(this, this.eClick)); }
  },

	_setIDentAttr: function(value) {
		this.IDent = value;
		this.setTextDesc();
	},
  _setAddressAttr: function(value) {
    this._set('address', value);
		this.setTextDesc();
	},
  _setLocalityAttr: function(value) {
    this._set('locality', value);
    this.setTextDesc();
  },
	_setCommentAttr: function(value) {
		this._set('comment', value);
		this.setTextDesc();
	},                
	_setContactAttr: function(value) {
		var that = this;
	  this._set('contact', value);
    this.lookupContact(value).then( function () {
      that.setTextDesc(); 
    });
  },

  lookupContact: function(id) {
    var def = new djDeferred();
    var that = this;
		if(id) {
    	djXhr.get(locationConfig.store + '/' + id, {handleAs: "json"}).then(function (result) {
				if(result && result.type == 'results') {
			  	that._set('dbContact', result.data[0]);
        	def.resolve();
				}
			});
		}
    return def;
  },

	setTextDesc: function () {
	  
    var html = '';
		if(this.IDent == null) {
			html = '<div><span class="id">[Nouvelle réservation]</span>';	
		} else {
			html = '<div><span class="id">' + this.id + '</span>'; 	
		}

    if(this.locality || this.address) {
      html += " - ";
      if(this.address) {
        html += this.address;
      }
      if(this.locality) {
        if(this.address) { html += ", " }
        html += this.locality;
      }
    }
    html += '</div>'

    if(this.dbContact) {
			var x = '';
      if(this.dbContact.o) {
        x += '<span class="o">' + this.dbContact.o + '</span>';
      }

      if(this.dbContact.givenname || this.dbContact.sn) {
        if(this.dbContact.o) { x += ', '; }
				var n = '';
				if(this.dbContact.givenname) {
					n += this.dbContact.givenname;
				}
				if(this.dbContact.sn) {
					if(this.dbContact.givenname) { n += ' '; }
					n += this.dbContact.sn;
				}
        x += '<span class="name">' + n + '</span>';
      }
			if(x != '') {
				html += '<div>' + x + '</div>';
			}
    }

		if(this.comment) {
			html += '<div>' + this.comment + '</div>';	
		}

    if(this.txtDesc) { this.txtDesc.innerHTML = html; }
	},

	eClick: function (event) {
		event.stopPropagation();
	
		var f = new rForm( {  begin: this.get('begin'), end: this.get('end'), reservation: this, status: this.get('status'), address: this.get('address'), locality: this.get('locality')  } );
		var dialog = new dtDialog({ title: "Reservation ", style: "width: 600px;", content: f });
		dialog.show();
	
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
				window.requestAnimationFrame(function () { if(l) { djDomClass.remove(l, "hidden");}});
      } else {
				window.requestAnimationFrame(function () { if(l) { djDomClass.add(l, "hidden"); }});
			}

    	var startDiff = 0;
			l = this.longerLeft;
     	if(djDate.compare(this.begin, dateRange.begin) < 0) {
        startDiff = Math.abs(djDate.difference(this.begin, dateRange.begin));
      	daySize -= startDiff;
				window.requestAnimationFrame(function () { if(l) { djDomClass.remove(l, "hidden");}});
     	}  else {
				window.requestAnimationFrame(function () { if(l) { djDomClass.add(l, "hidden");}});
			}

			/* Last day included */
      daySize = (daySize + 1) * currentWidth;

      var leftSize = Math.abs(djDate.difference(dateRange.begin, this.begin) + startDiff ) * currentWidth + this.get('offset') -1; 
			hourDiff = Math.ceil((this.begin.getHours() + (this.begin.getMinutes() / 10)) / ( 24 / this.get('blockSize')));
 			daySize -= Math.ceil((this.end.getHours() + (this.end.getMinutes() / 10)) / ( 24 / this.get('blockSize'))) + hourDiff; 

			var bgcolor = '#FFFFF';
			var that = this;
			var s = JSON.parse(window.sessionStorage.getItem('/Status/' + this.status));
			if(s && s.color) {
				bgcolor = '#' + s.color;
			}
			window.requestAnimationFrame(djLang.hitch(this, function() {
				/* might be destroyed async */
				if(that && that.main) {
					that.main.setAttribute('style', 'width: ' + daySize + 'px; position: absolute; left: ' + (leftSize+hourDiff) + 'px; background-color: ' + bgcolor + ';'); 
				}
			}));
		
			def.resolve();
    return def;
  }

});});
