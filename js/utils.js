function async(cb) {
	return new Promise( resolve => { resolve(cb()); } );
}
