function KAffaire (uid) {
    this.data = new Map()
    this.reservation = new Map()
    this.data.set('uid', uid)
    this.store = new KStore(KAIROS.URL(KAIROS.kaffaire.store))
}

KAffaire.create = function () {
    return new Promise((resolve, reject) => {
        const kstore = new KStore(KAIROS.URL(KAIROS.kaffaire.store))
        UserStore.getCurrentUser()
        .then (user => {
            if (!user) { throw new Error('ERR:NoAuth') }
            const body = {creator: user.getUrl()}
            return kstore.set(JSON.stringify(body))
        })
        .then(data => {
            return KAffaire.load(data[KAIROS.kaffaire.uid.remote])
        })
        .then(kaffaire => {
            resolve(kaffaire)
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KAffaire.load = function (uid) {
    return new Promise((resolve, reject) => {
        const kstore = new KStore(KAIROS.URL(KAIROS.kaffaire.store))
        kstore.get(uid)
        .then(data => {
            const kaffaire = new KAffaire(KAIROS.kaffaire.uid.remote)
            for (const key in data) {
                if (key === 'uid') { continue; }
                kaffaire.set(key, data[key])
            }
            resolve(kaffaire)
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KAffaire.prototype.set = function (name, value) {
    this.data.set(name, value)
}

KAffaire.prototype.get = function (name) {
    return this.data.get(name)
}

KAffaire.prototype.add = function (reservation) {
    const uid = typeof reservation === 'object' ? reservation.get('uid') : reservation
    if (!this.reservation.has(uid)) {
        KReservation.load(uid)
        .then(reservation => {
            this.reservation.set(uid, reservation)
        })
    }
}

KAffaire.prototype.isMine = function (reservationId) {
    if (this.reservation.has(reservationId)) {
        return this.get('uid')
    }
    return 0
}

KAffaire.prototype.has = function (uid)  {
    return this.reservation.has(uid)
}

function KAffaireUI (kaffaire) {
    this.kaffaire = kaffaire
    this.list = new KTaskBar()
    const title = document.createElement('SPAN')
    title.innerHTML = `Affaire #${this.kaffaire.get('uid')}`
    title.classList.add('title')
    this.list.list(title, this.kaffaire.reservation, [
        {label: 'Fermer l\'affaire', callback: (event) => {console.log(event)}}
    ])
}

KAffaireUI.prototype.render = function () {
    /* let content = ''
    for(const reservation of this.kaffaire.reservation) {
        const kreservation = reservation[1]
        content += `Réservation #${kreservation.get('uid')}`
    }
    KAIROSAnim.push(() => {
        this.domNode.innerHTML = content
    })*/
}