KAIROS.info = function (txt, code = 0) {
  this.log('info', txt, code)
}

KAIROS.warn = function (txt, code = 0) {
  this.log('warning', txt, code)
}

KAIROS.error = function (txt, code = 0) {
  this.log('error', txt, code)
}

KAIROS.log = function (level, txt, code) {
  var timeout = 10000
  var div = document.createElement('DIV')

  switch (level) {
    case 'info': timeout = 3000
      div.appendChild(document.createElement('I'))
      div.lastChild.setAttribute('class', 'fas fa-info-circle')
      break
    case 'error':
      div.appendChild(document.createElement('I'))
      div.lastChild.setAttribute('class', 'fas fa-times-circle')
      break
    case 'warning':
      div.appendChild(document.createElement('I'))
      div.lastChild.setAttribute('class', 'fas fa-exclamation-circle')
      break
  }

  div.setAttribute('class', 'message ' + level)
  if (!code) { code = '' }
  else { code = `(${code})` }
  div.appendChild(document.createTextNode(`${txt} ${code}`))

  window.setTimeout(() => {
    window.requestAnimationFrame(() => div.parentNode.removeChild(div))
  }, timeout)

  div.addEventListener('click', () => {
    window.clearTimeout(timeout)
    div.parentNode.removeChild(div)
  })

  window.requestAnimationFrame(() => document.getElementById('LogLine').appendChild(div))
}

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
    /* replace request id anyway */
    options.headers.set('X-Request-Id', rid)
  }

  if (!(url instanceof URL)) {
    url = new URL(url)
  }

  return __kairos_fetch(url, options)
}
fetch = KAIROS.fetch