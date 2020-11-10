KAIROS.timeline = null

KAIROS.getBase = function () {
  return `${window.location.origin}/${KAIROS.base}`
}

KAIROS.getBaseName = function () {
  return KAIROS.base.replace(/\//g, '')
}

/* override fetch to add X-Request-Id automatically */
const GLOBAL = new Function('return this')()
const __kairos_fetch = GLOBAL.fetch
KAIROS.fetch = function (url, options = {}) {
  if (KAIROS.fetch.uuid === undefined) {
    KAIROS.fetch.uuid = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
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

  let query = __kairos_fetch(url, options)
  query.then(response => {
    if (response.ok) { return } // don't process good response
    let headers = response.headers
    if (!(headers.has('Content-Type') && headers.get('Content-Type') === 'application/json')) { return } // wait for json response
    response.json().then(error => {
      if (!error.message) { return }
      switch(Math.trunc(response.status / 100)) {
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

  return query
}
fetch = KAIROS.fetch