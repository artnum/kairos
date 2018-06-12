/* eslint-env worker */
/* global wantdb, DB */
'use strict'
importScripts('../localdb.js')

wantdb(cleaner)

function cleaner () {
  var store = DB.transaction('reservations', 'readwrite').objectStore('reservations')
  var cleaned = []

  store.openCursor().onsuccess = function (event) {
    var cursor = event.target.result

    if (!cursor) {
      postMessage(cleaned)
      setTimeout(cleaner, 2500)
      return
    }

    if (cursor.value.deleted != null) {
      if (cleaned.indexOf(cursor.value.target) === -1) {
        cleaned.push(cursor.value.target)
      }
      cursor.delete()
    }
    cursor.continue()
  }
}
