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

	"location/rForm",
	"location/_Mouse",
	"location/_Request",

	"artnum/Request",
	"artnum/Join"
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
	request,

	Req,
	Join
) {

return djDeclare("location.reservation", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented, Mouse], {
  events: [],	
	baseClass: "reservation",
	templateString: _template,
	attrs: [],
	detailsHtml: '',
	special: 0,
	hidden: true,
	form: null,
	dbContact: null,


	constructor: function () {
		this.attrs = new Array('special');
		this.detailsHtml = '';
		this.special = 0;	
		this.hidden = true;
		this.form = null;
		this.dbContact = null;
	},
	error: function(txt, code) {
		this.sup.error(txt, code);
	},
	warn: function(txt, code) {
		this.sup.warn(txt, code);	
	},
	info: function(txt, code) {
		this.sup.info(txt, code);	
	},
	postCreate: function () {
		this.inherited(arguments);
		this.originalTop = djDomStyle.get(this.domNode, 'top');
	  this.resize();
		this.set('contact', '');
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
	_setEquipmentAttr: function(value) {
		this.addAttr('equipment');
    this._set('equipment', value);
	},
	_setReferenceAttr: function(value) {
		this.addAttr('reference');
    this._set('reference', value);
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
		var that = this;
		this.loadDbContact().then( function () { that.setTextDesc(); });
  },
	_setEnableAttr: function() {
		var that = this;
		this.hidden = false;
		window.requestAnimationFrame(
			function () { if(that.domNode) { djDomStyle.set(that.domNode, 'display', ''); }
		});
	},
	_setDisableAttr: function() {
		var that = this;
		this.hidden = true;
		window.requestAnimationFrame(
			function () { if(that.domNode) { djDomStyle.set(that.domNode, 'display', 'none'); }
		});
	},
	_getEnabledAttr: function() {
		return ! this.hidden;
	},

	animate: function (x) {
		var that = this;
		window.requestAnimationFrame(function() {
			if(x && x > that.get('offset')) {
				djDomStyle.set(that.domNode, 'width', Math.abs(x - that.get('clickPoint')));
				if(that.get('clickPoint') < x) {
					djDomStyle.set(that.domNode, 'left', that.get('clickPoint'));
				} else {
					djDomStyle.set(that.domNode, 'left', x);
				}
			}
			that.set('enable');
			djDomStyle.set(that.domNode, 'position', 'absolute');
		});
	},
	_setStartAttr: function(value) {
		this.addAttr('begin');
		if(value == this.get('stop')) { value -= this.get('blockSize'); }
		this._set('start', value);
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
		this._set('begin', value);
		this._set('start', this.xFromTime(value));	
	},
	_setStopAttr: function(value) {
		this.addAttr('end');
		if(value == this.get('start')) { value += this.get('blockSize'); }
		this._set('stop', value);
	},
	_setEndAttr: function(value) {
		this.addAttr('end');
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
		if(this.id) {
			djOn(this.sup, 'show-' + this.id, djLang.hitch(this, this.popMeUp));
		}
	},
	_setWithWorkerAttr: function(value) {
		this.addAttr('withWorker');
		this._set('withWorker', value);
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

	store: function () {
		var that = this;
		this.sup.store({o: this}).then(function() {
			that.set('contact', '');
			that.resize();
		})
	},

	loadDbContact: function () {
		var def = new djDeferred();
		var that = this;
		this.set('dbContact', null);
		
		request.get(locationConfig.store + '/ReservationContact/', { query: { "search.reservation": this.get("IDent"), "search.comment": '_client', "limit": 1}}).then( function (res) {
			if(res.whole().length>0) {
				if(res.first().target == null) {
					that._set('dbContact', res.first());
					def.resolve(res.first(), true);
				} else {
					request.get(locationConfig.store + '/' + res.first().target).then( function (result){
						if(result.whole().length>0) {
							that._set('dbContact', result.first());
							def.resolve(result.first(), true);
						}
					}); 
				}
			}
		});

		return def.promise;
	},

	setTextDesc: function () {
    var html = '';
		if(this.IDent == null) {
			html = '<div><span class="id">[Nouvelle réservation]</span>';	
		} else {
			html = '<div><span class="id">' + this.IDent + '</span>'; 	
		}

		if(this.get('dbContact')) {
			var dbContact = this.get('dbContact');
			if(dbContact.freeform) {
				html += ' - ' +  '<address>' + (dbContact.freeform + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1, $2') + '</address></div>';	
			} else {
				var x = ' - <address>';
				if(dbContact.o) {
					x += '<span class="o">' + dbContact.o + '</span>';
				}

				if(dbContact.givenname || dbContact.sn) {
					if(dbContact.o) { x += ', '; }
					var n = '';
					if(dbContact.givenname) {
						n += dbContact.givenname;
					}
					if(dbContact.sn) {
						if(dbContact.givenname) { n += ' '; }
						n += dbContact.sn;
					}
					x += '<span class="name">' + n + '</span>';
				}
				if(x != ' - <address>') {
					html += x + '</address></div>';
				}
			}
    } else {
			html += "</div>"	
		}

		html += "<div>"
		if(this.get('trueBegin') && this.get('trueEnd')) {
			if((Math.abs(this.get('trueBegin').getTime() - this.get('trueEnd').getTime()) <= 86400000) && (this.get('trueBegin').getDate() == this.get('trueEnd').getDate())) {
				html += '<span class="date">' + this.get('trueBegin').shortDate() + '</span>'; 
			} else {
				html += '<span class="date"><span>' + this.get('trueBegin').shortDate() + '</span>-'; 
				html += '<span>' + this.get('trueEnd').shortDate() + '</span></span>'; 
			}
		}
    
		if(this.locality || this.address) {
      var x = " <address>";
      if(this.address) {
        x += this.address;
      }
      if(this.locality) {
        if(this.address) { x += ", " }
        x += this.locality;
      }
			if(x != ", <address>") {
				html += x + "</address>";	
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
		if(this.get('id') == null) { return; }
		if(dtRegistry.byId('DIA_RES_' + this.get('id'))) {
			this.form = dtRegistry.byId('DIA_RES_' + this.get('id'));			
		}
		if( ! this.form) {
			this.form = new rForm({ reservation: this });
		}
		var f = this.form;
		f.set('begin', this.get('begin'));
		f.set('end', this.get('end'));
		f.set('deliveryBegin', this.get('deliveryBegin'));
		f.set('deliveryEnd', this.get('deliveryEnd'));
		f.set('status', this.get('status'));
		f.set('address', this.get('address'));
		f.set('locality', this.get('locality'));
		f.set('comment', this.get('comment'));
		f.set('equipment', this.get('equipment'));
		f.set('reference', this.get('reference'));
		f.show();	
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

			this.resize();
			return true;
		}

		return false;
	},
	computeIntervalOffset: function ( date ) {
		return this.sup.computeIntervalOffset(date);
	},

	drawComplement: function () {
		var that = this;
		var def = new djDeferred();


		Join({ url: locationConfig.store + '/Association', options: { query: { "search.reservation": this.get('id')}}}, { attribute: 'type' }, function ( data ) { if(data && data.data && data.data.length > 0) { return data.data; } else { return new Array(); } }).then( function ( entries ) {
			var frag = document.createDocumentFragment();
			var appendFrag = false;
			entries.forEach( function ( entry ) {

				var color = 'FFF';
				if(entry.type && entry.type.color) {
					color = entry.type.color;
				}
			
				var left = 0;
				var begin = new Date(entry.begin), end = new Date(entry.end), Rb = that.get('begin');
				if(djDate.compare(that.get('begin'), that.get('dateRange').begin, 'date') < 0) {
					Rb = djDate.add(that.get('dateRange').begin, 'day', 1);
				}
				var width = djDate.difference(begin, end, 'day') + 1; /* always full day */
				if(djDate.compare(end, Rb, 'date') < 0) {
					width = 0;
				}
				if(djDate.compare(begin, Rb, 'date') < 0) {
					width -= djDate.difference(Rb, begin, 'day');
				}

				left = djDate.difference(Rb, begin, 'day') - 1;
				if(left < 0) { left = 0; }

				if(width > 0) {
					left *= that.get('blockSize');
					width *= that.get('blockSize');

					width -= that.computeIntervalOffset(that.get('begin')); 

					var div = document.createElement('DIV');
					div.setAttribute('style', 'position: relative; background-color: #' + (color) + '; width: ' + width + 'px; left: ' + left + 'px; float: left; top: 0; height: 100%;');
					frag.appendChild(div);
					appendFrag = true;
				}
			});

			window.requestAnimationFrame(function () {
				for(var i = that.nStabilo.firstChild; i; i = that.nStabilo.firstChild) { that.nStabilo.removeChild(i); }
				if(appendFrag) {
					that.own(frag);
					that.nStabilo.appendChild(frag);
				}
				def.resolve();
			});
		})

		return def.Promise;
	},

  resize: function() {
		var that = this;
    var def = new djDeferred();
		var that = this;
	
			if(! intoYView(this.sup.domNode)) {
				def.resolve(); return; 
			} else {
				this.set('enable');
			}


			if( ! this.sup) { def.resolve(); return; }
			if(!this.get('begin') || !this.get('end')) { def.resolve(); return; }
	
			this.drawComplement();

			/* Verify  if we keep this ourself */
			if(djDate.compare(this.get('trueBegin'),this.get('dateRange').end, "date") >= 0 || 
					djDate.compare(this.get('trueEnd'), this.get('dateRange').begin, "date") < 0 ||
					this.deleted) { 
				this.set('disable');
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

			var t1, t2;
			t1 = new Date(end.getTime()); t2 = new Date(begin.getTime()); 
			t1.setHours(0,0); t2.setHours(0,0);
			var width = Math.abs(djDate.difference(t1, t2, 'day'));
			t1 = new Date(this.get('dateRange').begin.getTime()); t2 = new Date(begin.getTime()); 
			t1.setHours(0, 0); t2.setHours(0, 0);
			var bDay = djDate.difference(t1, t2, 'day');	
			
			if(bDay < 0) { bDay = 0; }
			var startPoint = this.get('offset') + (this.get('blockSize') * bDay);
			var stopPoint = (this.get('blockSize') * width);
		
			var d = this.computeIntervalOffset(begin);
			startPoint += d;
			stopPoint -= d;
			stopPoint += this.computeIntervalOffset(end);


			var toolsOffsetBegin = 0;
			if(djDate.difference(this.get('deliveryBegin'), this.get('begin'), 'hour') != 0) {
				toolsOffsetBegin = Math.abs(djDate.difference(this.get('deliveryBegin'), this.get('begin'), 'hour'));
			}
			if(djDate.compare(this.get('begin'), this.get('dateRange').begin)<=0) { toolsOffsetBegin = 0; }
			if(djDate.compare(this.get('deliveryBegin'), this.get('dateRange').begin) < 0) {
				toolsOffsetBegin -= Math.abs(djDate.difference(this.get('deliveryBegin'), this.get('dateRange').begin, 'hour'));
			}
			toolsOffsetBegin *= this.get('blockSize') / 24;

			var toolsOffsetEnd = 0;
			if(djDate.difference(this.get('deliveryEnd'), this.get('end'), 'hour') != 0) {
				toolsOffsetEnd = Math.abs(djDate.difference(this.get('deliveryEnd'), this.get('end'), 'hour'));
			}
			if(djDate.compare(this.get('end'), this.get('dateRange').end)>=0) { toolsOffsetEnd = 0; }
			if(djDate.compare(this.get('deliveryEnd'), this.get('dateRange').end) >  0) {
				toolsOffsetEnd -= Math.abs(djDate.difference(this.get('deliveryEnd'), this.get('dateRange').end, 'hour'));
			}
			toolsOffsetEnd *= this.get('blockSize') / 24;
			
			window.requestAnimationFrame(djLang.hitch(this, function() {
				/* might be destroyed async */
				if(! that || ! that.main) { def.resolve(); return ; }
				
				if(that.is('confirmed')) {
					djDomClass.add(that.main, 'confirmed');
				} else {
					djDomClass.remove(that.main, 'confirmed');
				}
				djDomStyle.set(that.main, 'width', stopPoint);
				djDomStyle.set(that.main, 'left', startPoint);
				djDomStyle.set(that.main, 'position', 'absolute');

				that.tools.setAttribute('style', 'background-color:' + bgcolor );

				for(var i = that.tools.firstChild; i; i = that.tools.firstChild) {
					that.tools.removeChild(i);
				}
				if(toolsOffsetBegin > 0) {
					var div = document.createElement('DIV');
					that.own(div);
					div.setAttribute('class', 'delivery');
					div.setAttribute('style', 'float: left; height: 100%; width: ' + toolsOffsetBegin + 'px');
					that.tools.appendChild(div);
				}

				if(toolsOffsetEnd > 0) {
					var div = document.createElement('DIV');
					that.own(div);
					div.setAttribute('class', 'delivery');
					div.setAttribute('style', 'float: right; height: 100%; width: ' + toolsOffsetEnd + 'px');
					that.tools.appendChild(div);
				}
			
				def.resolve();
			}));
		
    return def.promise;
  },
  _getEntriesAttr: function() {
    return this.sup.get('entries');
  }
});});
