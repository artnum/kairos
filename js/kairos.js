const GLOBAL = new Function('return this')() || (42, eval)('this')
KAIROS.timeline = null
KAIROS.dataVersion = 2
KAIROS.Cache = {
  _timeout: 7200000 // 2h cache timeout
} // global cache

KAIROS.init = function () {
  return new Promise((resolve, reject) => {
    Promise.all([
      KAIROS.getClientId(),
      KAIROS.cacheInit()
    ])
    .then(([clientid, cache]) => {
      resolve(clientid)
    })
    .catch(reason => {
      reject(reason)
    })
  })
}

KAIROS.cacheInit = function () {
  return new Promise((resolve, reject) => {
    if (KAIROS.kache) { resolve(KAIROS.kache); return 3}

    KAIROS.kache = {
      c: new Map(),
      reqid (request) {
        return new Promise((resolve, reject) => {
          const req = request.clone()
          let id = `${String(request.method).toLowerCase()}-${request.url.toString()}`
          req.arrayBuffer()
          .then(body => {
            return crypto.subtle.digest('SHA-1', body)
          })
          .then(hash => {
            id += `-${Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')}`
            resolve(id)
          })
        })
      },
      put (request, response) {
        return new Promise((resolve) => {
          const hCache = response.headers.get('Cache-Control')
          if (!hCache) { resolve(false); return }
          const argsCache = hCache.split(',').map(v => { return v.trim() })
          if (argsCache.indexOf('public') === -1) { resolve(false); return }
          let maxage = 3600
          for (const arg of argsCache ) {
            if (arg.toLowerCase().substr(0, 8) === 'max-age=') {
              const txtMaxAge = arg.split('=', arg, 2).map(v => { return v.trim() })[1]
              if (!isNaN(parseInt(txtMaxAge, 10))) {
                maxage = parseInt(txtMaxAge, 10)
              }
            }
          }
          if (maxage === 0) { resolve(false); return }
          this.reqid(request)
          .then(id => {
            resolve(this.c.set(id, {until: new Date().setTime(new Date().getTime() + maxage * 1000), response: response.clone()}))
          })
        })
      },
      match(request) {
        return new Promise((resolve) => {
          this.reqid(request)
          .then(id => {
            const response = this.c.get(id)
            if (!response) { resolve(undefined); return }
            if (response.until < new Date().getTime()) {  this.c.delete(id); resolve(undefined); return }
            resolve(response.response.clone())
          })
        })
      }
    }
    resolve(KAIROS.kache)
  })
}

KAIROS.getBase = function () {
  if (self) {
    return `${self.location.origin}/${KAIROS.base}`
  }
  return `${window.location.origin}/${KAIROS.base}`
}
KAIROS.getServer = function () {
  if (self) {
    return `${self.location.origin}`
  }
  return `${window.location.origin}`
}

KAIROS.getBaseName = function () {
  return KAIROS.base.replace(/\//g, '')
}

KAIROS.URL = function (tpl) {
  tpl = tpl.replace('%KBASE%', KAIROS.getBase())
  tpl = tpl.replace('%KSERVER%', KAIROS.getServer())
  tpl = tpl.replace('%KBASENAME%', KAIROS.getBaseName())
  return new URL(tpl, KAIROS.getServer())
}

if (typeof document !== 'undefined') {
  const scriptNode = document.currentScript
  const url = new URL(scriptNode.src, window.location)
  KAIROS.fetcher = new Worker(`${KAIROS.getBase()}/js/ww/fetcher.js?${url.search.substring(1)}`)
} else {
  KAIROS.fetcher = new Worker(`${KAIROS.getBase()}/js/ww/fetcher.js?${location.search.substring(1)}`)
}

KAIROS.fetcher.onmessage = function (msgEvent) {
  const msg = msgEvent.data
  const request = KAIROS.fetch.__pending.get(msg.id)
  if (!request) { return }
  KAIROS.fetch.__pending.delete(msg.id)
  try {
    switch (msg.op) {
      case 'query': 
        if (msg.status === 401 && typeof window !== undefined) { window.location.reload() }
        if (msg.error) {
          request[1](msg.content)
        } else {
          request[0](msg.content)
        }
      break
      case 'fetch':
        if (msg.status === 401 && typeof window !== undefined) { window.location.reload() }
        if (msg.error) {
          request[1](msg.content)
        } else {
          request[0]({
            ok: true,
            headers: new Headers(msg.headers),
            json: function () { return new Promise((resolve) => { resolve(msg.content)}) },
            text: function () { return new Promise((resolve) => { 
              if (this.headers.get('Content-Type') === 'application/json') {
                resolve(JSON.stringify(msg.content)) 
              } else {
                resolve(msg.content)
              }
            }) }
          })
        }
        break
    }
  } catch(reason) {
    console.log(reason)
  }
}

KAIROS.uuidV4 = function () {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
}

KAIROS.setClientId = function (cid) {
  KAIROS.getClientId.__clienti = cid
}

KAIROS.getClientId = function () {
  return new Promise((resolve, reject) => {
    if (KAIROS.getClientId.__clientid !== undefined) { resolve(KAIROS.getClientId.__clientid); return }
    let idString = (new Date()).toISOString()
    for (const k of ['appCodeName', 'appName', 'appVersion', 'buildId', 'language', 'oscpu', 'platform', 'product', 'productSub', 'userAgent', 'vendor']) {
      idString += String(navigator[k])
    }
    idString +=  crypto.getRandomValues(new Uint16Array(1)).toString(16)
    crypto.subtle.digest('SHA-1', (new TextEncoder()).encode(idString))
    .then(hash => {
      KAIROS.getClientId.__clientid = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      resolve(KAIROS.getClientId.__clientid)
    })
    .catch(reason => {
      throw new Error(reason)
    })
  })
}

KAIROS.eventTarget = new EventTarget()

KAIROS.addEventListener = function (type, callback, options) {
  KAIROS.eventTarget.addEventListener(type, callback, options)
}

KAIROS.removeEventListener = function (type, callabck, options) {
  KAIROS.eventTarget.removeEventListener(type, callback, options) 
}

KAIROS.register = function (resource, object) {
  if (KAIROS.register.table === undefined) { KAIROS.register.table = {} }
  if (KAIROS.register.table[resource]) {
    if (typeof KAIROS.register.table[resource].update === 'function' ) {
      KAIROS.register.table[resource].update(object)
    } else {
      KAIROS.register.table[resource] = object
    }
  } else {
    KAIROS.register.table[resource] = object
  }
  KAIROS.eventTarget.dispatchEvent(new CustomEvent('resource-add', {detail: object}))
}

KAIROS.unregister = function (resource) {
  let object
  if (KAIROS.register.table === undefined) { return }
  if (KAIROS.register.table[resource]) {
    object = KAIROS.register.table[resource]
    if (typeof KAIROS.register.table[resource].remove === 'function' ) {
      KAIROS.register.table[resource].remove(object)
      delete KAIROS.register.table[resource]
    } else {
      delete KAIROS.register.table[resource]
    }
  }
  KAIROS.eventTarget.dispatchEvent(new CustomEvent('resource-delete', {detail: object}))
}

KAIROS.purgeDelayedQuery = function (iter) {
  if (typeof requestIdleCallback !== 'function') {
    /* web worker run */
    const start = performance.now()
    let iterator = iter === undefined ? KAIROS.fetch.current.entries() : iter
    const now = Date.now()
    while (performance.now() - start < 50) {
      const current = iterator.next()
      if (current.done) { iterator = KAIROS.fetch.current.entries(); continue }
      if (now - current.value[1][1] > KAIROS.cache?.queryBufferDelay) {
        KAIROS.fetch.current.delete(current.value[0])
      }
    }
    setTimeout(() => KAIROS.purgeDelayedQuery(iterator), 500)  
    return;
  }
  requestIdleCallback(deadline => {
    let iterator = iter === undefined ? KAIROS.fetch.current.entries() : iter
    const now = Date.now()
    const start = performance.now()
    while (performance.now() - start < 10) { // frontend have 10 ms
      const current = iterator.next()
      if (current.done) { iterator = KAIROS.fetch.current.entries(); continue }
      if (now - current.value[1][1] > KAIROS.cache?.queryBufferDelay) {
        KAIROS.fetch.current.delete(current.value[0])
      }
    }
    setTimeout(() => KAIROS.purgeDelayedQuery(iterator), 500)  
  })
}

KAIROS.states = new Map()
KAIROS.states.set('lockShowHideRelation', false)
KAIROS.setState = function (name, value) {
  KAIROS.states.set(name, value)
}
KAIROS.getState = function (name) {
  return KAIROS.states.get(name)
}
KAIROS.unsetState = function (name) {
  KAIROS.states.delete(name)
}

KAIROS.get = function (resource) {
  if (KAIROS.register.table === undefined) { return null } 
  if (KAIROS.register.table[resource] === undefined) { return null }
  return KAIROS.register.table[resource];
}

KAIROS.global = GLOBAL

/* override fetch to add X-Request-Id automatically */
const __kairos_fetch = GLOBAL.fetch
KAIROS._runningQueries = new Map()

KAIROS.abortAllRequest = function () {
  for (const [key, query] of KAIROS._runningQueries) {
    query.abort()
  }
}

KAIROS.abortRequest = function (rid) {
  if (KAIROS._runningQueries.has(rid)) {
    KAIROS._runningQueries.get(rid).abort()
    KAIROS._runningQueries.delete(rid)
  }
}

KAIROS.getRequestId = function () {
  if (KAIROS.fetch.count === undefined) {
    KAIROS.fetch.count = 0
  }
  if (KAIROS.fetch.uuid === undefined) {
    KAIROS.fetch.uuid = KAIROS.uuidV4()
  }
  KAIROS.fetch.count++
  return `${KAIROS.fetch.uuid}-${new Date().getTime()}-${KAIROS.fetch.count}`
}

KAIROS.fetch = function (url, options = {}) {
  return new Promise((resolve, reject) => {
    if (!KAIROS.fetch.__id) {
      KAIROS.fetch.__id = 0
      KAIROS.fetch.__pending = new Map()
    }
    const id = ++KAIROS.fetch.__id
    if (options.headers && options.headers instanceof Headers) {
      const headers = {}
      for (const k of options.headers.keys()) {
        headers[k] = options.headers.get(k)
      }
      options.headers = headers
    } else {
      options.headers = {}
    }
    
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json' // what we use everywhere
    }
    const op = options._kairos_op ? options._kairos_op : 'fetch'
    KAIROS.getClientId()
    .then(cid => {
      if (!options.headers) { options.headers = {} }
      options.headers['X-Client-Id'] = cid
      KAIROS.fetcher.postMessage({op, url: url instanceof URL ? url.toString() : url, options: options, id})
      KAIROS.fetch.__pending.set(id, [resolve, reject])
    })
  })
}

KAIROS.syslog = function(error) {
  console.trace()
  console.log(error)
}

KAIROS.bug = KAIROS.syslog

KAIROS.DateFromTS = function(ts) {
  let d = new Date()
  d.setTime(parseInt(ts) * 1000)
  return d
}

/* must push data to server to have log */
KAIROS.ioError = function (responseOrReason) {
  console.log(responseOrReason)
}

fetch = KAIROS.fetch