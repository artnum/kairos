function UserStore(options = {}) {
    this.entries = []
    this.params = {}
    if (options.type) {
      this.params = {'search.function': options.type}
    }
}

UserStore.prototype.cleanId = function (id) {
    let s = id.split('/')
    if (s[0] === 'store' || s[0] === '') {
      s.shift()
      if (s[0] === 'store') {
        s.shift()
      }
    }
    return s.join('/')
}

UserStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        if (!id) { resolve({label: '', value: ''}); return }
        let entry = null
        id = this.cleanId(id)
        
        let url = new URL(`store/${id}`, KAIROS.getBase())
        fetch(url, {headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})}).then(response => {
            if (!response.ok) { reject(`HTTP Error code ${response.status} - ${response.statusText}`); return }
            response.json().then(result => {
                if (result.length !== 1) { reject('Result count invalid'); return }

                entry = Array.isArray(result.data) ? result.data[0] : result.data
                let name = `${entry.name}`
                entry.label = name
                entry.value = id
                delete entry.color

                resolve(entry)
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
            if (!response.ok) { reject(`HTTP Error code ${response.status} - ${response.statusText}`); return }
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

                    entry.label = `${name}`
                    entry.value = `User/${entry.id}`
                    delete entry.color

                    entries.push(entry)
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

UserStore.prototype.getIdentity = function (object) {
    if (object.uid) {
        return object.uid
    } else {
        return object.id
    }
}