function KStore(type) {
    if (!KAIROS[type]) { return null }
    const baseUrl = KAIROS.URL(KAIROS[type].store)
    if (!KStore._instance) { KStore._instance = new Map() }
    else {
        if (KStore._instance.has(baseUrl)) {
            return KStore._instance.get(baseUrl)
        }
    }

    this.url = baseUrl
    this.type = type
    KStore._instance.set(baseUrl, this)
    return this
}

KStore.prototype.relateEntry = function (kobject) {
    return new Promise((resolve, reject) => {
        const promises = []
        if (!kobject.get('uid')) { resolve(kobject); return }
        if (!KAIROS[kobject.getType()].relation) { resolve(kobject); return }

        for (const relation of KAIROS[kobject.getType()].relation) {
            if (!relation.multiple) {
                const ko = new KObjectGStore().get(relation.target, kobject.get(relation.attr))
                if (ko) {
                    ko.addRelation(kobject.getType(), kobject)
                    promises.push(Promise.resolve(ko))
                    continue
                }
            } else {
                const ko = new KObjectGStore().search(relation.target, relation.attr, kobject.get('uid'))
                if (ko) {
                    ko.addRelation(kobject.getType(), kobject)
                    promises.push(Promise.resolve(ko))
                    continue
                }
            }
            const kstore = new KStore(relation.target)
            if (relation.multiple) {
                promises.push(kstore.query({[relation.attr]: kobject.get('uid')}))
            } else {
                if (kobject.get(relation.attr)) {
                    promises.push(kstore.get(kobject.get(relation.attr)))
                }
            }
        }
        if (promises.length === 0) { resolve(kobject); return }
        Promise.allSettled(promises)
        .then(relations => {
            for (const relation of relations) {
                if (relation.status !== 'fulfilled') { continue }
                if (!relation.value) { continue }       
                if (Array.isArray(relation.value)) {
                    for(const rel of relation.value) {
                        kobject.addRelation(rel.getType(), rel)
                    }
                } else {
                    kobject.setRelation(relation.value.getType(), relation.value)
                }
            }
            resolve(kobject)
        })
        .catch(reason => {
            console.log(reason)
            resolve(kobject)
        })
    })
}

KStore.prototype.delete = function (id) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${this.url}/${id}`)
        fetch(url, {method: 'DELETE'})
        .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
        })
        .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            if (!result.length) { throw new Error('ERR:NoResults') }
            const data = Array.isArray(result.data) ? result.data[0] : result.data
            if (!data[id]) { throw new Error('ERR:Server') }
            resolve(data[id])
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        /* in some part, store/id is used, remove the store part */
        if (id.indexOf('/') !== -1) {
            id = id.split('/').pop() 
        }
        const url = new URL(`${this.url}/${id}`)
        fetch(url)
        .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
        })
        .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            if (!result.length) { throw new Error('ERR:NoResults') }
            const kobject = Array.isArray(result.data) ? new KObject(this.type, result.data[0]) : new KObject(this.type, result.data)
            return this.relateEntry(kobject)
        })
        .then(k => {
            resolve(k)
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KStore.prototype.query = function (query) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${this.url}/_query`)
        fetch(url, {method: 'POST', body: JSON.stringify(query)})
        .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
        })
        .then (result => {
            if (!result.success) { throw new Error('ERR:Server') }
            if (result.length === 0) { resolve([]) }
            if (!result.data) { resolve([]) }
            const promises = []
            for (const data of Array.isArray(result.data) ? result.data : [result.data]) {
                const kobject = new KObject(this.type, data)
                promises.push(this.relateEntry(kobject))
            }
            Promise.allSettled(promises)
            .then(results => {
                const kobjects = []
                for (const promise of results) {
                    if (promise.status === 'fulfilled') {
                        kobjects.push(promise.value)
                    }
                }
                resolve(kobjects)
            })
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KStore.prototype.set = function (object, id = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${this.url}${id === null ? '' : '/' + id}`)
        fetch(url, {method: id === null ? 'POST' : 'PATCH', body: JSON.stringify(object)})
        .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
        })
        .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            if (result.length < 1) { throw new Error('ERR:Server') }
            const data = Array.isArray(result.data) ? result.data[0] : result.data
            if (!data.id) { throw new Error('ERR:Server') }
            resolve(data.id)
        })
        .catch(reason => {
            reject(reason)
        })
    })    
}
