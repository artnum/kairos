var DB = null;


function wantdb( callback ) {
	var dbreq = indexedDB.open('location', 2);

	dbreq.onupgradeneeded = function (e) {
		var sReservations, sContacts;
		var tx = e.target.transaction;
		DB = dbreq.result;
		if(! DB.objectStoreNames.contains('reservations')) {
			sReservations = DB.createObjectStore('reservations', { keyPath: 'id' });
			sReservations.createIndex('by_target', 'target', {unique: false});
		} else {
			sReservations = tx.objectStore('reservations');	
		}
		
		if(! DB.objectStoreNames.contains('contacts')) {
			sContacts = DB.createObjectStore('contacts', { keyPath: 'path' });
			sContacts.createIndex('by_ident', 'IDent', {unique: true});
			sContacts.createIndex('by_company', 'o', {unique: false});
			sContacts.createIndex('by_name', 'sn', {unique: false});
			sContacts.createIndex('by_givename', 'givenname', {unique: false});
			sContacts.createIndex('by_locality', 'locality', {unique: false});
		} else {
			sContacts = tx.objectStore('conacts');
		}
	}

	dbreq.onsuccess = function () {
		DB = dbreq.result;
	
		if(callback) { callback(); }
	}
}
