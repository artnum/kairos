/*
   Copyright 2017 Etienne Bagnoud <etienne@artisan-numerique.ch>. All rights 
	 reserved.  
	 
	 Redistribution and use in source and binary forms, with or without 
	 modification, are permitted provided that the following conditions are met: 
	 
       - Redistributions of source code must retain the above copyright notice,
			 this list of conditions and the following disclaimer.
		   - Redistributions in binary form must reproduce the above copyright
			 notice, this list of conditions and the following disclaimer in the
			 documentation and/or other materials provided with the distribution.

   THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND ANY
	 EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	 DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE FOR ANY
	 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF 
	 THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
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
