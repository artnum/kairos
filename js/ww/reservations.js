/* eslint-env worker */
/* global Artnum */
'use strict'
importScripts('https://bitwiseshiftleft.github.io/sjcl/sjcl.js')
importScripts('https://artnum.ch/code/js/Path.js')
importScripts('https://artnum.ch/code/js/Query.js')

console.log('Start reservation thread')

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
    Artnum.Query.exec(Artnum.Path.url('/store/DeepReservation/' + id)).then(function (response) {
      if (response.success && response.length === 1) {
        resolve(response)
      }
    })
  })
}

self.onmessage = function (msg) {
  if (!msg.data || !msg.data.op || msg.data.op === 'response') {
    return
  }

  var localid = msg.data.localid
  switch (msg.data.op) {
    case 'touch':
      if (msg.data.id) {
        Artnum.Query.exec(Artnum.Path.url('/store/Reservation/' + String(msg.data.id)), Object.assign({method: 'PATCH', body: JSON.stringify({id: msg.data.id})}))
      }
      break
    case 'put':
      var result = {op: 'response', id: null, localid: localid, new: false, deleted: false, unchanged: false, data: null}
      write(msg.data.data).then(function (response) {
        get(response.id, true).then(function (data) {
          result.target = data.target
          result.localid = localid
          result.id = response.id
          result.new = response.new
          result.data = data.data
          if (msg.data.copyfrom) {
            result.copyfrom = msg.data.copyfrom
          }
          self.postMessage(result)
        })
      })
      break
    case 'modified':
    case 'get':
      if (!msg.data.id) {
        return
      }
      get(msg.data.id).then(function (data) {
        var result = {op: 'response', id: null, localid: localid, new: false, deleted: false, unchanged: true, data: null}
        if (data) {
          result.target = data.target
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
        self.postMessage(result)
      })
      break
  }
}
