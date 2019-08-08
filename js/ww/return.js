/* eslint-env worker */
/* global IdxDB, Artnum */
'use strict'
importScripts('https://bitwiseshiftleft.github.io/sjcl/sjcl.js')
importScripts('https://artnum.ch/code/js/Path.js')
importScripts('https://artnum.ch/code/js/Query.js')

var lastMod = 0
function run () {
  var p = {'search.done': '-'}
  if (lastMod > 0) {
    p = {'search.modification': `>${lastMod}`, 'long': '1'}
  }
  Artnum.Query.exec(Artnum.Path.url('store/Arrival', {params: p})).then(function (results) {
    if (results.success && results.length > 0) {
      for (var i = 0; i < results.length; i++) {
        postMessage(results.data[i])
        var mod = parseInt(results.data[i].modification)
        if (mod > lastMod) { lastMod = mod }
      }
    }
    setTimeout(run, lastMod > 0 ? 1000 : 1000)
  })
}

run()
