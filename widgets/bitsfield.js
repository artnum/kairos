define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
  "dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	"dojo/text!./templates/bitsfield.html",

	"dojo/on"
], function(
	djDeclare,
	djLang,
	djEvented,
  djDeferred,

	dtWidgetBase,
	dtTemplatedMixin,
	dtWidgetsInTemplateMixin,

	_template,

	djOn
) {

return djDeclare("artnum.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "bitsfield",
	bitClass: "fa bit ",
	templateString: _template,
	bitsCount: 0,

	constructor: function ( bitsCount ) {
		bitsCount = Math.abs(bitsCount);
		this.bitsCount = bitsCount;
	},

	_getValueAttr: function() {
		var txt = '';
		
		for(var i = this.nDotLine.firstChild; i; i = i.nextSibling) {
			if(i.getAttribute('data-artnum-set')) {
				txt += '1';	
			}	else {
				txt += '0';	
			}
		}	

		return txt;
	},

	_setValueAttr: function (value) {
		this._set('value', value);
		this._showValue();		
	},

	_showValue: function() {
		var number = 0;
		var value = this._get('value');
		if(! value ) { return; }
		for(var i = this.nDotLine.firstChild; i; i = i.nextSibling) {
			if(number < value.length) { 
				if(value.substr(number, 1) == '1') {
					this._setBit(number);	
				} else {
					this._unsetBit(number);
				}
			} else {
				this._unsetBit(number);
			}
			number++;
		}	
	},

	_unsetBit: function(number) {
		var that = this;
		window.requestAnimationFrame(function () {
			var n = that._getBitNode(number);
			if(n) {
				n.removeAttribute('data-artnum-set');	
				n.setAttribute('class', that.bitClass + ' fa-circle-o');
			}
		});	
	},

	_setBit: function(number) {
		var that = this;
		window.requestAnimationFrame(function () {
			var n = that._getBitNode(number);
			if(n) {
				n.setAttribute('data-artnum-set', 'true');	
				n.setAttribute('class', that.bitClass + ' fa-circle');
			}
		});	
	},

	_getBitNode: function (number) {
		for(var i = this.nDotLine.firstChild; i; i = i.nextSibling) {
			if(number == 0) {
				return i;	
			}	
			number--;
		}

		return null;
	},

	_toggleBit: function (number) {
		var n = this._getBitNode(number);
		if(n) {
			var state = n.getAttribute('data-artnum-set');
			if(state) {
				this._unsetBit(number);
			} else {
				this._setBit(number);
			}
		}
	},

	eDown: function (event) {
		var n = event.target;
		if(n) {
			var number = n.getAttribute('data-artnum-number');
			this._toggleBit(number);	
		}
	},

	eMove: function (event) {
		event.stopPropagation();
		if(event.buttons == 1) {
			var number = event.target.getAttribute('data-artnum-number');
			this._toggleBit(number);
		}
	},

	newSize: function(number) {
		var that = this;
		window.requestAnimationFrame(function () {
			var n = number;
			for(var i = that.nDotLine.firstChild; i; i = i.nextSibling) {
				if(number < 0) {
					var n = i;
					i = i.previousSibling;
					that.nDotLine.removeChild(n);
				}
				number--;	
			}	

			if(number > 0) {
				for(var i = 0; i <= number; i++) {
					that.nDotLine.appendChild(that._newBit(i + n));
				}	
			}

			n = 0;
			for(var i = that.nDotLine.firstChild; i; i = i.nextSibling) {
				i.setAttribute('data-artnum-number', n);
				n++;	
			}
		});
	},

	_newBit: function ( th ) {
		var b = document.createElement('I');
		b.setAttribute('class', this.bitClass + 'fa-circle-o');
		b.setAttribute('aria-hidden', 'true');
		b.setAttribute('data-artnum-number', th);
		djOn(b, "mousedown", djLang.hitch(this, this.eDown));
		djOn(b, "mouseover", djLang.hitch(this, this.eMove));
		return b;	
	},
	postCreate: function ( ) {
		var that = this;
		window.requestAnimationFrame(function () {
			var frag = document.createDocumentFragment();
			for(var i = 0; i < that.bitsCount; i++) {
				frag.appendChild(that._newBit(i));
			}
			that.nDotLine.appendChild(frag);
			that._showValue();
		});
		
	}

});});
