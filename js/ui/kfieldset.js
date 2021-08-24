function KFieldset (value, choices = {}, modifiable = false) {
    this.domNode = document.createElement('FIELDSET')
    this.domNode.classList.add('kfieldset')
    this.footer = document.createElement('DIV')
    this.footer.innerHTML = '<span data-action="delete"><i class="fas fa-trash"> </i> Supprimer</span>'
    if (modifiable) {
        this.footer.innerHTML += '<span data-action="modify"><i class="fas fa-edit"> </i> Modifier</span>'
    }
    this.domNode.appendChild(this.footer)
    this.choices = choices
    this.value = value
    this.setLegend()
    this.domNode.addEventListener('click', this.handleClick.bind(this))
    this.EvtTarget = new EventTarget()
    this.data = new Map()
}

KFieldset.prototype.set = function (name, value) {
    return this.data.set(name, value)
}

KFieldset.prototype.has = function (name) {
    return this.data.has(name)
}

KFieldset.prototype.get = function (name) {
    return this.data.get(name)
}

KFieldset.prototype.addEventListener = function (type, listener, options) {
    this.EvtTarget.addEventListener(type, listener, options)
}

KFieldset.prototype.handleClick = function (event) {
    let node = event.target

    while (node && !node.dataset.action && node !== this.domNode) { node = node.parentNode }
    if (!node) { return }
    if (node === this.domNode) { return }

    switch (node.dataset.action) {
        case 'delete':
            if (this.EvtTarget.dispatchEvent(new CustomEvent('delete', {detail: this, cancelable: true}))) {
                this.domNode.parentNode.removeChild(this.domNode)
            }
            break
    }
}

KFieldset.prototype.setLegend = function () {
    let value = ''
    let id
    if (this.choices[this.value]) {
        value = this.choices[this.value]
        id = this.value
    } else {
        let haveFreeChoice = false
        for (const choice in this.choices) {
            if (this.choices[choice] === '<input>') {
                haveFreeChoice = true
                id = choice
                break
            }
        }
        if (haveFreeChoice) {
            value = this.value
        }
    }
    if (value !== '') {
        const legend = document.createElement('LEGEND')
        this.domNode.appendChild(legend)
        legend.innerHTML = `<span class="title">${value}</span> <i class="fas fa-chevron-down"></i>`
        legend.dataset.id = id
        legend.dataset.value = value
        const list = new KList(legend, this.choices, legend.firstElementChild)
    }
}

KFieldset.prototype.appendChild = function(node) {
    this.domNode.insertBefore(node, this.footer)
}