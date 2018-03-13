/* Timeline app -> popup code */
define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Evented",
	"dojo/Deferred",

	"dojo/dom-construct",
	"dojo/on",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-form",
	"dojo/throttle",
	"dojo/request/xhr",
	"dojo/window",
	"dijit/registry",
	"dijit/Dialog",

	"artnum/Request"

], function(
	djDeclare,
	djLang,
	djEvented,
	djDeferred,

	djDomConstruct,
	djOn,
	djDomAttr,
	djDomClass,
	djDomStyle,
	djDomGeo,
	djDomForm,
	djThrottle,
	djXhr,
	djWindow,
	dtRegistry,

	dtDialog,

	Req
) {
	
return djDeclare("location.timeline.popup", [ djEvented ], {

	searchLoc: function () {
		var dialog = new dtDialog({
			title: "Recherche location",
			content: "<form><label>Numéro :</label> <input type=\"text\" name=\"locationNumber\"></input><br /><button type=\"submit\">Chercher</button></form>"
		});

		var form = dialog.domNode.getElementsByTagName('form')[0];
		djOn(form, 'submit', (event) => {
			event.preventDefault();
			
			var o = djDomForm.toObject(form);	
			this.doSearchLocation(o.locationNumber);
			dialog.destroy();
		});

		dialog.show();
	}

})});

