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
function DLList () {
	return {
		_current: null,
		_width: 0,

		_make_node: function ( element ) {
			return { data: element, next: null, previous: null }
		},

		_connect_after: function ( node, dest ) {
			node.previous = dest;
			if(dest) { node.next = dest.next };
			if(node.next) { node.next.previous = node; }
			if(dest) { dest.next = node };
		
			this._width++;	
			return node;
		},
		_connect_before: function ( node, dest ) {
			node.next = dest;
			if(dest) { node.previous = dest.previous; }
			if(node.previous) { node.previous.next = node; }
			if(dest) { dest.previous = node; }

			this._width++;
			return node;
		},

		width: function () {
			return this._width;
		},

		/*** relative to current */
		prepend: function ( element ) {
			this._current = this._connect_before( this._make_node(element), this._current);	
		},

		append: function ( element ) {
			this._current = this._connect_after( this._make_node(element), this._current);
		},

		/*** absolute */

		/* remove last */
		pop: function ( ) {
			let node = this._current;
			if(!node) { return null; }
			for( ; node.next; node = node.next);
			if(node.previous) { node.previous.next = null; }
			node.previous = null;

			this._width--;
			return node.data;
		},

		/* remove first */
		shift: function ( ) {
			let node = this._current;
			for( ; node && node.previous; node = node.previous);
			if(node.next) { node.next.previous = null; }
			node.next = null;

			this._width--;
			return node.data;
		},

		add: function ( element ) {
			if ( ! this._current )	{
				this._current = this._make_node(element);
			} else {
				let tnode = null;
				if( arguments.length > 1 && typeof arguments[1] === "function" ) {
					tnode = this.compare( element, arguments[1] );
				}
				
				if(! tnode) {
					tnode = this.rewind();
					this._current = this._connect_before( this._make_node(element), tnode);
				} else {
					this._current = this._connect_after( this._make_node(element), tnode );
				}
			}
		},

		/* Move to next element */
		next: function ( ) {
			if(this._current && this._current.next) {
				this._current = this._current.next;
				return this._current.data;	
			}	else {
				return null;	
			}
		},

		last: function ( ) {
			while(this.next());
		},

		first: function ( ) {
			while(this.previous());
		},

		previous: function ( ) {
			if(this._current && this._current.previous) {
				this._current = this._current.previous;	
				return this._current.data;
			} else {
				return null;
			}
		},

		current: function () {
			if(this._current) {
				return this._current.data;	
			}

			return null;
		},

		compare: function ( element, callback ) {
			let  node = null, previous = null;

			if(typeof callback === "function") {
				for(node = this.rewind(); node != null; node = node.next ) {
					if( callback(node.data, element) ) {
						previous = node;
					} else {
						break;
					}
				}
			}

			return previous;
		},

		at: function ( value, callback ) {
			for(let i = this.rewind(); i != null; i = i.next) {
				if(callback(value, i.data)) {
					this._current = i;
					return this._current;
				}	
			}
				
		},

		/* Return first node as syntactic sugar */
		rewind : function () {
			for ( ; this._current && this._current.previous; this._current = this._current.previous);
			return this._current;
		},

		forEach: function ( callback ) {
			this.first();
			do {
				callback(this._current.data);	
			} while(this.next());
			
		}

	}	
}
