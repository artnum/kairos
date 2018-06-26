/* eslint-env browser */
/* global IdxDB, Address */
'use strict'

var Return = function () {
  var table = document.createElement('table')
  if (arguments[1]) {
    arguments[1].appendChild(table)
  } else {
    document.body.appendChild(table)
  }
  table.innerHTML = '<thead><tr><th>Machine</th><th>Référence</th><th>Localité</th><th>Adresse</th><th>Fin</th><th>Annonce</th><th>Contact</th><th>Clef</th><th>Divers</th></tr></thead>'
  table.appendChild(document.createElement('tbody'))
  this.parent = table.lastChild

  this.ww = new Worker('/location/js/ww/return.js')
  this.ww.onmessage = function (msg) {
    if (msg && msg.data) {
      this.query(msg.data).then(function (retval) {
        this.add(retval)
      }.bind(this))
    }
  }.bind(this)
  this.entry = {}
  new IdxDB().then(function (db) {
    this.db = db
    this.run()
  }.bind(this))

  this.bc = new BroadcastChannel('artnum/location')
}

Return.prototype.query = function (retval) {
  return new Promise(function (resolve, reject) {
    fetch('/location/store/DeepReservation/' + retval.target).then(function (response) {
      if (response.ok) {
        response.json().then(function (reservation) {
          if (reservation.type === 'results') {
            fetch('https://aircluster.local.airnace.ch/store/Machine/?search.description=' + reservation.data.target + '&search.airaltref=' + reservation.data.target).then(function (response) {
              if (response.ok) {
                response.json().then(function (machine) {
                  retval._target = reservation.data
                  retval._target._target = machine.data[0]
                  resolve(retval)
                })
              }
            })
          }
        })
      }
    })
  })
}

Return.prototype.run = function () {
  var st = this.db.transaction('return').objectStore('return')
  st.openCursor().onsuccess = function (event) {
    var cursor = event.target.result

    if (!cursor) {
      return
    }

    this.query(cursor.value).then(function (retval) {
      this.add(retval)
    }.bind(this))

    cursor.continue()
  }.bind(this)
}

Return.prototype.html = {
  _txt: function (value) {
    var txt = value
    if (value == null) {
      txt = ''
    } else if (value instanceof Date) {
      txt = value.fullDate() + ' ' + value.shortHour()
    } else if (value instanceof Array) {
      txt = value.join('<br/>')
    }

    txt = txt.replace(/(?:\r\n|\r|\n)/mg, '<br/>')
    return txt
  },
  label: function (value) {
    var span = document.createElement('td')

    span.innerHTML = this._txt(value)
    span.setAttribute('class', 'label')
    return span
  },

  button: function (value) {
    var button = document.createElement('BUTTON')
    button.appendChild(document.createTextNode(value))

    return button
  }
}

Return.prototype.nextStep = function (event) {
  event.stopPropagation()
}

Return.prototype.expandDetails = function (event) {
  var node = event.target

  while (node.nodeName !== 'TR') {
    node = node.parentNode
  }

  var id = node.getAttribute('id')
  var state = node.getAttribute('data-current-state')

  if (state === 'open') {
    node.setAttribute('data-current-state', 'closed')
  } else {
    node.setAttribute('data-current-state', 'open')
  }

  for (node = node.parentNode.firstChild; node; node = node.nextSibling) {
    if (node.getAttribute('data-parent-id') === id) {
      if (state === 'open') {
        node.setAttribute('style', 'display: none')
      } else {
        node.setAttribute('style', '')
      }
    }
  }
}

Return.prototype.add = function (retval) {
  var now = new Date()
  if (this.entry[retval.id] && this.entry[retval.id].domNode) {
    this.parent.removeChild(this.entry[retval.id].domNode)
    this.entry[retval.id].domNode = null
    var node = this.parent.firstChild
    while (node) {
      var tmp = node.nextSibling

      if (node.getAttribute('data-parent-id') === 'return_' + retval.id) {
        this.parent.removeChild(node)
      }
      node = tmp
    }
  }

  if (retval.done || retval.deleted || retval._target.deleted) {
    return
  }

  this.entry[retval.id] = { domNode: document.createElement('tr'), data: retval }
  var dom = this.entry[retval.id].domNode
  var className = 'return'
  if (now.getTime() < new Date(retval._target.end).getTime() && !retval.inprogress) {
    className += ' later'
  }
  if (retval.inprogress) {
    className += ' inprogress'
  }
  if (retval._target.contacts && retval._target.contacts._client) {
    className += ' expandable'
  }

  dom.setAttribute('class', className)
  dom.setAttribute('id', 'return_' + retval.id)
  dom.setAttribute('data-current-state', 'closed')

  dom.appendChild(this.html.label(retval._target._target.cn))
  dom.appendChild(this.html.label(retval._target.target))
  dom.appendChild(this.html.label(retval.locality ? retval.locality : retval._target.locality))
  dom.appendChild(this.html.label(retval.contact ? retval.contact : retval._target.address))
  dom.appendChild(this.html.label(new Date(retval._target.end)))
  dom.appendChild(this.html.label(retval.reported ? new Date(retval.reported) : ''))
  if (retval._target.contacts && retval._target.contacts._retour) {
    var addr = new Address(retval._target.contacts._retour[0])
    dom.appendChild(this.html.label(addr.toArray()))
  } else {
    dom.appendChild(this.html.label(''))
  }
  dom.appendChild(this.html.label(retval.other))
  dom.appendChild(this.html.label(retval.comment))

  /*
  if (retval.inprogress && !retval.done) {
    var x = this.html.button('Fait')
  } else if (!retval.inprogress && !retval.done) {
    x = this.html.button('En cours')
  }
  dom.appendChild(x)
  x.addEventListener('click', this.nextStep.bind(this))
  */
  dom.addEventListener('click', function () {
    this.bc.postMessage({what: 'reservation', id: retval.target, type: 'open'})
    this.bc.postMessage({what: 'window', type: 'close'})
  }.bind(this))

  this.parent.appendChild(dom)
  /* if (retval._target.contacts && retval._target.contacts._client) {
    var x = document.createElement('tr')
    x.setAttribute('data-parent-id', 'return_' + retval.id)
    x.setAttribute('class', 'details')
    x.appendChild(document.createElement('th'))
    x.firstChild.appendChild(document.createTextNode('Client'))
    x.appendChild(this.html.label(new Address(retval._target.contacts._client[0]).toArray()))
    x.lastChild.setAttribute('colspan', '8')
    this.parent.appendChild(x)
  } */
}
