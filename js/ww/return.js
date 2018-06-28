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
  st.openCursor().onsuccess = function (event) {
    var cursor = event.target.result
    if (!cursor) {
      setTimeout(function () { clean(db) }, 5000)
      return
    }

    var id = cursor.value.id
    fetch('/location/store/Return/' + id).then(function (response) {
      response.json().then(function (res) {
        if (res && !res.data.id) {
          console.log('Delete return ' + id + ', vanish from store', res.data)
          st = db.transaction('return', 'readwrite').objectStore('return')
          st.delete(id)
          postMessage({id: id, deleted: 'now'})
        }
      })
    })
    cursor.continue()
  }
}

new IdxDB().then(function (db) {
  findLastMod(db).then(function (lastmod) { fetchLastMod(lastmod, db) })
  setTimeout(function () { clean(db) }, 5000)
})
