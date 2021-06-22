function KReservation () {
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
    addresses: null,
  }

  this.inited = new Promise((resolve) => {
    this._initresolve = resolve
  })
  this.evttarget = new EventTarget()
}

KReservation._registry = new Map()

KReservation.get = function (id) {
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
    let r = KReservation.get(id)
    if (r) {
      resolve(r)
      return
    }
    r = new KReservation()
    r.init(id)
    .then(() => {
      resolve(r)
    })
    .catch(reason => {
      if (!(reason instanceof Error)) {
        reject(new Error(reason))
        return
      }
      reject(reason)
    })
  })
}

KReservation.prototype.get = function (attr) {
  if (this.data.reservation[attr]) {
    return this.data.reservation[attr]
  }
  if (attr.indexOf('.') !== -1) {
    const [x, y] = attr.split('.', 2)
    if (this.data[x][y]) {
      return this.data[x][y]
    }
  }
  return undefined
}

KReservation.prototype.init = function (id) {
  return new Promise((resolve, reject) => {
    fetch(new URL(`${KAIROS.getBase()}/store/Reservation/${id}`)).then(response => {
      if (!response.ok) { return null }
      return response.json()
    })
    .then(result => {
      if (!result || result.length !== 1) { this.ok = false; resolve(this);  return }
      this.data.reservation = Array.isArray(result.data) ? result.data[0] : result.data
      
      this.hash.reservation._complete = this.hashJsonS(this.data.reservation, [ 'modification' ])

      this.data.reservation.begin = new Date(this.data.reservation.begin)
      this.data.reservation.end = new Date(this.data.reservation.end)
      this.data.reservation.duration = this.data.reservation.end.getTime() - this.data.reservation.begin.getTime()
      this.data.reservation.delivery = {
        begin: this.data.reservation.deliveryBegin ? new Date(this.data.reservation.deliveryBegin) : this.data.reservation.begin,
        end: this.data.reservation.deliveryEnd ? new Date(this.data.reservation.deliveryEnd) : this.data.reservation.end
      }
      this.data.reservation.created = KAIROS.DateFromTS(this.data.reservation.created)
      this.data.reservation.modification = KAIROS.DateFromTS(this.data.reservation.modification)
      this.data.reservation.reference = this.data.reservation.reference ? this.data.reservation.reference : ''
      this.ok = true
      Promise.all([
        this.loadMachine(),
        this.loadCreator(),
        this.loadTechnician(),
        this.loadLocality(),
        this.loadContact(),
      ])
      .then(_ => {
        this.register()
        resolve(this)
      })
    })
    .catch(reason => {
      if (!(reason instanceof Error)) {
        reject(new Error(reason))
        return
      }
      reject(reason)
    })
  })
}

KReservation.prototype.register = function () {
  KReservation._registry.set(this.getId(), {data: this, atime: new Date().getTime()})
}

KReservation.prototype.fromJson = function (json) {
  this.data.reservation = Array.isArray(json) ? json[0] : json
  this.affaire = new KAffaire()

  this.loadAffaire = Promise.resolve()
  if (this.data.reservation.affaire) {
    this.loadAffaire = this.affaire.init(this.data.reservation.affaire)
  }

  this.hash.reservation._complete = this.hashJsonS(this.data.reservation, [ 'modification' ])

  this.data.reservation.begin = new Date(this.data.reservation.begin)
  this.data.reservation.end = new Date(this.data.reservation.end)
  this.data.reservation.duration = this.data.reservation.end.getTime() - this.data.reservation.begin.getTime()
  this.data.reservation.delivery = {
    begin: this.data.reservation.deliveryBegin ? new Date(this.data.reservation.deliveryBegin) : this.data.reservation.begin,
    end: this.data.reservation.deliveryEnd ? new Date(this.data.reservation.deliveryEnd) : this.data.reservation.end
  }
  this.data.reservation.created = KAIROS.DateFromTS(this.data.reservation.created)
  this.data.reservation.modification = KAIROS.DateFromTS(this.data.reservation.modification)
  this.data.reservation.reference = this.data.reservation.reference ? this.data.reservation.reference : ''
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

KReservation.prototype.serverCompare = function () {
  return new Promise((resolve, reject) => {
    console.log(this)
    KReservation.load(this.data.reservation.id)
    .then(srvVersion => {
      const cmpVal = ['reservation', 'locality', 'creator', 'technician']
      for (let i = 0; i < cmpVal.length; i++) {
        if (this.hash[cmpVal[i]]._complete !== srvVersion.hash[cmpVal[i]]._complete) {
          resolve(false)
          return
        }
      }
      resolve(true)
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

KReservation.prototype.getAffaire = function () {
  return this.affaire.getId()
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
    fetch(url).then(response => {
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

KReservation.prototype.getLabel = function () {
    return `#${this.get('id')}/${this.get('machine.uid')}`
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