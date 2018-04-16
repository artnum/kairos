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

	"dijit/Tooltip",
	"dijit/registry",
	"dijit/layout/ContentPane",

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

	dtTooltip,
	dtRegistry,
	dtContentPane,

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
	complements: [],


	constructor: function () {
		this.attrs = new Array('special');
		this.detailsHtml = '';
		this.special = 0;	
		this.hidden = true;
		this.form = null;
		this.dbContact = null;
		this.complements = new Array();
	},

	fromJson: function (json) {
		var that = this;
		djLang.mixin(this, json);
		[ 'begin', 'end', 'deliveryBegin', 'deliveryEnd' ].forEach ( function (attr) {
			if(that[attr]) {
				that[attr] = djDateStamp.fromISOString(that[attr]);
			}
		});

		if(that.contacts && that.contacts['_client']) {
			if(that.contacts['_client'][0].target) {
				that.dbContact = that.contacts['_client'][0].target;
				that.setTextDesc();
			} else {
				that.dbContact = { freeform: that.contacts['_client'][0].freeform };
				that.setTextDesc();
			}
		} else {
			that.dbContact = {} ;
			that.setTextDesc();
		}
		if(! that.color ) { that.color =  "FFF"; }
		if(! that.complements) { that.complements = new Array(); }
		if(! that.IDent) { that.IDent = that.id; }
	},

	refresh: function () {
		var that = this;
		var def = new djDeferred();

		Req.get(locationConfig.store + '/DeepReservation/' + this.id).then( (entry) => {
			if(entry.data) {
				that.fromJson(entry.data);
				def.resolve();
			}
		});

		return def.promise;
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
		this.originalTop = djDomStyle.get(this.domNode, 'top');
		this.set('active', false);
	  this.resize();
		djOn(this.domNode, "dblclick", djLang.hitch(this, (e) => { e.stopPropagation(); this.popMeUp(); }));
		djOn(this.domNode, "mousedown", djLang.hitch(this, (e) => { this.sizeMeUp(); }));
		djOn(this.domNode, "mouseup", djLang.hitch(this, (e) => { this.sizeMeDown(); }));
  },

	sizeMeUp: function (e) {
	},

	sizeMeDown: function (e) {
	},

	addAttr: function ( attr ) {
		if(this.attrs.indexOf(attr) == -1) {
			this.attrs.push(attr);	
		}
	},
	_setFolderAttr: function(value) {
		this.addAttr('folder');
		this._set('folder', value);
	},
	_setTitleAttr: function(value) {
		this.addAttr('title');
		this._set('title', value);
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
	_setGpsAttr: function (value) {
		this.addAttr('gps');
		this._set('gps', value);
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
	_setEnableAttr: function() {
		this.set('active', true);
	},
	_setDisableAttr: function() {
		this.set('active', false);
	},

	_setActiveAttr: function (value) {
		this._set('hidden', value ? true : false);
		this._set('active', value ? true : false);
		if(value) {
			djDomStyle.set(this.domNode, 'display', '');
		} else {
			djDomStyle.set(this.domNode, 'display', 'none');
		}
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
		/*if(this.id) {
			djOn(this.sup, 'show-' + this.id, djLang.hitch(this, this.popMeUp));
		}*/
	},
	_setWithWorkerAttr: function(value) {
		this.addAttr('withWorker');
		this._set('withWorker', value);
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
	_getCompactAttr: function() {
		return this.sup.get('compact');
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
		return this.save();
	},

	confirmedDom: function() {
		var i = document.createElement('I');
		if(this.is('confirmed')) {
			i.setAttribute('class', 'far fa-check-circle');
		} else {
			i.setAttribute('class', 'far fa-circle');
		}

		djOn(i, 'click', djLang.hitch(this, this.doConfirm));

		return i;
	},

	doConfirm: function () {
		if(this.is('confirmed')) {
			this.setIs('confirmed', false);
		} else {
			this.setIs('confirmed', true);
		}
		this.save();
	},

	contactDom: function () {
		var contact = this.get('dbContact');
		var content = document.createDocumentFragment();
		if(contact) {
			if(contact.freeform) {
				content.appendChild(document.createTextNode(String(contact.freeform).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1, $2')));
			} else {
				if(contact.o) {
					content.appendChild(document.createElement('SPAN')); content.lastChild.setAttribute('class', 'o names');
					content.lastChild.appendChild(document.createTextNode(contact.o));
				}

				if(contact.givenname) {
					content.appendChild(document.createElement('SPAN')); content.lastChild.setAttribute('class', 'givenname names');
					content.lastChild.appendChild(document.createTextNode(contact.givenname));
				}

				if(contact.sn) {
					content.appendChild(document.createElement('SPAN')); content.lastChild.setAttribute('class', 'sn names');
					content.lastChild.appendChild(document.createTextNode(contact.sn));
				}
			}
		}

		return content;
	},

	setTextDesc: function () {
		var html = '';
		var frag = document.createDocumentFragment();

		frag.appendChild(document.createElement('DIV'));
		if(! this.get('compact')) {
			frag.lastChild.appendChild(this.confirmedDom())
		}
			
		var ident = document.createElement('SPAN');
		ident.setAttribute('class', 'id');
		if(this.get('IDent')) {
			ident.appendChild(document.createElement('A'));
			ident.firstChild.setAttribute('href', '#' + this.get('IDent'));
			ident.firstChild.appendChild(document.createTextNode(this.get('IDent')));
		} else {
			ident.appendChild(document.createTextNode('[Nouvelle réservation]'));
		}
		frag.lastChild.appendChild(ident);

		frag.lastChild.appendChild(document.createElement('address'));
		frag.lastChild.lastChild.appendChild(this.contactDom());

		/* Second line */
		frag.appendChild(document.createElement('DIV'));

		if((Math.abs(this.get('trueBegin').getTime() - this.get('trueEnd').getTime()) <= 86400000) && (this.get('trueBegin').getDate() == this.get('trueEnd').getDate())) {
			frag.lastChild.appendChild(document.createElement('SPAN'));
			frag.lastChild.lastChild.setAttribute('class', 'date single begin');
			frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueBegin').shortDate()));
		} else {
			frag.lastChild.appendChild(document.createElement('SPAN'));
			frag.lastChild.lastChild.setAttribute('class', 'date begin');
			frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueBegin').shortDate()));
			frag.lastChild.appendChild(document.createElement('SPAN'));
			frag.lastChild.lastChild.setAttribute('class', 'date end');
			frag.lastChild.lastChild.appendChild(document.createTextNode(this.get('trueEnd').shortDate()));
		}

		if(this.locality || this.address) {
			var locality = frag.lastChild.appendChild(document.createElement('address'));
			locality.setAttribute('class', 'location');
			locality = frag.lastChild.lastChild;
			if(this.gps) {
				frag.lastChild.lastChild.appendChild(document.createElement('A'));
				frag.lastChild.lastChild.lastChild.setAttribute('href', 'https://www.google.com/maps/place/' + String(this.gps).replace(/\s/g, ''));
				frag.lastChild.lastChild.lastChild.setAttribute('target', '_blank');
				locality = frag.lastChild.lastChild.lastChild;
			}

			if(this.address) {
				locality.appendChild(document.createElement('SPAN'));
				locality.lastChild.setAttribute('class', 'address');
				locality.lastChild.appendChild(document.createTextNode(this.address));
			}

			if(this.locality) {
				locality.appendChild(document.createElement('SPAN'));
				locality.lastChild.setAttribute('class', 'locality');
				locality.lastChild.appendChild(document.createTextNode(this.locality));
			}
		}

		if(this.comment) {
			frag.appendChild(document.createElement('DIV'));
			frag.lastChild.setAttribute('class', 'comment');
			frag.lastChild.appendChild(document.createTextNode(this.comment));
		}

		var div = this.txtDesc;
		window.requestAnimationFrame(() => {
			if(div.firstChild) {
				div.removeChild(div.firstChild);
			}
			div.appendChild(document.createElement('DIV'));
			div.firstChild.appendChild(frag);
		});
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
		var tContainer = dtRegistry.byId('tContainer');
		if(this.get('id') == null) { return; }
		if(dtRegistry.byId('ReservationTab_' + this.get('id'))) {
			tContainer.selectChild('ReservationTab_' + this.get('id'));	
			return;
		}
		var f = new rForm({ reservation: this });	
		this.highlight();
		
		var cp = new dtContentPane({
			title: 'Réservation ' + this.get('id'),
			closable: true,
			id: 'ReservationTab_' + this.get('id'),
			content: f.domNode});
		cp.own(f);
		tContainer.addChild(cp);
		tContainer.resize();
		tContainer.selectChild(cp.id);

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
		f.set('_pane', [ cp, tContainer]);
		//f.show();	
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
		var totalWidth = 0;
		var drawn = new Array();

		var frag = document.createDocumentFragment();
		var appendFrag = false;
		var x = this.complements;
		var byType = new Object();

		for(var i = 0; i < x.length; i++) {
			x[i].range = new DateRange(x[i].begin, x[i].end);
			if(!byType[x[i].type.color]) {
				byType[x[i].type.color] = new Array();
			} 
			byType[x[i].type.color].push(x[i]);
			
			var overlap = true;
			while(overlap) {
				overlap = false;
				var z = byType[x[i].type.color].pop();
				for(var j = 0; j < byType[x[i].type.color].length; j++) {
					var o = byType[x[i].type.color][j].range.merge(z.range);
					if(o != null) {
						byType[x[i].type.color][j].range = o;
						overlap = true;
						break;
					}
				}
				if(!overlap) {
					byType[x[i].type.color].push(z);
				}
			} 
		}

		var cent = 100 - djDomStyle.get(that.tools, 'height') * 100 / djDomStyle.get(that.main, 'height');		
		var height = Math.round(cent / Object.keys(byType).length);
		var maxWidth = djDomStyle.get(that.nStabilo, 'width');
		var lineCount = 0;
		var previous = 0;

		for(var i in byType) {
			totalWidth = 0;
			var overflow = false;
			byType[i].forEach( function ( entry ) {
				if(!overflow) {
					var begin = entry.range.begin, end = entry.range.end, Rb = that.get('trueBegin');
					var color = 'FFF';
					if(entry.type && entry.type.color) {
						color = entry.type.color;
					}
				
					var left = 0;
					if(djDate.compare(that.get('trueBegin'), that.get('dateRange').begin, 'date') < 0) {
						Rb = that.get('dateRange').begin;
					}

					var width = djDate.difference(begin, end, 'day') + 1; /* always full day */
					if(djDate.compare(begin, Rb, 'date') < 0) {
						width -= djDate.difference(Rb, begin, 'day');
					}
					
					left = djDate.difference(Rb, begin, 'day');
					if(left < 0) { left = 0; }
					
					if(djDate.compare(end, Rb, 'date') < 0 || djDate.compare(end, that.get('dateRange').begin, 'date') < 0) {
						width = 0;
					}

					if(width > 0) {
						left *= that.get('blockSize');
						width *= that.get('blockSize');

						if(totalWidth + width >= maxWidth) {
							width = maxWidth - totalWidth;
							overflow = true;
						}

						/* Use of CSS relative position => the next element left position is pushed by previous element width */
						left -= totalWidth;
						totalWidth += width;

						var div = document.createElement('DIV');
						div.setAttribute('style', 'position: relative; background-color: #' + (color) + '; width: ' + width + 'px; left: ' + left + 'px; float: left; top: 0; height: ' + height + '%; clear: right;');
						div.setAttribute('class', 'stabiloLine');
						frag.appendChild(div);
						appendFrag = true;
					}
				}
			});
		}

		window.requestAnimationFrame(() => {
			if(!that.nStabilo) { def.resolve(); return; }
			for(var i = that.nStabilo.firstChild; i; i = that.nStabilo.firstChild) { that.nStabilo.removeChild(i); }
			if(appendFrag) {
				that.nStabilo.appendChild(frag);
			}
			def.resolve();
		});

		return def.promise;
	},

  resize: function() {
		var that = this;
    var def = new djDeferred();

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
		var bgcolor = '#FFFFFF';
		if(this.color) {
			bgcolor = '#' + this.color;
		}

		var range = this.get('dateRange');	
		var begin = this.get('trueBegin');
		if(djDate.compare(range.begin, begin, 'date')>0) {
			begin = range.begin;
		}
		var end = this.get('trueEnd');
		if(djDate.compare(range.end, end, 'date')<=0) {
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

			var supRect = getElementRect(that.sup.domNode);
			var supTopBorder = djDomStyle.get(that.sup.domNode, 'border-top-width'),  supBottomBorder = djDomStyle.get(that.sup.domNode, 'border-bottom-width');
			var myTopBorder = djDomStyle.get(that.main, 'border-top-width'), myBottomBorder = djDomStyle.get(that.main, 'border-bottom-width');

			djDomStyle.set(that.main, 'width', stopPoint);
			djDomStyle.set(that.main, 'left', startPoint);
			djDomStyle.set(that.main, 'top', supRect[1] + supTopBorder);
			djDomStyle.set(that.main, 'height', that.sup.originalHeight - (supBottomBorder + supTopBorder + myTopBorder + myBottomBorder));
			djDomStyle.set(that.main, 'position', 'absolute');

			that.tools.setAttribute('style', 'background-color:' + bgcolor );

			for(var i = that.tools.firstChild; i; i = that.tools.firstChild) {
				that.tools.removeChild(i);
			}
			if(toolsOffsetBegin > 0) {
				var div = document.createElement('DIV');
				div.setAttribute('class', 'delivery');
				div.setAttribute('style', 'float: left; height: 100%; width: ' + toolsOffsetBegin + 'px');
				that.tools.appendChild(div);
			}

			if(toolsOffsetEnd > 0) {
				var div = document.createElement('DIV');
				div.setAttribute('class', 'delivery');
				div.setAttribute('style', 'float: right; height: 100%; width: ' + toolsOffsetEnd + 'px');
				that.tools.appendChild(div);
			}

			that.setTextDesc();
			that.set('enable');	
			def.resolve();
		}));
		
    return def.promise;
  },
	highlight: function () {
		this.sup.highlight(this.domNode);
	},
  _getEntriesAttr: function() {
    return this.sup.get('entries');
  },
	destroyReservation: function(reservation) {
		this.sup.destroyReservation(reservation);
	},

	save: function () {
		var method = 'post', query = {}, suffix = '', that = this, def = new djDeferred();

		if(this.get('IDent') != null) {
			method = 'put';
			suffix = '/' + this.get('IDent');
			query['id'] = this.get('IDent');
		}

		this.attrs.forEach( (attr) => {
			query[attr] = that[attr];
		});

		[ 'begin', 'end', 'deliveryBegin', 'deliveryEnd'].forEach( (attr) => {
			if(that[attr]) {
				query[attr] = djDateStamp.toISOString(that[attr]);
			}
		});
		query['target'] = this.get('target');

		Req[method](locationConfig.store + "/Reservation" + suffix, { query: query }).then( (result) => {
			Req.get(locationConfig.store + "/DeepReservation/" + result.data.id).then( (result) => {
				if(result && result.data) {
					that.fromJson(result.data);
					that.resize();
				}
				def.resolve(result);
			});
		});
		
		return def.promise;
	}
});});
