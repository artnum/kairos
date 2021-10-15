function KField (opts, data) {
    this.opts = opts
    this.data = data
}

KField.prototype.get = function(name) {
    return new Promise((resolve) => {
        this.data.ready()
        .then(_ => {
            const result = this.data.get(name)
            if (result instanceof Promise) {
                result
                .then(value => {
                    resolve(value)
                })
                .catch(reason => {
                    resolve(undefined)
                })
            } else {
                resolve(result)
            }
        })
        .catch(reason => {
            resolve(undefined)
        })
    })
}

KField.prototype.set = function(name, value) {
    return this.data.set(name, value)
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