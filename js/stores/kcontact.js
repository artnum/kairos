/* *** KContactObject *** */
function KContactObject (store, highlightTerm = []) {
    this.store = store
    this.data = new Map()
    this.highlightTerm = highlightTerm

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

KContactObject.cleanPhoneNumber = function (phone) {
    return String(phone).replace(/[\s\.\/\-\(\)]/g, '')
}

KContactObject.prototype.cmpId = function (id) {
    if (this.get('IDent') === id) { return true }
    if (this.getId() === id) { return true }
    return false
}

KContactObject.prototype.getId = function () {
    return `Contacts/${this.get('IDent')}`
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
    let label
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

/* *** KContactText *** */

function KContactText (id, text) {
    this.id = id
    this.json = text.startsWith('JSON://')
    this.text = this.json ? JSON.parse(text.substring(7)) : text
    this.data = new Map()

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
        console.log(phoneLinks)
        if (phoneLinks.length > 0) {
            let line = phoneLinks[0]
            while (line && !line.classList.contains('addrline')) { line = line.parentNode }
            console.log(line)
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
            resolve(kcontact)
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
            for(const entry of Array.isArray(result.data) ? result.data : [result.data]) {
                const kcontact = new KContactObject(this)
                for (const k in entry) {
                    kcontact.set(k, entry[k])
                }
                results.push(kcontact)
            }
            resolve(results)
        })
        .catch(reason => {
            reject(reason instanceof Error ? reason : new Error(reason))
        })
    })
}