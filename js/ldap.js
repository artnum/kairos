function flatten(value) {
	if(is_array(value)) {
		var txt = '';
		value.forEach(function(v) {
			if(txt != '') { txt += ' '; }
			txt += v;
		});
		value = txt;
	}

	return value;
}

function is_array(value) {
	if(Array.isArray) {
		return Array.isArray(value);	
	} else {
		if(value instanceof Array) {
			return true;	
		}	
	}

	return false;
}
