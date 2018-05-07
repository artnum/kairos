var req = new XMLHttpRequest(), last = { 'modification': null, 'id': 0 };

handleResults = function (txt) {
	var byTarget = new Object();
	try {
		r = JSON.parse(txt);
	} catch(e) {
		return byTarget;
	}
	if(r && r.data && r.data.length > 0) {
		for(var i = 0; i < r.data.length; i++) {
			if(r.data[i].target) {
				var mod = new Date();
				mod.setTime(Date.parse(r.data[i].modification));
				if(mod) {
					if(last.modification == null) {
						last.modification = mod;
					} else {
						if(last.modification.getTime() < mod.getTime()) {
							last.modification = mod;
						}
					}
				}
				if(last.id == null) {
					last.id = Number(r.data[i].id);
				} else {
					if(last.id < Number(r.data[i].id)) {
						last.id = Number(r.data[i].id);
					}
				}
				if(! byTarget[r.data[i].target]) {
					byTarget[r.data[i].target] = new Array();
				}
				byTarget[r.data[i].target].push(r.data[i]);
			}
		}
	}
	return byTarget;
}

req.onload = function (e) {
	if(req.readyState === 4) {
		if(req.status === 200) {
			var byTarget = handleResults(req.responseText);
			postMessage({ type: 'all', content: byTarget });
		}
	}
};

checker = function () {
	var url = '/location/store/DeepReservation';
	var parameters = '';
	if(last.modification == null && last.id == 0) {
		setTimeout(checker, 2500);
		return;
	}

	var params = new Array();
	if(last.modification != null) {
		params.push('search.modification=' + encodeURIComponent('>' +last.modification.toISOString()));
	}
	if(last.id != 0) {
		params.push('search.id=' + encodeURIComponent('>' + String(last.id)));
		if(params.length > 1) {
			params.push('search._rules=' + encodeURIComponent('modification OR id'));
		}
	}

	if(params.length > 0) {
		params.push('long=1');
		parameters = params.join('&');
	}
	if(parameters != '') {
		url += '?' + parameters;
	}

	var cReq = new XMLHttpRequest();
	cReq.onload = function(e) {
		if(cReq.readyState === 4) {
			if(cReq.status === 200) {
				var byTarget = handleResults(cReq.responseText);
				postMessage({ type: 'entry', content: byTarget });
			}
			checker();
		}
	}
	cReq.open('get', url, true);
	setTimeout(() => { cReq.send(null); }, 2000);
}

checker();

onmessage = function ( msg ) {
	req.abort();
	var parameters = '';
	var url = msg.data[0];
	if(msg.data[1] && msg.data[1].query) {
		var array = new Array();
		for(var k in msg.data[1].query){
			array.push(encodeURIComponent(k) + '=' + encodeURIComponent(msg.data[1].query[k]));
		}
		parameters = array.join('&');
	}
	if(parameters != '') { url += '?' + parameters; }

	req.open('get', url, true);
	req.send();
};
