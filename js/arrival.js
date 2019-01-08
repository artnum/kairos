/* eslint-env browser */
/* global IdxDB, Address, Artnum */
'use strict'

var Arrival = function () {
  var table = document.createElement('table')
  if (arguments[1]) {
    arguments[1].appendChild(table)
  } else {
    document.body.appendChild(table)
  }
  table.innerHTML = '<thead><tr><th>Machine</th><th>Ref</th><th>Localité</th><th>Adresse</th><th>Fin</th><th>Client</th><th>Contact</th><th>Clef</th><th>Matériel</th><th>Divers</th><th>Progression</th></tr></thead>'
  table.appendChild(document.createElement('tbody'))
  this.parent = table.lastChild

  var th = table.getElementsByTagName('thead')[0].childNodes[0].getElementsByTagName('th')
  for (var i = 0; i < th.length; i++) {
    th[i].setAttribute('data-artnum-sortidx', i)
    th[i].addEventListener('click', function (event) {
      var idx = Number(event.target.getAttribute('data-artnum-sortidx'))
      var dir = event.target.getAttribute('data-artnum-sortdir') ? event.target.getAttribute('data-artnum-sortdir') : 'asc'
      this.sort(idx, dir)
      event.target.setAttribute('data-artnum-sortdir', dir === 'asc' ? 'desc' : 'asc')

      for (var i = 0; i < th.length; i++) {
        if (th[i] !== event.target) {
          th[i].removeAttribute('data-artnum-sortdir')
        }
      }
    }.bind(this))
  }

  this.ww = new Worker(Artnum.Path.url('/js/ww/return.js'))
  this.ww.onmessage = function (msg) {
    if (msg && msg.data) {
      if (msg.data.delete && msg.data.id) {
        console.log('delete', msg.data)
        var node = document.getElementById('return_' + msg.data.id)
        if (node) {
          this.parent.removeChild(node)
        }
      } else {
        this.query(msg.data).then(function (retval) {
          this.add(retval)
        }.bind(this))
      }
    }
  }.bind(this)
  this.entry = {}
  new IdxDB().then(function (db) {
    this.db = db
    this.run()
  }.bind(this))

  this.bc = new BroadcastChannel(Artnum.Path.bcname('artnum/location'))
  this.RChannel = new BroadcastChannel(Artnum.Path.bcname('reservations'))
}

Arrival.prototype.query = function (retval) {
  return new Promise(function (resolve, reject) {
    fetch(Artnum.Path.url('/store/DeepReservation/' + retval.target)).then(function (response) {
      if (response.ok) {
        response.json().then(function (reservation) {
          if (reservation.type === 'results' && reservation.data !== null) {
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

Arrival.prototype.run = function () {
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

Arrival.prototype.html = {
  _txt: function (value) {
    var txt = value
    if (value == null) {
      txt = ''
    } else if (value instanceof Date) {
      txt = value.shortDate() + '<br />' + value.shortHour()
    } else if (value instanceof Array) {
      txt = value.join('<br/>')
    }

    txt = txt.replace(/(?:\r\n|\r|\n)/mg, '<br/>')
    return txt
  },
  _value: function (value) {
    var val = value
    if (value == null) {
      val = ''
    } else if (value instanceof Date) {
      val = value.getTime()
    } else if (value instanceof Array) {
      val = value.join('')
    }

    val = String(val).replace(/(?:\r\n|\r|\n)/mg, '')
    return val
  },
  label: function (value) {
    var span = document.createElement('td')

    span.innerHTML = this._txt(value)
    var className = 'label'
    if (arguments[1]) {
      className += ' ' + arguments[1]
    }
    span.setAttribute('class', className)
    span.setAttribute('data-artnum-sort', this._value(value))
    return span
  },

  button: function (value) {
    var button = document.createElement('DIV')
    button.setAttribute('class', 'button')
    button.appendChild(document.createTextNode(value))

    return button
  },

  cell: function () {
    var td = document.createElement('TD')
    if (arguments[0]) {
      if (Array.isArray(arguments[0])) {
        for (var i = 0; i < arguments[0].length; i++) {
          if (arguments[0][i] instanceof HTMLElement) {
            td.appendChild(arguments[0][i])
          }
        }
      } else if (arguments[0] instanceof HTMLElement) {
        td.appendChild(arguments[0])
      }
    }
    if (arguments[1]) {
      td.setAttribute('data-artnum-sort', arguments[1])
    }
    return td
  }
}

Arrival.prototype.done = function (event) {
  event.stopPropagation()
  var req = { id: this.id }
  if (this.done) {
    req.done = ''
  } else {
    var now = new Date()
    req.done = now.toISOString()
  }
  Artnum.Query.exec(Artnum.Path.url('/store/Arrival/' + req.id), {method: 'PUT', body: req}).then(function (result) {
    if (result.success && result.length === 1) {
      if (window.localStorage.getItem(Artnum.Path.bcname('autoprint'))) {
        fetch(Artnum.Path.url('exec/auto-print.php', {params: {type: 'decompte', file: 'pdfs/decompte/' + this.target}}))
      }
      this.RChannel.postMessage({op: 'touch', id: this.target})
    }
  }.bind(this))
}

Arrival.prototype.progress = function (event) {
  event.stopPropagation()
  var req = { id: this.id }
  if (this.inprogress) {
    req.inprogress = ''
  } else {
    var now = new Date()
    req.inprogress = now.toISOString()
  }

  fetch(Artnum.Path.url('/store/Arrival/' + req.id), {method: 'PUT', body: JSON.stringify(req)}).then(function () {
    this.RChannel.postMessage({op: 'touch', id: this.target})
  }.bind(this))
}

Arrival.prototype.expandDetails = function (event) {
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

Arrival.prototype.sort = function (idx, direction = 'asc') {
  var i = 1
  var getValue = function (row, col) {
    return this.parent.childNodes[row].childNodes[col].getAttribute('data-artnum-sort')
  }.bind(this)
  var swap = function (row1, row2) {
    var x = row1.parentNode.removeChild(row1)
    row2.parentNode.insertBefore(x, row2)
  }

  while (i < this.parent.childNodes.length) {
    var j = i
    while (j > 0 &&
      (direction === 'asc' ? getValue(j - 1, idx) < getValue(j, idx) : getValue(j - 1, idx) > getValue(j, idx))) {
      swap(this.parent.childNodes[j], this.parent.childNodes[j - 1])
      j--
    }
    i++
  }
}

Arrival.prototype.add = function (retval) {
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
  var magnitude = 0
  if (now.getTime() < new Date(retval._target.end).getTime() && !retval.inprogress) {
    className += ' later'
    magnitude = 1
  }
  if (retval.inprogress) {
    className += ' inprogress'
    magnitude = 2
  }

  dom.setAttribute('class', className)
  dom.setAttribute('id', 'return_' + retval.id)
  dom.setAttribute('data-current-state', 'closed')

  var rep = retval.reported ? new Date(retval.reported) : ''
  if (rep !== '') { rep = '\n<span class="addendum">Annonce : ' + rep.fullDate() + ' ' + rep.shortHour() + '</span>' }
  dom.appendChild(this.html.label(retval._target._target.cn + rep))
  dom.appendChild(this.html.label(retval._target.target))
  dom.appendChild(this.html.label(retval.locality ? retval.locality : retval._target.locality))
  dom.appendChild(this.html.label(retval.contact ? retval.contact : retval._target.address))
  dom.appendChild(this.html.label(new Date(retval._target.end)))
  if (retval._target.contacts && retval._target.contacts._client && retval._target.contacts._client[0]) {
    var addr = new Address(retval._target.contacts._client[0])
    dom.appendChild(this.html.label(addr.toArray()[0]))
  } else {
    dom.appendChild(this.html.label(''))
  }
  if (retval._target.contacts && retval._target.contacts._retour) {
    addr = new Address(retval._target.contacts._retour[0])
    dom.appendChild(this.html.label(addr.toArray()))
  } else if (retval._target.contacts && retval._target.contacts._place) {
    addr = new Address(retval._target.contacts._place[0])
    dom.appendChild(this.html.label(addr.toArray()))
  } else if (retval._target.contacts && retval._target.contacts._responsable) {
    addr = new Address(retval._target.contacts._responsable[0])
    dom.appendChild(this.html.label(addr.toArray()))
  } else {
    dom.appendChild(this.html.label(''))
  }
  dom.appendChild(this.html.label(retval.other))
  var equipment = ''
  if (retval._target.complements.length > 0) {
    retval._target.complements.forEach(function (c) {
      var duration = ''
      if (c.follow === '1') {
        duration = 'toute la réservation'
      } else {
        c.begin = new Date(c.begin)
        c.end = new Date(c.end)
        duration = 'du ' + c.begin.fullDate() + ' ' + c.begin.shortHour() + ' au ' + c.end.fullDate() + ' ' + c.end.shortHour()
      }

      equipment += '— ' + c.number + ' ' + c.type.name + ' ' + duration + '\n'
    })
  }
  if (retval._target.equipment) {
    equipment += retval._target.equipment
  }
  dom.appendChild(this.html.label(equipment, 'wide'))
  dom.appendChild(this.html.label(retval.comment, 'wide'))

  if (retval.inprogress && !retval.done) {
  } else if (!retval.inprogress && !retval.done) {
  }
  var doneBtn = this.html.button('Fait')
  var progBtn = this.html.button('En cours')
  if (retval.inprogress) {
    progBtn.setAttribute('class', 'button selected')
  }

  retval.RChannel = this.RChannel
  dom.appendChild(this.html.cell([progBtn, doneBtn], magnitude))
  doneBtn.addEventListener('click', this.done.bind(retval))
  progBtn.addEventListener('click', this.progress.bind(retval))

  dom.addEventListener('click', function () {
    this.bc.postMessage({what: 'reservation', id: retval.target, type: 'open'})
    this.bc.postMessage({what: 'window', type: 'close'})
  }.bind(this))

  this.parent.appendChild(dom)
}
