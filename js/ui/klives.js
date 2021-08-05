function KLiveSearch(searchBox, store, localityStore, opts = {}) {
    this.opts = Object.assign(
        {
            onlyBook: false,
            typeSelect: true,
            type: null
        },
        opts
    )
    this.store = store
    this.localityStore = localityStore
    this.domNode = searchBox
    this.domNode.addEventListener('keyup', this.searchBoxHandleEvents.bind(this))
    this.domNode.addEventListener('keydown', this.searchBoxHandleEvents.bind(this))
    this.EvtTarget = new EventTarget()
    this.noMoreSearch = false
    if (opts.type) {
        this.store.typeFilter(opts.type)
    } else {
        this.store.typeFilter('any')
    }
    if (opts.typeSelect) {
        const searchType = new KFlatList({
            'any': ['Tout', 'fas fa-asterisk'],
            'organization': ['Société', 'fas fa-building'],
            'person': ['Personne', 'fas fa-user']
        }, 'any')
        searchType.addEventListener('change', event => {
            this.store.typeFilter(event.detail)
        })
        this.domNode.parentNode.insertBefore(searchType.domNode, this.domNode.nextElementSibling)
    }
    this.orgInput = null
    if (this.opts.typeSelect || (!this.opts.typeSelect && (this.opts.type === 'person' || this.opts.type === 'any'))) {
        this.orgLiveInput = document.createElement('INPUT')
        this.orgLiveInput.setAttribute('name', 'organization')
        this.orgLiveSearch = new KLiveSearch(
            this.orgLiveInput,
            new KContactStore(`${KAIROS.getBase()}/store/Contacts`,  {type: 'organization', limit: KAIROS.searchLimit}),
            this.localityStore,
            {onlyBook: true, type: 'organization', typeSelect: false}
        )
        this.orgLiveSearch.addEventListener('change', event => {
            this.orgLiveInput.value = event.detail.getLabel()
            this.orgLiveInput.dataset.value = event.detail.getId()
        })
    }
}

KLiveSearch.prototype.addEventListener = function (type, listener, opt = {}) {
    this.EvtTarget.addEventListener(type, listener, opt)
}

KLiveSearch.prototype.removeEventListener = function (type, listener, opt = {}) {
    this.EvtTarget.removeEventListener(type, listener, opt)
}

KLiveSearch.prototype.setTargetType = function (type) {
    this.targetType = type
    this.EvtTarget.dispatchEvent(new CustomEvent('type-change', { detail: this.targetType }))
}

KLiveSearch.prototype.search = function (term) {
    return new Promise((resolve, reject) => {
        this.store.query(term)
        .then(result => {

        })
    })
}

KLiveSearch.prototype.handleMouseEvent = function (event) {
    if (this.mouseEventBlock && event.type === 'mouseenter') {
        this.mouseEventBlock = false
        return
    }
    this.mouseEventBlock = false
    let node = event.target
    while (node && !node.classList.contains('kls-result')) { node = node.parentNode }
    if (!node) { return }

    const resultDiv = this.popDiv.querySelector('.kls-results')
    const current = this.popDiv.querySelector('.kls-result[data-hover="1"]')

    if (current) { delete current.dataset.hover }
    node.dataset.hover = '1'
}

KLiveSearch.prototype.searchBoxHandleEvents = function (event) {
    if (this.noMoreSearch) { return }
    if (event.type === 'keydown') {
        switch (event.key) {
            case 'Up':
            case 'ArrowUp':   
            case 'Down':
            case 'ArrowDown':
            case 'End':
            case 'Home':
            case 'PageUp':
            case 'PageDown':
                event.preventDefault()
                this.mouseEventBlock = true
                break
        }
        return
    }
    switch (event.key) {
        case 'Enter':
            this.store.query(this.domNode.value, 0)
            .then(result => {
                this.removeResult()
                this.renderResult(result)
                .then(resultDiv => {
                    const popup = new KPopup(`Recherche "${this.domNode.value}"`, {isWindow: true})
                    popup.setContentDiv(resultDiv)
                    popup.open()
                })
            })
            break
        case 'Up':
        case 'ArrowUp':   
            this.moveInResult(event, 'up', 1)
            break
        case 'Down':
        case 'ArrowDown':
            this.moveInResult(event, 'down', 1)
            break
        case 'End':
            this.moveInResult(event, 'up', Infinity)
            break
        case 'Home':
            this.moveInResult(event, 'down', Infinity)
            break
        case 'PageUp':
            this.moveInResult(event, 'up', 3)
            break
        case 'PageDown':
            this.moveInResult(event, 'down', 3)
            break
        default:
            this.store.query(this.domNode.value)
            .then(result => {
                this.renderResult(result)
                .then(popDiv => {
                    popDiv.style.setProperty('z-index', KAIROS.zMax())
                    popDiv.addEventListener('keyup', this.searchBoxHandleEvents.bind(this))
                    popDiv.addEventListener('keydown', this.searchBoxHandleEvents.bind(this))
                    this.removeResult(popDiv)
                    KAIROSAnim.push(() => { document.body.appendChild(popDiv) })
                    .then(() => {
                        const pop = Popper.createPopper(this.domNode, popDiv, {placement: 'bottom-start'})
                    })
                })
            })
            break
    }
}

KLiveSearch.prototype.selectElement = function (event) {
    if (this.noMoreSearch) { return }
    event.preventDefault()
    const current = this.popDiv.querySelector('.kls-result[data-hover="1"]')
    const object = this.ObjectList.get(current.dataset.id)
    this.removeResult()
    this.EvtTarget.dispatchEvent(new CustomEvent('change', {detail: object}))
}

KLiveSearch.prototype.moveInResult = function (event, direction, quantity) {
    event.preventDefault()
    if (!this.popDiv) { return }
    const resultDiv = this.popDiv.querySelector('.kls-results')
    const resultDivRects = resultDiv.getBoundingClientRect()
    const current = this.popDiv.querySelector('.kls-result[data-hover="1"]')
    let next
    if (!current) {
        if (direction === 'down') { 
            next = resultDiv.firstElementChild
        }
        else {  
            next = resultDiv.lastElementChild
        }
    } else {
        delete current.dataset.hover
        if (direction === 'down') {
            if (quantity === Infinity) {
                next = resultDiv.firstElementChild
            } else {
                next = current
                for (i = 0; i < quantity; i++) {
                    if (!next.nextElementSibling) {
                        next = resultDiv.firstElementChild
                    } else {
                        next = next.nextElementSibling
                    }
                }
            }
        }
        if (direction === 'up') {
            if (quantity === Infinity) {
                next = resultDiv.lastElementChild
            } else {
                next = current
                for (i = 0; i < quantity; i++) {
                    if (!next.previousElementSibling) {
                        next = resultDiv.lastElementChild
                    } else {
                        next = next.previousElementSibling
                    }
                }
            }
        }
    }
    if (!next) { return }
    next.dataset.hover = '1'
    const nextRects = next.getBoundingClientRect()
    resultDiv.scrollTop = next.offsetTop - (resultDivRects.height / 2 - nextRects.height / 2)
}

KLiveSearch.prototype.removeResult = function (replace = null) {
    if (this.popDiv) {
        const oldDiv = this.popDiv
        if (replace !== null) { this.popDiv = replace }
        else { this.popDiv = null }
        KAIROSAnim.push(() => { oldDiv.parentNode.removeChild(oldDiv) })
    } else if (replace) {
        this.popDiv = replace
    }
}

KLiveSearch.prototype.renderResult = function (results) {
    return new Promise(resolve => {
        const popDiv = document.createElement('DIV')
        popDiv.classList.add('kls-popup')
        const resDiv = document.createElement('DIV')
        resDiv.classList.add('kls-results')

        const optDiv = document.createElement('DIV')
        optDiv.classList.add('kls-opts')

        //const more = new MButton('Tous les résultats')
        const add = new MButton('Ajouter adresse')

        add.addEventListener('click', event => {
            this.renderAddForm(this.targetType)
        })

        //optDiv.appendChild(more.domNode)
        optDiv.appendChild(add.domNode)

        popDiv.appendChild(resDiv)
        popDiv.appendChild(optDiv)

        let order = 0
        this.ObjectList = new Map()
        for (const result of results) {
            const label = result.getHTMLLabel()
            const div = document.createElement('DIV')
            div.classList.add('kls-result')
            div.dataset.id = result.getId()
            this.ObjectList.set(div.dataset.id, result)
            if (label instanceof HTMLElement) {
                div.appendChild(label)
            } else {
                div.innerHTML = label
            }
            div.addEventListener('mouseenter', this.handleMouseEvent.bind(this))
            div.addEventListener('mousedown', this.handleMouseEvent.bind(this))
            div.addEventListener('click', this.selectElement.bind(this))
            order++
            div.style.setProperty('order', order)
            resDiv.appendChild(div)
        }
        resolve(popDiv)
    })
}

KLiveSearch.prototype.renderAddForm = function (addrType) {
    this.noMoreSearch = true
    const domNode = document.createElement('FORM')
    domNode.innerHTML = `
        <fieldset class="kfieldset"><legend>Adresse</legend>
        <div class="name"><label>Société</label><input type="text" name="name"></input></div>
        <div class="address"><label>Addresse</label><textarea name="postaladdress"></textarea></div>
        <div class="locality"><label>Localité</label><input type="text" name="locality"></input> <i data-action="expand-locality" class="fas fa-chevron-down"></i></div>
        </fieldset>
        <fieldset class="kfieldset"><legend>Téléphonie</legend>
        <div class="mobile"><label>Mobile</label><input type="text" name="mobile"></input> <i data-action="add-multiple" class="fas fa-plus"></i></div>
        <div class="landline"><label>Fixe</label><input type="text" name="telephonenumber"></input> <i data-action="add-multiple" class="fas fa-plus"></i></div>
        </fieldset>
        <fieldset class="kfieldset"><legend>Internet</legend>
        <div class="email"><label>E-Mail</label><input type="text" name="mail"></input> <i data-action="add-multiple" class="fas fa-plus"></i></div>
        <div class="website"><label>Site Web</label><input type="text" name="labeleduri"></input> <i data-action="add-multiple" class="fas fa-plus"></i></div>
        </fieldset>
        <button type="submit">Ajouter</button> <button type="reset">Annuler</button>
    `
    const organization = domNode.querySelector('div.name')
    this.orgInput = organization.querySelector('input')
    const locality = new Select(domNode.querySelector('input[name="locality"]'), this.localityStore)

    if (this.opts.typeSelect) {
        const type = new KFlatList({organization: 'Société', person: 'Personne'}, 'organization')
        type.domNode.setAttribute('name', 'type')
        type.addEventListener('change', event => {
            if (event.detail === 'person') {
                const organization = domNode.querySelector('div.name')
                organization.classList.replace('name', 'organization')
    
                const d1 = document.createElement('DIV')
                const d2 = document.createElement('DIV')
                d1.classList.add('name')
                d1.innerHTML = '<label>Nom</label><input type="text" name="name"></input>'
                d2.classList.add('givenname')
                d2.innerHTML = '<label>Prénom</label><input type="text" name="givenname"></input>'
    
                organization.parentNode.insertBefore(d1, organization)
                organization.parentNode.insertBefore(d2, organization)
                this.orgInput.parentNode.replaceChild(this.orgLiveInput, this.orgInput)
                return
            }
    
            const organization = domNode.querySelector('div.organization')
            organization.parentNode.removeChild(organization.parentNode.querySelector('div.name'))
            organization.parentNode.removeChild(organization.parentNode.querySelector('div.givenname'))
    
            organization.classList.replace('organization', 'name')
            if (this.orgLiveInput.parentNode) {
                this.orgLiveInput.parentNode.replaceChild(this.orgInput, this.orgLiveInput)
            }
        })    
        domNode.insertBefore(type.domNode, domNode.firstElementChild)
    } else {
        const type = document.createElement('INPUT')
        type.setAttribute('type', 'hidden')
        type.setAttribute('name', 'type')
        type.setAttribute('value', this.opts.type)
        domNode.insertBefore(type, domNode.firstElementChild)
    }
    
    if (!this.opts.onlyBook) {
        const saveTo = new KFlatList({addressbook: 'Carnet d\'adresses', local: 'Local'}, KAIROS.contact.saveto[addrType] ?? 'local')
        saveTo.domNode.setAttribute('name', 'saveto')
        this.addEventListener('type-change', event => {
            saveTo.selectItem(KAIROS.contact.saveto[event.detail] ?? 'local')
        })
        domNode.insertBefore(saveTo.domNode, domNode.querySelector('button'))
    }

    this.popDiv.innerHTML = ''  
    this.popDiv.appendChild(domNode)
    /* add domNode before adding type.domNode or else events are discarded */
    
    domNode.addEventListener('submit', event => {
        this.noMoreSearch = false
        event.preventDefault()
        const form = KFormData.new(event.target)

        new Promise((resolve, reject) => {
            const contact = {}
            if (form.get('locality') && /^PC\/[a-z0-9]+$/.test(form.get('locality'))) {
                fetch(`${KAIROS.getBase()}/store/${form.get('locality')}`)
                .then(response => {
                    if (!response.ok) { reject() }
                    return response.json()
                })
                .then(result => {
                    const locality = Array.isArray(result.data) ? result.data[0] : result.data 
                    contact.st = locality.state.toUpperCase() || null
                    contact.l = locality.name || null
                    contact.postalcode = locality.np || null
                    contact.c = 'CH'
                    resolve(contact)
                })
                .catch (reason => {

                })
            } else {
                contact.st = form.get('canton') || null
                contact.l = form.get('city') || null
                contact.postalcode = form.get('np') || null
                contact.c = form.get('country') || null
                resolve(contact)
            }
        })
        .then(contact => {
            for (const k in contact) {
                if (contact[k] === null) {
                    delete contact[k]
                }
            }
            const org = form.get('type') === 'organization'
            for (const pair of form.entries()) {
                switch (pair[0]) {
                    case 'locality':
                    case 'saveto': break
                    case 'mobile':
                    case 'telephonenumber':
                        if (!contact[pair[0]]) {
                            contact[pair[0]] = []
                        }
                        contact[pair[0]].push(KSano.phone(pair[1]))
                        break
                    case 'mail':
                        if (!contact[pair[0]]) {
                            contact[pair[0]] = []
                        }
                        contact[pair[0]].push(KSano.mail(pair[1]))
                        break;
                    case 'labeleduri':
                        if (!contact[pair[0]]) {
                            contact[pair[0]] = []
                        }
                        contact[pair[0]].push(KSano.url(pair[1]))
                        break
                    default: contact[pair[0]] = pair[1]; break
                    case 'name': 
                        if (org) {
                            contact.o = pair[1]
                        } else {
                            contact.sn = pair[1]
                        }
                        break
                    case 'np': contact['postalcode'] = pair[1]; break
                    case 'country': contact['c'] = pair[1]; break
                    case 'canton': contact['st'] = pair[1]; break
                    case 'city': contact['l'] = pair[1]; break
                }
            }
            fetch(`${KAIROS.getBase()}/store/Contacts`, {method: 'POST', body: JSON.stringify(contact)})
            .then(response => {
                if (!response.ok) { return null }
                return response.json()
            })
            .then(result => {
                return this.store.get(Array.isArray(result.data) ? result.data[0].IDent : result.data.IDent)
            })
            .then(object => {
                this.removeResult()
                this.EvtTarget.dispatchEvent(new CustomEvent('change', {detail: object}))    
            })
        })
    })
    domNode.addEventListener('click', event => {
        let node = event.target
        switch (event.target.dataset.action) {
            case 'expand-locality':
                while (node && node.nodeName !== 'DIV') { node = node.parentNode }
                const np = document.createElement('DIV')
                np.innerHTML = '<label>Code postale</label><input type="text" name="np"></input> <i data-action="reduce-locality" class="fas fa-chevron-up"></i>'
                const city = document.createElement('DIV')
                city.innerHTML = '<label>Localité</label><input type="text" name="city"></input>'
                const dep = document.createElement('DIV')
                dep.innerHTML = '<label>Canton</label><input type="text" name="canton"></input>'
                const country = document.createElement('DIV')
                country.innerHTML = '<label>Pays</label><input type="text" name="country"></input>'

                node.parentNode.insertBefore(np, node)
                node.parentNode.insertBefore(city, node)
                node.parentNode.insertBefore(dep, node)
                node.parentNode.insertBefore(country, node)
                node.parentNode.removeChild(node)
                np.querySelector('INPUT').focus()
                break
            case 'reduce-locality':
                while (node && node.nodeName !== 'DIV') { node = node.parentNode }
                const locDiv = document.createElement('DIV')
                locDiv.innerHTML = '<label>Localité</label> <i data-action="expand-locality" class="fas fa-chevron-down"></i>'
                locDiv.insertBefore(locality.domNode, locDiv.firstElementChild.nextSibling)

                node.parentNode.removeChild(node.nextElementSibling.nextElementSibling.nextElementSibling)
                node.parentNode.removeChild(node.nextElementSibling.nextElementSibling)
                node.parentNode.removeChild(node.nextElementSibling)
                node.parentNode.insertBefore(locDiv, node)
                node.parentNode.removeChild(node)
                locDiv.querySelector('INPUT').focus()
                break
            case 'add-multiple':
                while (node && node.nodeName !== 'DIV') { node = node.parentNode }
                const newNode = node.cloneNode(true)
                newNode.querySelector('LABEL').innerHTML = ''
                newNode.removeChild(newNode.querySelector('i'))
                newNode.querySelector('INPUT').value = ''
                let nextNode = node.nextElementSibling
                while (nextNode && nextNode.querySelector('LABEL')?.innerHTML === '') { nextNode = nextNode.nextElementSibling }
                node.parentNode.insertBefore(newNode, nextNode)
                newNode.querySelector('INPUT').focus()
                break
        }
    })
}