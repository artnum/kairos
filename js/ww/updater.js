/* eslint-env worker */
importScripts('../gevent.js')
importScripts('lib/idx-db-reservation-cache.js')
importScripts('lib/channel.js')
importScripts('lib/fetch.js')
importScripts('lib/error.js')

const KLogChannel = new ErrorChannel()
const CacheDB = new IdxDbReservationCache()
const LoadStatus = new Map()
const Entries = new Map()
const Channels = new Map()
const Symlinks = new Map()

const Ports = []
const KFetch = new Fetch()
let Range = null
let PostPoned = {}
let Run = false

const EVTOperation = Object.freeze({
  write: {
    reservation(msg) {
      updateEntry(msg.id, msg.cid)
    },
    arrival(msg) {
      fetch(new URL(`$kairos/Arrival/${msg.id}`, location))
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
    contact(msg) {
      fetch(new URL(`$kairos/ReservationContact/${msg.id}`, location))
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
    evenement(msg) {

    }
  },
  delete: {
    reservation(msg) {
      CacheDB.findById(msg.id)
        .then(entry => {
          return CacheDB.delete(entry)
        })
        .then(entry => {
          const channel = Ports.find(p => p.isMe(entry.target))
          if (channel) { 
            channel.message({ op: 'remove', reservation: entry, clientid: msg.cid }) 
          }
        })
        .catch(error => {
          KLogChannel.log('error', error)
        })
    },
    evenement(msg) { }
  }
})

function connectEventSource() {
  const evtsource = new EventSource(new URL('$kevent', location))
  evtsource.onmessage = event => {
    const msg = JSON.parse(event.data)
    self.postMessage({ op: 'log', data: msg })
    if (msg.operation === undefined) { return }
    if (msg.cid === undefined) { return }
    if (EVTOperation[msg.operation] && EVTOperation[msg.operation][msg.type]) {
      EVTOperation[msg.operation][msg.type](msg)
    } else {
      new GEvent().send('kobjet.something', msg)
    }
  }
  evtsource.onerror = event => {
    KLogChannel.log('error', 'ERR:ConnectToServer')
    evtsource.close()
    setTimeout(connectEventSource.bind(self), 1000)
  }
}
connectEventSource()

self.onmessage = function (msg) {
  switch (msg.data.op) {
    case 'ready':
      KFetch.setAuthToken(msg.data.token)
      if (msg.data.clientid) {
        KFetch.setClientId(msg.data.clientid)
      }
      Run = true
      CacheDB.open()
        .then(_ => {
          runUpdater()
        })
      break
    case 'newTarget':
      return (() => {
        const targetId = String(msg.data.target)
        if (msg.ports.length <= 0 || !msg.data.target) { return }

        const channel = (() => {
          const c = Ports.find(p => p.isMe(msg.data.target))
          if (c) {
            c.setPort(msg.ports[0])
            return c
          }
          const cc = new Channel(targetId, msg.ports[0])
          Ports.push(cc)
          return cc
        })()

        channel.onMessage(targetMessages)
        Ports.push(channel)
        if (PostPoned[targetId]) {
          channel.message({ op: 'entries', value: PostPoned[targetId] })
          delete PostPoned[targetId]
        }
        if (LoadStatus.has(targetId)) {
          channel.message({ op: 'state', value: LoadStatus.get(targetId) })
          LoadStatus.delete(targetId)
        }
      })()
    case 'symlinkTarget':
      if (msg.data.source === undefined || msg.data.destination === undefined) { return }

      const targetId = String(msg.data.source)
      const channel = (() => {
        const c = Ports.find(p => p.isMe(msg.data.target))
        if (c) { return c }
        const cc = new Channel(targetId, null)
        Ports.push(cc)
        return cc
      })()
      channel.addSame(msg.data.destination)
      break
    case 'move':
      if (Range === null) {
        Range = { begin: msg.data.begin, end: msg.data.end }
      } else {
        Range.begin = msg.data.begin
        Range.end = msg.data.end
      }
      runUpdater()
      break
  }
}

function dstamp(date) {
  date = Date.parse(date)
  if (isNaN(date)) {
    return null
  }

  return date
}

function targetMessages(msg, force = false) {
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
        fetch(new URL(`$kairos/Reservation/${msg.data.reservation}`, location))
          .then((response) => {
            if (!response.ok) { return null; }
            return response.json()
          })
          .then(json => {
            if (!json) { return; }
            if (!json.success) { return; }
            cacheAndSend(Array.isArray(json.data) ? json.data : [json.data], force, msg.clientid)
          })
      }
      break
  }
}

function updateEntry(entryId, clientid) {
  KLogChannel.log('info', `updateEntry ${entryId}`)
  KFetch.get(new URL(`$kairos/Reservation/${entryId}`, location))
    .then(response => {
      if (!response.content) { return }
      reservation = Array.isArray(response.content.data) ? response.content.data[0] : response.content.data
      CacheDB.get(reservation.uuid)
        .then(previousEntry => {
          if (previousEntry && previousEntry.target !== reservation.target) {
            const oldChannel = Ports.find(p => p.isMe(previousEntry.target))
            if (oldChannel) {
              oldChannel.message({ op: 'remove', reservation: previousEntry, clientid })
            }
          }

          CacheDB.add(reservation) // put in local cache
          const channel = Ports.find(p => p.isMe(reservation.target))
          if (!channel) { return }
          channel.message({ 'op': 'entries', 'value': [reservation] })
        })
        .catch(reason => {
          KLogChannel.log('error', reason)
        })
    })
}

function cacheAndSend(data, nocache = false) {
  new Promise((resolve, reject) => {
    data.sort((a, b) => {
      return a.target.localeCompare(b.target)
    })
    const current = {
      channel: null,
      target: null,
      entries: []
    }
    Promise.allSettled(data.map((entry) => {
      return new Promise((resolve, reject) => {

        /* not used anymore but maybe some code rely on "interventions" to be
         * present in the entry */
        entry.interventions = []

        /* with no cache, we don't need to check if the entry is different from
         * the cache as it can't be different (except if the cache changes from
         * another source but it's gonna be fixed by the next server query)
         */
        ; (() => {
          if (nocache) { return Promise.resolve(undefined) }
          return CacheDB.get(entry.uuid)
        })()
          .then(previousEntry => {

            /* previous entry had a different target */
            if (previousEntry && previousEntry.target !== entry.target) {
              /* remove can't be sent in array */
              const oldChannel = Ports.find(p => p.isMe(previousEntry.target))
              if (oldChannel) {
                oldChannel.message({ op: 'remove', reservation: previousEntry, clientid: null })
              }
            }

            ; (() => {
              if (nocache) { return Promise.resolve() }
              return CacheDB.add(entry)
            })()
              .then(_ => {
                const channel = Ports.find(p => p.isMe(entry.target))
                if (!channel) { return }
                /* no current target, start a new set */
                if (current.target === null) {
                  current.channel = channel
                  current.target = entry.target
                  current.entries.push(entry)
                  return resolve()
                }

                /* same target, add to current set */
                if (current.target === entry.target) {
                  current.entries.push(entry)
                  return resolve()
                }

                /* different target, send current set and start a new set */
                current.channel.message({ 'op': 'entries', 'value': current.entries })

                current.channel = channel
                current.target = entry.target
                current.entries = [entry]

                resolve()
              })
          })
      })
    }))
      .then(() => {
        /* send the last set */
        if (current.target) {
          current.channel.message({ 'op': 'entries', 'value': current.entries })
        }
        resolve()
      })
      .catch(reason => {
        reject(reason)
      })
  })
}

const Status = new Map()
/* Limit the server query to MaxServerQueryTimeMS ms.
 * In between that time, it uses only local cache.
 */
const MaxServerQueryTimeMS = 100
function runUpdater() {
  if (!Run) { return }
  if (!Range) { return }
  const url = new URL(`$kairos/Reservation/_query`, location)
  const query = {
    begin: ['<', Range.end.toISOString().split('T')[0]],
    end: ['>', Range.begin.toISOString().split('T')[0]],
    deleted: '-'
  }

  CacheDB.find({ begin: Range.begin, end: Range.end })
    .then(results => {
      if (results.length > 0) {
        /* send cached data, no need to cache back */
        return cacheAndSend(results, true)
      }
      return Promise.resolve()
    })
    .catch(reason => {
      KLogChannel.log('error', reason)
    })

  if (runUpdater.timer > performance.now() - MaxServerQueryTimeMS) { return }
  runUpdater.timer = performance.now()
  KFetch.post(url, { body: query })
    .then(response => {
      const json = response.content
      if (!json) { return }
      if (json.length <= 0) { return }
      cacheAndSend(json.data)
    })
    .catch(reason => {
      KLogChannel.log('error', reason)
    })
}