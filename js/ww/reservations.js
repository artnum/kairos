/* eslint-env worker */
/* global IdxDB */
'use strict'
importScripts('../localdb.js')

new IdxDB().then(function (db) {
  console.log('Start reservation thread')

  var bc = new BroadcastChannel('reservations')

  var write = function (data) {
    return new Promise(function (resolve, reject) {
      var method = data.id ? 'PUT' : 'POST'
      var url = data.id ? '/' + String(data.id) : '/'
      fetch('/location/store/Reservation/' + url, {method: method, body: JSON.stringify(data)}).then(function (response) {
        response.json().then(function (data) {
          if (data.type === 'results') {
            if (data.data.success) {
              resolve({id: data.data.id, new: method === 'POST'})
            }
          }
        })
      })
    })
  }

  var get = function (id, force = false) {
    return new Promise(function (resolve, reject) {
      var queryServer = function () {
        fetch('/location/store/DeepReservation/' + id).then(function (response) {
          response.json().then(function (data) {
            try {
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

    var forceServer = false
    switch (msg.data.op) {
      case 'touch':
        if (msg.data.id) {
          fetch('/location/store/Reservation/' + String(msg.data.id), {method: 'PUT', body: JSON.stringify({id: msg.data.id})})
        }
        break
      case 'put':
        var result = {op: 'response', id: null, new: false, deleted: false, unchanged: false, data: null}
        write(msg.data.data).then(function (response) {
          get(response.id, true).then(function (data) {
            result.id = response.id
            result.new = response.new
            result.data = data.data
            if (msg.data.localid) {
              result.localid = msg.data.localid
            }
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
          var result = {op: 'response', id: null, new: false, deleted: false, unchanged: true, data: null}
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
