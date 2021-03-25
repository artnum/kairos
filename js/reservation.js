function KReservation (id) {
  this.data = {
    reservation: null,
    locality: null,
    machine: null,
    creator: null,
    technician: null,
    addresses: {}
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
      response.json().then(result => {
          if (result.length !== 1) { r.ok = false; resolve(r);  return }
          r.data.reservation = Array.isArray(result.data) ? result.data[0] : result.data
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

KReservation.prototype.loadMachine = function () {
  this.promise.machine = new Promise((resolve, reject) => {
    if (!this.ok) { resolve(); return }
    fetch(new URL(`${KAIROS.getBase()}/store/Machine/${this.data.reservation.target}`)).then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        if (result.length !== 1) { resolve(); return }
        this.data.machine = Array.isArray(result.data) ? result.data[0] : result.data
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
    fetch(new URL(`${KAIROS.getBase()}/store/User/${this.data.reservation.creator}`)).then(response => {
      if (!response.ok) { resolve(); return }
      response.json().then(result => {
        if (result.length !== 1) { resolve(); return }
        this.data.creator = Array.isArray(result.data) ? result.data[0] : result.data
        resolve(this.data.creator)
      })
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
    fetch(new URL(`${KAIROS.getBase()}/store/User/${this.data.reservation.technician}`)).then(response => {
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
    if (/^PC\/[0-9a-f]{32,32}$/.test(this.data.reservation.locality) || /^Warehouse\/[a-zA-Z0-9]*$/.test(this.data.reservation.locality)) {
      fetch(new URL(`${KAIROS.getBase()}/store/${this.data.reservation.locality}`)).then(response => {
        if (!response.ok) { resolve(); return }
        response.json().then(result => {
          if (result.length !== 1) { resolve(); return }
          this.data.locality = Array.isArray(result.data) ? result.data[0] : result.data
          resolve(this.data.locality)
        })
      })
    } else {
      this.data.locality = {
        name: this.data.reservation.locality,
        label: this.data.reservation.locality,
        color: 'black'
      }
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

KReservation.prototype.oneLine = function () {
  return new Promise((resolve, reject) => {
    if (!this.ok) { resolve(''); return }
    this.loaded().then(() => {
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
  })
}