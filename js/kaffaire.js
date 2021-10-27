function KAffaire (uid) {
    this.data = new Map()
    this.reservation = new Map()
    this.data.set('uid', uid)
    this.store = new KStore('kaffaire')
}

KAffaire.create = function () {
    return new Promise((resolve, reject) => {
        const kstore = new KStore('kaffaire')
        UserStore.getCurrentUser()
        .then (user => {
            if (!user) { throw new Error('ERR:NoAuth') }
            const body = {creator: user.getUrl()}
            return kstore.set(body)
        })
        .then(uid => {
            return KAffaire.load(uid)
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
        const kstore = new KStore('kaffaire')
        kstore.get(uid)
        .then(data => {
            const kaffaire = new KAffaire(data[KAIROS.kaffaire.uid.remote])
            for (const key of data.keys()) {
                if (key === 'uid') { continue; }
                kaffaire.set(key, data[key])
            }
            console.log(kaffaire, data)
            const relations = []
            if (KAIROS.kaffaire.relation) {
                for (const relation of KAIROS.kaffaire.relation) {
                    if (relation.multiple) {
                        relations.push(
                            new KStore(relation.target)
                                .query({[relation.attr]: kaffaire.get('uid')})
                        )
                    } else {
                        relations.push(
                            new KStore(relation.target)
                                .get(kaffaire.get(relation.attr))
                        )
                    }
                }   
            }

            Promise.allSettled(relations)
            .then(relations => {
                for (const key in relations) {
                    if (relations[key].status !== 'fulfilled') { continue }
                    kaffaire.set(`relation.${KAIROS.kaffaire.relation[key].target}`, relations[key].value)
                    
                }
                resolve(kaffaire)
            })
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

KAffaire.prototype.getName = function (capitalize = false) {
    if (capitalize) { return KAIROS.kaffaire.name.charAt(0).toUpperCase() + KAIROS.kaffaire.name.slice(1) }
    return KAIROS.kaffaire.name
}

KAffaire.prototype.getCn = function () {
    const cnAttrs = Array.isArray(KAIROS.kaffaire.cn.remote) ? KAIROS.kaffaire.cn.remote : [KAIROS.kaffaire.cn.remote]
    let cn = KAIROS.kaffaire.cn.label
    for (const attr of cnAttrs) {
        if (attr.indexOf('.') !== -1) {
            const [relation, attribute] = attr.split('.', 2)
            const object = this.get(`relation.${relation}`)
            if (object[attribute]) {
                cn = cn.replaceAll(`\${${relation}.${attribute}}`, object[attribute])
            } else {
                cn = cn.replaceAll(`\${${relation}.${attribute}}`, '')
            }
            continue
        }
        const val = this.get(attr)
        if (val) { cn = cn.replaceAll(`\${${attr}}`, val) }
        else { cn = cn.replaceAll(`\${${attr}}`, '') }
    }
    return cn
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
    title.innerHTML = this.kaffaire.getCn()
    title.classList.add('title')
    this.listItem = this.list.list(title, this.kaffaire.get('relation.kreservation'), (item) => {
            const node = document.getElementById(item.uuid)
            if (node) { node.style.backgroundColor = 'red' }
        } ,[
        {label: `Fermer ${this.kaffaire.getName()}`, callback: (event) => {console.log(event)}}
    ])
    this.listItem.addEventListener('pop', event => {
        for (const reservation of this.kaffaire.get('relation.kreservation')) {
            const node = document.getElementById(reservation.uuid)
            if (node) { node.style.backgroundColor = 'green' }
        }
    })
    this.listItem.addEventListener('unpop', event => {
        console.log(event)
        for (const reservation of this.kaffaire.get('relation.kreservation')) {
            const node = document.getElementById(reservation.uuid)
            if (node) { node.style.removeProperty('background-color') }
        }
    })
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