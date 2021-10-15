function KReservation (opts) {
  this.opts = opts
  this.data = {
    reservation: new Map(),
    locality: new Map(),
    machine: new Map(),
    creator: new Map(),
    technician: new Map(),
    addresses: new Map(),
    arrival: new Map(),
    status: new Map()
  }

  this.promise = {
    locality: null,
    resource: null,
    creator: null,
    technician: null,
    addresses: null,
    arrival: null,
    status: null
  }

  this.inited = new Promise((resolve) => {
    this._initresolve = resolve
  })
  this.evttarget = new EventTarget()
}

KReservation._registry = new Map()

KReservation.getById = function (id) {
  const r = KReservation._registry.get(id)
  if (r) {
    r.atime = new Date().getTime()
    KReservation._registry.set(id, r)
    return r.data
  }
  return undefined
}

KReservation.load = function (id) {
  return new Promise((resolve, reject) => {
    fetch(new URL(`${KAIROS.getBase()}/store/Reservation/${id}`))
    .then(response => {
      if (!response.ok) { throw new Error('ERR:Server') }
      return response.json()
    })
    .then(result => {
          if (result.length < 1) { throw new Error('DATA:Inexistant') }
          const reservation = new KReservation()
          return reservation.extUpdate(Array.isArray(result.data) ? result.data[0] : result.data)
    })
    .then(reservation => {
      if (reservation.ok) { throw new Error('DATA:Unloadable') }
      resolve(reservation)
    })
    .catch(reason => {
      reject(reason)
    })
  })
}

/* some json data obtained elsewhere are available */
KReservation.prototype.extUpdate = function (reservation) {
  this._load = new Promise((resolve, reject) => {
    for (const key in reservation) {
      switch (key) {
        case 'other':
          try {
            const other = JSON.parse(reservation[key])
            for (const k in other) {
              other[k] = KSano.auto(other[k])
            }
            this.set('other', other)
          } catch (reason) {
            throw new Error('DATA:Corrupt')
          }
          break
        case 'deliveryBegin':
        case 'deliveryEnd':
        case 'begin':
        case 'end':
          if (!reservation[key]) { break; }
          this.set(key, new Date(reservation[key]))
          break
        case 'version':
          this.set(key, KSano.num(reservation[key]))
          break
        case 'created':
        case 'modification':
          this.set(key, KAIROS.DateFromTS(reservation[key]))
          break
        default:
            this.set(key, KSano.txt(reservation[key]))
          break
      }
    }
    this.set('duration', this.get('end').getTime() - this.get('begin').getTime())
    this.set('delivery',
      {
        begin: this.has('deliveryBegin') ? this.get('deliveryBegin') : this.get('begin'),
        end: this.has('deliveryEnd') ? this.get('deliveryEnd') : this.get('end')
      }
    )
    this.ok = true
    Promise.allSettled([
      this.loadMachine(),
      this.loadCreator(),
      this.loadTechnician(),
      this.loadLocality(),
      this.loadContact(),
      this.loadArrival(),
      this.loadStatus()
    ])
    .then(_ => { 
      resolve(this)
    })
  })
  return this._load
}

KReservation.prototype.ready = function () {
  return this._load
}

KReservation.prototype.set = function (name, value) {
  try {
    const tree = name.split('.')
    if (tree.length === 1) {
      return this.data.reservation.set(tree.pop(), value)
    } else {
      switch(tree.shift()) {
        case '_': return this.data[category] = value
        case 'locality': return this.data.locality.set(tree.pop(), value)
        case 'machine': return this.data.machine.set(tree.pop(), value)
        case 'creator': return this.data.creator.set(tree.pop(), value)
        case 'technician': return this.data.technician.set(tree.pop(), value)
        case 'addresses': return this.data.addresses.set(tree.pop(), value)
        case 'arrival': return this.data.arrival.set(tree.pop(), value)
        case 'status': return this.data.status.set(tree.pop(), value)
      }
    }
  } catch(reason) {
    KAIROS.bug(reason)
    return undefined
  } 
}

KReservation.prototype.get = function (name) {
  try {
    const tree = name.split('.')
    if (tree.length === 1) {
      return this.data.reservation.get(tree.pop())
    } else {
      switch(tree.shift()) {
        case '_': return this.data[category]
        case 'locality': return this.data.locality.get(tree.pop())
        case 'machine': return this.data.machine.get(tree.pop())
        case 'creator': return this.data.creator.get(tree.pop())
        case 'technician': return this.data.technician.get(tree.pop())
        case 'addresses': return this.data.addresses.get(tree.pop())
        case 'arrival': return this.data.arrival.get(tree.pop())
        case 'status': return this.data.status.get(tree.pop())
      }
    } 
  } catch (reason) {
    KAIROS.bug(reason)
    return undefined
  }
}

KReservation.prototype.has = function (name) {
  try {
    const tree = name.split('.')
    if (tree.length === 1) {
      return this.data.reservation.has(tree.pop())
    } else {
      const category = tree.shift()
      switch(category) {
        case '_': return this.data[category] !== undefined
        case 'locality': return this.data.locality.has(tree.pop())
        case 'machine': return this.data.machine.has(tree.pop())
        case 'creator': return this.data.creator.has(tree.pop())
        case 'technician': return this.data.technician.has(tree.pop())
        case 'addresses': return this.data.addresses.has(tree.pop())
        case 'arrival': return this.data.arrival.has(tree.pop())
        case 'status': return this.data.status.has(tree.pop())
      }
    }
  } catch (reason) {
    KAIROS.bug(reason)
    return undefined
  }
}

KReservation.prototype.serverCompare = function () {
  return new Promise((resolve, reject) => {
    fetch(new URL(`${KAIROS.getBase()}/store/Reservation/.version?id=${this.get('id')}`))
    .then(response => {
      if (!response.ok) { return null }
      return response.json()
    })
    .then(result => {
      if (!result) { return false }
      if (result.length <= 0 || result.length > 1) { return false }
      const data = Array.isArray(result.data) ? result.data[0] : result.data
      if (!data.version) { return false }
      if (KSano.num(data.version) !== this.get('version')) { return false }
      return true
    })
    .then(same => {
      resolve(same)
    })
  })
}

KReservation.prototype.loadMachine = function () {
  this.promise.machine = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    fetch(new URL(`${KAIROS.getBase()}/store/Machine/${this.get('target')}`)).then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        if (result.length !== 1) { resolve(); return }
        const machine = Array.isArray(result.data) ? result.data[0] : result.data
        for (const key in machine) {
          this.set(`machine.${key}`, machine[key])
        }
        resolve(this.get('machine._'))
      })
    })
  })
}

KReservation.prototype.getYear = function () {
  return this.get('begin').getFullYear()
}

KReservation.prototype.getMonth = function () {
  return this.get('begin').getMonth() + 1
}

KReservation.prototype.getId = function () {
  return this.get('id')
}

KReservation.prototype.getAffaire = function () {
  return this.affaire.getId()
}

KReservation.prototype.loadCreator = function () {
  this.promise.creator = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    if (this.get('creator') === '') {
      resolve(); return
    }
    fetch(new URL(`${KAIROS.getBase()}/store/User/${this.get('creator').split('/').pop()}`))
    .then(response => {
      if (!response.ok) { return {length: 0, data: null} }
      return response.json()
    })
    .then(result => {
      if (result.length !== 1) { resolve(); return }
      const creator = Array.isArray(result.data) ? result.data[0] : result.data
      for (const key in creator) {
        this.set(`creator.${key}`, creator[key])
      }
      resolve(this.get('creator._'))
    })
  })
  return this.promise.creator
}

KReservation.prototype.loadTechnician = function () {
  this.promise.technician = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    if (this.get('technician') === '') {
      resolve(); return
    }
    fetch(new URL(`${KAIROS.getBase()}/store/User/${this.data.reservation.get('technician').split('/').pop()}`)).then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        if (result.length !== 1) { resolve(); return }
        this.data.technician = Array.isArray(result.data) ? result.data[0] : result.data
        resolve(this.data.technician)
      })
    })
  })
  return this.promise.technician
}

KReservation.prototype.loadLocality = function () {
  this.promise.locality = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    if (/^PC\/[0-9a-f]{32,32}$/.test(this.data.reservation.get('locality')) || /^Warehouse\/[a-zA-Z0-9]*$/.test(this.data.reservation.get('locality'))) {
      fetch(new URL(`${KAIROS.getBase()}/store/${this.data.reservation.get('locality')}`))
      .then(response => {
        if (!response.ok) { throw new Error('ERR:Server') }
        return response.json()
      })
      .then(result => {
        if (!result.success) { throw new Error('ERR:Server') }
        const locality = Array.isArray(result.data) ? result.data[0] : result.data
        for (const key in locality) {
          switch (key) {
            case 'np':
            case 'npext':
            case 'part':
            case 'tsid':
            case 'id':
              this.data.locality.set(key, KSano.num(locality[key]))
              break
            default:
              this.data.locality.set(key, KSano.txt(locality[key]))
              break
          }
        }
        resolve(this.data.locality)
        
      })
    } else {
      this.data.locality.set('name', this.data.reservation.get('locality'))
      this.data.locality.set('label', this.data.reservation.get('locality'))
      this.data.locality.set('color', 'black')
      resolve(this.data.locality)
    }
  })
  return this.promise.locality
}

KReservation.prototype.loadStatus = function () {
  const status = this.data.reservation.get('status')
  const url = new URL(`${KAIROS.getBase()}/store/Status/${status.split('/').pop()}`)
  fetch(url)
  .then(response => {
    if (!response.ok) { throw new Error('ERR:Server') }
    return response.json()
  })
  .then(result => {
    if (!result.success) { throw new Error('ERR:Server') }
    const status = Array.isArray(result.data) ? result.data[0] : result. data
    for(const key in status) {
      switch (key) {
        default:
          this.data.status.set(key, KSano.txt(status[key]))
          break
        case 'id':
        case 'default':
        case 'type':
        case 'severity':
          this.data.status.set(key, KSano.num(status[key]))
          break
      }
    }
  })
  .catch(reason => {
    KAIROS.error(reason)
  })
}

KReservation.prototype.loadContact = function () {
  this.promise.contacts = new Promise((resolve, reject) => {
    let promises = []
    let url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
    url.searchParams.append('search.reservation', this.data.reservation.get('id'))
    fetch(url)
    .then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        for (let i = 0; i < result.length; i++) {
          let p = Address.load(result.data[i])
          p.then(contact => {
            if (contact !== null) {
              this.data.addresses[result.data[i].comment] = contact
            }
          })
          promises.push(p)
        }
        Promise.all(promises).then(() => {
          resolve(this.data.addresses)
        })
      })
    })
  })
}

KReservation.prototype.loadArrival = function () {
  this.promise.arrival = new Promise((resolve, reject) => {
    let url = new URL(`${KAIROS.getBase()}/store/Arrival`)
    url.searchParams.append('search.target', this.data.reservation.get('id'))
    url.searchParams.append('search.deleted', '-')
    fetch(url)
    .then(response => {
      if (!response.ok) { return null }
      return response.json()
    })
    .then(result => {
      if (!result) { resolve() }
      const data = Array.isArray(result.data) ? result.data[0] : result.data
      for (const k in data) {
        switch(k) {
          case 'reported':
          case 'done':
          case 'inprogress':
            if (!data[k]) { continue }
            this.data.arrival[k] = new Date(data[k])
            break
          default:
            this.data.arrival[k] = data[k]
            break
        }
      }
      resolve()
    })
  })
}

KReservation.prototype.getLabel = function () {
    return `#${this.get('id')}/${this.get('machine.uid')}`
}

KReservation.prototype.oneLine = function () {
  return new Promise((resolve, reject) => {
    if (!this.ok) { resolve(''); return }
    let div = document.createElement('DIV')
    div.dataset.id = this.data.reservation.get('id')
    div.innerHTML = `
      <span class="ident">${this.data.reservation.get('id')}</span>
      ${this.data.reservation.get('reference') !== '' ? '<span class="reference">/' + this.data.reservation.get('reference') + '</span>' : ''}
      <span class="mnumber">${this.data.machine.uid}</span>
      <span class="machine">${this.data.machine.cn}</span>
      <span class="duration">${Math.ceil(this.data.reservation.get('duration') / 86400000)} jours</span>
      <span class="address">${this.data.reservation.get('address ')}</span>
      <span class="locality">${this.data.locality.label ?? ''}</span>
    `
    resolve(div)
  })
}

KReservation.prototype.getContact = function (address, type) {
  return new Promise((resolve, reject) => {
    let url
    if (address instanceof KContactText) {
      url = new URL(`${KAIROS.getBase()}/store/ReservationContact/${address.getId()}`) 
    } else {
      url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
      url.searchParams.append('search.reservation', this.data.reservation.get('id'))
      url.searchParams.append('search.target', typeof address === 'string' ? address : address.getId())
      url.searchParams.append('search.comment', typeof type === 'string' ? type : type.getSelected())
    }
    fetch(url)
    .then(response => {
      if (!response.ok) { throw new Error('Erreur réseau')}
      return response.json()
    })
    .then(result => {
      if (result.length > 1) { throw new Error('Adresse non unique') }
      if (!result.data) { throw new Error('Data is null')}
      resolve(Array.isArray(result.data) ? result.data[0] : result.data)
    })
    .catch(reason => {
      reject(new Error(reason))
    })
  })
}

KReservation.prototype.changeContactType = function (address, oldType, newType) {
  this.getContact(address, oldType)
  .then (relation => {
    const url = new URL(`${KAIROS.getBase()}/store/ReservationContact/${relation.id}`)
    return fetch(url, {method: 'PUT', body: JSON.stringify({id: relation.id, comment: newType.getSelected() })})
  })
  .then(response => {
    console.log(response)
  })
  .catch(reason => {
    KAIROS.syslog(reason)
    KAIRSO.error('Impossible de changer le type')
  })
}

KReservation.prototype.addContact = function (address, type) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
    url.searchParams.append('search.reservation', this.data.reservation.get('id'))
    url.searchParams.append('search.target', typeof address === 'object' ? address.getId() : address)
    url.searchParams.append('search.comment', typeof type === 'object' ? type.getSelected() : type)
    fetch(url)
    .then(response => {
      if (!response.ok) { return null }
      return response.json()
    })
    .then(result => {
      if (result.length > 1) {
        KAIROS.error('...')
      }
      if (result.length === 1) {
        console.log(result)
        return
      }
      const url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
      fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          reservation: this.data.reservation.get('id'),
          comment: typeof type === 'object' ? type.getSelected() : type,
          freeform: null,
          target: typeof address === 'object' ? address.getId() : address
        })
      })
      .then(response => {
        if (!response.ok) { return null }
        return response.json()
      })
      .then(result => {
        if (!result.success) { throw new Error('Erreur pour l\'ajout du contact') }
        const data = Array.isArray(result.data) ? result.data[0] : result.data
        resolve(data.id)
      })
    })
  })
}

KReservation.prototype.delContact = function (contact, type) {
  return new Promise((resolve, reject) => {
    this.getContact(contact, type)
    .then(relation => {
      if (!relation) { return null }
      const url = new URL(`${KAIROS.getBase()}/store/ReservationContact/${relation.id}`)
      return fetch(url, {method: 'DELETE'})
    })
    .then(result => {
      if (!result) { resolve(false) }
      if (result.ok) { resolve(true) }
      else { resolve(false) }
    })
    .catch(reason => reject(reason instanceof Error ? reason : new Error(reason)))
  })
}

KReservation.prototype.modContact = function (contact) {

}