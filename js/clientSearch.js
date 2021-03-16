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
                            r.loaded().then(r => {
                                if(!addr) {
                                    addr = new Address(result.data[i])
                                }
                                if (searchResults[addr.id] === undefined) {
                                    searchResults[addr.id] = {address: addr, years: {}, yearList: []}
                                }

                                if (searchResults[addr.id].years[r.getYear()] === undefined) {
                                    searchResults[addr.id].years[r.getYear()] = []
                                    searchResults[addr.id].yearList.push(r.getYear())
                                    searchResults[addr.id].yearList.sort((a, b) => { return parseInt(b) - parseInt(a) })
                                }
                                searchResults[addr.id].years[r.getYear()].push(r)
                                resolve()
                            })
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
        KAIROS.openWindow(`Recherche client "${val}"`).then(([win, doc]) => {
            win.startLoading()
            p.push(this.doSearch(url2))
            new Promise((resolve, reject) => { 
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
                if (p.length > 0) {
                    Promise.all(p).then(results => {
                        for (let i = 0; i < results.length; i++) {
                            if (results[i] === null) { continue }
                            const addr = results[i][Object.keys(results[i])[0]]
                            const div = doc.createElement('DIV')
                            div.classList.add('searchResult')
                            div.innerHTML = `<h1>${addr.address.toString()}</h1>`
                            div.addEventListener('click', event => {
                                if (event.target.dataset.reservation) {
                                    event.target.classList.add('wait')
                                    KAIROS.timeline.gotoReservation(event.target.dataset.reservation).then(opened => {
                                        console.log(opened)
                                        if (opened) {
                                            event.target.classList.remove('wait')
                                        } else {
                                            KAIROS.error(`Échec d'ouverture de la réservation`)
                                        }
                                    })
                                    return;
                                }
                                const node = event.target.parentNode
                                if (node.dataset.open === '1') {
                                    node.innerHTML = ''
                                    node.dataset.open = '0'
                                } else {
                                    node.dataset.open = '1'
                                    let entryCount = 0
                                    for (const y of addr.yearList) {
                                        if (addr.years[y].length <= 0) { continue }
                                        node.innerHTML += `<h2>${y}</h2>`
                                        for (let i = 0; i < addr.years[y].length; i++) {
                                            let entry = addr.years[y][i]
                                            entryCount++
                                            node.innerHTML += `
                                                <p class="result"><span class="uid entry">${entry.data.machine?.uid ?? ''}</span>
                                                <span class="name entry">${entry.data.machine?.cn ?? ''}</span>
                                                <span class="reservation entry" data-reservation="${entry.data.reservation?.id}">${entry.data.reservation?.id}</span>
                                                du <span class="begin entry">${entry.data.reservation?.begin.shortDate()}</span>
                                                au <span class="begin entry">${entry.data.reservation?.end.shortDate()}</span>
                                                <span class="reference entry">${entry.data.reservation?.reference ?? ''}</span>
                                                <span class="locality entry">${entry.data.reservation?.locality ?? ''}</span>
                                                </p>`
                                            if (entryCount > 20) { break }
                                        }
                                        if (entryCount > 20) { break }
                                    }
                                }
                            })
                            win.appendChild(div)
                        }
                        win.stopLoading()
                    })
                }
            })
        })
    }
}