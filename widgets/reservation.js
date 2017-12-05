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
	"dijit/Tooltip",
	"dijit/registry",

	"artnum/rForm",
	"artnum/_Mouse",
	"artnum/_Request"

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
	dtTooltip,
	dtRegistry,

	rForm,
	Mouse,
	request

) {

return djDeclare("artnum.reservation", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, Mouse], {
  events: [],	
	baseClass: "reservation",
	templateString: _template,
	attrs: [],
	detailsHtml: '',
	special: 0,
	intervalZoomFactors : [],


	constructor: function () {
		this.attrs = new Array('special');
		this.detailsHtml = '';
		/* Interval zoom factor is [ Hour Begin, Hour End, Zoom Factor ] */
		this.intervalZoomFactors = new Array( [ 7, 17, 10 ]);
		this.special = 0;	
	},
	postCreate: function () {
		this.inherited(arguments);
	  this.resize();
		if(this.domNode) { 
			djOn(this.domNode, "dblclick", djLang.hitch(this, this.eClick));
		}
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
		if(value) {
	    this.lookupContact(value).then( function () {
  	    that.setTextDesc(); 
    	});
		} else {
			that.dbContact = null;
			that.setTextDesc();	
		}
  },
	_setStartAttr: function(value) {
		this.addAttr('begin');
		if(value == this.get('stop')) { value -= this.get('blockSize'); }
		this._set('start', value);
		this._set('begin', this.timeFromX(value));
		this.setTextDesc();
	},
	_getStartAttr: function() {
		var s = this.xFromTime(this.get('trueBegin'));
		if(s < this.get('offset')) { s = this.get('offset'); }
		return s;
	},
	_getStopAttr: function() {
		return this.xFromTime(this.get('trueEnd'));
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
		this.setTextDesc();
	},
	_setDeliveryBeginAttr: function(value) {
		this.addAttr('deliveryBegin');
		this._set('deliveryBegin', value);	
	},
	_setDeliveryEndAttr: function(value) {
		this.addAttr('deliveryEnd');
		this._set('deliveryEnd', value);
	},
	_setSupAttr: function ( sup ) {
		this._set('sup', sup);
		djOn(this.sup, 'show-' + this.id, djLang.hitch(this, this.popMeUp));
	},
	_setMyParentAttr:function(value) {
		console.log('This function is deprecated')
		this.set('sup', value);
	},
	_getDeliveryBeginAttr: function () {
		if(this.deliveryBegin) {
			return this.deliveryBegin;	
		}

		return this.begin;
	},
	_getDeliveryEndAttr: function () {
		if(this.deliveryEnd) {
			return this.deliveryEnd;	
		}
		return this.end;
	},
	_getBeginAttr: function() {
		return this.begin;	
	},
	_getEndAttr: function() {
		return this.end;
	},
	_getTrueBeginAttr: function() {
		if(this.deliveryBegin) {
			if(djDate.compare(this.begin, this.deliveryBegin) > 0) {
				return this.deliveryBegin;	
			}	
		}

		return this.begin;
	},
	_getTrueEndAttr: function() {
		if(this.deliveryEnd) {
			if(djDate.compare(this.end, this.deliveryEnd) < 0) {
				return this.deliveryEnd;	
			}	
		}
		return this.end;
	},
	is: function(what) {
		switch(what) {
			default: return false;
			case 'confirmed': if(this.special & 0x1) { return true; } else { return false; }
			case 'deliverydate': if(this.special & 0x2) { return true; } else { return false; }
		}
	},
	setIs: function(what, value) {
		switch(what) {
			case 'confirmed':
				if(value) { 
					this.special |= 0x1; 
				} else {
					this.special &= (~0x1);
				}
				break;
			case 'deliverydate':
				if(value) {
					this.special |= 0x2;	
				} else {
					this.special &= (~0x2);
				}
				break;
		}
		return;
	},
  lookupContact: function(id) {
    var def = new djDeferred();
    var that = this;
		if(id) {
    	request.get(locationConfig.store + '/' + id).then(function (result) {
				if(result && result.type == 'results') {
		  		that._set('dbContact', result.first());
       		def.resolve(result.first());
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

    if(this.dbContact) {
			var x = ' - ';
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
			if(x != ' - ') {
				html += x + '</div>';
			}
    } else {
			html += "</div>"	
		}

		html += "<div>"
		if(this.get('trueBegin')) { html += "<span>" + this.get('trueBegin').toLocaleTimeString('fr-CH', {hour: "2-digit", minute: "2-digit", hour12: false, day: "2-digit", month: "2-digit"}) + "</span> - "; }
		if(this.get('trueEnd')) { html += "<span>" + this.get('trueEnd').toLocaleTimeString('fr-CH', {hour: "2-digit", minute: "2-digit", hour12: false, day: "2-digit", month: "2-digit"}) + "</span>"; }
    
		if(this.locality || this.address) {
      var x = ", ";
      if(this.address) {
        x += this.address;
      }
      if(this.locality) {
        if(this.address) { x += ", " }
        x += this.locality;
      }
			if(x != ", ") {
				html += x;	
			}
    }

		html += "</div>"


		if(this.comment) {
			html += '<div>' + this.comment + '</div>';	
		}

    if(this.txtDesc) { this.txtDesc.innerHTML = html; }
		this.detailsHtml = html;
	},
	eDetails: function(event) {
		event.preventDefault();
		event.stopPropagation();
	
		var pos = this.getAbsPos(event);	
		var x = djDomConstruct.toDom("<div>" + this.detailsHtml + "</div>");
		x.style = "background-color: white;position: absolute; top: "+ pos.y +"px; left: "+pos.x +"px; z-index: 100";

		document.getElementsByTagName('BODY')[0].appendChild(x);
			

	},
	eClick: function (event) {
		event.stopPropagation();
		event.preventDefault();
		if(! this.get('IDent')) { return; }
		if(document.selection && document.selection.empty) {
			document.selection.empty();
		} else if(window.getSelection) {
			var sel = window.getSelection();
			sel.removeAllRanges();
		}
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
				deliveryBegin: this.get('deliveryBegin'),
				deliveryEnd: this.get('deliveryEnd'),
				reservation: this, status: this.get('status'), 
				address: this.get('address'), 
				locality: this.get('locality'),
				comment: this.get('comment'),
				contact: this.get('contact') } );
			var dialog = new dtDialog({ title: "Reservation " +  this.IDent + ", machine " + this.get('target'), style: "width: 600px; background-color: white;", content: f, id: 'DIA_RES_' + this.IDent });
			f.set('dialog', dialog);
			dialog.startup();
			dialog.show();
			dialog.resize();
	},
	_getTargetAttr: function() {
		return this.sup.get('target');
	},
	_getOffsetAttr: function() {
		return this.sup.get('offset');	
	},
	_getBlockSizeAttr: function() {
		return this.sup.get('blockSize');	
	},
	_getDateRangeAttr: function() {
		return this.sup.get('dateRange');
	},
	_setIntervalZoomFactor: function ( arr ) {
		console.log('Not implemented');
	},
	timeFromX: function (x) {
		var blockTime = this.get('blockSize')	/ 24; /* block is a day, day is 24 hours */
		var hoursToX = Math.ceil((x - this.get('offset')) / blockTime);
		var d = djDate.add(this.get('dateRange').begin, "hour", hoursToX);
		d.setMinutes(0); d.setSeconds(0);
		return d;
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
	computeIntervalOffset: function ( date ) {
		var offset = 0;
		var days = 24, sub = 0;

		this.intervalZoomFactors.forEach( function ( izf ) {
			days -= izf[1] - izf[0];
			sub += (izf[1] - izf[0]) * izf[2];
		});
		sub += days;

		var hour = date.getHours();
		var within = 0, without = 0;
		var offset = 0;
		this.intervalZoomFactors.forEach ( function ( izf ) {
			if(hour >= izf[0]) {
				within = hour - izf[0];
				if(hour > izf[1]) {
					without =  24 - izf[1];
					within -= without;
				}
				without += izf[0]
			}	
			offset = (within * izf[2]) + without;
		});
		
		return (this.get('blockSize') / sub *  offset);
	},
  resize: function() {
		var that = this;
    var def = new djDeferred();
		var that = this;
		
		if(! rectsIntersect(getPageRect(), getElementRect(this.domNode))) {
			window.requestAnimationFrame(function () { if(that.domNode) { djDomStyle.set(that.domNode, 'visibility', 'hidden'); }});
			def.resolve(); return; 
		} else {
			window.requestAnimationFrame(function () { if(that.domNode) { djDomStyle.set(that.domNode, 'visibility', 'visibility'); }});
		}

		if( ! this.sup) { def.resolve(); return; }
		if(!this.get('begin') || !this.get('end')) { def.resolve(); return; }
	
		/* Verify  if we keep this ourself */
		if(djDate.compare(this.get('trueBegin'),this.get('dateRange').end, "date") > 0 || 
				djDate.compare(this.get('trueEnd'), this.get('dateRange').begin, "date") < 0 ||
				this.deleted) { 
			window.requestAnimationFrame(function () { that.destroy(); });
			def.resolve();
			return; 
		}

		/* Size calculation */
		var dateRange = this.get('dateRange');
		var currentWidth = this.get('blockSize');

		/* Last day included */
		var bgcolor = '#FFFFF';
		var s = JSON.parse(window.sessionStorage.getItem('/Status/' + this.status));
		if(s && s.color) {
			bgcolor = '#' + s.color;
		}

		var range = this.get('dateRange');	
		var begin = this.get('trueBegin');
		if(djDate.compare(range.begin, begin, 'date')>0) {
			begin = range.begin;
		}
		var end = this.get('trueEnd');
		if(djDate.compare(range.end, end, 'date')<0) {
			end = range.end;
		}


		var width = Math.abs(djDate.difference(end, begin, 'day'));
		var bDay = djDate.difference(this.get('dateRange').begin, begin, 'day');	
		if(bDay < 0) { bDay = 0; }
		var startPoint = this.get('offset') + (this.get('blockSize') * bDay);
		var stopPoint = (this.get('blockSize') * width);
	
		var d = this.computeIntervalOffset(begin);
		startPoint += d;
		stopPoint -= d;
		stopPoint += this.computeIntervalOffset(end);

		window.requestAnimationFrame(djLang.hitch(this, function() {
			/* might be destroyed async */
			if(! that || ! that.main) { def.resolve(); return ; }
			
			if(that.is('confirmed')) {
				djDomClass.add(that.main, 'confirmed');
			} else {
				djDomClass.remove(that.main, 'confirmed');
			}
			that.main.setAttribute('style', 'width: ' + stopPoint + 'px; position: absolute; left: ' + (startPoint) + 'px;'); 
			//that.tools.setAttribute('style', 'position: relative; width:' + ( this.get('stop')  - this.get('start')  - dSDiff - dEDiff) + 'px; left: ' + dSDiff + 'px; background-color:' + bgcolor); 
			that.tools.setAttribute('style', 'background-color:' + bgcolor); 
		
			def.resolve();
		}));
	
    return def;
  }

});});
