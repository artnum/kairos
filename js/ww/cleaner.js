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
    var value = cursor.value
    var del = false

    if (typeof value.id !== 'string') {
      cursor.delete()
      del = true
    }

    if (value.deleted != null) {
      if (cleaned.indexOf(value.target) === -1) {
        cleaned.push(value.target)
      }
      del = true
      cursor.delete()
    }

    if (del && value.return) {
      DB.transaction('return', 'readwrite').objectStore('return').delete(value.return.id)
    }

    cursor.continue()
  }
}
