function KFormUI (object) {
    this.object = object
    this.domNode = document.createElement('FORM')
    this.domNode.classList.add('k-form-ui')
    this.domNode.addEventListener('submit', this.submit.bind(this))
    this.domNode.addEventListener('reset', this.reset.bind(this))
}

KFormUI.prototype.getValue = function (element) {
    if (!element) { return null }
    switch(element.nodeName) {
        case 'INPUT':
        case 'TEXTAREA':
            if (element.dataset) {
                if (element.dataset.value) { return element.dataset.value }
            }
            if (element.value) {
                return element.value
            }
            return null
        case 'CHECKBOX':
        case 'SELECT':
            return null
    }
}

KFormUI.prototype.submit = function (event) {
}

KFormUI.prototype.reset = function (event) {
    
}

KFormUI.prototype.change = function (event) {
    let node = event.target
    node.classList.add('k-changed')
    this.object.set(node.getAttribute('name'), node.value)
    KStore.save(this.object)
    .then(x => {
        node.classList.remove('k-changed')
    })
    .catch(reason => {
        node.classList.remove('k-changed')
        node.classList.add('k-invalid')
    })
}

KFormUI.prototype.render = function (fields) {
    return new Promise((resolve, reject) => {
        this.domNode.id = this.object.get('id')
        for (const key of Object.keys(fields)) {
            const label = document.createElement('LABEL')
            label.innerHTML = fields[key]?.label || key
            label.setAttribute('for', key)
            label.classList.add('k-label')

            const type = fields[key]?.type || 'text'
            const input = ((type, value) => {
                switch(type) {
                    default:
                    case 'text':  
                        const txt = document.createElement('INPUT')
                        txt.value = value
                        txt.setAttribute('type', 'text')
                        txt.classList.add('k-input-text')
                        return txt
                    case 'multitext':
                        const mtxt = document.createElement('TEXTAREA')
                        mtxt.classList.add('k-input-multitext')
                        mtxt.innerText = value
                        return mtxt
                    case 'hour':
                        const hour = document.createElement('INPUT')
                        hour.value = TimeUtils.toHourString(value)
                        hour.setAttribute('type', 'text')
                        hour.classList.add('k-input-hour')
                        hour.dataset.type = 'hour'
                        return hour
                    case 'date':
                        const date = document.createElement('INPUT')
                        date.value = TimeUtils.toDateString(value)
                        date.setAttribute('type', 'text')
                        date.classList.add('k-input-hour')
                        date.dataset.type = 'date'
                        return date
                }
            })(type, this.object.get(key))

            input.setAttribute('name', key)
            input.classList.add('k-input')
            if (fields[key]?.readonly) {
                input.classList.add('k-input-readonly')
                input.setAttribute('readonly', '1')
            }

            input.addEventListener('change', this.change.bind(this))
            label.appendChild(input)

            let found = false
            for (const currentInput of this.domNode.getElementsByTagName(input.nodeName)) {
                if (currentInput.getAttribute('name') === input.getAttribute('name')) {
                    this.domNode.replaceChild(input, currentInput)
                    found = true;
                    break
                }
            }
            if (!found) {
                this.domNode.appendChild(label)
            }
        }
        resolve(this.domNode)
    })
}