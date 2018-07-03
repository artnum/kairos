/* eslint-env worker */
/* global IdxDB */
'use strict'
importScripts('../localdb.js')

new IdxDB().then(function (db) {
  function cleaner (db) {
    var st = db.transaction('reservations').objectStore('reservations')
    st.getAllKeys().onsuccess = function (event) {
      var keys = event.target.result

      if (keys.length === 0) { return }

      do {
        var subkeys = keys.splice(0, 200)
        var strkeys = subkeys.join('|')

        fetch('/location/store/Reservation/|' + strkeys).then(function (response) {
          response.json().then(function (data) {
            var entries = data.data
            var found = []
            st = db.transaction('reservations', 'readwrite').objectStore('reservations')
            for (var i = 0; i < entries.length; i++) {
              if (entries[i].deleted != null && entries[i].deleted !== '') {
                st.delete(entries[i].id)
              } else {
                found.push(entries[i].id)
              }
            }

            for (i = 0; i < subkeys.length; i++) {
              if (found.indexOf(subkeys[i]) === -1) {
                st.delete(subkeys[i])
              }
            }
          })
        })
      } while (keys.length > 0)

      setTimeout(function () { cleaner(db) }, 15000)
    }
  }

  cleaner(db)
})
