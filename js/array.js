ExtArray = function () {
	this._current = -1;	
}

ExtArray.prototype = new Array();

ExtArray.prototype.width = function () {
	return this.length;	
}

ExtArray.prototype.first = function () {
	this._current = 0;
	return this[0];	
}

ExtArray.prototype.last = function() {
	this._current = this.length - 1;
	return this[this.length - 1];	
}

ExtArray.prototype.current = function() {
	return this._current;	
}

ExtArray.prototype.prepend = function (value) {
	if(this._current < 0) {
		return this.unshift(value);	
	} else {
		return this.splice(this._current, 0, value);
	}
}

ExtArray.prototype.append = function (value) {
	if(this._current < 0) {
		return this.push(value);	
	}	 else {
		this._current++;
		return this.splice(this._current, 0, value);	
	}
}

ExtArray.prototype.add = function(value) {
	if(this.length == 0) { this.push(value); return value; }
	let tnode = -1;

	if(arguments.length > 1 && typeof arguments[1] === "function") {
		tnode = this.findIndex(arguments[1]);
	}

	if(tnode == -1) {
		this.unshift(value);	
	} else {
		this.splice(tnode+1, 0, value);
	}
}
