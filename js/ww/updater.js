/* eslint-env worker */
/* global objectHash */
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

/*const MaxCacheCleanAge = 60
var cacheLastAge = 0*/
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
    if (Entries[entry.id]) {
      if (hash !== Entries[entry.id][0]) {
        if (Entries[entry.id][1] !== btoa(entry.target)) {
          if (!entries[Entries[entry.id][1]]) {
            entries[Entries[entry.id][1]] = []
          }
          entries[Entries[entry.id][1]].push(entry)
          delete Entries[entry.id]
        }
        Entries[entry.id] = [hash, btoa(entry.target), new Date().getTime()]
        entries[btoa(entry.target)].push(entry)
      }
    } else {
      Entries[entry.id] = [hash, btoa(entry.target), new Date().getTime()]
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

  /*
  if (cacheLastAge === 0) {
    cacheLastAge = new Date().getTime()
  } else {
    if (new Date().getTime() - cacheLastAge > MaxCacheCleanAge * 1000) {
      cacheLastAge = new Date().getTime()
      cleanCache()
    }
  } */
}
/*
const MaxObjectAge = 600
function cleanCache () {
  console.log('Run cleanCache')
  for (let k in Entries) {
    if (new Date().getTime() - Entries[k][2] > MaxObjectAge * 1000) {
      console.log(`Clean entries ${k} from cache`)
      delete Entries[k]
    }
  }
} */

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
