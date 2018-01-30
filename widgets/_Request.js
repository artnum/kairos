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
			if(! this._skipCache) {
				var id = this._getId(url, options);
				var cacheEntry = JSON.stringify({ data: data, time: Date.now() });
				
				window.sessionStorage.setItem(id, LZString.compress(cacheEntry));
			}
			return new result(data);	
		},

		_skipCache: function(args) {
			if(args) {
				if(args.skipCache) {
					return true;	
				}
			}

			if(locationConfig && locationConfig.skipCache) {
				return true;
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

			return def.promise;
		},

		post: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'POST';
			djXhr(url, options).then( function (r) {
				def.resolve(new result(r));
			});
			return def.promise;			
		},

		put: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'PUT';
			djXhr(url, options).then( function (r) {
				def.resolve(new result(r));	
			});
			return def.promise;
		},

		del: function (url) {
			var def = new djDeferred();
			var options = this._options(arguments[1]);
			options.method = 'DELETE';
			djXhr(url, options).then( function (r) {
				def.resolve(new result(r));
			});
			return def.promise;
		},

		head: function(url) {
			var xhr = new XMLHttpRequest();
			var def = new djDeferred();

			window.setTimeout( function () {
				xhr.onreadystatechange = function (event) {
					if(this.readyState === XMLHttpRequest.DONE) {
						if(this.status === 200) {
							var r = /X-Artnum-([^\:]+)\:([^\r\n]*)/;
							var headers = this.getAllResponseHeaders();
							var result = new Object();
							headers.split(/[\r\n]/).forEach( function (header) {
								if(r.test(header)) {
									var s = r.exec(header);
									result[s[1]] = s[2];
								}
							});
							def.resolve(result);	
						}
					}
				}

				xhr.open('HEAD', url, true);
				xhr.send();
			}, 0);

			return def.promise;
		}
	};
});
