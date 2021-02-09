/* eslint-env worker */
/* global objectHash */
importScripts('../../conf/app.js')
importScripts('../kairos.js')
importScripts('../localdb.js')
importScripts('../object-hash/dist/object_hash.js')
importScripts('/js/Path.js')
importScripts('../stores/user.js')

let LastMod = 0
let Entries = {}
let Channels = {}
let Symlinks = {}
let Range = null
let PostPoned = {}

self.onmessage = function (msg) {
  switch (msg.data.op) {
    case 'newTarget':
      if (msg.ports.length > 0 && msg.data.target) {
        let targetId = btoa(msg.data.target)
        Channels[targetId] = msg.ports[0]
        Channels[targetId].onmessage = (m) => {
          targetMessages(m, targetId)
        }
        if (PostPoned[targetId]) {
          Channels[targetId].postMessage({op: 'entries', value: PostPoned[targetId]})
          delete PostPoned[targetId]
        }
      }
      break
    case 'symlinkTarget':
      let targetId = btoa(msg.data.source)
      if (msg.data.source === undefined || msg.data.destination === undefined) { return }
      Symlinks[targetId] = btoa(msg.data.destination)
      if (PostPoned[targetId]) {
        Channels[Symlinks[targetId]].postMessage({op: 'entries', value: PostPoned[targetId]})
        delete PostPoned[targetId]
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
    case 'moveEntry':
      if (msg.data.reservation === undefined) {
        return
      }
      let entry = JSON.parse(msg.data.reservation)
      if (!Entries[entry.id]) { return }
      let oldChannel = Channels[btoa(entry.previous)] 
      if (oldChannel === undefined) {
        oldChannel = Symlinks[btoa(entry.previous)]
      }
      let newChannel = Channels[btoa(entry.target)]
      if (newChannel === undefined) {
        newChannel = Symlinks[btoa(entry.target)]
      }
      oldChannel.postMessage({op: 'remove', reservation: entry})
      Entries[entry.id][1] = newChannel
      newChannel.postMessage({op: 'add', reservation: entry})
      break
  }
}

function  dstamp (date) {
  date = Date.parse(date)
  if (isNaN(date)) {
    return null
  }

  return date
}

function targetMessages (msg, targetId = null) {
  if (!msg.data.op) { return }
  switch (msg.data.op) {
    case 'uncache':
      if (msg.data.value.length > 0) {
        msg.data.value.entry.forEach((id) => {
          delete Entries[id]
        })
      }
      break
    case 'reload':
      if (msg.data.reservation) {
        doFetch(getUrl(`store/DeepReservation/${msg.data.reservation}`)).then((response) => {
          if (response.ok) {
            response.json().then((json) => {
              if (json.length > 0 && json.success) {
                cacheAndSend([json.data], newVTimeLine())
              }
            })
          }
        })
      }
      break
  }
}

var fetchId = 0
function doFetch(url) {
  fetchId++
  return fetch(url, {credential: 'include', headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${fetchId}`})})
}

function getUrl (suffix) {
  let path = self.location.pathname.split('/')
  let first = ''
  while ((first = path.shift()) === '') ;
  return new URL(`${self.location.origin}/${first}/${suffix}`)
}

function getIntervention (entry) {
  return new Promise((resolve, reject) => {
    resolve([])
    return
  })
}

/* count, for each day, the number of complements by color as to send a resume */
function pComplements (vTimeLine, idx, entry, key) {
  if (!entry.complements) { return }
  if (!Array.isArray(entry.complements)) { return }
  if (entry.complements.length <= 0) { return }
  for (let i = 0; i < entry.complements.length; i++) {
    let c = entry.complements[i]
    let num = parseInt(c.number)
    if (isNaN(num)) { return }
    if (!vTimeLine[idx][key][c.type.color]) { vTimeLine[idx][key][c.type.color] = { count: 0} }
    if (parseInt(c.follow) === 1) {
      vTimeLine[idx][key][c.type.color].count += num
      vTimeLine[idx][key][c.type.color].type = c.type.id
    } else {
      let begin = dstamp(c.begin)
      let end = dstamp(c.end)
      if (end > vTimeLine[idx].date - 86400000 && begin <= vTimeLine[idx].date) {
        vTimeLine[idx][key][c.type.color].count += num 
        vTimeLine[idx][key][c.type.color].type = c.type.id
      }
    }
  }
}

const ProcessPipeline = {
  complements: {
    fn: pComplements
  }
}

/* do processing for each day of the timeline */
function processDays (vTimeLine, options) {
  for (let i = 0; i < vTimeLine.length; i++) {
    for (let key in ProcessPipeline) {
      vTimeLine[i][key] = {}
      for (let j = 0; j < vTimeLine[i].entries.length; j++) {
        ProcessPipeline[key].fn(vTimeLine, i, vTimeLine[i].entries[j], key)
      }
      if (Object.keys(vTimeLine[i][key]).length > 0) {
        self.postMessage({op: key, value: vTimeLine[i][key], date: vTimeLine[i].datestr, options: options})
      }
    }
  }
}

function cacheAndSend (data, vTimeLine) {
  new Promise((resolve, reject) => {
    let entries = {}
    let promises = []
    data.forEach((entry) => {
      let begin = dstamp(entry.begin)
      let end = dstamp(entry.end)
      
      for (let i = 0; i < vTimeLine.length; i++) {
        if (end > vTimeLine[i].date - 86400000 && begin <= vTimeLine[i].date) {
          vTimeLine[i].entries.push(entry)
        }
      }
      promises.push(new Promise((resolve, reject) => {
        getIntervention(entry).then((interventions) => {
          entry.interventions = interventions
          if (parseInt(entry.modification) > LastMod) {
            LastMod = parseInt(entry.modification)
          }
          let channel = btoa(entry.target)
          if (Symlinks[channel]) {
            channel = Symlinks[channel]
          }
          if (!entries[channel]) {
            entries[channel] = []
          }
          let hash = objectHash.sha1(entry)
          entry._hash = hash
          if (Entries[entry.id]) {
            if (hash !== Entries[entry.id][0]) {
              if (Entries[entry.id][1] !== channel) {
                if (!entries[Entries[entry.id][1]]) {
                  entries[Entries[entry.id][1]] = []
                }
                entries[Entries[entry.id][1]].push(entry)
                delete Entries[entry.id]
              }
              Entries[entry.id] = [hash, channel, new Date().getTime()]
              entries[channel].push(entry)
            }
          } else {
            Entries[entry.id] = [hash, channel, new Date().getTime()]
            entries[channel].push(entry)
          }
          resolve()
        })
      }))
    })
    Promise.all(promises).then(() => {
      resolve(entries)
    })
  }).then((entries) => {
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
    let url = getUrl('store/User')
    url.searchParams.set('search.function', 'machiniste')
    url.searchParams.set('search.disabled', '0')
    url.searchParams.set('search.temporary', '0')
    doFetch(url).then((response) => {
      /* in any case we process each days */
      if (response.ok) {
        response.json().then((json) => {
          processDays(vTimeLine, {machinist: json})
        })
      } else {
        processDays(vTimeLine)
      }
    })
  })
}

function newVTimeLine () {
  let days = Math.floor((Range.end.getTime() - Range.begin.getTime()) / 86400000)
  let vTimeLine = []
  for (let i = 0; i < days; i++) {
    let x = new Date()
    x.setTime(Range.begin.getTime() + (i * 86400000))
    x.setHours(12, 0, 0)
    let dstr = x.toISOString().split('T')[0]
    x.setHours(23, 59, 59)
    vTimeLine[i] = {
      date: x,
      datestr: dstr,
      entries: []
    }
  }
  return vTimeLine
}

var Status = {}
function checkMachineState () {
  let url = getUrl('store/Evenement/.machinestate')
  doFetch(url).then(response => {
    if (response.ok) {
      response.json().then(result => {
        let prmses = []
        for (i = 0; i < result.length; i++) {
          prmses.push(new Promise((resolve, reject) => {
            let entry = result.data[i]
            let channel = btoa(entry.resolvedTarget)

            if (Symlinks[channel]) {
              channel = Symlinks[channel]
            }

            if (entry.type === '') { resolve([]); return }
            if (Status[entry.type] !== undefined) {
              if (Status[entry.type] !== null) {
                entry.type = Status[entry.type]
              }
              resolve([channel, entry])
            } else {
              doFetch(getUrl(`store/${entry.type}`)).then(response => {
                if (!response.ok) { Status[entry.type] = null; resolve(); return }
                response.json().then(status => {
                  if (status.length === 1) {
                    let severity = parseInt(status.data.severity)
                    if (severity < 1000) {
                      status.data.color = 'black'
                    } else if (severity < 2000) {
                      status.data.color = 'blue'
                    } else if (severity < 3000) {
                      status.data.color = 'darkorange'
                    } else {
                      status.data.color = 'red'
                    }
                    Status[entry.type] = status.data
                    entry.type = Status[entry.type]
                    resolve([channel, entry])
                  }
                }, () => resolve([]))
              })
            }
          
          }))
        }
        Promise.all(prmses).then((toSend) => {
          let merged = {}
          for (let i = 0; i < toSend.length; i++) {
            if (toSend[i].length !== 2) { continue }
            if (merged[toSend[i][0]] === undefined) {
              merged[toSend[i][0]] = toSend[i][1]
            } else {
              if (merged[toSend[i][0]].severity === undefined) {
                merged[toSend[i][0]] = toSend[i][1]
              } else {
                if (parseInt(merged[toSend[i][0]].severity) < parseInt(toSend[i][1].severity)) {
                  merged[toSend[i][0]] = toSend[i][1]
                }
              }
            }
          }
          for (let k in merged) {
            if (Channels[k] !== undefined) {
              Channels[k].postMessage({op: 'state', value: merged[k]})
            }
          }
          setTimeout(checkMachineState, 5000)
        })
      })
    }
  })
}

function runUpdater () {
  let url = getUrl('store/DeepReservation')

  url.searchParams.set('search.begin', '<' + Range.end.toISOString().split('T')[0])
  url.searchParams.set('search.end', '>' + Range.begin.toISOString().split('T')[0])
  url.searchParams.set('search.deleted', '-')
  doFetch(url).then((response) => {
    if (response.ok) {
      response.json().then((json) => {
        if (json.length > 0 && json.success) {
          cacheAndSend(json.data, newVTimeLine())
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
    doFetch(url).then((response) => {
      if (response.ok) {
        response.json().then((json) => {
          if (json.length > 0 && json.success) {
            cacheAndSend(json.data, newVTimeLine())
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

checkMachineState()