/* eslint-env worker */
'use strict'

function filterDate (value, params) {
  if (!params.date) { return false }
  if (!params.type) { return false }
  var date = new Date()
  try {
    date.setTime(params.date.getTime())
    date.setHours(0, 0, 0, 0)
  } catch (e) {
    return false
  }

  var type = params.type
  if (!Array.isArray(params.type)) {
    type = [ params.type ]
  }

  var toDate = null
  for (var i = 0; i < type.length; i++) {
    if (value[type[i]] != null && value[type[i]] !== '') {
      try {
        toDate = new Date(value[type[i]])
        toDate.setHours(0, 0, 0, 0)
        break
      } catch (e) {
        return false
      }
    }
  }

  if (toDate != null) {
    if (toDate.getTime() === date.getTime()) {
      return true
    }
  }

  return false
}

function filterRange (value, params) {
  if (!params.begin) { return false }
  if (!params.end) { return false }
  if (!params.type) { return false }

  var begin = new Date()
  var end = new Date()
  try {
    begin.setTime(params.begin.getTime())
    end.setTime(params.end.getTime())
  } catch (e) {
    return false
  }

  var type = params.type
  if (!Array.isArray(params.type)) {
    type = [ params.type ]
  }

  var toDate = null
  for (var i = 0; i < type.length; i++) {
    try {
      toDate = new Date(value[type[i]])
      break
    } catch (e) {
      return false
    }
  }

  if (toDate != null) {
    if (begin.getTime() <= toDate.getTime() && end.getTime() >= toDate.getTime()) {
      return true
    }
  }

  return false
}

function filterBetween (value, params) {
  if (!params.begin) { return false }
  if (!params.end) { return false }
  if (!params.date) { return false }

  if (!value[params.begin]) { return false }
  if (!value[params.end]) { return false }

  var begin = null
  var end = null
  try {
    begin = new Date()
    end = new Date()
    begin.setTime(new Date(value[params.begin]).getTime())
    end.setTime(new Date(value[params.end]).getTime())
  } catch (e) {
    return false
  }

  var date = null
  try {
    date = new Date()
    date.setTime(new Date(params.date).getTime())
  } catch (e) {
    return false
  }

  if (params.dayonly) {
    date.setHours(0, 0, 0)
    begin.setHours(0, 0, 0)
    end.setHours(0, 0, 0)
  }

  if (date != null && begin != null && end != null) {
    if (begin.getTime() <= date.getTime() && end.getTime() >= date.getTime()) {
      return true
    }
  }

  return false
}

function filterEqual (value, params) {
  if (!params.value) { return false }
  if (!params.attribute) { return false }

  String(params.attribute).split('.').forEach((attr) => {
    if (attr !== '') {
      if (value[attr]) {
        value = value[attr]
      }
    }
  })

  if (value === params.value) {
    return true
  }

  return false
}

function _merge (a, b) {
  for (var i = 0; i < b.length; i++) {
    if (a.indexOf(b[i]) === -1) {
      a.push(b[i])
    }
  }

  return a
}

onmessage = function (msg) {
  var results = {}
  if (!msg.data && !msg.data.ops) {
    console.warn('Web Worker Message is wrong', msg)
    return
  }

  DB.transaction('reservations', 'readonly').objectStore('reservations').openCursor().onsuccess = function (event) {
    var cursor = event.target.result

    if (!cursor) {
      var ret = {}

      for (var i = 0; i < msg.data.ops.length; i++) {
        var op = msg.data.ops[i]
        var opname = op.name ? op.name : i
        if (!results[opname]) { continue }

        if (op.intersect) {
          var intersect = results[op.intersect]
          results[op.intersect] = null
          var out = {}

          if (intersect) {
            for (var k in results[opname]) {
              if (intersect[k]) {
                for (var j = 0; j < results[opname][k].length; j++) {
                  if (intersect[k].indexOf(results[opname][k][j]) !== -1) {
                    if (!out[k]) { out[k] = [] }
                    out[k].push(results[opname][k][j])
                  }
                }
              }
            }
          }
          results[opname] = out
        }
        for (k in results[opname]) {
          if (!ret[k]) {
            ret[k] = results[opname][k]
          } else {
            ret[k] = _merge(ret[k], results[opname][k])
          }
        }
      }

      postMessage(ret)
      return
    }
    var id = cursor.value.id
    var target = cursor.value.target
    for (i = 0; i < msg.data.ops.length; i++) {
      op = msg.data.ops[i]
      opname = op.name ? op.name : i
      var value = []
      switch (op.on) {
        default: case 'entry':
          value = [ cursor.value ]
          break
        case 'complement':
          if (cursor.value.complements) {
            value = cursor.value.complements
          }
          for (j = 0; j < value.length; j++) {
            if (value[j].follow !== '0') {
              value[j].begin = (cursor.value.deliveryBegin != null && cursor.value.deliveryBegin !== '') ? cursor.value.deliveryBegin : cursor.value.begin
              value[j].end = (cursor.value.deliveryEnd != null && cursor.value.deliveryEnd !== '') ? cursor.value.deliveryEnd : cursor.value.end
            }
          }
          break
      }

      for (j = 0; j < value.length; j++) {
        var keep = false
        switch (op.filter.toLowerCase()) {
          case 'date':
            keep = filterDate(value[j], op.params)
            break
          case 'range':
            keep = filterRange(value[j], op.params)
            break
          case 'between':
            keep = filterBetween(value[j], op.params)
            break
          case 'equal':
            keep = filterEqual(value[j], op.params)
            break
        }
        if (keep) {
          if (!results[opname]) {
            results[opname] = {}
          }
          if (!results[opname][target]) {
            results[opname][target] = []
          }
          results[opname][target].push(id)
        }
      }
    }
    cursor.continue()
  }
}
