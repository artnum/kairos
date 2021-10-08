function KStore(baseUrl) {
    if (KStore._instance) { return KStore._instance}

    this.url = baseUrl
    KStore._instance = this
    return this
}

KStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${this.url}/${id}`)
        fetch(url)
        .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
        })
        .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            if (!result.length) { throw new Error('ERR:NoResults') }
            resolve(Array.isArray(result.data) ? result.data[0] : result.data)
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
            resolve(Array.isArray(result.data) ? result.data : [result.data])
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
            resolve(Object.keys(data)[0])
        })
        .catch(reason => {
            reject(reason)
        })
    })    
}
