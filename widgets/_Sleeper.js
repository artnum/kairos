define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
	"dojo/Deferred",

	"dijit/_WidgetBase",

	"dojo/dom-construct",
	"dojo/on",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-style"

], function(
	djDeclare,
	djLang,
	djEvented,
	djDeferred,
	dtWidgetBase,
	
	djDomConstruct,
	djOn,
	djDomAttr,
	djDomClass,
	djDomStyle
) {
	
return {
	lastEvent: null,
	sleepTime: 120000,
	caughtCall: null,
	reloadTimeout: null,

	init: function() {
		if(!window.Sleeper) {
			window.Sleeper = this;
			this.caughtCall = new Array();
			if(arguments[0]) {
				this.sleepTime = time * 1000;
			}
			this.run();
		}
	},

	run: function() {
		var that = window.Sleeper;

		if(that.lastEvent == null) {
			that.lastEvent = Date.now();
		}

		window.setTimeout( function() {
			if(Date.now() - that.lastEvent > that.sleepTime) {
				that.sleep();
			}
			window.setTimeout(that.run, 1000);
		}, 1000);
	},

	isSleeping: function() {
		return document.getElementById('sleeping') ? true : false;
	},

	awake: function (func) {
		var that = window.Sleeper;

		if(that.isSleeping()) {
			that.caughtCall.push(func);
			return false;
		}

		return true;
	},

	wake: function() {
		var that = window.Sleeper;
		if(that.reloadTimeout) {
			window.clearTimeout(that.reloadTimeout);
			that.reloadTimeout = null;
		}
		if( that.isSleeping()) {
			var funcs = that.caughtCall;
			that.caughtCall = new Array();
			that.lastEvent = Date.now();
			window.requestAnimationFrame(function () {
				var body = document.getElementsByTagName('BODY')[0];
				var div = document.getElementById('sleeping');
				djDomStyle.set(body, 'overflow', '');
				if(div) {
					body.removeChild(div);
				}

				funcs.forEach( function ( func ) {
					if(func) { func(); }
				});
			});
		}
	},

	/* If nothing is happening */
	sleep: function() {
		var that = window.Sleeper;
		
		if( ! that.isSleeping()) {
			that.reloadTimeout = window.setTimeout( function () { window.location.reload(true); }, that.sleepTime);
			window.requestAnimationFrame(function () {
				var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
				var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			
				var div = document.createElement('DIV');
				div.setAttribute('style', 'text-align: center; background-color: rgba(255,255,255,0.5); z-index: 2000; position: fixed; left: 0; top: 0; width: ' + w + 'px; height: ' + h + 'px');	
				div.setAttribute('id', 'sleeping');
				var body = document.getElementsByTagName('BODY')[0];
				var icon = document.createElement('I');
				icon.setAttribute('class', 'fa fa-pause-circle-o');
				
				h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
				icon.setAttribute('style', 'font-size: 100vh; color: rgba(0,0,0,0.5);');
				div.appendChild(icon); 
				djDomStyle.set(body, 'overflow', 'hidden');
				body.appendChild(div);


				djOn(div, "mouseup, mousemove", window.Sleeper.wake);
			});
		}
	},
	
	on: function (object, events, func) {
		var that = window.Sleeper;
		djOn(object, events, function(e) { 
			if(! that.isSleeping()) {
				that.lastEvent = Date.now();
				func(e);
			}
		});
	},
}});
