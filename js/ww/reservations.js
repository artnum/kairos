/* eslint-env worker */
/* global IdxDB, Artnum */
'use strict'
importScripts('../localdb.js')
importScripts('https://bitwiseshiftleft.github.io/sjcl/sjcl.js')
importScripts('https://artnum.ch/code/js/Path.js')
importScripts('https://artnum.ch/code/js/Query.js')

var fetchInit = {credentials: 'same-origin'}
new IdxDB().then(function (db) {
  console.log('Start reservation thread')

  var bc = new BroadcastChannel(Artnum.Path.bcname('reservations'))

  var write = function (data) {
    return new Promise(function (resolve, reject) {
      var arrival = null
      if (data.arrival) {
        arrival = data.arrival
        delete data.arrival
      }
      var method = data.id ? 'PUT' : 'POST'
      var url = data.id ? '/' + String(data.id) : '/'
      Artnum.Query.exec(Artnum.Path.url('/store/Reservation/' + url), {method: method, body: data}).then(async function (res) {
        if (res.success && res.length === 1) {
          if (arrival) {
            url = arrival.id ? arrival.id : ''
            method = arrival.id ? 'PATCH' : 'POST'
            var body = arrival
            if (arrival._op) {
              switch (arrival._op.toLowerCase()) {
                case 'delete':
                  if (arrival.id) {
                    method = 'DELETE'
                    body = {id: arrival.id}
                  } else {
                    method = null
                  }
                  break
              }
            }

            if (method) {
              await Artnum.Query.exec(Artnum.Path.url('/store/Arrival/' + url), {method: method, body: body})
            }
          }
          resolve({id: res.data[0].id, new: method === 'POST'})
        }
      })
    })
  }

  var get = function (id, force = false) {
    return new Promise(function (resolve, reject) {
      var queryServer = function () {
        fetch(Artnum.Path.url('/store/DeepReservation/' + id), fetchInit).then(function (response) {
          response.json().then(function (data) {
            try {
              data['_lastfetch'] = new Date().toISOString()
              db.transaction('reservations').objectStore('reservations', 'readwrite').put(data)
            } catch (e) {
              /* nothing */
            }
            resolve(data)
          })
        })
      }

      if (force) {
        queryServer()
        return
      }

      var st = db.transaction('reservations').objectStore('reservations')
      var req = st.get(id)
      req.onsuccess = function (event) {
        if (event.type === 'success') {
          if (event.target.result) {
            resolve(event.target.result)
          } else {
            queryServer()
          }
        } else {
          queryServer()
        }
      }
      req.onerror = function (event) {
        console.log(event)
        if (reject) {
          reject(new Error('Request to database has failed'))
        }
      }
    })
  }

  self.onmessage = function (event) {
    var result = {}
    postMessage(result)
  }

  bc.onmessage = function (msg) {
    if (!msg.data || !msg.data.op || msg.data.op === 'response') {
      return
    }

    let cookie = msg.data.cookie ? msg.data.cookie : {}
    var localid = msg.data.localid
    var forceServer = false
    switch (msg.data.op) {
      case 'touch':
        if (msg.data.id) {
          fetch(Artnum.Path.url('/store/Reservation/' + String(msg.data.id)), Object.assign({method: 'PUT', body: JSON.stringify({id: msg.data.id})}, fetchInit))
        }
        break
      case 'put':
        var result = {op: 'response', id: null, localid: localid, new: false, deleted: false, unchanged: false, data: null, cookie: cookie}
        write(msg.data.data).then(function (response) {
          get(response.id, true).then(function (data) {
            result.localid = localid
            result.id = response.id
            result.new = response.new
            result.data = data.data
            if (msg.data.copyfrom) {
              result.copyfrom = msg.data.copyfrom
            }
            bc.postMessage(result)
          })
        })
        break
      case 'modified':
      case 'get':
        if (msg.data.op === 'modify') {
          forceServer = true
          console.log('direct to server')
        }
        if (!msg.data.id) {
          return
        }
        get(msg.data.id, forceServer).then(function (data) {
          var result = {op: 'response', id: null, localid: localid, new: false, deleted: false, unchanged: true, data: null, cookie: cookie}
          if (data) {
            if (data.deleted) {
              result = Object.assign(result, {id: data.id, deleted: true, unchanged: false})
            } else {
              if (msg.data.hash && msg.data.hash === data._hash) {
                result = Object.assign(result, {id: data.id, hash: data._hash})
              } else {
                result = Object.assign(result, {id: data.id, deleted: false, unchanged: false, hash: data._hash, data: data})
              }
            }
          }
          bc.postMessage(result)
        })
        break
    }
  }
}, function (error) {
  console.error('Failed reservation thread', error)
})
