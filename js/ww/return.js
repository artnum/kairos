/* eslint-env worker */
/* global IdxDB */
'use strict'

importScripts('../localdb.js')

var findLastMod = function (db) {
  return new Promise(function (resolve, reject) {
    var st = db.transaction('return', 'readwrite').objectStore('return')
    var lastmod = 0

    st.openCursor().onsuccess = function (event) {
      var cursor = event.target.result

      if (!cursor) {
        resolve(lastmod)
        return
      }

      if (cursor.value.deleted) {
        cursor.continue()
        return
      }

      var ts = Math.round(new Date(cursor.value.modification).getTime() / 1000)
      if (lastmod < ts) {
        lastmod = ts
      }
      cursor.continue()
    }
  })
}

var fetchLastMod = function (lastmod, db) {
  fetch('/location/store/Return?long=1&search.modification=>' + lastmod).then(function (response) {
    if (response.ok) {
      response.json().then(function (values) {
        if (values.type === 'results') {
          var newest = lastmod
          var st = db.transaction('return', 'readwrite').objectStore('return')
          values.data.forEach((e) => {
            postMessage(e)
            if (e.deleted) {
              if (st.getKey(e.id)) {
                st.delete(e.id)
              }
            } else {
              st.put(e)
            }
            var ts = Math.round(new Date(e.modification).getTime() / 1000)
            if (ts > newest) {
              newest = ts
            }
          })
          fetchLastMod(String(newest), db)
        }
      })
    }
  })
}

function clean (db) {
  var st = db.transaction('return').objectStore('return')
  st.getAllKeys().onsuccess = function (event) {
    var keys = event.target.result

    /* this is done to limit size of URL */
    do {
      var subkeys = keys.splice(0, 200)
      var strkeys = subkeys.join('|')
      fetch('/location/store/Return/|' + strkeys).then(function (response) {
        response.json().then(function (data) {
          var entries = data.data
          var found = []
          st = db.transaction('return', 'readwrite').objectStore('return')
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].deleted === '') { entries[i].deleted = null }
            if (entries[i].done === '') { entries[i].done = null }

            if (entries[i].deleted != null || entries[i].done != null) {
              st.delete(entries[i].id)
              postMessage({delete: true, id: entries[i].id})
            } else {
              found.push(entries[i].id)
            }
          }
        })
      })
    } while (keys.length > 0)
    setTimeout(function () { clean(db) }, 15000)
  }
}

new IdxDB().then(function (db) {
  findLastMod(db).then(function (lastmod) { fetchLastMod(lastmod, db) })
  setTimeout(function () { clean(db) }, 15000)
})
