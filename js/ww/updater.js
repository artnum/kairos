/* eslint-env worker */
/* global objectHash, Artnum */
importScripts('../object-hash/dist/object_hash.js')
importScripts('https://artnum.ch/code/js/Path.js')

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
self.onmessage = function (msg) {
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

var handleResults = function (txt) {
  var r
  try {
    r = JSON.parse(txt)
  } catch (e) {
    console.log(e)
  }
  if (r && r.data && r.data.length > 0) {
    r.data.sort((a, b) => {
      let ai = parseInt(a.target)
      let bi = parseInt(b.target)
      /* parseInt convert up to what is a number, so if back to string the number is different, the number is not a number 
       * so : if a is number and b is string, a is bigger
       *      if a is string b is number, b is bigger
       *      if both are string compare string
       *      else compare number
       */
      if (String(ai) === a.target && String(bi) !== b.target) {
        return 1
      } else if (String(ai) !== a.target && String(bi) === b.target) {
        return -1
      } else if (String(ai) !== a.target && String(bi) !== b.target) {
        if (b.target === a.target) { return 0 } else if (a.target > b.target) { return 1 } else { return -1 }
      }

      return ai - bi
    })

    var currentTarget = null
    var response = []
    while (r.data.length > 0) {
      var current = r.data.shift()
      if (current.target !== currentTarget && response.length > 0) {
        self.postMessage({op: 'responses', target: currentTarget, data: response})
        response = []
        currentTarget = current.target
      }
      response.push(current)
    }
    if (response.length > 0) {
      self.postMessage({op: 'responses', target: response[0].target, data: response})
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
