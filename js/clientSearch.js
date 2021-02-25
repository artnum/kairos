function ClientSearch() {
    this.addresses = {}
}

ClientSearch.prototype.formatAddress = function(address) {
    return new Address(address).toHtml(true)
}

ClientSearch.prototype.cleanup = function () {
    return new Promise((resolve, reject) => {
        if (this.domNode) {
            window.requestAnimationFrame(() => {
                this.domNode.innerHTML = ''
                resolve()
            })
        } else {
            resolve()
        }
    })
}

ClientSearch.prototype.doSearch = function (url, address = null) {
    return new Promise((resolve, reject) => {
        fetch(url).then(response => {
            if (!response.ok) { resolve(null); return }
            let searchResults = {}
            response.json().then(result => {
                if (result.length < 1) { resolve(null); return }
                let addr
                if (address) {
                    addr = new Address(address)
                }
                let promises = []
                for (let i = 0; i < result.length; i++) {
                    if (result.data[i].reservation <= 0 || result.data[i].reservation == null) { continue }
                    promises.push(new Promise((resolve, reject) => {
                        KReservation.load(result.data[i].reservation).then(r => {
                            if(!addr) {
                                addr = new Address(result.data[i])
                            }
                            if (searchResults[addr.id] === undefined) {
                                searchResults[addr.id] = {address: addr, years: {}}
                            }

                            if (searchResults[addr.id].years[r.getYear()] === undefined) {
                                searchResults[addr.id].years[r.getYear()] = []
                            }
                            searchResults[addr.id].years[r.getYear()].push(r)
                            resolve()
                        })
                    }))
                }
                Promise.all(promises).then(_ => {
                    resolve(searchResults)
                })
            }, () => resolve(null))
        }, () => resolve(null))
    })
}

ClientSearch.prototype.search = function (val) {
    if (val.length < 3) {
        KAIROS.warn('Cherchez plus de 3 caractères')
        return
    }
    let params = val.split(' ')
    let url = new URL(`${KAIROS.getBase()}/store/Contacts`)
    let url2 = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
    let p = []

    if (params.length > 0) {
        for (let i = 0; i < params.length; i++) {
            if (params[i] !== '') {
                url.searchParams.append('search.name', `*${params[i]}*`)
                url2.searchParams.append('search.freeform', `~%${params[i]}%`)
            }
        }
        p.push(this.doSearch(url2))
        new Promise((resolve, reject) => { 
            console.log('---- ----- -----')
            fetch(url).then(response => {
                if (!response.ok) { resolve(); return }
                response.json().then(result => {
                    for (let i = 0; i < result.length; i++) {
                        let url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
                        url.searchParams.append('search.target', `/Contacts/${result.data[i].IDent}`)
                        p.push(this.doSearch(url, result.data[i]))
                    }
                    resolve()
                }, () => resolve())
            }, () => resolve())
        }).then(() => {
            console.log(p)
            if (p.length > 0) {
                Promise.all(p).then(results => {
                   KAIROS.openWindow(`Recherche client "${val}"`).then(win => {
                       for (let i = 0; i < results.length; i++) {
                           
                       }
                   })
                })
            }
        })
    }
}