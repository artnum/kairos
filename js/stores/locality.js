/* eslint-env browser, amd */
function KLocalityStore (type = 'both') {
    this.type = String(type).toLowerCase()
}

KLocalityStore.prototype.getLabel = function (entry) {
    let label = `${entry.name} (Dépôt)`
    if (entry.state) {
      const township = entry.township.replace(`(${entry.state.toUpperCase()})`, '').trim() // remove state specifier when already in database
      if (township === entry.name) {
        label = `${entry.np} ${entry.name} (${entry.state.toUpperCase()})`
      } else {
        label = `${entry.np} ${entry.name} (${township} ${entry.state.toUpperCase()})`
      }
    }
    return label
}

KLocalityStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        if (/^PC\/[0-9a-f]{32,32}$/.test(id) || /^Warehouse\/[a-zA-Z0-9]*$/.test(id)) {
            fetch(new URL(`${KAIROS.getBase()}/store/${id}`))
            .then(response => {
                if (!response.ok) { return null }
                return response.json()
            })
            .then(result => {
                if (!result) { resolve(null); return }
                if (result.length !== 1) { resolve(null); return}
                const entry = Array.isArray(result.data) ? result.data[0] : result.data
                entry.label = this.getLabel(entry)
                entry.printableLabel = entry.label
                entry.value = id
                entry.lastFetch = (new Date()).getTime()
                resolve(entry)
            })
            .catch(reason => { resolve(null) })
            return;
        }

        resolve({
            label: id,
            printableLabel: id,
            value: id,
            lastFetch: new Date().getTime()
        })
    })
}

KLocalityStore.prototype.query = function (txt) {
    return new Promise((resolve, reject) => {
        const queries = []
        let searchName = txt.toAscii()
        let searchNp = null
        if (txt && txt.indexOf(' ') !== -1) {
            searchNp = txt.split(' ', 2)
            if (!isNaN(parseInt(searchNp[0], 10)) && String(parseInt(searchNp[0], 10)) === searchNp[0]) {
                searchName = searchNp[1].toAscii()
                searchNp = searchNp[0]
            } else {
                searchNp = null
            }
        }
        if (this.type === 'both' || this.type === 'warehouse') {
            const url = new URL(`${KAIROS.getBase()}/store/Warehouse`)
            url.searchParams.append('search.name', `~${searchName}%`)
            queries.push(fetch(url))
        }
        if (txt.length > 0 && (this.type === 'both' || this.type === 'locality')) {
            const url = new URL(`${KAIROS.getBase()}/store/PC`)
            url.searchParams.append('search._rules', 'name OR township OR np')
            url.searchParams.append('search.name', `~${searchName}%`)
            url.searchParams.append('search.township', `~${searchName}%`)
            if (searchNp) {
                url.searchParams.append('search.np', `~${searchNp}%`)
            } else {
                url.searchParams.append('search.np', `~${searchName}%`)
            }
            queries.push(fetch(url))
        }
        Promise.allSettled(queries)
        .then(responses => {
            const results = []
            for (const response of responses) {
                if (response.status === 'fulfilled') {
                    if (!response.value.ok) { continue }
                    results.push(response.value.json())
                }
            }
            return Promise.allSettled(results)
        })
        .then(results => {
            let entries = []
            for (const result of results) {
                if (result.status !== 'fulfilled') { continue }
                if (result.value.length <= 0) { continue }
                const currentEntries = []
                for (const entry of result.value.data) {
                    let name = entry.name
                    let s = entry.name.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
                    if (s !== -1) {
                        name = `${entry.name.substring(0, s)}<span class="match">${entry.name.substring(s, s + searchName.length)}</span>${entry.name.substring(s + searchName.length)}`
                    }
                    if (entry.np) {
                        let np = entry.np
                        const searchTerm = searchNp || searchName
                        s = entry.np.indexOf(searchTerm)
                        if (s !== -1) {
                            np = `${entry.np.substring(0,s)}<span class="match">${entry.np.substring(s, s + searchTerm.length)}</span>${entry.np.substring(s + searchTerm.length)}`
                        }
                        let township = entry.township
                        if (entry.name !== entry.township) {
                            s = entry.township.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
                            if (s !== -1) {
                                township = `${entry.township.substring(0, s)}<span class="match">${entry.township.substring(s, s + searchName.length)}</span>${entry.township.substring(s + searchName.length)}`
                            }
                        } else {
                            township = ''
                        }
                        entry.printableLabel = entry.label
                        entry.label = this.getLabel(Object.assign(entry, {np, township, name}))
                    } else {
                        entry.printableLabel = entry.label
                        entry.label = this.getLabel(Object.assign(entry, {name}))
                    }
                    entry.value = `${result.value.store}/${this.getIdentity(entry)}`
                    currentEntries.push(entry)
                }
                currentEntries.sort((a, b) => {
                    return a.name.localeCompare(b.name)
                })
                entries = entries.concat(currentEntries)
            }
            resolve(entries)
        })
    })
}

KLocalityStore.prototype.getIdentity = function (object) {
    if (object.uid) {
        return object.uid
    } else {
        return object.id
    }   
}