/* eslint-env worker */
/* global IdxDB, Artnum */
'use strict'

importScripts('../localdb.js')
importScripts('https://artnum.ch/code/js/Path.js')

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

      var ts = parseInt(cursor.value.modification)
      if (ts < Math.round((new Date()).getTime() / 1000) && lastmod < ts) {
        lastmod = ts
      }
      cursor.continue()
    }
  })
}

var fetchLastMod = function (lastmod, db) {
  var url = Artnum.Path.url('store/Arrival')
  url.searchParams.append('long', '1')
  url.searchParams.append('search.modification', '>' + lastmod)
  fetch(url).then(function (response) {
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
              if (e.modification > Math.round((new Date()).getTime() / 1000)) {
                e.modification = Math.round((new Date()).getTime() / 1000)
              }
              st.put(e)
            }
            var ts = parseInt(e.modification)
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
      fetch(Artnum.Path.url('/store/Arrival/|' + strkeys)).then(function (response) {
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
