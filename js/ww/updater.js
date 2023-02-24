/* eslint-env worker */
importScripts('../../conf/app.js')
importScripts(`../kairos.js?${location.search.substring(1)}`)
importScripts('../gevent.js')
importScripts('../stores/user.js')
importScripts('lib/updater-count.js')

let LastMod = 0
const LoadStatus = new Map()
const Entries = new Map()
const Channels = new Map()
const Symlinks = new Map()
let Range = null
let PostPoned = {}
let Run = false

const EVTOperation = Object.freeze({
  write: {
    count (msg) {
      countUpdateMessage(msg)
      .then(([reservationId, clientId]) => {
        if (!reservationId || !clientId) { return }
        updateEntry(reservationId, clientId)
      })
      .catch(reason => {
        console.log(reason)
      })
    },
    reservation (msg) {
      updateEntry(msg.id, msg.cid)
    },
    arrival (msg) {
      fetch(new URL(`${KAIROS.getBase()}/store/Arrival/${msg.id}`))
      .then(response => {
        if (!response.ok) { return null }
        return response.json() 
      })
      .then(result => {
        if (result === null) { return }
        if (!result.success) { return }
        const data = Array.isArray(result.data) ? result.data[0] : result.data
        new GEvent().send('arrival.update', data)
        updateEntry(data.target, msg.cid)
      })
    },
    contact (msg) {
      fetch(new URL(`${KAIROS.getBase()}/store/ReservationContact/${msg.id}`))
      .then(response => {
        if (!response.ok) { return null }
        return response.json() 
      })
      .then(result => {
        if (result === null) { return }
        if (!result.success) { return }
        const data = Array.isArray(result.data) ? result.data[0] : result.data
        updateEntry(data.reservation, msg.cid)
      })
    },
    evenement (msg) {
      checkMachineState()
    }
  },
  delete: {
    evenement (msg) {
      checkMachineState()
    }
  }
})

function connectEventSource () {
  const evtsource = new EventSource(KAIROS.URL(KAIROS.eventSource))
  evtsource.onmessage = event => {
    const msg = JSON.parse(event.data)
    self.postMessage({op: 'log', data: msg})
    if (msg.operation === undefined) { return }
    if (msg.cid === undefined) { return }
    if (EVTOperation[msg.operation] && EVTOperation[msg.operation][msg.type]) {
      EVTOperation[msg.operation][msg.type](msg)
    } else {
      new GEvent().send('kobjet.something', msg)
    }
  }
  evtsource.onerror = event => {
    evtsource.close()
    setTimeout(connectEventSource.bind(self), 1000)
  }
}
connectEventSource()

self.onmessage = function (msg) {
  switch (msg.data.op) {
    case 'ready':
      Run = true
      runUpdater()
      checkMachineState()
      break
    case 'newTarget':
      if (msg.ports.length > 0 && msg.data.target) {
        const targetId = String(msg.data.target)
        Channels.set(targetId, msg.ports[0])
        Channels.get(targetId).onmessage = (m) => {
          targetMessages(m)
        }
        if (PostPoned[targetId]) {
          Channels.get(targetId).postMessage({op: 'entries', value: PostPoned[targetId]})
          delete PostPoned[targetId]
        }
        if (LoadStatus.has(targetId)) {
          msg.ports[0].postMessage({op: 'state', value: LoadStatus.get(targetId)})
          LoadStatus.delete(targetId)
        }
      }
      break
    case 'symlinkTarget':
      const targetId = String(msg.data.source)
      if (msg.data.source === undefined || msg.data.destination === undefined) { return }
      Symlinks.set(targetId, msg.data.destination)
      if (PostPoned[targetId]) {
        Channels.get(Symlinks.get(targetId)).postMessage({op: 'entries', value: PostPoned[targetId]})
        delete PostPoned[targetId]
      }
      if (LoadStatus.has(targetId)) {
        Channels.get(Symlinks.get(targetId)).postMessage({op: 'state', value: LoadStatus.get(targetId)})
        LoadStatus.delete(targetId)
      }
      break
    case 'move':
      if (Range === null) {
        Range = {begin: msg.data.begin, end: msg.data.end}
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
      if (!Entries.has(entry.id)) { return }
      const oldEntry = Entries.get(entry.id)
      let oldChannel = Channels.get(entry.previous)
      if (oldChannel === undefined) {
        oldChannel = Symlinks.get(entry.previous)
      }
      let newChannel = Channels.get(String(entry.target))
      if (newChannel === undefined) {
        newChannel = Symlinks.get(String(entry.target))
      }
      oldChannel.postMessage({op: 'remove', reservation: entry, clientid: null})
      oldEntry[1] = newChannel
      Entries.set(entry.id, oldEntry)
      newChannel.postMessage({op: 'add', reservation: entry, clientid: null})
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

function targetMessages (msg, force = false) {
  if (!msg.data.op) { return }
  switch (msg.data.op) {
    case 'uncache':
      if (msg.data.value.length > 0) {
        msg.data.value.entry.forEach((id) => {
          Entries.delete(id)
        })
      }
      break
    case 'reload':
      if (msg.data.reservation) {
        fetch(new URL(`${KAIROS.getBase()}/store/DeepReservation/${msg.data.reservation}`))
        .then((response) => {
          if (!response.ok) { return null; }
          return response.json()
        })
        .then(json => {
          if (!json) { return; }
          if (!json.success) { return ;}
          cacheAndSend(Array.isArray(json.data) ? json.data : [json.data], force, msg.clientid)
        })
      }
      break
  }
}

function getIntervention (entry) {
  return new Promise((resolve, reject) => {
    resolve([])
    return
  })
}

function updateEntry(entryId, clientid) {
  fetch(`${KAIROS.getBase()}/store/DeepReservation/${entryId}`)
  .then(response => {
    if (!response.ok) { throw new Error('Net error')}
    return response.json()
  })
  .then(result => {
    if (!result.success) { throw new Error('Server error')}
    if (result.length <= 0) { return }
    return Array.isArray(result.data) ? result.data[0] : result.data
  })
  .then(reservation => {
    const channel = Channels.get(String(reservation.target)) || Channels.get(Symlinks.get(String(reservation.target)))
    const oldEntry = Entries.get(reservation.id)
    if (oldEntry) {
      const oldChannel = Channels.get(oldEntry[3]) || Channels.get(Symlinks.get(oldEntry[3]))
      if (oldChannel !== channel) {
        oldChannel.postMessage({op: 'remove', reservation, clientid})
      }
    }
    if (!channel) { return }
    Entries.set(reservation.id, [reservation.version, channel, new Date().getTime(), String(reservation.target)])
    channel.postMessage({op: 'update-reservation', reservation, clientid})
  })
  .catch(reason => {
    console.log(reason)
  })
}

function deleteEntry (entryId, clientid) {
  fetch(`${KAIROS.getBase()}/store/Reservation/${entryId}`)
  .then(response => {
    if (!response.ok) { return null }
    return response.json()
  })
  .then(result => {
    if (!result) { return }
    if (!result.success) { return }
    const reservation = Array.isArray(result.data) ? result.data[0] : result.data
    const channel = Channels.get(String(reservation.target)) || Channels.get(Symlinks.get(String(reservation.target)))
    if (channel) { channel.postMessage({op: 'remove', reservation: Array.isArray(result.data) ? result.data[0] : result.data, clientid}) }
  })
}

function cacheAndSend (data, force = false) {
  new Promise((resolve, reject) => {
    const entries = new Map()
    let promises = []
    data.forEach((entry) => {
      let begin = dstamp(entry.begin)
      let end = dstamp(entry.end)
      promises.push(new Promise((resolve, reject) => {
        getIntervention(entry).then((interventions) => {
          entry.interventions = interventions
          if (parseInt(entry.modification) > LastMod) {
            LastMod = parseInt(entry.modification)
          }
          let channel = String(entry.target)
          if (Symlinks.has(channel)) {
            channel = Symlinks.get(channel)
          }
          if (entries[channel] === undefined) {
            entries[channel] = []
          }
          if (Entries.has(entry.id)) {
            const storedEntry = Entries.get(entry.id)
            if ((entry.version !== storedEntry[0]) || force) {
              if (storedEntry[1] !== channel) {
                if (entries[storedEntry[1]] === undefined) {
                  entries[storedEntry[1]] = []
                }
                let remChannel = storedEntry[1] 
                if (Symlinks.has(remChannel)) {
                  remChannel = Symlinks.get(remChannel)
                }
                Channels.get(remChannel)?.postMessage({op: 'remove', reservation: entry, clientid: null})
                entries[storedEntry[1]].push(entry)
                Entries.delete(entry.id)
              }
              Entries.set(entry.id, [entry.version, channel, new Date().getTime(), String(entry.target)])
              entries[channel].push(entry)
            }
          } else {
            Entries.set(entry.id, [entry.version, channel, new Date().getTime(), String(entry.target)])
            entries[channel].push(entry)
          }
          resolve()
        })
      }))
    })
    Promise.all(promises)
    .then(() => {
      resolve(entries)
    })
  }).then((entries) => {
    let processed = []
    for (let k in entries) {
      if (Channels.has(k) && entries[k].length > 0) {
        Channels.get(k).postMessage({op: 'entries', value: entries[k]})
        processed.push(k)
      } else if (entries[k].length > 0) {
        if (!PostPoned[k]) {
          PostPoned[k] = []
        }
        PostPoned[k] = [...PostPoned[k], ...entries[k]]
      }
    }
  })
}

const Status = new Map()
function checkMachineState () {
  return // not in use yet
  if (!Run) { return }
  const url = new URL(`${KAIROS.getBase()}/store/Evenement/.machinestate`)
  fetch(url)
  .then(response => {
    if (!response.ok) { return {length: 0, data: null} }
    return response.json()
  })
  .then(result => {
    let prmses = []
    for (i = 0; i < result.length; i++) {
      prmses.push(new Promise((resolve, reject) => {
        const entry = result.data[i]
        let channel = entry.resolvedTarget

        if (Symlinks.has(channel)) {
          channel = Symlinks.get(channel)
        }

        if (entry.type === '') { resolve([]); return }
        if (Status.has(entry.type)) {
          entry.type = Status.get(entry.type)
          resolve([channel, entry])
        } else {
          fetch(new URL(`${KAIROS.getBase()}/store/${entry.type}`))
          .then(response => {
            if (!response.ok) { return {length: 0, data: null} }
            return response.json()
          })
          .then(status => {
            if (status.length === 1) {
              const data = Array.isArray(status.data) ? status.data[0] : status.data
              let severity = parseInt(data.severity)
              if (severity < 1000) {
                data.color = 'black'
              } else if (severity < 2000) {
                data.color = 'blue'
              } else if (severity < 3000) {
                data.color = 'darkorange'
              } else {
                data.color = 'red'
              }
              Status.set(entry.type, data)
              entry.type = data
              resolve([channel, entry])
            }
          })
          .catch(reason => {
            console.log(reason)
          })
        }
      }))
    }
    Promise.all(prmses)
    .then((toSend) => {
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
      for (const k in merged) {
        if (Channels.has(k)) {
          Channels.get(k).postMessage({op: 'state', value: merged[k]})
        } else {
          LoadStatus.set(k, merged[k])
        }
      }
    })
  })
  .catch(reason => {
    console.log(reason)
  })
  
}

function runUpdater () {
  if (!Run) { return }
  const url = new URL(`${KAIROS.getBase()}/store/DeepReservation`)

  url.searchParams.set('search.begin', '<' + Range.end.toISOString().split('T')[0])
  url.searchParams.set('search.end', '>' + Range.begin.toISOString().split('T')[0])
  url.searchParams.set('search.deleted', '-')
  fetch(url)
  .then((response) => {
    if (!response.ok) { return {length: 0, data: null} }
    return response.json()
  })
  .then((json) => {
    if (json.length > 0) {
      cacheAndSend(json.data)
    }
  })
  .catch(reason => console.log(reason))
}