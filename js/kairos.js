KAIROS.timeline = null
KAIROS.dataVersion = 2
KAIROS.Cache = {
  _timeout: 7200000 // 2h cache timeout
} // global cache

KAIROS.getBase = function () {
  if (self) {
    return `${self.location.origin}/${KAIROS.base}`
  }
  return `${window.location.origin}/${KAIROS.base}`
}

KAIROS.getBaseName = function () {
  return KAIROS.base.replace(/\//g, '')
}

KAIROS.uuidV4 = function () {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
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

KAIROS.get = function (resource) {
  if (KAIROS.register.table === undefined) { return null } 
  if (KAIROS.register.table[resource] === undefined) { return null }
  return KAIROS.register.table[resource];
}

/* override fetch to add X-Request-Id automatically */
const GLOBAL = new Function('return this')()
const __kairos_fetch = GLOBAL.fetch
KAIROS.fetch = function (url, options = {}) {
  const originalUrl = url instanceof URL ? url.toString() : url
  let bufferDelay = false

  if (KAIROS.cache?.queryBufferDelay) {
    if (options.method === undefined) { bufferDelay = true }
    else {
      switch(options.method.toLowerCase()) {
        case 'head':
        case 'get':
          bufferDelay = true;
          break
      }
    }
  }

  if (KAIROS.fetch.uuid === undefined) {
    KAIROS.fetch.uuid = KAIROS.uuidV4()
  }
  if (bufferDelay && KAIROS.fetch.current === undefined) {
    KAIROS.fetch.current = new Map()
    KAIROS.purgeDelayedQuery() // start purge loop
  }
  if (bufferDelay) {
    const currentRunning = KAIROS.fetch.current.get(originalUrl)
    if (currentRunning) {
      return currentRunning[0].then(response => { return response.clone() })
    }
  }

  if (KAIROS.fetch.count === undefined) {
    KAIROS.fetch.count = 0
  }

  KAIROS.fetch.count++
  let rid =  `${KAIROS.fetch.uuid}-${new Date().getTime()}-${KAIROS.fetch.count}`
  if (options.headers === undefined) {
    options.headers = new Headers({'X-Request-Id': rid})
  } else {
    if (!(options.headers instanceof Headers)) {
      options.headers = new Headers(options.headers)
    }
    /* x-request-id might be used for auth purpose, don't change */
    if (!options.headers.has('X-Request-Id')) {
      options.headers.set('X-Request-Id', rid)
    }
  }

  if (!(url instanceof URL)) {
    let origin = GLOBAL.location.origin || GLOBAL.origin
    if (origin) {
      url = new URL(url, GLOBAL.location.origin)
    }
  }

  const query = __kairos_fetch(url, options)
  if (bufferDelay) {
    KAIROS.fetch.current.set(originalUrl, [query, Date.now()])
  }

  query
  .then(response => {
    if (response.ok) { return } // don't process good response
    const clonedResponse = response.clone()
    let headers = clonedResponse.headers
    if (!(headers.has('Content-Type') && headers.get('Content-Type') === 'application/json')) { return } // wait for json response
    clonedResponse.json().then(error => {
      if (!error.message) { return }
      switch(Math.trunc(clonedResponse.status / 100)) {
        case 3:
          KAIROS.log(`Message serveur : "${errror.message}"`)
          break
        case 4:
          KAIROS.warn(`Attention serveur : "${errror.message}"`)
          break;
        default:
        case 5:
          KAIROS.error(`Erreur serveur : "${error.message}"`)
          break
      }
    })
  })

  return query.then(response => { return response.clone() })
}

KAIROS.DateFromTS = function(ts) {
  let d = new Date()
  d.setTime(parseInt(ts) * 1000)
  return d
}

fetch = KAIROS.fetch