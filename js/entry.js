function KEntry (id) {
    this.data = {}
    this.id = id
    this.ok = false
    this.channel = new MessageChannel()
    this.channel.port1.onmessage = this.handleMessage.bind(this)
    this.evtTarget = new EventTarget()
    this.entries = {}
    this._loaded
}

KEntry.load = function (id) {
    let entry = new KEntry(id)
    entry._loaded = new Promise((resolve, reject) => {
        fetch(new URL(`${KAIROS.getBase()}/store/Machine/${id}`)).then(response => {
            if (!response.ok) { resolve(entry); return }
            response.json().then(result => {
                if (result.length !== 1) { resolve(entry); return}
                entry.data = Array.isArray(result.data) ? result.data[0] : result.data
                entry.ok = true
                resolve(entry)
            })
        })
    })
    return entry._loaded
}

KEntry.prototype.addEventListener = function (type, callback, options = {}) {
    this.evtTarget.addEventListener(type, callback, options)
}

KEntry.prototype.removeEventListener = function (type, callback, options = {}) {
    this.evtTarget.removeEventListener(type, callback, options)
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
    wwInstance.postMessage({op: 'newTarget', target: this.data.uid}, [this.channel.port2])
    if (this.data.oldid) {
        if (Array.isArray(this.data.oldid)) {
            for (let i = 0; this.data.oldid.length; i++) {
                if (this.data.oldid[i] !== this.data.uid) {
                    wwInstance.postMessage({op: 'symlinkTarget', destination: this.data.uid, source: this.data.oldid[i] })
                }
            }
        } else {
            if (this.data.oldid !== this.data.uid) {
                wwInstance.postMessage({op: 'symlinkTarget', destination: this.data.uid, source: this.data.oldid })
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
            if (this.data.oldid !== undefined) {
                if (Array.isArray(this.data.oldid)) {
                    for (let i = 0; i < this.data.oldid.length; i++) {
                        url = new URL(`${KAIROS.getBase()}/store/Evenement/.chain`)
                        url.searchParams.append('machine', this.data.oldid[i])
                        queries.push(fetch(url))
                    }
                } else {
                    url = new URL(`${KAIROS.getBase()}/store/Evenement/.chain`)
                    url.searchParams.append('machine', this.data.oldid)
                    queries.push(fetch(url))
                }
            }
            Promise.all(queries).then(responses => {
                let eventList = []
                let waitJson = []
                for (let i = 0; i < responses.length; i++) {
                    if (!responses[i].ok) { KAIROS.error('Erreur lors de l\'interrogation des évènements'); continue; }
                    let p = new Promise((resolve, reject) =>  {
                        responses[i].json().then(result => {
                            if (result.length > 0) {
                                let data = Array.isArray(result.data) ? result.data : [result.data]
                                eventList = [...eventList, ...data]
                            }
                            resolve()
                        })
                    })
                    waitJson.push(p)
                }
                Promise.all(waitJson).then(() => {
                    resolve(eventList)
                })
            })
        })
    })
}

KEntry.prototype.handleMessage = function (msg) {
    let msgData = msg.data
    switch (msgData.op) {
      case 'entries':
        let process = (deadline, origin = 0) => {
            let i = origin;
            while(deadline.timeRemaining() > 5 && i < msgData.value.length) {
                let entry = msgData.value[i]
                entry.modification = parseInt(entry.modification)
                if (entry._arrival) {
                    entry._arrival.modification = parseInt(entry._arrival.modification)
                    if (entry.modification < entry._arrival.modification) {
                        entry.modification = entry._arrival.modification
                    }
                }
                let id = entry.uuid
                if (entry.uuid === undefined || entry.uuid === null) {
                    id = entry.id
                }
                if (entry.target === this.data.uid || (this.data.oldid && this.data.oldid === entry.target)) {
                    let update = false
                    if (this.entries[id]) {
                        /* no change recorder, so don't bother any further */
                        if (this.entries[id].modification === entry.modification) { continue; }
                        update = true
                    }
                    this.entries[entry.id] = entry
                    this.evtTarget.dispatchEvent(new CustomEvent(update ? 'update-entry' : 'create-entry', {detail: {entry: entry}}))
                } else {
                    if (this.entries[id]) {
                        delete this.entries[id]
                        this.evtTarget.dispatchEvent(new CustomEvent('remove-entry', {detail: {entry: entry}}))
                    }
                }
                i++
            }

            if (i < msgData.value.length) {
                window.requestIdleCallback((deadline) => {
                    process(deadline, i)
                })
            }
        }
        window.requestIdleCallback((deadline) => {
            process(deadline, 0)
        })
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