/* eslint-env worker */
/* global IdxDB, objectHash */
importScripts('../localdb.js')
importScripts('../object-hash/dist/object_hash.js')

var msgs = []
self.onmessage = function (msg) {
  msgs.push(msg)
}

new IdxDB().then(function (DB) {
  var req = new XMLHttpRequest()
  var last = { 'modification': null, 'id': 0 }

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
    var ids = []
    var r
    try {
      r = JSON.parse(txt)
    } catch (e) {
      console.log(e)
    }
    if (r && r.data && r.data.length > 0) {
      var tx = DB.transaction('reservations', 'readwrite')
      var store = tx.objectStore('reservations')
      for (var i = 0; i < r.data.length; i++) {
        if (r.data[i].target) {
          var mod = new Date()
          mod.setTime(Date.parse(r.data[i].modification))
          if (mod) {
            if (last.modification == null) {
              last.modification = mod
            } else {
              if (last.modification.getTime() < mod.getTime()) {
                last.modification = mod
              }
            }
          }
          if (last.id == null) {
            last.id = Number(r.data[i].id)
          } else {
            if (last.id < Number(r.data[i].id)) {
              last.id = Number(r.data[i].id)
            }
          }
          if (ids.indexOf(r.data[i].target) === -1) {
            ids.push(r.data[i].target)
          }

          if (r.data[i].previous) {
            if (ids.indexOf(r.data[i].previous) === -1) {
              ids.push(r.data[i].previous)
            }
          }
          r.data[i]._hash = objectHash.sha1(r.data[i])
          r.data[i]._atime = new Date().toISOString()
          store.put(r.data[i])
        }
      }
    }
    postMessage({ type: 'entries', content: ids })
  }

  var checker = function () {
    var url = '/location/store/DeepReservation'
    var parameters = ''
    if (last.modification == null && last.id === 0) {
      setTimeout(checker, 2500)
      return
    }

    var params = []
    if (last.modification != null) {
      params.push('search.modification=' + encodeURIComponent('>' + last.modification.toISOString()))
    }
    if (last.id !== 0) {
      params.push('search.id=' + encodeURIComponent('>' + String(last.id)))
      if (params.length > 1) {
        params.push('search._rules=' + encodeURIComponent('modification OR id'))
      }
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
