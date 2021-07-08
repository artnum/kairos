function KLiveSearch(searchBox, store, localityStore) {
    this.store = store
    this.localityStore = localityStore
    this.domNode = searchBox
    this.domNode.addEventListener('keyup', this.searchBoxHandleEvents.bind(this))
    this.domNode.addEventListener('keydown', this.searchBoxHandleEvents.bind(this))
    this.EvtTarget = new EventTarget()
    this.noMoreSearch = false
}

KLiveSearch.prototype.addEventListener = function (type, listener, opt = {}) {
    this.EvtTarget.addEventListener(type, listener, opt)
}

KLiveSearch.prototype.removeEventListener = function (type, listener, opt = {}) {
    this.EvtTarget.removeEventListener(type, listener, opt)
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
                    KAIROSAnim.push(() => { this.domNode.parentNode.appendChild(popDiv) })
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

        const more = new MButton('Tous les résultats')
        const add = new MButton('Ajouter adresse')

        add.addEventListener('click', event => {
            console.log(event)

            this.renderAddForm()
        })

        optDiv.appendChild(more.domNode)
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

KLiveSearch.prototype.renderAddForm = function () {
    this.noMoreSearch = true
    const type = new KFlatList({organization: 'Société', person: 'Personne'}, 'organization')
    const domNode = document.createElement('FORM')
    domNode.innerHTML = `
        <fieldset class="kfieldset"><legend>Adresse</legend>
        <div class="name"><label>Société</label><input type="text" name="name"></input></label></div>
        <div class="address"><label>Addresse</label><textarea type="address"></textarea></label></div>
        <div class="locality"><label>Localité</label><input type="text" name="locality"></input></label></div>
        </fieldset>
        <fieldset class="kfieldset"><legend>Téléphonie</legend>
        <div class="mobile"><label>Mobile</label><input type="text" name="mobile"></input></div>
        <div class="landline"><label>Fixe</label><input type="text" name="landline"></input></div>
        </fieldset>
        <fieldset class="kfieldset"><legend>Internet</legend>
        <div class="email"><label>E-Mail</label><input type="text" name="email"></input></div>
        <div class="website"><label>Site Web</label><input type="text" name="website"></input></div>
        </fieldset>
        <button type="submit">Ajouter</button> <button type="reset">Annuler</button>
    `
    const locality = new Select(domNode.querySelector('input[name="locality"]'), this.localityStore)   
    domNode.insertBefore(type.domNode, domNode.firstElementChild)

    this.popDiv.innerHTML = ''
    this.popDiv.appendChild(domNode)
    /* add domNode before adding type.domNode or else events are discarded */
    

    console.log(locality)
}