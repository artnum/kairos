function KReservation (id) {
  this.data = {
    reservation: null,
    locality: null,
    machine: null,
    creator: null,
    technician: null,
    addresses: {}
  }

  this.hash = {
    reservation: {},
    locality: {},
    machine: {},
    creator: {},
    technician: {},
    address : {}
  }

  this.promise = {
    locality: null,
    machine: null,
    creator: null,
    technician: null,
    addresses: null
  }
}

KReservation.load = function (id) {
  const r = new KReservation(id)
  return new Promise((resolve, reject) => {
    fetch(new URL(`${KAIROS.getBase()}/store/Reservation/${id}`)).then(response => {
      if (!response.ok) { r.ok = false; resolve(r); return }
      response.json()
      .then(result => {
          if (result.length !== 1) { r.ok = false; resolve(r);  return }
          r.data.reservation = Array.isArray(result.data) ? result.data[0] : result.data
          
          r.data.reservation.version = parseInt(r.data.reservation.version)
          r.hash.reservation._complete = r.hashJsonS(r.data.reservation, [ 'modification' ])

          r.data.reservation.begin = new Date(r.data.reservation.begin)
          r.data.reservation.end = new Date(r.data.reservation.end)
          r.data.reservation.duration = r.data.reservation.end.getTime() - r.data.reservation.begin.getTime()
          r.data.reservation.delivery = {
            begin: r.data.reservation.deliveryBegin ? new Date(r.data.reservation.deliveryBegin) : r.data.reservation.begin,
            end: r.data.reservation.deliveryEnd ? new Date(r.data.reservation.deliveryEnd) : r.data.reservation.end
          }
          r.data.reservation.created = KAIROS.DateFromTS(r.data.reservation.created)
          r.data.reservation.modification = KAIROS.DateFromTS(r.data.reservation.modification)
          r.data.reservation.reference = r.data.reservation.reference ? r.data.reservation.reference : ''
          r.ok = true
          Promise.all([
            r.loadMachine(),
            r.loadCreator(),
            r.loadTechnician(),
            r.loadLocality(),
            r.loadContact(),
          ])
          .then(_ => { 
            resolve(r)
          })
      })
    })
  })
}

KReservation.prototype.hashJsonS = function (json, skip = [], topHash) {
  if (!json) { return null }
  const keys = Object.keys(json)
  keys.sort()
  const h = topHash || new MurmurHash3()
  keys.forEach(k => {
    if (skip.indexOf(k) !== -1) { return }
    if (typeof json[k] === 'array' || typeof json[k] === 'object') {
      this.hashJson(json[k], [], h)
      return
    }
    h.hash(this.data.reservation[k] ?? '')
  })
  return h.result()
}

KReservation.prototype.hashJson = function (json, only = [], topHash) {
  if (!json) { return null }
  const keys = only.length === 0 ? Object.keys(json) : only
  keys.sort()
  const h = topHash || new MurmurHash3()
  keys.forEach(k => {
    if (typeof json[k] === 'array' || typeof json[k] === 'object') {
      this.hashJson(json[k], [], h)
      return
    }
    h.hash(this.data.reservation[k] ?? '')
  })
  return h.result()
}

/* some json data obtained elsewhere are available */
KReservation.prototype.extUpdate = function (json) {

}

KReservation.prototype.serverCompare = function () {
  return new Promise((resolve, reject) => {
    fetch(new URL(`${KAIROS.getBase()}/store/Reservation/.version?id=${this.data.reservation.id}`))
    .then(response => {
      if (!response.ok) { return null }
      return response.json()
    })
    .then(result => {
      if (!result) { return false }
      if (result.length <= 0 || result.length > 1) { return false }
      const data = Array.isArray(result.data) ? result.data[0] : result.data
      if (!data.version) { return false }
      if (parseInt(data.version) !== this.data.reservation.version) { return false }
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
    fetch(new URL(`${KAIROS.getBase()}/store/Machine/${this.data.reservation.target}`)).then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        if (result.length !== 1) { resolve(); return }
        this.data.machine = Array.isArray(result.data) ? result.data[0] : result.data
        this.hash.machine._complete = this.hashJson(this.data.machine, [ 'airref' ])
        resolve(this.data.machine)
      })
    })
  })
  return this.promise.machine
}

KReservation.prototype.getYear = function () {
  return this.data.reservation.begin.getFullYear()
}

KReservation.prototype.getMonth = function () {
  return this.data.reservation.begin.getMonth() + 1
}

KReservation.prototype.getId = function () {
  return this.data.reservation.id
}

KReservation.prototype.loadCreator = function () {
  this.promise.creator = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    if (this.data.reservation.creator === null) {
      resolve(); return
    }
    fetch(new URL(`${KAIROS.getBase()}/store/User/${this.data.reservation.creator.split('/').pop()}`))
    .then(response => {
      if (!response.ok) { return {length: 0, data: null} }
      return response.json()
    })
    .then(result => {
      if (result.length !== 1) { resolve(); return }
      this.data.creator = Array.isArray(result.data) ? result.data[0] : result.data
      this.hash.creator._complete = this.hashJson(this.data.creator, [ 'id' ])
      resolve(this.data.creator)
    })
  })
  return this.promise.creator
}

KReservation.prototype.loadTechnician = function () {
  this.promise.technician = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    if (this.data.reservation.technician === null) {
      resolve(); return
    }
    fetch(new URL(`${KAIROS.getBase()}/store/User/${this.data.reservation.technician.split('/').pop()}`)).then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        if (result.length !== 1) { resolve(); return }
        this.data.technician = Array.isArray(result.data) ? result.data[0] : result.data
        this.hash.technician = this.hashJson(this.data.technician, [ 'id' ])
        resolve(this.data.technician)
      })
    })
  })
  return this.promise.technician
}

KReservation.prototype.loadLocality = function () {
  this.promise.locality = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    if (/^PC\/[0-9a-f]{32,32}$/.test(this.data.reservation.locality) || /^Warehouse\/[a-zA-Z0-9]*$/.test(this.data.reservation.locality)) {
      fetch(new URL(`${KAIROS.getBase()}/store/${this.data.reservation.locality}`)).then(response => {
        if (!response.ok) { resolve(); return }
        response.json().then(result => {
          if (result.length !== 1) { resolve(); return }
          this.data.locality = Array.isArray(result.data) ? result.data[0] : result.data
          this.hash.locality._complete = this.hashJson(this.data.locality, [ 'np', 'npext', 'state', 'tsid', 'name', 'id' ])
          resolve(this.data.locality)
        })
      })
    } else {
      this.data.locality = {
        name: this.data.reservation.locality,
        label: this.data.reservation.locality,
        color: 'black'
      }
      this.hash.locality._complete = this.hashJson(this.data.locality, [ 'name' ])
      resolve(this.data.locality)
    }
  })
  return this.promise.locality
}

KReservation.prototype.loadContact = function () {
  this.promise.contacts = new Promise((resolve, reject) => {
    let promises = []
    let url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
    url.searchParams.append('search.reservation', this.data.reservation.id)
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

KReservation.prototype.oneLine = function () {
  return new Promise((resolve, reject) => {
    if (!this.ok) { resolve(''); return }
    let div = document.createElement('DIV')
    div.dataset.id = this.data.reservation.id
    div.innerHTML = `
      <span class="ident">${this.data.reservation.id}</span>
      ${this.data.reservation.reference !== '' ? '<span class="reference">/' + this.data.reservation.reference  + '</span>' : ''}
      <span class="mnumber">${this.data.machine.uid}</span>
      <span class="machine">${this.data.machine.cn}</span>
      <span class="duration">${Math.ceil(this.data.reservation.duration / 86400000)} jours</span>
      <span class="address">${this.data.reservation.address ?? ''}</span>
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
      url.searchParams.append('search.reservation', this.data.reservation.id)
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
    url.searchParams.append('search.reservation', this.data.reservation.id)
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
          reservation: this.data.reservation.id,
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