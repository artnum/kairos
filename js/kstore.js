function KStore(type, bindQuery = null) {
    if (!KAIROS.stores[type]) { return null }
    const baseUrl = KAIROS.URL(KAIROS.stores[type].store)
    let bindedQuery = ''
    if (bindQuery !== null) {
        bindedQuery = `#${JSON.stringify(bindQuery)}`
    }
    if (!KStore._instance) { KStore._instance = new Map() }
    else {
        if (KStore._instance.has(`${baseUrl}${bindedQuery}`)) {
            return KStore._instance.get(`${baseUrl}${bindedQuery}`)
        }
    }

    this.url = baseUrl
    this.type = type
    this.bindQuery = bindQuery
    KStore._instance.set(`${baseUrl}${bindedQuery}`, this)
    return this
}

KStore.save = function (kobject) {
    const kstore = new KStore(kobject.getType())
    const fields = KAIROS.stores[kobject.getType()].fields !== undefined ? KAIROS.stores[kobject.getType()].fields : []
    if (fields.length === 0) {
        return kstore.set(kobject.getBody(), kobject.get('uid'))
    }
    const body = {}
    for (const k of kobject.keys()) {
        if (fields.indexOf(k) !== -1) {
            body[k] = kobject.get(k)
        }
    }
    return new Promise((resolve, reject) => {
        kstore.set(body, kobject.get('uid'))
        .then(id => {
            return kstore.get(id)
        })
        .then(kobject => {
            resolve(kobject)
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KStore.prototype.relateEntry = function (kobject) {
    return new Promise((resolve) => {
        const promises = []
        if (!kobject.get('uid')) { resolve(kobject); return }
        if (!KAIROS.stores[kobject.getType()].relation) { resolve(kobject); return }

        for (const relation of KAIROS.stores[kobject.getType()].relation) {
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
                        rel.addRelation(kobject.getType(), kobject)
                    }
                } else {
                    kobject.setRelation(relation.value.getType(), relation.value)
                    relation.value.addRelation(kobject.getType(), kobject)
                }
            }
            resolve(kobject)
        })
        .catch(reason => {
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

KStore.prototype.getSearchAttribute = function () {
    return KAIROS.stores[this.type].searchOn || 'name'
}

KStore.prototype.get = function (id) {
    if (id === undefined) { return Promise.resolve(null) }
    if (id === null || String(id) === '' || parseInt(id) === 0) { return Promise.resolve(null) }
    return new Promise((resolve, reject) => {
        id = String(id)
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
        if (this.bindQuery) {
            const originalQuery = query
            query = {'#and': {

            }}
            for (const k of Object.keys(originalQuery)) {
                query['#and'][k] = originalQuery[k]
            }
            for (const k of Object.keys(this.bindQuery)) {
                query['#and'][k] = this.bindQuery[k]
            }
        }
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
        console.log(object)
        const json = object instanceof KObject ? object.toJSON() : JSON.stringify(object)
        if (object instanceof KObject) {
            id = object.get('uid')
        }
        if (typeof id === 'undefined') { id = null }
        if (id === '') { id = null }
        const url = new URL(`${this.url}${id === null ? '' : '/' + id}`)
        fetch(url, {method: id === null ? 'POST' : 'PATCH', body: json})
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