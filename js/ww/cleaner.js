/* eslint-env worker */
/* global IdxDB */
'use strict'
importScripts('../localdb.js')

new IdxDB().then(function (DB) {
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

      if (!del) {
        fetch('/location/store/Reservation/' + value.id, {method: 'head'}).then(function (response) {
          var deleted = response.headers.get('X-Artnum-deleted')
          if (Number(deleted)) {
            DB.transaction('reservations', 'readwrite').objectStore('reservations').delete(value.id)
          }
        }, function (error) {
          console.error('Error fetch reservation', error)
        })
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

  cleaner()
})
