/* eslint-env worker */
/* global IdxDB, objectHash */
'use strict'
importScripts('../localdb.js')
importScripts('../object-hash/dist/object_hash.js')

var fetchInit = {credentials: 'same-origin'}
var Entries = {}
var today = new Date().toISOString().split('T')[0]

function rebuild (db) {
  var x = new Promise(function (resolve, reject) {
    var st = db.transaction('reservations', 'readwrite').objectStore('reservations')
    st.openCursor().onsuccess = function (event) {
      if (event.target.result) {
        event.target.result.delete()
        event.target.result.continue()
      } else {
        resolve()
      }
    }
  })
  var y = new Promise(function (resolve, reject) {
    var st = db.transaction('return', 'readwrite').objectStore('return')
    st.openCursor().onsuccess = function (event) {
      if (event.target.result) {
        event.target.result.delete()
        event.target.result.continue()
      } else {
        resolve()
      }
    }
  })

  return new Promise(function (resolve, reject) {
    x.then(function () {
      y.then(function () { resolve() })
    })
  })
}

new IdxDB().then(function (db) {
  postMessage({op: 'loaded'})
  self.onmessage = function (msg) {
    if (!msg.data || !msg.data.op) {
      return
    }
    switch (msg.data.op.toLowerCase()) {
      case 'rebuild':
        rebuild(db).then(function () {
          console.log('end rebuild')
          postMessage({op: 'rebuild'})
        })
        break
    }
  }

  function deleteold (db) {
    return new Promise(function (resolve, reject) {
      var keys = []
      var now = new Date()
      var st = db.transaction('reservations', 'readwrite').objectStore('reservations')
      st.openCursor().onsuccess = function (event) {
        var cursor = event.target.result

        if (!cursor) {
          resolve(keys)
          return
        }

        if (cursor.value._lastfetch) {
          if (now.getTime() - 172800000 > new Date(cursor.value._lastfetch).getTime()) {
            cursor.delete()
          } else {
            keys.push(cursor.value.id)
          }
        } else {
          var newValue = Object.assign({}, cursor.value)
          newValue._lastfetch = now.toISOString()
          cursor.update(newValue)
          keys.push(newValue.id)
        }

        cursor.continue()
      }
    })
  }

  function cleaner (db) {
    deleteold(db).then(function (keys) {
      if (keys.length === 0) { return }

      do {
        var subkeys = keys.splice(0, 200)
        var strkeys = subkeys.join('|')

        fetch('/location/store/Reservation/|' + strkeys, fetchInit).then(function (response) {
          response.json().then(function (data) {
            var entries = data.data
            var st = db.transaction('reservations', 'readwrite').objectStore('reservations')
            for (var i = 0; i < entries.length; i++) {
              if (entries[i].deleted != null && entries[i].deleted !== '') {
                st.delete(entries[i].id)
                delete Entries[entries[i].id]
              } else {
                var hash = objectHash.sha1(entries[i])
                if (Entries[entries[i].id]) {
                  if (Entries[entries[i].id] !== hash) {
                    /* Post message */
                  }
                }
                Entries[entries[i].id] = hash
              }
            }
          })
        })
      } while (keys.length > 0)
      setTimeout(function () { cleaner(db) }, 600000)
    })
  }

  function deleted (db) {
    fetch('/location/store/Reservation?search.deleted=>=' + today, fetchInit).then(function (response) {
      response.json().then(function (data) {
        if (data.type === 'results' && data.data.length > 0) {
          var st = db.transaction('reservations', 'readwrite').objectStore('reservations')
          data.data.forEach(function (reservation) {
            try {
              st.delete(reservation.id)
            } catch (e) {
              // nothing
            }
          })
        }
      })
      setTimeout(function () { deleted(db) }, 15000)
    })
  }

  cleaner(db)
  deleted(db)
})
