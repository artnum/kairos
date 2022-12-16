function KLogin (base = null) {
    this.derive_halgo = 'SHA-256'
    this.halgo = 'SHA-384'
    this.halgo_length = 384
    this.pbkdf2_iterations = [100000, 200000]
    this.base = base || window.location
}

KLogin.prototype.getUserid = function (username) {
    return new Promise((resolve, reject) => {
        fetch (new URL('.auth/userid', this.base), {method: 'POST', body: JSON.stringify({username})})
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (result.error) { return reject(new Error('login error')) }
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.init = function (userid, nonce = null) {
    return new Promise((resolve, reject) => {
        const params = {userid: userid}
        if (nonce !== null) { params.cnonce = this.arrayToB64(nonce) }
        fetch (new URL('.auth/init', this.base), {method: 'POST', body: JSON.stringify({userid, cnonce: this.arrayToB64(nonce), hash: this.halgo})})
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (result.error) { return reject(new Error('login error')) }
            resolve(result)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.arrayToB64 = function (array) {
    return btoa(String.fromCharCode(...new Uint8Array(array)))
}

KLogin.prototype.b64ToArray = function (string) {
    const binary = atob(string)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i)
    }
    return array
}

KLogin.prototype.genPassword = function (password) {
    const getRandomInt = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }
    return new Promise((resolve, reject) => {
        const outKey = {
            derived: '',
            salt: new Uint8Array(this.derive_halgo_length / 8),
            iterations: getRandomInt(this.pbkdf2_iterations[0], this.pbkdf2_iterations[1])
        }
        crypto.getRandomValues(outKey.salt)
        crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
        .then(cryptokey => {
            return crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt: outKey.salt, iterations: outKey.iterations}, 
                cryptokey, {name: 'HMAC', hash: 'SHA-256'}, true, ['sign'])
        })
        .then(cryptokey => {
            return crypto.subtle.exportKey('raw', cryptokey)
        })
        .then(rawkey => {
            outKey.derived = this.arrayToB64(rawkey)
            outKey.salt = this.arrayToB64(outKey.salt)
            return resolve(outKey)
        })
        .catch(e => {
            reject(new Error('Password generation failed', {cause: e}))
        })
    })
}

KLogin.prototype.genToken = function (params, password, nonce = null) {
    return new Promise ((resolve, reject) => {
        crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
        .then(cryptokey => {
            const salt = this.b64ToArray(params.salt).buffer
            /* TODO length is set to 256 for compatibility purpose, must change */
            return crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: parseInt(params.count)}, 
                cryptokey, {name: 'HMAC', hash: this.halgo, length: 256}, false, ['sign'])
        })
        .then(key => {
            const auth = this.b64ToArray(params.auth)
            const sign = new Uint8Array(auth.length + (nonce === null ? 0 : nonce.length))
            sign.set(auth)
            if (nonce) { sign.set(nonce, auth.length) }
            return crypto.subtle.sign({name: 'HMAC', hash: this.halgo, length: this.halgo_length}, key, sign)
        })
        .then(rawtoken => {
            resolve(this.arrayToB64(rawtoken))
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.getToken = function () {
    return Promise.resolve(localStorage.getItem('klogin-token'))
}

KLogin.prototype.getUser = function () {
    return Promise.resolve(localStorage.getItem('klogin-userid'))
}

KLogin.prototype.check = function (token) {
    return new Promise((resolve, reject) => {
        fetch (new URL('.auth/check', this.base), {method: 'POST', body: JSON.stringify({auth: token})})
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (!result.done) { return reject(new Error('login error'))}
            resolve(token)
        })
    })
}

KLogin.prototype.getShareType = function (name) {
    switch(name) {
        default:
        case 'share-limited': return [86400, false]
        case 'share-once-limited': return [600, true]
        case 'share-once-unlimited': return [-1, true]
        case 'share-unlimited': return [-1, false]
    }
}

KLogin.prototype.genUrl = function (url, params = {}, type = [86400, false]) {
    return new Promise((resolve, reject) => {
        if (!(url instanceof URL)) { url = new URL(url) }
        Object.keys(params).forEach(k => {
            url.searchParams.append(k, params[k])
        })
        this.getShareableToken(url, '', type[0], type[1])
        .then(token => {
            url.searchParams.append('access_token', token)
            resolve(url)
        })
        .catch(cause => {
            reject('Cannot get token', {cause : cause})
        })
    })
}

KLogin.prototype.getShareableToken = function (url, comment = '', duration = 86400, once = false) {
    return new Promise((resolve, reject) => {
        this.getToken()
        .then(token => {
            return fetch(new URL('.auth/getshareable', this.base), {method: 'POST', body: JSON.stringify({auth: token, url, comment, permanent: duration <= 0, duration, once, hash: this.halgo})})
        })
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (!result.done) { return reject(new Error('login error'))}
            return resolve(result.token)
        })
        .catch(e => {
            return reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.quit = function (token) {
    return fetch(new URL('.auth/quit', this.base), {method: 'POST', body: JSON.stringify({auth: token})})
}

KLogin.prototype.logout = function () {
    return new Promise(resolve => {
        const token = localStorage.getItem('klogin-token')
        this.quit(token)
        .finally(() => {
            localStorage.removeItem('klogin-token')
            localStorage.removeItem('klogin-userid')
            resolve()
        })
    })
}

KLogin.prototype.getNonce = function () {
    const arr = new Uint8Array(this.halgo_length / 8)
    crypto.getRandomValues(arr)
    return arr
}

KLogin.prototype.isLogged = function () {
    return new Promise((resolve, reject) => {
        const userid = localStorage.getItem('klogin-userid')
        const token = localStorage.getItem('klogin-token')
        this.check(token)
        .then(token => {
            return resolve(token)
        })
        .catch(cause => {
            reject(new Error('Error login', {cause: cause}))
        })
    })
}

KLogin.prototype.login = function (userid, password) {
    return new Promise((resolve, reject) => {
        const nonce = this.getNonce()
        this.init(userid, nonce)
        .then(params => {
            return this.genToken(params, password, nonce)
        })
        .then(token => {
            return this.check(token)
        })
        .then(token => {
            localStorage.setItem('klogin-userid', userid)
            localStorage.setItem('klogin-token', token)
            resolve(token)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.disconnect = function (userid) {
    return new Promise((resolve, reject) => {
        return fetch (new URL('.auth/disconnect', this.base), {method: 'POST', body: JSON.stringify({userid: userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot disconnect')) }
            return response.json()
        })
        .then(result => {
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.disconnectAll = function (userid) {
    return new Promise((resolve, reject) => {
        return fetch (new URL('.auth/disconnect-all', this.base), {method: 'POST', body: JSON.stringify({userid: userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot disconnect')) }
            return response.json()
        })
        .then(result => {
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.disconnectShare = function (userid) {
    return new Promise((resolve, reject) => {
        return fetch (new URL('.auth/disconnect-share', this.base), {method: 'POST', body: JSON.stringify({userid: userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot disconnect')) }
            return response.json()
        })
        .then(result => {
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.disconnectById = function (uid) {
    return new Promise((resolve, reject) => {
        return fetch (new URL('.auth/disconnect-by-id', this.base), {method: 'POST', body: JSON.stringify({uid: uid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot disconnect')) }
            return response.json()
        })
        .then(result => {
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.getActive = function (userid) {
    return new Promise((resolve, reject) => {
        fetch (new URL('.auth/active', this.base), {method: 'POST', body: JSON.stringify({userid: userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot get active connection')) }
            return response.json()
        })
        .then(result => {
            if (!result.connections) { return reject(new Error('Cannot get active connection'))}
            resolve(result.connections)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}