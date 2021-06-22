function KAffaire (uid) {
    this.data = new Map()
    this.reservation = new Map()
    this.data.set('uid', uid)
}

KAffaire.create = function () {
    return new Promise((resolve, reject) => {
        UserStore.getCurrentUser()
        .then (user => {
            const body = {creator: user.getUrl()}
            return fetch(`${KAIROS.getBase()}/store/Affaire`, {method: 'POST', body: JSON.stringify(body)})
        })
        .then(response => {
            if (!response.ok) { return null }
            return response.json()
        })
        .then(result => {
            if (!result || result.length <= 0) { reject(new Error('Pas de résultat')); return}
            return KAffaire.load(Array.isArray(result.data) ? result.data[0].id : result.data.id)
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
        fetch(`${KAIROS.getBase()}/store/Affaire/${uid}`)
        .then(response => {
            if (!response) { return null }
            return response.json()
        })
        .then(result => {
            if (!result || result.length <= 0) { reject(new Error('Impossible de charger l\'affaire')); return }
            const data = Array.isArray(result.data) ? result.data[0] : result.data
            const kaffaire = new KAffaire(data.uid)
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