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
    fetch(url).then(response => {
        if (!response.ok) { return }
        response.json().then(result => {
            if (result.length < 1) { return }
            let addr
            if (address) {
                addr = new Address(address)
            }
        
            for (let i = 0; i < result.length; i++) {
                if (result.data[i].reservation <= 0 || result.data[i].reservation == null) { continue }
                KReservation.load(result.data[i].reservation).then(r => {
                    if(!addr) {
                        addr = new Address(result.data[i])
                    }
                    let addrNode
                    if (this.addresses[addr.id] === undefined) {
                        addrNode = document.createElement('DIV')
                        this.window.document.body.appendChild(addrNode)
                        addrNode.innerHTML = `<span class="result">${addr.toString()} ${addr.getType()}</span>`
                        this.window.document.body.appendChild(document.createElement('DIV'))
                        addrNode = {node: addrNode, years: {}, entries: {}}
                        this.addresses[addr.id] = addrNode
                    } else {
                        addrNode = this.addresses[addr.id]
                    }

                    if (addrNode.entries[r.getId()]) {
                        return;
                    }
                    addrNode.entries[r.getId()] = r

                    r.oneLine().then(node => {
                        let domNode
                        if (addrNode.years[r.getYear()]) {
                            domNode = addrNode.years[r.getYear()]
                        } else {
                            domNode = document.createElement('DIV')
                            domNode.innerHTML = `<span class="year">${r.getYear()}</span>`
                            domNode.dataset.sort = r.getYear()
                            let node = null
                            for (let year of Object.keys(addrNode.years)) {
                                if (parseInt(year) < r.getYear()) {
                                    node = addrNode.years[year]
                                }
                            }
                            addrNode.years[r.getYear()] = domNode
                            this.window.document.body.insertBefore(domNode, node)
                        }
                        node.classList.add('entry')
                        this.window.document.body.appendChild(node)
                    })
                })
            }
        })
    })
}

ClientSearch.prototype.search = function (val) {
    if (val.length < 3) {
        KAIROS.warn('Cherchez plus de 3 caractères')
        return
    }
    let params = val.split(' ')

    KAIROS.openWindow(`Recherche client "${val}"`).then(win => {
        this.window = win
        let url = new URL(`${KAIROS.getBase()}/store/Contacts`)
        let url2 = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
        if (params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                if (params[i] !== '') {
                    url.searchParams.append('search.name', `*${params[i]}*`)
                    url2.searchParams.append('search.freeform', `~%${params[i]}%`)
                }
            }
            fetch(url).then(response => {
                if (!response.ok) { return }
                response.json().then(result => {
                    for (let i = 0; i < result.length; i++) {
                        let url = new URL(`${KAIROS.getBase()}/store/ReservationContact`)
                        url.searchParams.append('search.target', `/Contacts/${result.data[i].IDent}`)
                        this.doSearch(url, result.data[i])
                    }
                })
            })
            this.doSearch(url2)
        }
    })
}