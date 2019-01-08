/* eslint-env worker */
/* global IdxDB, objectHash, Artnum */
importScripts('../localdb.js')
importScripts('../object-hash/dist/object_hash.js')
importScripts('https://artnum.ch/code/js/Path.js')

var msgs = []
self.onmessage = function (msg) {
  msgs.push(msg)
}

var RChannel = new BroadcastChannel(Artnum.Path.bcname('reservations'))

new IdxDB().then(function (DB) {
  var req = new XMLHttpRequest()
  var last = { 'modification': 0, 'id': 0 }

  var handleReqLoad = function (e) {
    if (req.readyState === 4) {
      if (req.status === 200) {
        handleResults(req.responseText)
      }
    }
  }

  req.onload = handleReqLoad
  var msgHandle = function (msg) {
    if (req.readyState > 0 && req.readyState < 3) {
      req.abort()
    }
    if (!msg.data && !msg.data.op) {
      console.warn('Web Worker Message is wrong', msg)
    }

    switch (msg.data.type) {
      case 'move':
        var parameters = ''
        var url = msg.data.content[0]
        if (msg.data.content[1] && msg.data.content[1].query) {
          var array = []
          for (var k in msg.data.content[1].query) {
            array.push(encodeURIComponent(k) + '=' + encodeURIComponent(msg.data.content[1].query[k]))
          }
          parameters = array.join('&')
        }
        if (parameters !== '') { url += '?' + parameters }
        req.open('get', url, true)
        req.send()
        break
    }
  }
  self.onmessage = msgHandle

  if (msgs.length > 0) {
    for (var i = 0; i < msgs.length; i++) {
      msgHandle(msgs[i])
    }
  }

  var handleResults = function (txt) {
    var r
    try {
      r = JSON.parse(txt)
    } catch (e) {
      console.log(e)
    }
    if (r && r.data && r.data.length > 0) {
      for (let i = 0; i < r.data.length; i++) {
        if (!r.data[i]) { continue }
        if (r.data[i].target) {
          r.data[i]._hash = objectHash.sha1(r.data[i])
          r.data[i]._lastfetch = new Date().toISOString()
          if (parseInt(r.data[i].modification) > last.modification) {
            last.modification = parseInt(r.data[i].modification)
          }

          let reservation = r.data[i]
          try {
            var g = DB.transaction('reservations').objectStore('reservations').get(reservation.id)
            g.onerror = function (event) {
              console.log(event)
            }
            g.onsuccess = function (event) {
              var result = event.target.result
              if (!result) {
                RChannel.postMessage({op: 'response', id: reservation.id, new: true, unchanged: false, deleted: false, data: reservation})
                DB.transaction('reservations', 'readwrite').objectStore('reservations').put(reservation)
              } else {
                if (result._hash !== reservation._hash) {
                  DB.transaction('reservations', 'readwrite').objectStore('reservations').put(reservation)
                  RChannel.postMessage({op: 'response', id: reservation.id, new: false, unchanged: false, deleted: false, data: reservation})
                }
              }
            }
          } catch (e) {
            console.log(e)
          }
        }
      }
    }
  }

  var checker = function () {
    var url = String(Artnum.Path.url('/store/DeepReservation'))
    var parameters = ''
    if (last.modification === 0) {
      setTimeout(checker, 2500)
      return
    }

    var params = []
    if (last.modification !== 0) {
      params.push('search.modification=' + encodeURIComponent('>' + last.modification))
    }

    if (params.length > 0) {
      params.push('long=1')
      parameters = params.join('&')
    }
    if (parameters !== '') {
      url += '?' + parameters
    }

    var cReq = new XMLHttpRequest()
    cReq.onload = function (e) {
      if (cReq.readyState === 4) {
        if (cReq.status === 200) {
          handleResults(cReq.responseText)
        }
        checker()
      }
    }
    cReq.open('get', url, true)
    cReq.send(null)
  }

  checker()
})
