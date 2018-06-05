importScripts('../localdb.js')
importScripts('../object-hash/dist/object_hash.js')
var req = new XMLHttpRequest(), last = { 'modification': null, 'id': 0 }
var firstLoad = true
wantdb(() => { checker() })

onmessage = function (msg) {
  if (!msg.data && !msg.data.op) {
    console.warn('Web Worker Message is wrong', msg)
  }

  switch (msg.data.type) {
    case 'move':
      if (req && req.readyState > 0 && req.readyState < 4) {
        req.abort()
      }
      var parameters = ''
      var url = msg.data.content[0]
      if (msg.data.content[1] && msg.data.content[1].query) {
        var array = new Array()
        for (var k in msg.data.content[1].query) {
          array.push(encodeURIComponent(k) + '=' + encodeURIComponent(msg.data.content[1].query[k]))
        }
        parameters = array.join('&')
      }
      if (parameters != '') { url += '?' + parameters }
      req.open('get', url, true)
      req.send()
      break
  }
}

handleResults = function (txt) {
  var ids = new Array()
  try {
    r = JSON.parse(txt)
  } catch (e) {
    return byTarget
  }
  if (r && r.data && r.data.length > 0) {
    var tx = DB.transaction('reservations', 'readwrite')
    tx.oncomplete = function (e) { postMessage({ type: 'entries', content: ids }) }
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
            if (!firstLoad) { new Notification('Nouvelle réservation ' + r.data[i].id + ' a été créée') }
          }
        }
        if (ids.indexOf(r.data[i].target) == -1) {
          ids.push(r.data[i].target)
        }

        if (r.data[i].previous) {
          if (ids.indexOf(r.data[i].previous) == -1) {
            ids.push(r.data[i].previous)
          }
        }
        r.data[i]._hash = objectHash.sha1(r.data[i])
        store.put(r.data[i])
      }
    }
  }
}

req.onload = function (e) {
  if (req.readyState === 4) {
    if (req.status === 200) {
      handleResults(req.responseText)
    }
  }
}

checker = function () {
  var url = '/location/store/DeepReservation'
  var parameters = ''
  if (last.modification == null && last.id == 0) {
    setTimeout(checker, 2500)
    return
  }

  var params = new Array()
  if (last.modification != null) {
    params.push('search.modification=' + encodeURIComponent('>' + last.modification.toISOString()))
  }
  if (last.id != 0) {
    params.push('search.id=' + encodeURIComponent('>' + String(last.id)))
    if (params.length > 1) {
      params.push('search._rules=' + encodeURIComponent('modification OR id'))
    }
  }

  if (params.length > 0) {
    params.push('long=1')
    parameters = params.join('&')
  }
  if (parameters != '') {
    url += '?' + parameters
  }
  firstLoad = false
  var cReq = new XMLHttpRequest()
  cReq.onload = function (e) {
    if (cReq.readyState === 4) {
      if (cReq.status === 200) {
        var byTarget = handleResults(cReq.responseText)
      }
      checker()
    }
  }
  cReq.open('get', url, true)
  cReq.send(null)
}
