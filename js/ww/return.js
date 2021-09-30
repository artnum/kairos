/* eslint-env worker */
/* global IdxDB, Artnum */
'use strict'
importScripts('../../conf/app.js')
importScripts('../kairos.js')


var lastMod = 0
function run () {
  const url = new URL(`${KAIROS.getBase()}/store/Arrival`)
  var p = {'search.done': '--'}
  url.searchParams.append('search.done', '--')
  if (lastMod > 0) {
    url.searchParams.append('search.modification', `>${lastMod}`)
    url.searchParams.append('long', '1')
  }
    
  fetch(url)
  .then(function (response) {
    if (!response.ok) { return null}
    return response.json()
  }).then(results =>{
    if (results) {
      for (let i = 0; i < results.length; i++) {
        postMessage(results.data[i])
        const mod = parseInt(results.data[i].modification)
        if (mod > lastMod) { lastMod = mod }
      }
    }
    setTimeout(run, lastMod > 0 ? 1000 : 1000)
  })
}

self.onmessage(msg => {
  if (msg.data.op === undefined) { return }
  switch(msg.data.op) {
    case 'setClientId':
      KAIROS.setClientId(msg.data.cid)
      run()
      break
  }
})
