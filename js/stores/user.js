function KairosUser(object, label = null) {
    if (Array.isArray(object)) {
        object = object[0]
    }
    if (label === null) {
        object.label = object.name
    } else {
        object.label = label
    }
    delete object.color

    Object.assign(this, object)
    this.value = this.getUrl()
}

KairosUser.prototype.getUrl = function () {
    return `/User/${this.id}`
}

KairosUser.prototype.getIdentity = function () {
    if (this.uid) {
        return this.uid
    } else {
        return this.id
    }
}

KairosUser.prototype.getId = function () {
    let id = parseInt(this.id)
    if (isNaN(id)) { throw new RangeError('ID must be a number') }
    if (id <= 0) { throw new RangeError('ID must be a positive number') }
    return id
}

function UserStore(options = {}) {
    this.entries = []
    this.params = {}
    if (options.type) {
      this.params = {'search.function': options.type}
    }
}

UserStore.getCurrentUser = function () {
    return new Promise((resolve, reject) => {
        let currentUser = null
        try {
            currentUser = window.localStorage.getItem(`/${KAIROS.getBaseName()}/user`)
            if (!currentUser) { throw new RangeError('Null not allowed') }
            currentUser = JSON.parse(currentUser)
            resolve(new KairosUser(currentUser))
        } catch (e) { 
            resolve(null)
        }
    })
}

UserStore.prototype.cleanUrl = function (id) {
    let s = id.split('/')
    if (s[0] === 'store' || s[0] === '') {
      s.shift()
      if (s[0] === 'store') {
        s.shift()
      }
    }
    return s.join('/')
}

UserStore.prototype.get = function (relUrl) {
    return new Promise((resolve, reject) => {
        if (!relUrl) { resolve(null); return }
        let entry = null
        relUrl = this.cleanUrl(relUrl)
        if (relUrl.split('/').length < 2) { resolve(null); return }
        
        let url = new URL(`store/${relUrl}`, KAIROS.getBase())
        fetch(url, {headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})}).then(response => {
            if (!response.ok) { resolve(null); return }
            response.json().then(result => {
                if (result.length !== 1) { resolve(null); return }
                resolve(new KairosUser(result.data))
            }, reason => reject(reason))
        }, reason => reject(reason))
    })
}

UserStore.prototype.query = function (txt, currentValue = undefined) {
    return new Promise((resolve, reject) => {
        let entries = []
        let searchName = txt.toAscii()
        let url = new URL('store/User', KAIROS.getBase())
        url.searchParams.append('search.name', `~${searchName}%`)
        Object.keys(this.params).forEach(k => {
            url.searchParams(k, this.params[k])
        })
        fetch(url, {headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})}).then(response => {
            if (!response.ok) { resolve([]); return }
            response.json().then(result => {
                for (let i = 0; i < result.length; i++) {
                    let entry = result.data[i]
                    if (entry.disabled && entry.disabled !== '0') { continue }
                    let s = entry.name.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
                    let name = entry.name
                    if (s !== -1) {
                        name = entry.name.substring(0, s) + '<span class="match">' +
                            entry.name.substring(s, s + searchName.length) + '</span>' +
                            entry.name.substring(s + searchName.length)
                    }
                    entries.push(new KairosUser(entry, name))
                }
            
                entries.sort((a, b) => {
                    return a.name.localeCompare(b.name)
                })

                this.entries = entries
                resolve(entries)
            }, reason => reject(reason))

        }, reason => reject(reason))
    })
}

UserStore.prototype.search = function (search) {
    return new Promise ((resolve, reject) => {
        let url = new URL('store/User', KAIROS.getBase())
        Object.keys(search).forEach(k => {
            if (Array.isArray(search[k])) {
                search[k].foreEach(v => {
                    url.searchParams.append(`search.${k}`, v)
                })
            } else {
                url.searchParams.append(`search.${k}`, search[k])
            }
        })
        fetch(url, {headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})}).then(response => {
            if (!response.ok) { reject(`HTTP Error code ${response.status} - ${response.statusText}`); return }
            response.json().then(result => {
                let entries = []
                for (let i = 0; i < result.length; i++) {
                    entries.push(new KairosUser(result.data[i]))
                }
                this.entries = entries
                resolve(this.entries)
            })
        }, reason => reject(reason))
    })
}

UserStore.prototype.getIdentity = function (object) {
    if (object.uid) {
        return object.uid
    } else {
        return object.id
    }
}