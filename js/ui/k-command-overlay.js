function KCommandOverlay() {
    const kset = new KSettings()

    const operations = [
        {
            key: 'A',
            label: 'Se rendre à aujourd\'hui',
            input: false,
            cb: () => { return this.gotoDay(new Date()) }
        },
        {
            key: 'J',
            label: 'Se rendre au jour',
            input: true,
            cb: (value) => { return this.gotoDay(value) }
        },
        /*{
            key: 'R',
            label: 'Se rendre à la réservation',
            input: true,
            cb: (value) => {
                window.dispatchEvent(new CustomEvent('k-search-reservation', { detail: { reservation: value } }))
                return Promise.resolve()
            }
        },*/
        {
            key: 'P',
            label: 'Projets',
            input: false,
            cb: () => { return this.displayProjects() }
        },
        {
            key: 'K',
            label: 'Wiki',
            input: false,
            cb: () => { 
                const klateral2 = new KLateral().open()
                klateral2.add(`<iframe style="border: none; width: 100%; height: 100%; min-height: 100%; min-width: 100%;" src="${KAIROS.URL(KAIROS.kedURL)}"></iframe>`, {title: 'Wiki'})
                return Promise.resolve()
            }
        },
        {
            key: 'I',
            label: 'Imprimer',
            input: false,
            cb: () => { return this.print() }
        }
    ]
    if (document.getElementById('commandModeOverlay')) {
        this.domNode = document.getElementById('commandModeOverlay')
    } else {
        this.domNode = document.createElement('DIV')
        this.domNode.id = 'commandModeOverlay'
    }
    this.domNode.style.setProperty('z-index', KAIROS.zMax() * 3)
    this.domNode.innerHTML = '<div class="container">'
    this.container = this.domNode.firstElementChild
    this.container.innerHTML = `
        <div class="search"><input id="commandSearchBox" type="text" value="" name="search" /></div>
    `
    this.domNode.setAttribute('tab-index', 1)
    const kclosable = new KClosable()
    const idx = kclosable.add(this.domNode, {function: () => {
        window.removeEventListener('keydown', handleKeyEvents, { capture: true })
        window.requestAnimationFrame(() => {
            if (this.domNode.parentNode) { this.domNode.parentNode.removeChild(this.domNode) }
        })
        new KMouseIndicator().enable()
    }})
    new KMouseIndicator().disable()
    const handleKeyEvents = (event) => {
        window.removeEventListener('keydown', handleKeyEvents, { capture: true })
        let key = event.key
        for (const op of operations) {
            if (!op.input && op.key.toLowerCase() === key.toLowerCase()) {
                event.stopPropagation()
                event.preventDefault()
                window.requestAnimationFrame(() => {
                    this.domNode.classList.add('loading')
                })
                op.cb()
                    .catch(_ => {
                        window.dispatchEvent(new CustomEvent('k-message', { detail: { type: 'warning', content: 'Impossible d\'effectuer la commande' } }))
                    })
                    .finally(_ => {
                        kclosable.closeByIdx(idx)
                        window.requestAnimationFrame(() => {
                            this.domNode.classList.remove('loading')
                        })
                        new KMouseIndicator().enable()
                    })
                return
            }
            if (op.input && op.key.toLowerCase() === key.toLowerCase()) {
                event.stopPropagation()
                event.preventDefault()
                const sbox = this.goToSearchBox()
                new Promise(resolve => {
                    sbox.addEventListener('keyup', event => {
                        if (event.key === 'Enter') { 
                            window.requestAnimationFrame(() => {
                                this.domNode.classList.add('loading')
                            })
                            return resolve(sbox.value) 
                        }
                    })
                })
                .then(value => {
                    op.cb(value)
                        .catch(_ => {
                            window.dispatchEvent(new CustomEvent('k-message', { detail: { type: 'warning', content: 'Impossible d\'effectuer la commande' } }))
                        })
                        .finally(_ => {
                            kclosable.closeByIdx(idx)
                            window.requestAnimationFrame(() => {
                                this.domNode.classList.remove('loading')
                            })
                            new KMouseIndicator().enable()
                        })
                })
                return
            }
        }
    }
    window.addEventListener('keydown', handleKeyEvents, { capture: true })
    operations.forEach(operation => {
        const div = document.createElement('DIV')
        div.dataset.key = operation.key
        div.classList.add('entry')
        div.innerHTML = `<span class="key">${operation.key}</span><span class="description">${operation.label}</span>`
        this.container.appendChild(div)
    })

    const ksettings = [
        ['dont-display-relation', 'Cacher les relations'],
        ['dont-display-back-forth', 'Cacher les aller-retour'],
        ['dont-show-details', 'Cacher les détails'],
        ['dont-allow-select', 'Pas de sélection']
    ]

    const ksettingDomNode = document.createElement('DIV')
    ksettingDomNode.classList.add('k-settings')
    ksettingDomNode.innerHTML = `<h1>Réglages</h1>`
    for (const setting of ksettings) {
        const ck = document.createElement('LABEL')
        ck.innerHTML = `<input type="checkbox" name="${setting[0]}" ${kset.get(setting[0]) ? 'checked' : ''}> ${setting[1]}`
        ksettingDomNode.appendChild(ck)
    }
    
    this.container.appendChild(ksettingDomNode)

    this.container.innerHTML += `
        <div class="cmd-bottom"><div class="lds-ripple"><div></div><div></div></div></div>
    `

    this.domNode.querySelectorAll('input[type="checkbox"]').forEach(node => {
        node.addEventListener('click', event => {
            const kset = new KSettings()
            const current = kset.get(event.target.name)
            kset.set(event.target.name, !current)
        })
    })
    this.domNode.querySelectorAll('div.entry').forEach(node => {
        node.addEventListener('click', event => {
            let node = event.target
            while (node && !node.classList.contains('entry')) { node = node.parentNode }
            if (!node) { return }
            handleKeyEvents({key: node.dataset.key, preventDefault: () => {}, stopPropagation: () => {}})
        }, {capture: true})
    })

    window.requestAnimationFrame(() => {
        document.body.appendChild(this.domNode)
        this.domNode.focus()
    })
}

KCommandOverlay.prototype.goToSearchBox = function () {
    const sbox = document.getElementById('commandSearchBox')
    sbox.setSelectionRange(0, sbox.value.length)
    sbox.focus()
    return sbox
}

KCommandOverlay.prototype.gotoDay = function (val) {
    return new Promise((resolve, reject) => {
        if (!(val instanceof Date || val instanceof KDate)) {
            val = KDate.EUParse(val)
        }
        if (isNaN(val.getTime())) { return reject() }
        window.dispatchEvent(new CustomEvent('k-set-center', { detail: { date: val } }))
        return resolve()
    })
}

KCommandOverlay.prototype.displayProjects = function () {
    return new Promise((resolve, reject) => {
    const kstore = new KStore('kproject')
    kstore.query({ '#and': { closed: '--', deleted: '--' } })
        .then(results => {
            const klateral = new KLateral().open()

            const container = document.createElement('DIV')
            container.classList.add('k-project-list')
            const search = document.createElement('DIV')
            search.style.setProperty('order', -1)
            search.innerHTML = '<input type="text" placeholder="Recherche">'
            container.appendChild(search)
            search.firstElementChild.addEventListener('keyup', event => {
                const searchSpace = event.target.parentNode
                if (event.target.value.length <= 0) {
                    for (let node = searchSpace.nextElementSibling; node; node = node.nextElementSibling) {
                        node.style.removeProperty('display')
                    }
                    return resolve()
                }
                const searchWords = event.target.value.split(' ')
                for (let node = searchSpace.nextElementSibling; node; node = node.nextElementSibling) {
                    if (!node.dataset.words) { continue }
                    const words = node.dataset.words.split(' ')
                    let keep = false
                    for (const searchWord of searchWords) {
                        for (const w of words) {
                            if (w.startsWith(searchWord.toLowerCase())) {
                                keep = true
                                break
                            }
                        }
                        if (keep) {
                            break
                        }
                    }
                    if (!keep) {
                        node.style.setProperty('display', 'none')
                    } else {
                        node.style.removeProperty('display')
                    }
                }
            })
            klateral.add(container, { title: 'Projet' })
            for (const project of results) {
                const projectUi = new KProject(project)
                projectUi.render()
                    .then(domNode => {
                        window.requestAnimationFrame(() => {
                            container.appendChild(domNode)
                            resolve()
                        })
                    })
            }
        })
        .catch(reason => {
            reject(reason)
        })


        })
    }

KCommandOverlay.prototype.print = function () {
    return new Promise((resolve, reject) => {
        const popup = new KPopup('Imprimer le planning', {fitContent: true})
        const form = document.createElement('FORM')
        form.innerHTML = `
        <label for="begin">Début : <input type="date" name="begin"></label><br>
        <label for="begin">Fin : <input type="date" name="end"></label><br>
        <button type="submit">Imprimer</button><button type="reset">Annuler</button>
        `
        form.addEventListener('reset', _ => {
            popup.close()
        })
        form.addEventListener('submit', event => {
        event.preventDefault()
        const data = new FormData(form)

        const url = new URL(`${KAIROS.getBase()}/pdfs/full/`)
        const begin = data.get('begin')
        const end = data.get('end')

        if (begin !== '') { url.searchParams.set('begin', begin) }
        if (end !== '') { url.searchParams.set('end', end) }
        url.searchParams.set('auth', `Bearer ${localStorage.getItem('klogin-token')}`)
        
        window.open(url, '_blank')
            popup.close()
        })
        popup.setContentDiv(form)
        popup.open()
        resolve()
    })
}