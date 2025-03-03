class Fetch {
    constructor(authToken) {
        this.authToken = authToken
        this.clientId = null
    }

    setAuthToken (authToken) {
        this.authToken = authToken
    }

    setClientId (clientId) {
        this.clientId = clientId
    }

    getRequestId () {
        return new Promise((resolve, reject) => {
            resolve(
                Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(16)),
                    x => ('00' + x.toString(16)).slice(-2)
                ).join('')
            )
        })
    }

    setHeaders (headers) {
        return new Promise((resolve, reject) => {
            if (!(headers instanceof Headers)) {
                return reject(new TypeError('headers must be an instance of Headers'))
            }
            this.getRequestId()
            .then(requestId => {
                headers.set('Authorization', `Bearer ${this.authToken}`)
                headers.set('X-Request-Id', requestId)
                if (this.clientId) {
                    headers.set('X-Client-Id', this.clientId)
                }
                return resolve(headers)
            })
        })
    }

    getResponse (response) {
        return new Promise((resolve, reject) => {
            if (!response.ok) {
                return reject(response)
            }
            switch(String(response.headers.get('Content-Type')).trim().split(';')[0].trim()) {
                default:
                    response.text()
                    .then(text => {
                        return resolve({
                            content: text,
                            type: 'text/plain',
                            status: response.status
                        })
                    })
                case 'application/json':
                    response.json()
                    .then(json => {
                        return resolve({
                            content: json,
                            type: 'application/json',
                            status: response.status
                        })
                    })
            }
        })
    }

    get (url, options) {
        options = Object.assign({}, options)
        options.method = 'GET'
        return this.fetch(url, options)
    }

    post (url, options) {
        options = Object.assign({}, options)
        options.method = 'POST'
        return this.fetch(url, options)
    }

    put (url, options) {
        options = Object.assign({}, options)
        options.method = 'PUT'
        return this.fetch(url, options)
    }

    delete (url, options) {
        options = Object.assign({}, options)
        options.method = 'DELETE'
        return this.fetch(url, options)
    }

    patch (url, options) {
        options = Object.assign({}, options)
        options.method = 'PATCH'
        return this.fetch(url, options)
    }

    fetch (url, options) {
        return new Promise((resolve, reject) => {
            options = options || {}

            if (!(url instanceof URL)) {
                url = new URL(url, location)
            }
            if (options.headers === undefined) {
                options.headers = new Headers()
            }
            if (!(options.headers instanceof Headers)) {
                options.headers = new Headers(options.headers)
            }
            
            if (options.body && typeof options.body !== 'string') {
                options.body = JSON.stringify(options.body)
                options.headers.set('Content-Type', 'application/json')
            }

            this.setHeaders(options.headers)
            .then(headers => {
                options.headers = headers
                return fetch(url, { ...options})
            })
            .then(response => {
                return this.getResponse(response)
            })
            .then(result=> {
                resolve(result)
            })
            .catch(reason => {
                reject(reason)
            })
        })
    }
}