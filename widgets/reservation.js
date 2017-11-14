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
	"dijit/registry",

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
	dtRegistry,

	rForm

) {

return djDeclare("artnum.reservation", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
  events: [],	
	baseClass: "reservation",
	templateString: _template,
	attrs: [],

	constructor: function() {
		this.attrs = new Array();
	},
	postCreate: function () {
		this.inherited(arguments);
	  this.resize();
		if(this.domNode) { djOn(this.domNode, "click", djLang.hitch(this, this.eClick)); }
  },

	addAttr: function ( attr ) {
		if(this.attrs.indexOf(attr) == -1) {
			this.attrs.push(attr);	
		}
	},

	_setStatusAttr: function(value) {
		this.addAttr('status');
		this._set('status', value);
	},

	_setIDentAttr: function(value) {
		this.IDent = value;
		this.id = value;
		this.setTextDesc();
	},
  _setAddressAttr: function(value) {
		this.addAttr('address');
    this._set('address', value);
		this.setTextDesc();
	},
  _setLocalityAttr: function(value) {
		this.addAttr('locality');
    this._set('locality', value);
    this.setTextDesc();
  },
	_setCommentAttr: function(value) {
		this.addAttr('comment');
		this._set('comment', value);
		this.setTextDesc();
	},                
	_setContactAttr: function(value) {
		this.addAttr('contact');
		var that = this;
	  this._set('contact', value);
    this.lookupContact(value).then( function () {
      that.setTextDesc(); 
    });
  },

	_setStartAttr: function(value) {
		this.addAttr('begin');
		if(value == this.get('stop')) { value -= this.get('blockSize'); }
		this._set('start', value);
		this._set('begin', this.timeFromX(value));
	},
	_setBeginAttr: function(value) {
		this.addAttr('begin');
		if(djDate.compare(this.get('dateRange').begin, value) > 0) {
			value = this.get('dateRange').begin;
		}
		this._set('begin', value);
		this._set('start', this.xFromTime(value));	
	},

	_setStopAttr: function(value) {
		this.addAttr('end');
		if(value == this.get('start')) { value += this.get('blockSize'); }
		this._set('stop', value);
		this._set('end', this.timeFromX(value));
	},
	_setEndAttr: function(value) {
		this.addAttr('end');
		if(djDate.compare(this.get('dateRange').end, value) < 0) {
			value = this.get('dateRange').end;
		}
		this._set('end', value);
		this._set('stop', this.xFromTime(value));	
	},

  lookupContact: function(id) {
    var def = new djDeferred();
    var that = this;
		if(id) {
    	djXhr.get(locationConfig.store + '/' + id, {handleAs: "json"}).then(function (result) {
				if(result && result.type == 'results') {
		  		that._set('dbContact', result.data[0]);
       		def.resolve(result.data[0]);
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
			html = '<div><span class="id">' + this.IDent + '</span>'; 	
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
		this.popMeUp();
	
	},

	popMeUp: function() {
		if(this.IDent == null) { return; }
		var d = dtRegistry.byId('DIA_RES_' + this.IDent);
		if(d) {
			d.destroy();	
		}
			var f = new rForm( {  
				begin: this.get('begin'), 
				end: this.get('end'), 
				reservation: this, status: this.get('status'), 
				address: this.get('address'), 
				locality: this.get('locality'),
				comment: this.get('comment'),
				contact: this.get('contact') } );
			var dialog = new dtDialog({ title: "Reservation " +  this.IDent, style: "width: 600px; background-color: white;", content: f,
				id: 'DIA_RES_' + this.IDent });
			f.set('dialog', dialog);
			dialog.show();
	},

	_getOffsetAttr: function() {
		return this.myParent.get('offset');	
	},
	_getBlockSizeAttr: function() {
		return this.myParent.get('blockSize');	
	},
	_getDateRangeAttr: function() {
		return this.myParent.get('dateRange');
	},

	timeFromX: function (x) {
		var blockTime = this.get('blockSize')	/ 24; /* block is a day, day is 24 hours */
		var hoursToX = Math.ceil((x - this.get('offset')) / blockTime);
		return djDate.add(this.get('dateRange').begin, "hour", hoursToX);
	},

	xFromTime: function (x) {
		var diff = djDate.difference(this.get('dateRange').begin, x, "hour");
		return (diff * this.get('blockSize') / 24) + this.get('offset');
	},
	
	remove: function() {
		if(confirm('Vraiment supprimer la réservation ' + this.get('IDent'))) {
			this.set('deleted', true);
			this.destroy();
			return true;
		}

		return false;
	},

  resize: function() {
    var def = new djDeferred();
		var that = this;
			if( ! this.myParent) { def.resolve(); return; }
			if(!this.get('begin') || !this.get('end')) { def.resolve(); return; }
    
			/* Verify  if we keep this ourself */
      if(djDate.compare(this.begin,this.myParent.get('dateRange').end, "date") > 0 || 
      		djDate.compare(this.end, this.myParent.get('dateRange').begin, "date") < 0 ||
					this.deleted) { 
				window.requestAnimationFrame(function () { that.destroy(); });
				def.resolve();
				return; 
			}

			/* Size calculation */
			var dateRange = this.myParent.get('dateRange');
      var currentWidth = this.myParent.get('blockSize');


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
					that.main.setAttribute('style', 'width: ' + (this.get('stop') - this.get('start')) + 'px; position: absolute; left: ' + this.get('start') + 'px; background-color: ' + bgcolor + ';'); 
				}
			}));
		
			def.resolve();
    return def;
  }

});});
