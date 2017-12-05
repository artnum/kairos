define([
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/request/xhr",
	"artnum/_Result"
], function(
	djLang,
	djDeferred,
	djXhr,
	result
){
return { 
		_options: function() {
			var options =  { handleAs: 'json', cacheTimeout: 240 };
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
				r = JSON.parse(LZString.decompress(r));
				if(r) {
					if(Date.now() - r.time > options.cacheTimeout * 1000) {
						window.sessionStorage.removeItem(id);
						r = null;
					} else {
						return new result(r.data);	
					}
				}
			}
	
			return null;	
		},

		_setInCache: function(url, options, data) {
			var id = this._getId(url, options);
			var cacheEntry = JSON.stringify({ data: data, time: Date.now() });
			
			window.sessionStorage.setItem(id, LZString.compress(cacheEntry));
			return new result(data);	
		},

		_skipCache: function(args) {
			if(args) {
				if(args.skipCache) {
					return true;	
				}
			}
			return false;
		},

		get: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'GET';

			var cached = null;
			if(! this._skipCache(arguments[1])) {
				cached = this._getFromCache(url, options);
			}
			if(cached != null) {
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
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'POST';
			djXhr(url, options).then( function (r) {
				def.resolve(new result(r));
			});
			return def;			
		},

		put: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'PUT';
			djXhr(url, options).then( function (r) {
				def.resolve(new result(r));	
			});
			return def;
		},

		del: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'DELETE';
			djXhr(url, options).then( function (r) {
				def.resolve(new result(r));
			});
			return def;
		}
	};
});
