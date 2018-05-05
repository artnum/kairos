var req = new XMLHttpRequest();

req.onload = function (e) {
	if(req.readyState === 4) {
		if(req.status === 200) {
			r = JSON.parse(req.responseText);
			var byTarget = new Object(); 
			if(r && r.data && r.data.length > 0) {
				for(var i = 0; i < r.data.length; i++) {
					if(r.data[i].target) {
						if(! byTarget[r.data[i].target]) {
							byTarget[r.data[i].target] = new Array();
						}
						byTarget[r.data[i].target].push(r.data[i]);
					}
				}
			}
			postMessage(byTarget);
		}
	}
};

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
