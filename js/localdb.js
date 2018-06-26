/* eslint-env browser, amd */
'use strict'

var IdxDB = function () {
  return new Promise(function (resolve, reject) {
    var dbreq = indexedDB.open('location', 3)

    dbreq.onupgradeneeded = function (e) {
      var sReservations
      var sContacts
      var sReturn
      var tx = e.target.transaction
      DB = dbreq.result
      if (!DB.objectStoreNames.contains('reservations')) {
        sReservations = DB.createObjectStore('reservations', { keyPath: 'id' })
        sReservations.createIndex('by_target', 'target', {unique: false})
      } else {
        sReservations = tx.objectStore('reservations')
      }

      if (!DB.objectStoreNames.contains('contacts')) {
        sContacts = DB.createObjectStore('contacts', { keyPath: 'path' })
        sContacts.createIndex('by_ident', 'IDent', {unique: true})
        sContacts.createIndex('by_company', 'o', {unique: false})
        sContacts.createIndex('by_name', 'sn', {unique: false})
        sContacts.createIndex('by_givename', 'givenname', {unique: false})
        sContacts.createIndex('by_locality', 'locality', {unique: false})
      } else {
        sContacts = tx.objectStore('contacts')
      }

      if (!DB.objectStoreNames.contains('return')) {
        sReturn = DB.createObjectStore('return', { keyPath: 'id' })
        sReturn.createIndex('by_hash', '_hash', { unique: false })
      } else {
        sReturn = tx.objectStore('return')
      }
    }

    dbreq.onsuccess = function () {
      this.DB = dbreq.result
      resolve(this.DB)
    }.bind(this)
  }.bind(this))
}

var DB = null
function wantdb (callback) {
  new IdxDB().then((db) => {
    DB = db
    if (callback) { callback() }
  })
}
