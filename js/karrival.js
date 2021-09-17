function KArrival (options = {}) {
    this.data = {
        id: 0,
        target: 0,
        reported: new Date(),
        done: 0,
        inprogress: 0,
        contact: '',
        where: '',
        comment: '',
        other: '',
        locality: '',
        creator: null,
        created: 0,
        deleted: 0,
        modification: 0
    }
    Object.assign(this.data, options)
}

KArrival.attributes = function () {
    return [
        'id',
        'target',
        'reported',
        'done',
        'inprogress',
        'contact',
        'where',
        'comment',
        'other',
        'locality',
        'creator',
        'created',
        'deleted',
        'modification'
    ]
}

KArrival.search = function (reservation) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${KAIRSO.getBase()}/store/Arrival`)
        url.searchParams.append('search.target', reservation)
        fetch(url)
        .then(response => {
            if (!response.ok) { return null }
            return response.json()
        })
        .then(result => {
            if (result.length > 1) {
                const reconciliatedArrival = {}
                const ids = []
                for(const arrival in result.data) {
                    ids.push(arrival.id)
                    for (const attr in KArrival.attributes()) {
                        if (arrival[attr] !== '' && arrival[attr] !== null) {
                            reconciliatedArrival[attr] = arrival[attr]
                        }
                    }
                }
                const p = []
                for(const id in ids) {
                    if (id === reconciliatedArrival.id) { continue }
                    p.push(fetch(`${KAIROS.getBase()}/store/Arrival/${id}`, {method: 'DELETE'}))
                }
                p.push(fetch(`${KAIROS.getBase()}/store/Arrival/${reconciliatedArrival.id}}`, {method: 'PUT', body: JSON.stringify(reconciliatedArrival)}))
                Promise.all(p)
                .then(_ => {
                    resolve(new KArrival(reconciliatedArrival))
                    return
                })
            }
            if (result.length === 1) {
                resolve(new KArrival(Array.isArray(result.data) ? result.data[0] : result.data))
                return
            }
            resolve(null)
            return
        })
    })
}

KArrival.load = function (id) {
    return new Promise((resolve, reject) => {
        fetch(`${KAIROS.getBase()}/store/Arrival/${id}`)
        .then(response => {
            if (!response.ok) { return null }
            return response.json()
        })
        .then(result => {
            if (!result) { resolve(null); return }
            
        })
    })
}

KArrival.create = function (reservation) {
    return new Promise((resolve, reject) => {
        UserStore.getCurrentUser()
        .then(KUser => {
            if (!KUser) { resolve(null); return }
            const karr = new KArrival({
                creator: KUser.getUrl(),
                target: reservation
            })
            
        })
        .catch(r => {
            reject(r)
        })
    })
}