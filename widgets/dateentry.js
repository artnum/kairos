define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
  "dojo/Deferred",

	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/form/ValidationTextBox",

	"dojo/text!./templates/dateentry.html",

	"dojo/on"
], function(
	djDeclare,
	djLang,
	djEvented,
  djDeferred,

	dtWidgetBase,
	dtTemplatedMixin,
	dtWidgetsInTemplateMixin,
	dtValidationTextBox,

	_template,

	djOn
) {

return djDeclare("artnum.rForm", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
	baseClass: "dateentry",
	templateString: _template,
	dateRegex: new RegExp(/\s*([0-9]{1,2}){1}[\.-\/]{1}([0-9]{1,2}){1}(?:[\.-\/]{1}(?=([0-9]{2,4}))){0,1}\s*/),
	timeRegex: new RegExp(/\s*([0-9]{1,2}){1}[\:hH]{1}([0-9]{1,2}){1}(?:[\:mM]{1}(?=([0-9]{1,2}))){0,1}\s*/),

	postCreate: function() {
		djOn(this.nEntry, 'keypress', djLang.hitch(this, this.eKeyPress));
		djOn(this.nEntry, 'focusout', djLang.hitch(this, this.validate));
	},

	eKeyPress: function(event) {
		if(event.key == "Enter") {
			this.validate();	
		}
	},

	validate: function() {
		var that = this;
		var value = this.nEntry.get('value');

		e = value.split(/[\s,-]/);
		
		var currentDate = null;
		var times = new Array();

		var i = 0;
		e.forEach( function ( v ) {
			if(that.dateRegex.test(v)) {
				var currentYear = new Date(Date.now()).getFullYear();
				var date = that.dateRegex.exec(v);
				var o = new Date(currentYear, Number(date[2]) - 1, date[1], 12, 0, 0);
				if(date[3]) {
					var year = date[3];
					if(date[3].length == 2) {
						if(currentYear - 2000 < Number(date[3])) {
							year = 1900 + Number(date[3]);
						} else {
							year = 2000 + Number(date[3]);
						}
					}
					o.setFullYear(year);
				

				}
				currentDate = o;
			}	else if(that.timeRegex.test(v)) {
				var o = new Date(Date.now());
				if(currentDate != null) {
					o.setTime(currentDate.getTime());		
				}
				var time = that.timeRegex.exec(v);
				o.setHours(time[1]); o.setMinutes(time[2]);
				if(time[3]) {
					o.setSeconds(time[3]);
				}

				times.push(o);
			} 

			i++;
		});

		this.set('value', times);
	},

	_setErrorAttr: function (error) {
		error = error ? true : false;
		
		this._set('error', error);	
		if(error) {	
			var d = document.createElement('i');
			d.setAttribute('class', 'fa fa-exclamation error symbol');

			while(this.nParsed.firstChild) {
				this.nParsed.removeChild(this.nParsed.firstChild);
			}
			this.nParsed.appendChild(d);
		}
	},

	_setValueAttr: function (times) {
		this.set('error', false);
		var doc = document.createDocumentFragment();
		if((times.length > 0) && (times.length % 2 == 0)) {
			this._set('value', times);
			for(var i = 0; i < times.length; i+=2) {
				var txt = 'du ' + times[i].toLocaleDateString();			
				txt += ' à ' + times[i].toLocaleTimeString();
				txt += ' au ' + times[i+1].toLocaleDateString();
				txt += ' à ' + times[i+1].toLocaleTimeString();
				txt = document.createTextNode(txt);
				var d = document.createElement('DIV');
				d.appendChild(txt);
				doc.appendChild(d);
			}	

			while(this.nParsed.firstChild) {
				this.nParsed.removeChild(this.nParsed.firstChild);
			}
			this.nParsed.appendChild(doc);
			return true;
		} else {
			this._set('value', []);
			this.set('error', true);
			return false;
		}	
	}

});});
