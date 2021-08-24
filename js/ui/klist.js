function KList (head, choices, headText = null) {
    this.head = head
    this.choices = choices
    this.headText = headText
    this.head.addEventListener('click', (event) => { this.handleClickEvent(event) })
    this.head.classList.add('klist', 'head')
    this.selected = this.choices[0]
    this.EvtTarget = new EventTarget()
}

KList.prototype.getSelected = function () {
    if (this.choices[this.selected] === '<input>') {
        return this.value
    }
    return this.selected
}

KList.prototype.addEventListener = function (type, callback, options) {
    this.EvtTarget.addEventListener(type, callback, options)
}

KList.prototype.handleClickEvent = function (event) {
    if (!this.popper) {
        const node = document.createElement('DIV')
        node.classList.add('klist', 'popup')
        for (const k in this.choices) {
            const item = document.createElement('DIV')
            item.classList.add('klist', 'item')

            let chvalue = this.choices[k]
            if (this.choices[k] === '<input>') {
                chvalue = `<input class="klist input"></input>&nbsp;<i class="fas fa-arrow-circle-right"></i>`
                item.addEventListener('change', (event) => {
                    let node = event.target
                    while (node && !node.dataset.id) { 
                        node = node.parentNode
                    }
                    if (!node) { return }
                    this.selectItem(node.dataset.id)
                }, {capture: true})
            }
            if (this.head.dataset.id === k) {
                item.innerHTML = `<i class="fas fa-check-circle"> </i>&nbsp;${chvalue}`
            } else {
                item.innerHTML = `<i class="far fa-circle"> </i>&nbsp;${chvalue}`
            }
            item.dataset.id = k
            node.appendChild(item)
            item.addEventListener('click', (event) => {
                let node = event.target
                while (node && !node.dataset.id) { 
                    if (node.nodeName === 'INPUT') { node = null; break }
                    node = node.parentNode
                }
                if (!node) { return }
                this.selectItem(node.dataset.id)
            })
        }
        this.head.parentNode.insertBefore(node, this.head)
        this.popper = Popper.createPopper(this.head, node, {placement: 'bottom-start'})
        this.popup = node
        this.state = true
        return;
    }

    if (this.state) {
        this.closePopup()
    } else {
        this.openPopup()
    }
}

KList.prototype.closePopup = function () {
    this.popup.parentNode.removeChild(this.popup)
    this.state = false
}

KList.prototype.openPopup = function () {
    this.head.parentNode.insertBefore(this.popup, this.head)
    this.popup.style.setProperty('z-index', KAIROS.zMax())
    this.popper.update()
    this.state = true
}

KList.prototype.selectItem = function (id) {
    if (!this.choices[id]) { return }
    let targetNode = null
    if (this.popup) {
        for (let node = this.popup.firstElementChild; node; node = node.nextElementSibling) {
            if (node.dataset.id === id) {
                targetNode = node
                node.firstElementChild.classList.remove('fa-circle', 'far')
                node.firstElementChild.classList.add('fa-check-circle', 'fas')
            } else {
                node.firstElementChild.classList.remove('fa-check-circle', 'fas')
                node.firstElementChild.classList.add('fa-circle', 'far')  
            }
        }
    }
    let value = this.choices[id]
    if (this.choices[id] === '<input>') {
        value = targetNode.querySelector('INPUT').value
    }

    this.head.dataset.id = id
    this.selected = id
    if (this.headText) { this.headText.innerHTML = value }
    else { this.head.innerHTML = value }
    this.closePopup()
    this.head.dataset.value = this.getSelected()
    this.EvtTarget.dispatchEvent(new CustomEvent('change', { detail: this.getSelected() }))
}

function KFlatList (choices, value) {
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('klist', 'flat')
    this.choices = choices
    this.selected = value
    this.value = this.choices[value]
    this.genChoices(value)
    this.domNode.dataset.value = this.getSelected()
    this.EvtTarget = new EventTarget()
}

KFlatList.prototype.addEventListener = function (type, callback, options) {
    this.EvtTarget.addEventListener(type, callback, options)
}

KFlatList.prototype.genChoices = function (value) {
    for (const k in this.choices) {
        const item = document.createElement('DIV')
        item.classList.add('klist', 'item')

        let chvalue = this.choices[k]
        let icon = 'far fa-circle'
        if (Array.isArray(chvalue)) {
            icon = chvalue[1]
            chvalue = chvalue[0]
            item.dataset.icon = '1'
        }
        if (chvalue === '<input>') {
            chvalue = `<input class="klist input"></input>`
            item.addEventListener('change', (event) => {
                let node = event.target
                while (node && !node.dataset.id) { 
                    node = node.parentNode
                }
                if (!node) { return }
                this.selectItem(node.dataset.id)
            }, {capture: true})
        }
        if (value === k) {
            if (icon === 'far fa-circle') {
                icon = 'fas fa-check-circle'
            }
            item.innerHTML = `<i class="${icon}"> </i>&nbsp;${chvalue}`
            item.dataset.selected = '1'
        } else {
            item.innerHTML = `<i class="${icon}"> </i>&nbsp;${chvalue}`
        }
        item.dataset.id = k
        item.addEventListener('click', (event) => {
            let node = event.target
            while (node && !node.dataset.id) { 
                if (node.nodeName === 'INPUT') { node = null; break }
                node = node.parentNode
            }
            if (!node) { return }
            this.selectItem(node.dataset.id)
        })
        this.domNode.appendChild(item)
    }
}

KFlatList.prototype.selectItem = function (id) {
    if (!this.choices[id]) { return }
  
    let targetNode = null
    for (let node = this.domNode.firstElementChild; node; node = node.nextElementSibling) {
        if (node.dataset.id === id) {
            targetNode = node
            if (!node.dataset.icon) {
                node.firstElementChild.classList.remove('fa-circle', 'far')
                node.firstElementChild.classList.add('fa-check-circle', 'fas')
            }
            node.dataset.selected = '1'
        } else {
            if (!node.dataset.icon) {
                node.firstElementChild.classList.remove('fa-check-circle', 'fas')
                node.firstElementChild.classList.add('fa-circle', 'far')  
            }
            node.dataset.selected = '0'
        }
    }

    this.selected = id
    this.value = this.choices[id]
    if (this.choices[id] === '<input>') {
        this.value = targetNode.querySelector('INPUT').value
    }
    this.domNode.dataset.value = this.getSelected()
    this.EvtTarget.dispatchEvent(new CustomEvent('change', { detail: this.getSelected() }))
}

KFlatList.prototype.getSelected = function () {
    if (this.choices[this.selected] === '<input>') {
        return this.value
    }
    return this.selected
}

KFlatList.prototype.nextItem = function () {
    let next = false
    let newChoice = null
    for (const k in this.choices) {
        if (k === this.selected) {
            next = true
            continue
        }
        if (next && this.choices[k] !== '<input>') {
            newChoice = k
            break
        }
    }

    if (newChoice) {
        this.selectItem(newChoice)
    } else {
        /* select first non-<input> item */
        for (const k in this.choices) {
            if (this.choices[k] !== '<input>') {
                this.selectItem(k)
                break
            }
        }
    }
}