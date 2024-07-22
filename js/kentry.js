function KEntry (id) {
    this.data = new Map()
    this.id = id
    this.ok = false
    this.channel = new MessageChannel()
    this.channel.port1.onmessage = this.handleMessage.bind(this)
    this.evtTarget = new EventTarget()
    this.entries = new Map()
    this.wwInstance = null
    this._loaded = null
    this.KUI = new KUIEntry(this, KAIROS.stores.kentry.ui)
    this.URL = KAIROS.URL(KAIROS.stores.kentry.store)
}

KEntry.load = function (id) {
    const entry = new KEntry(id)
    entry._loaded = new Promise((resolve, reject) => {
        kfetch(new URL(`${entry.URL.toString()}/${id}`))
        .then(response => {
            if (!response.ok) { return null }
            return response.json()
        }).then(result => {
            if (!result) { resolve(entry); return; }
            if (result.length !== 1) { resolve(entry); return}
            result.data = Array.isArray(result.data) ? result.data[0] : result.data
            for (const k in result.data) {
                entry.data.set(k, result.data[k])
            }
            entry.ok = true
            resolve(entry)
        })
        .catch(reason =>{
            console.log(reason)
        })
    })
    return entry._loaded
}

KEntry.prototype.getHeight = function () {
    return this.KUI.getHeight()
}

KEntry.prototype.setHeight = function (height) {
    return this.KUI.setHeight(height)
}

KEntry.prototype.resize = function () {
    return this.KUI.resize()
}

KEntry.prototype.render = function (parentNode = null) {
    return this.KUI.render(parentNode)
}

KEntry.prototype.ready = function () {
    return this._loaded
}

KEntry.prototype.set = function(name, value) {
    return new Promise((resolve, reject) => {
        this.ready()
        .then(_ => {
            if (name === 'origin') {
                this.KUI.moveOrigin(value, this.data.get(name))
            }
            if (name === 'row') {
                this.KUI.setOrder(value)
            }
            resolve(this.data.set(name, value))
        })
    })
}

KEntry.prototype.get = function(name) {
    return new Promise((resolve, reject) => {
        this.ready()
        .then(_ => {
            resolve(this.data.get(name))
        })
    })
}

KEntry.prototype.has = function(name) {
    return new Promise((resolve, reject) => {
        this.ready()
        .then(_ => {
            resolve(this.data.has(name))
        })
    })
}

KEntry.prototype.size = function(name) {
    return new Promise((resolve, reject) => {
        this.ready()
        .then(_ => {
            resolve(this.data.size(name))
        })
    })
}

KEntry.prototype.delete = function(name) {
    return new Promise((resolve, reject) => {
        this.ready()
        .then(_ => {
            resolve(this.data.delete(name))
        })
    })
}

KEntry.prototype.addEventListener = function (type, callback, options = {}) {
    this.evtTarget.addEventListener(type, callback, options)
}

KEntry.prototype.removeEventListener = function (type, callback, options = {}) {
    this.evtTarget.removeEventListener(type, callback, options)
}

KEntry.prototype.move = function (entry) {
    this.wwInstance.postMessage({op: 'moveEntry', reservation: JSON.stringify(entry)})
}

KEntry.prototype.is = function (id) {
    return new Promise((resolve, reject) => {
        this._loaded.then(() => {
            if (this.data.uid === id) {
                resolve(true)
                return
            }
            if (this.data.oldid !== undefined) {
                if (Array.isArray(this.data.oldid)) {
                    for (let i = 0; i < this.data.oldid.length; i++) {
                        if (this.data.oldid[i] === id) {
                            resolve(true)
                            return
                        }
                    }
                } else if (this.data.oldid === id) {
                    resolve(true)
                    return
                }
            }
            resolve(false)
        })
    })
}

KEntry.prototype.register = function (wwInstance) {
    this.wwInstance = wwInstance
    wwInstance.postMessage({op: 'newTarget', target: this.data.get('id')}, [this.channel.port2])
    if (this.data.oldid) {
        if (Array.isArray(this.data.oldid)) {
            for (let i = 0; this.data.oldid.length; i++) {
                if (this.data.oldid[i] !== this.data.uid) {
                    wwInstance.postMessage({op: 'symlinkTarget', destination: this.data.get('id'), source: this.data.oldid[i] })
                }
            }
        } else {
            if (this.data.oldid !== this.data.uid) {
                wwInstance.postMessage({op: 'symlinkTarget', destination: this.data.get('id'), source: this.data.oldid })
            }
        }
    }
}

KEntry.prototype.getEvents = function () {
    return new Promise((resolve, reject) => {
        this._loaded.then(() => {
            let queries = []
            let url = new URL(`store/Evenement/.chain`, KAIROS.getBase())
            url.searchParams.append('machine', this.data.uid)
            queries.push(fetch(url))
            Promise.all(queries).then(responses => {
                let waitJson = []
                for (let i = 0; i < responses.length; i++) {
                    if (!responses[i].ok) { KAIROS.error('Erreur lors de l\'interrogation des évènements'); continue; }
                    let p = new Promise((resolve, reject) =>  {
                        responses[i].json().then(result => {
                            if (result.length > 0) {
                                let data = Array.isArray(result.data) ? result.data : [result.data]
                                resolve(data)
                                return
                            }
                            resolve([])
                            return
                        })
                    })
                    waitJson.push(p)
                }
                
                Promise.all(waitJson).then((eventList) => {
                    let results = []
                    for (let i = 0; i < eventList.length; i++) {
                        results = [...eventList[i], ...results]
                    }
                    resolve(results)
                })
            })
        })
    })
}

KEntry.prototype.processReservationList = function (list, start = 0) {
        const kview = new KView()
        const p = []
        while (start < list.length) {
            const entry = list[start]
            const uuid = entry.uuid

            if (this.entries.has(uuid)) {
                const currentEntry = this.entries.get(uuid)
                if (currentEntry.get('version') === entry.version) {
                    start++
                    continue 
                }
            }

            const y = kview.getObjectRow(this)
            if (this.entries.has(uuid)) {
                const reservation = this.entries.get(uuid)
                reservation.update(entry)
                /* re-add to viewport after update */
                {
                    const rows = kview.getRowFromDates(new Date(reservation.get('begin')), new Date(reservation.get('end')), y)
                    for (const row of rows) {
                        if (!row) { continue }
                        row.set(`${reservation.getType()}:${reservation.get('uid')}`, reservation)
                    }
                }
                p.push(this.KUI.placeReservation(reservation))
            } else {
                const reservation = new KObject('kreservation', entry)
                this.entries.set(entry.uuid, reservation)
                const rows = kview.getRowFromDates(new Date(reservation.get('begin')), new Date(reservation.get('end')), y)
                for (const row of rows) {
                    if (!row) { continue }
                    row.set(`${reservation.getType()}:${reservation.get('uid')}`, reservation)
                }
 
                p.push(new Promise(resolve => {
                    new KStore('kreservation').relateEntry(reservation)
                    .then(kobject => {
                        this.KUI.placeReservation(kobject).then(_ => resolve())
                    })
                    .catch(reason => {
                        KAIROS.error(reason)
                    })
                }))
            }
            start++
        }
        Promise.allSettled(p)
        .then(_ => {
            kview.render()
        })
}

KEntry.prototype.handleMessage = function (msg) {
    const kview = new KView()
    const msgData = msg.data
    switch (msgData.op) {
        case 'remove':
            (() => {
                if (this.entries.has(msgData.reservation.uuid)) {
                    const reservation = this.entries.get(msgData.reservation.uuid)
                    kview.removeObject(`${reservation.getType()}:${reservation.get('uid')}`)
                    this.entries.delete(msgData.reservation.uuid)
                }
            })()
            break
        case 'update-reservation':
        case 'add':
            (() => {
                /* remove object first */
                if (this.entries.has(msgData.reservation.uuid)) {
                    const reservation = this.entries.get(msgData.reservation.uuid)
                    kview.removeObject(`${reservation.getType()}:${reservation.get('uid')}`)
                }
                this.processReservationList([msgData.reservation])
            })()
            break
        case 'entries':
            this.processReservationList(msgData.value)
            break
      case 'state':
        window.requestIdleCallback(() => {
            if (!msgData.value) { return }
            if (!msgData.value.type) { return }
            if (msgData.value.type.severity === undefined || !Number.isInteger(parseInt(msgData.value.type.severity))) { return }

            if (!this.state) {
                this.state = {id: -1, type: {severity: -1}}
            }
            if (msgData.value.id !== this.state.id) {
                msgData.value.type.severity = parseInt(msgData.value.type.severity)
                this.state = msgData.value
                this.evtTarget.dispatchEvent(new CustomEvent('state-change', {detail: {state: msgData.value, severity: msgData.value.type.severity}}))
            }
        })
        break
    }
  }