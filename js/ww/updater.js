/* eslint-env worker */
/* global IdxDB, objectHash, Artnum */
importScripts('../localdb.js')
importScripts('../object-hash/dist/object_hash.js')
importScripts('https://artnum.ch/code/js/Path.js')

let LastMod = 0
let Entries = {}
let Channels = {}
let Range = null
let PostPoned = {}
self.onmessage = function (msg) {
  switch (msg.data.op) {
    case 'newTarget':
      if (msg.ports.length > 0 && msg.data.target) {
        Channels[btoa(msg.data.target)] = msg.ports[0]
        Channels[btoa(msg.data.target)].onmessage = targetMessages
        if (PostPoned[btoa(msg.data.target)]) {
          Channels[btoa(msg.data.target)].postMessage({op: 'entries', value: PostPoned[btoa(msg.data.target)]})
          delete PostPoned[btoa(msg.data.target)]
        }
      }
      break
    case 'move':
      if (Range === null) {
        Range = {begin: msg.data.begin, end: msg.data.end}
        startUpdater()
      } else {
        Range.begin = msg.data.begin
        Range.end = msg.data.end
      }
      runUpdater()
      break
  }
}

function targetMessages (msg) {
  if (!msg.data.op) { return }
  switch (msg.data.op) {
    case 'uncache':
      if (msg.data.value.length > 0) {
        msg.data.value.entry.forEach((id) => {
          delete Entries[id]
        })
      }
      break
  }
}

function getUrl (suffix) {
  let path = self.location.pathname.split('/')
  let first = ''
  while ((first = path.shift()) === '') ;
  return new URL(`${self.location.origin}/${first}/${suffix}`)
}

function cacheAndSend (data) {
  let entries = {}
  data.forEach((entry) => {
    if (parseInt(entry.modification) > LastMod) {
      LastMod = parseInt(entry.modification)
    }
    if (!entries[btoa(entry.target)]) {
      entries[btoa(entry.target)] = []
    }
    let hash = objectHash.sha1(entry)
    if (!Entries[entry.id] || hash !== Entries[entry.id]) {
      Entries[entry.id] = hash
      entries[btoa(entry.target)].push(entry)
    }
  })
  let processed = []
  for (let k in entries) {
    if (Channels[k] && entries[k].length > 0) {
      Channels[k].postMessage({op: 'entries', value: entries[k]})
      processed.push(k)
    } else if (entries[k].length > 0) {
      if (!PostPoned[k]) {
        PostPoned[k] = []
      }
      PostPoned[k] = [...PostPoned[k], ...entries[k]]
    }
  }
  for (let k in Channels) {
    if (processed.indexOf(k) === -1) {
      Channels[k].postMessage({op: 'entries', value: []})
    }
  }
}

function runUpdater () {
  let url = getUrl('store/DeepReservation')
  url.searchParams.set('search.begin', '<' + Range.end.toISOString().split('T')[0])
  url.searchParams.set('search.end', '>' + Range.begin.toISOString().split('T')[0])
  url.searchParams.set('search.deleted', '-')
  fetch(url).then((response) => {
    if (response.ok) {
      response.json().then((json) => {
        if (json.length > 0 && json.success) {
          cacheAndSend(json.data)
        }
      })
    }
  })
}

const updateTimer = 10
function startUpdater () {
  if (LastMod > 0) {
    let url = getUrl('store/DeepReservation')
    url.searchParams.set('search.modification', '>' + LastMod)
    fetch(url).then((response) => {
      if (response.ok) {
        response.json().then((json) => {
          if (json.length > 0 && json.success) {
            console.log(json.data)
            cacheAndSend(json.data)
          }
          setTimeout(startUpdater, updateTimer * 1000)
        })
      } else {
        setTimeout(startUpdater, updateTimer * 1000)
      }
    })
  } else {
    setTimeout(startUpdater, updateTimer * 1000)
  }
}

/*var RChannel = new BroadcastChannel(Artnum.Path.bcname('reservations'))

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
//  self.onmessage = msgHandle

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
*/
