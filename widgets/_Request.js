define([
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/request/xhr"
], function(
	djLang,
	djDeferred,
	djXhr,
){
return { 
		_options: function() {
			var options =  { handleAs: 'json', cacheTimeout: 60 };
			if(arguments[0]) {
				if(arguments[0].query) {
					options.query = arguments[0].query;	
				}
				if(arguments[0].headers) {
					options.headers = arguments[0].headers;	
				}
				if(arguments[0].data) {
					options.data = arguments[0].data;	
				}
				if(arguments[0].cacheTimeout) {
					options.data = arguments[0].cacheTimeout;	
				}
			}

			return options;
		},

		_getId: function(url, options) {
			var hash = new sjcl.hash.sha256();
			hash.update(url);
			if(options.method) {
				hash.update(options.method);	
			}
			if(options.query) {
				hash.update(JSON.stringify(options.query));
			}
			if(options.data) {
				hash.update(JSON.stringify(options.data));
			}

			return sjcl.codec.base64.fromBits(hash.finalize());
		},

		_getFromCache: function(url, options) {
			var id = this._getId(url, options);
			var r = window.sessionStorage.getItem(id);
			if(r) {
				r = JSON.parse(r);
				if(Date.now() - r.time < options.cacheTimeout) {
					window.sessionStorage.removeItem(id);
					r = null;
				} else {
					return r.data;	
				}
			}
	
			return null;	
		},

		_setInCache: function(url, options, data) {
			var id = this._getId(url, options);
			var cacheEntry = JSON.stringify({ data: data, time: Date.now() });
			
			window.sessionStorage.setItem(id, cacheEntry);
			return data;	
		},
		
		get: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'GET';

			var cached = this._getFromCache(url, options);
			if(cached) {
				def.resolve(cached);
			} else {
				var that = this;
				djXhr(url, options).then(function (r) {
					def.resolve(that._setInCache(url, options, r));
				});
			}
			return def;
		},

		post: function (url) {
			var options = this._options(arguments[1]);
			options.method = 'POST';
			return djXhr(url, options);			
		},

		put: function (url) {
			var options = this._options(arguments[1]);
			options.method = 'PUT';
			return djXhr(url, options);
		},

		del: function (url) {
			var options = this._options(arguments[1]);
			options.method = 'DELETE';
			return djXhr(url, options);	
		}
	};
});
