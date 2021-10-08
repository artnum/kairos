/* *** KContactObject *** */
function KContactObject (store, highlightTerm = []) {
    this.store = store
    this.data = new Map()
    this.highlightTerm = highlightTerm
    this.data.set('local', false)
    this.loading = []

    return new Proxy(this, {
        get: function (object, prop) {
            if (prop === 'label') {
                return object.getHTMLLabel()
            }
            if (prop === 'printableLabel') {
                return object.getLabel()
            }
            if (prop === 'value') {
                return object.getId()
            }
            if (object.data.has(prop)) { return object.data.get(prop) }
            return object[prop]
        },
        has: function (object, prop) {
            return object.data.has(prop)
        },
        set: function (object, prop, value) {
            return object.data.set(prop, value)
        }
    })
}

KContactObject.prototype.load = function () {
    return new Promise((resolve) => {
        if (this.loading.length <= 0) { resolve(); return}
        Promise.allSettled(this.loading)
        .then( _ => {
            resolve()
        })
    })
}

KContactObject.cleanPhoneNumber = function (phone) {
    return String(phone).replace(/[\s\.\/\-\(\)]/g, '')
}

KContactObject.prototype.cmpId = function (id) {
    if (this.get('IDent') === id) { return true }
    if (this.getId() === id) { return true }
    return false
}

KContactObject.prototype.getId = function () {
    return `/Contacts/${this.get('IDent')}`
}

KContactObject.prototype.get = function (name) {
    if (this.data.has(name)) {
        return this.data.get(name)
    }
    return ''
}

KContactObject.prototype.has = function (name) {
    return this.data.has(name)
}

KContactObject.prototype.set = function (name, value) {
    switch(name) {
        case 'o':
            if (Array.isArray(value)) { value = value[0] } // keep first in multiple o affiliation
            if (value.match(/\/?Contacts\/.+/) !== null) {
                this.loading.push(new Promise((resolve, reject) => {
                    this.store.get(value)
                    .then(address => {
                        this.data.set('o', address.getLabel())
                        resolve()
                    })
                    .catch(_ => {
                        resolve()
                        // nothing
                    })
                }))
                return true
            }
            break
    }
    return this.data.set(name, value)
}

KContactObject.prototype.getLabel = function () {
    if (this.get('type') === 'organization') {
        let label = `${this.data.get('o')}`
        return label
    }
    let label = `${[this.data.get('givenname'), this.data.get('sn')].join(' ')}`
    return label
}

KContactObject.prototype.getRelated = function (relations) {
    return new Promise((resolve, reject) => {
        const queries = []
        for (const relation of relations) {
            if (this.has(relation)) {
                queries.push(this.store.get(this.get(relation)))
                
            }
        }
        Promise.all(queries)
        .then(results => {
            const related = {}
            for (const relation of relations) {
                for (const result of results) {
                    if (result.cmpId(this.get(relation))) {
                        related[relation] = result
                        break
                    }
                }
            }
            resolve(related)
        })
    })
}

KContactObject.prototype.getHTMLLabel = function (hidden = {}, short = false) {
    let label = ''
    if (hidden.singlephone) {
        if (this.data.has('mobile')) {
            hidden.telephonenumber = true
            hidden.mobile = false
        } else if (this.data.has('telephonenumber')) {
            hidden.telephonenumber = false
            hidden.mobile = true
        }
    }

    if (this.data.get('type') === 'organization') {
        label += `<i class="fas fa-building">&nbsp;</i><span class="name">${this.data.get('o')}</span>`
    } else {
        label += `<i class="fas fa-user">&nbsp;</i><span class="name">${[this.data.get('givenname'), this.data.get('sn')].join(' ')}</span>`
        if (this.data.has('o')) {
            label += `<br ${hidden.o ? 'data-hidden="1"' : ''}><span class="organization" ${hidden.o ? 'data-hidden="1"' : ''}>${this.data.get('o')}</span>`
        }
    }

    if (this.get('local')) {
        label += ' <i class="fas fa-sd-card"></i>'
    }

    if (this.data.has('postaladdress')) {
        const address = this.data.get('postaladdress')
        label += `<div class="group address" ${hidden.postaladdress ? 'data-hidden="1"' : ''}><span class="address">${Array.isArray(address) ? address[0] : address}</span></div>`
    }
    if (this.data.has('locality')) {
        const locality = this.data.get('locality')
        const country = this.data.get('c')
        label += `<div class="group locality" ${hidden.locality ? 'data-hidden="1"' : ''}><span class="locality">${Array.isArray(locality) ? locality[0] : locality}</span>`
        label += `${country ? `<span class="country">${(Array.isArray(country) ? country[0] : country)}</span>` : ''}</div>`
    }

    if (this.data.has('mobile')) {
        let mobile = this.data.get('mobile')
        label += `<div class="group mobile" ${hidden.mobile ? 'data-hidden="1"' : ''}>`
        let i = 0
        for (let m of Array.isArray(mobile) ? mobile : [mobile]) {
            label += `<span class="mobile" ${short && i > 0 ? 'data-hidden="1"' : ''}><i class="fas fa-mobile-alt"></i>&nbsp;<a target="_blank" href="tel:${KContactObject.cleanPhoneNumber(m)}">${m}</a></span>`
            i++; if (i > 2) { break }
        }
        label += '</div>'
    }
    if (this.data.has('telephonenumber')) {
        let telephonenumber = this.data.get('telephonenumber')
        label += `<div class="group telephone" ${hidden.telephonenumber ? 'data-hidden="1"' : ''}>`
        let i = 0
        for (let m of Array.isArray(telephonenumber) ? telephonenumber : [telephonenumber]) {
            label += `<span class="telephonenumber" ${short && i > 0 ? 'data-hidden="1"' : ''}><i class="fas fa-phone-alt"></i>&nbsp;<a target="_blank" href="tel:${KContactObject.cleanPhoneNumber(m)}">${m}</a></span>`
            i++; if (i > 2) { break }
        }
        label += '</div>'
    }
    if (this.data.has('mail')) {
        let mail = this.data.get('mail')
        label += `<div class="group mail" ${hidden.mail ? 'data-hidden="1"' : ''}>`
        let i = 0
        for (let m of Array.isArray(mail) ? mail : [mail]) {
            label += `<span class="mail" ${short && i > 0 ? 'data-hidden="1"' : ''}><i class="fas fa-envelope"></i>&nbsp;<a target="_blank" href="mailto:${m}">${m}</a></span>`
            i++; if (i > 2) { break }
        }
        label += '</div>'
    }
    return label
}

KContactObject.prototype.getDOMLabel = function (hidden = {}, short = false) {
    const p = document.createElement('ADDRESS')
    p.classList.add('kaddress')
    p.innerHTML = this.getHTMLLabel(hidden, short)
    if (Object.keys(hidden).length > 0) {
        p.classList.add('dynamic')
        p.addEventListener('click', (event) => {
            if (!event.target instanceof HTMLElement) { return }
            if (event.target.nodeName !== 'SPAN') { return }
            if (!event.target.classList.contains('name')) { return }
            const p = event.target.parentNode
            const hidden =  p.querySelectorAll('[data-hidden]')
            for (const node of hidden) {
                node.dataset.hidden = node.dataset.hidden === '1' ? '0' : '1'
            }
        })
    }
    return p
}

KContactText.prototype.getRelated = function (relations) {
    return new Promise((resolve, reject) => {
        resolve([]) // no relation possible (might change in future)
    })
}

if (false) {
KContactObject.prototype.edit = function (addrNode) {
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
    const switchFormType = (type) => {
        if (type === 'person') {
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
            return
        }

        const organization = domNode.querySelector('div.organization')
        if (organization) {
            organization.parentNode.removeChild(organization.parentNode.querySelector('div.name'))
            organization.parentNode.removeChild(organization.parentNode.querySelector('div.givenname'))

            organization.classList.replace('organization', 'name')
        }
    }

    const organization = domNode.querySelector('div.name')
    this.orgInput = organization.querySelector('input')
    const locality = new Select(domNode.querySelector('input[name="locality"]'), this.localityStore)
    if (!this.has('type')) {
        const type = new KFlatList({organization: 'Société', person: 'Personne'}, 'organization')
        type.domNode.setAttribute('name', 'type')
        type.addEventListener('change', event => {
            switchFormType(type)
        })    
        domNode.insertBefore(type.domNode, domNode.firstElementChild)
    } else {
        switchFormType(this.get('type'))
        const type = document.createElement('INPUT')
        type.setAttribute('type', 'hidden')
        type.setAttribute('name', 'type')
        type.setAttribute('value', this.get('type'))
        domNode.insertBefore(type, domNode.firstElementChild)
    }
    
    if (!this.has('local')) {
        const saveTo = new KFlatList({addressbook: 'Carnet d\'adresses', local: 'Local'}, KAIROS.contact.saveto[addrType] ?? 'local')
        saveTo.domNode.setAttribute('name', 'saveto')
        this.addEventListener('type-change', event => {
            saveTo.selectItem(KAIROS.contact.saveto[event.detail] ?? 'local')
        })
        domNode.insertBefore(saveTo.domNode, domNode.querySelector('button'))
    } else {
        const type = document.createElement('INPUT')
        type.setAttribute('type', 'hidden')     
        type.setAttribute('name', 'saveto')
        type.setAttribute('value', this.get('local') ? 'local' : 'addressbook')
        domNode.insertBefore(type, domNode.firstElementChild)    
    }

    const parentNode = addrNode.parentNode
    parentNode.removeChild(addrNode)
    parentNode.appendChild(domNode)
    /* add domNode before adding type.domNode or else events are discarded */
    
    domNode.addEventListener('reset', event => {
        this.removeAddForm()
    })

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
                    case 'locality': break
                    case 'saveto':
                        if (pair[1] === 'local') {
                            contact['local'] = true
                        } else {
                            contact['local'] = false
                        }
                        break
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

KContactObject.create = function (addrNode, store) {
    const object = new KContactObject(store)
    object.edit(addrNode)
    return object
}

}

/* *** KContactText *** */

function KContactText (id, text) {
    this.id = id
    this.json = text.startsWith('JSON://')
    this.text = this.json ? JSON.parse(text.substring(7)) : text
    this.data = new Map()
    this.data.set('local', false)

    if (this.json) {
        for (const k in this.text) {
            this.data.set(k, this.text[k])
        }
    }

    return new Proxy(this, {
        get: function (object, prop) {
            if (prop === 'label') {
                return object.getHTMLLabel()
            }
            if (prop === 'printableLabel') {
                return object.getLabel()
            }
            if (prop === 'value') {
                return object.getId()
            }
            if (object.data.has(prop)) { return object.data.get(prop) }
            return object[prop]
        },
        set: function (object, prop, value) {
            return object.data.set(prop, value)
        }
    })
}

KContactText.prototype.getHTMLLabel = function (hidden = {}, short = false) {
    if (!this.json) {
        const div = document.createElement('DIV')
        const parts = this.text.split("\n")
        let i = 1
        const hasHidden = Object.keys(hidden).length > 1
        for (const line of parts) {
            div.innerHTML += `<div ${hasHidden && i > 1 ? 'data-hidden="1"' : ''} class="${i === 1 ? 'name ' : ''}addrline addrline-${i}">${line}</div>`
            i++
        }
        phoneLinks = createLinkFromPhone(div)
        if (phoneLinks.length > 0) {
            let line = phoneLinks[0]
            while (line && !line.classList.contains('addrline')) { line = line.parentNode }
            if (line && line.dataset.hidden) {
                line.removeAttribute('data-hidden')
            }
        }
        return div.innerHTML
    }
    let label
    if (this.data.get('type') === 'organization') {
        label = `<i class="fas fa-building">&nbsp;</i><span class="name">${this.data.get('o')}</span>`
    } else {
        label = `<i class="fas fa-user">&nbsp;</i><span class="name">${[this.data.get('givenname'), this.data.get('sn')].join(' ')}</span>`
        if (this.data.has('o')) {
            label += `<br ${hidden.o ? 'data-hidden="1"' : ''}><span class="organization" ${hidden.o ? 'data-hidden="1"' : ''}>${this.data.get('o')}</span>`
        }
    }
    if (this.data.has('postaladdress')) {
        const address = this.data.get('postaladdress')
        label += `<div class="group address" ${hidden.postaladdress ? 'data-hidden="1"' : ''}><span class="address">${Array.isArray(address) ? address[0] : address}</span></div>`
    }
    if (this.data.has('locality')) {
        const locality = this.data.get('locality')
        const country = this.data.get('c')
        label += `<div class="group locality" ${hidden.locality ? 'data-hidden="1"' : ''}><span class="locality">${Array.isArray(locality) ? locality[0] : locality}</span>`
        label += `${country ? `<span class="country">${(Array.isArray(country) ? country[0] : country)}</span>` : ''}</div>`
    }

    if (this.data.has('mobile')) {
        let mobile = this.data.get('mobile')
        label += `<div class="group mobile" ${hidden.mobile ? 'data-hidden="1"' : ''}>`
        let i = 0
        for (let m of Array.isArray(mobile) ? mobile : [mobile]) {
            label += `<span class="mobile" ${short && i > 0 ? 'data-hidden="1"' : ''}><i class="fas fa-mobile-alt"></i>&nbsp;<a target="_blank" href="tel:${KContactObject.cleanPhoneNumber(m)}">${m}</a></span>`
            i++; if (i > 2) { break }
        }
        label += '</div>'
    }
    if (this.data.has('telephonenumber')) {
        let telephonenumber = this.data.get('telephonenumber')
        label += `<div class="group telephone" ${hidden.telephonenumber ? 'data-hidden="1"' : ''}>`
        let i = 0
        for (let m of Array.isArray(telephonenumber) ? telephonenumber : [telephonenumber]) {
            label += `<span class="telephonenumber" ${short && i > 0 ? 'data-hidden="1"' : ''}><i class="fas fa-phone-alt"></i>&nbsp;<a target="_blank" href="tel:${KContactObject.cleanPhoneNumber(m)}">${m}</a></span>`
            i++; if (i > 2) { break }
        }
        label += '</div>'
    }
    if (this.data.has('mail')) {
        let mail = this.data.get('mail')
        label += `<div class="group mail" ${hidden.mail ? 'data-hidden="1"' : ''}>`
        let i = 0
        for (let m of Array.isArray(mail) ? mail : [mail]) {
            label += `<span class="mail" ${short && i > 0 ? 'data-hidden="1"' : ''}><i class="fas fa-envelope"></i>&nbsp;<a target="_blank" href="mailto:${m}">${m}</a></span>`
            i++; if (i > 2) { break }
        }
        label += '</div>'
    }
    return label
}

KContactText.prototype.getDOMLabel = function (hidden = {}, short = false) {
    const p = document.createElement('ADDRESS')
    p.classList.add('kaddress')
    p.innerHTML = this.getHTMLLabel(hidden, short)
    if (Object.keys(hidden).length > 0) {
        p.classList.add('dynamic')
        p.addEventListener('click', (event) => {
            if (!event.target instanceof HTMLElement) { return }
            if (event.target.nodeName !== 'SPAN' && event.target.nodeName !== 'DIV') { return }
            if (!event.target.classList.contains('name')) { return }
            const p = event.target.parentNode
            const hidden =  p.querySelectorAll('[data-hidden]')
            for (const node of hidden) {
                node.dataset.hidden = node.dataset.hidden === '1' ? '0' : '1'
            }
        })
    }
    return p
}

KContactText.prototype.getLabel = function () {
    if (this.json) {
        if (this.get('type') === 'organization') {
            let label = `${this.data.get('o')}`
            return label
        }
        let label = `${[this.data.get('givenname'), this.data.get('sn')].join(' ')}`
        return label
    }
    return this.text.split("\n")[0]
}

KContactText.prototype.cmpId = function (id) {
    if (this.id === id) { return true }
    return false
}

KContactText.prototype.getId = function () {
    return this.id
}

KContactText.prototype.get = function (name) {
    if (this.data.has(name)) {
        return this.data.get(name)
    }
    return ''
}

KContactText.prototype.has = function (name) {
    return this.data.has(name)
}

KContactText.prototype.set = function (name, value) {
    return this.data.set(name, value)
}

/* *** KContactStore *** */

function KContactStore (baseURL, opts = {}) {
    this.type = '*'
    if (!KContactStore._instances) {
        KContactStore._instances = new Map()
    }

    if (KContactStore._instances.has(`${baseURL}#${JSON.stringify(opts)}`)) {
        return KContactStore._instances.get(`${baseURL}#${JSON.stringify(opts)}`)
    }

    this.baseUrl = baseURL
    this.limit = 0
    this.opts = opts
    if (opts.limit && parseInt(opts.limit) > 0) {
        this.limit = parseInt(opts.limit)
    }
    if (opts.type) {
        this.typeFilter(opts.type)
    }

    KContactStore._instances.set(`${baseURL}#${JSON.stringify(opts)}`, this)
}

KContactStore.prototype.typeFilter = function (type = 'any') {
    this.type = this.getType(type)
}

KContactStore.prototype.getType = function (type = 'any') {
    switch(type) {
        default:
        case 'any':
            return '*'; break
        case 'person':
            return 'person'; break
        case 'organization':
            return 'organization'; break
    }
}

KContactStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        const parts = id.split('/')
        const url = new URL(`${this.baseUrl}/${parts.pop()}`)
        fetch(url)
        .then(response => {
            if (!response.ok) { return null }
            return response.json()
        })
        .then(result => {
            if (!result) { resolve({}); return }
            const kcontact = new KContactObject(this)
            const entry = Array.isArray(result.data) ? result.data[0] : result.data
            for (const k in entry) {
                kcontact.set(k, entry[k])
            }
            kcontact.load()
            .then(_ => {
                resolve(kcontact)
            })
        })
    })
}

KContactStore.prototype.query = function (term, limit = null) {
    const searchOn = ['o', 'sn', 'givenname', 'displayname']
    return new Promise((resolve, reject) => {
        const url = new URL(this.baseUrl)
        const terms = term.split(' ')
        url.searchParams.append('limit', limit ?? this.limit)
        const appliedTerms = []
        let rules = ''
        for (let t of terms) {
            if (t.length <= 0) { continue }
            if (appliedTerms.indexOf(t) !== -1) { continue }
            appliedTerms.push(t)
            for (let k of searchOn) {
                url.searchParams.append(`search.${k}`, `*${t}*`)
                rules += `(_${k}_)`
            }
        }
        url.searchParams.append('search._rules', `(&(objectClass=${this.type})(|${rules}))`)
        fetch(url)
        .then(response => {
            if (!response.ok) { return null; }
            return response.json()
        })
        .then(result => {
            if (!result) { resolve([]); return }
            if (result.length === 0 || result.data === null) { resolve([]); return }
            const results = []
            const loading = []
            for(const entry of Array.isArray(result.data) ? result.data : [result.data]) {
                const kcontact = new KContactObject(this)
                for (const k in entry) {
                    kcontact.set(k, entry[k])
                }
                results.push(kcontact)
                loading.push(kcontact.load())
            }
            Promise.allSettled(loading)
            .then(_ => {
                resolve(results)
            })
        })
        .catch(reason => {
            reject(reason instanceof Error ? reason : new Error(reason))
        })
    })
}