KAIROS.info = function (txt, code) {
  this.log('info', txt, code)
}

KAIROS.warn = function (txt, code) {
  this.log('warning', txt, code)
}

KAIROS.error = function (txt, code) {
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
  div.appendChild(document.createTextNode(' ' + txt))

  window.setTimeout(() => {
    window.requestAnimationFrame(() => div.parentNode.removeChild(div))
  }, timeout)

  div.addEventListener('click', () => {
    window.clearTimeout(timeout)
    div.parentNode.removeChild(div)
  })

  window.requestAnimationFrame(() => document.getElementById('LogLine').appendChild(div))
}