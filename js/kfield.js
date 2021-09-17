function KField (opts, data) {
    this.opts = opts
    this.data = data
}

KField.prototype.get = function(name) {
    return new Promise((resolve) => {
        this.data.ready()
        .then(_ => {
            if (!this.opts[name]) { resolve(undefined); return }
            if (!this.opts[name].remote) { resolve(undefined); return }
            this.data.get(this.opts[name].remote)
            .then(value => {
                resolve(value)
            })
            .catch(reason => {
                resolve(undefined)
            })
        })
        .catch(reason => {
            resolve(undefined)
        })
    })
}

KField.prototype.set = function(name, value) {
    if (!this.opts[name]) { return undefined }
    if (!this.opts[name].remote) { return undefined }
    return this.data.set(this.opts[name].remote, value)
}

KField.prototype.gets = function (names) {
    return new Promise(resolve =>  {
        const all = []

        for (const name of names) {
            all.push(this.get(name))
        }
        Promise.allSettled(all)
        .then(results => {
            const values = new Map()
            for (const name of names) {
                const result = results.shift()
                if (result.status !== 'fulfilled') { continue }
                values.set(name, result.value)
            }
            resolve(values)
        })
    })
}