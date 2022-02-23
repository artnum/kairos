function KFormUI (object) {
    this.object = object
    this.fields = []
    this.inputs = []
    this.changePipeline = Promise.resolve()
    this.domNode = document.createElement('FORM')
    this.domNode.classList.add('k-form-ui')
    this.domNode.addEventListener('submit', this.submit.bind(this))
    this.domNode.addEventListener('reset', this.reset.bind(this))
    this.object.addEventListener('update', this.updateFormFields.bind(this))
    this.object.addEventListener('begin-update', this.beginObjectUpdate.bind(this))
    this.object.addEventListener('end-update', this.endObjectUpdate.bind(this))
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
    const node = event.target
    node.classList.add('k-changed')

    this.changePipeline
    .then(() => {
        this.changePipeline = new Promise(resolve => {
            let value = null
            switch(node.dataset.type) {
                default: value = node.value; break
                case 'hour': value = TimeUtils.fromHourString(node.value); break
            }

            this.object.set(node.getAttribute('name'), value)
            KStore.save(this.object)
            .then(x => {
                node.classList.remove('k-changed')
                this.updateFormFields()
                resolve()
            })
            .catch(reason => {
                node.classList.remove('k-changed')
                node.classList.add('k-invalid')
                resolve()
            })
        })
    })
}

KFormUI.prototype.beginObjectUpdate = function () {
    for(const input of this.inputs) {
        window.requestAnimationFrame(() => {
            input.classList.add('k-update-begin')
            input.setAttribute('readonly', '1')
        })
    }
}

KFormUI.prototype.endObjectUpdate = function () {
    for(const input of this.inputs) {
        window.requestAnimationFrame(() => {
            input.classList.remove('k-update-begin')
            input.removeAttribute('readonly')
        })
    }
}

KFormUI.prototype.updateFormFields = function () {
    for (const key of this.fields) {
        const input = this.domNode.querySelector(`[name="${key}"]`)
        if (input) {
            const value = this.object.get(input.getAttribute('name'))
            if (input.dataset.value) {
                if (value !== input.dataset.value) {
                    input.dataset.value = value
                    switch(input.dataset.type) {
                        case 'date': input.value = TimeUtils.toDateString(value); break;
                        case 'hour': input.value = TimeUtils.toHourString(value); break;
                    }
                }
            } else {
                if (value !== input.value) { 
                    input.value = value 
                }
            }
        }
    }
}

KFormUI.prototype.keyDownEvents = function (event) {
    const node = event.target
    switch (event.key) {
        case 'Escape':
            node.value = this.object.get(node.getAttribute('name'))
            node.focus()
            break
    }
}

KFormUI.prototype.keyUpEvents = function (event) {
    const node = event.target

    /* resize textarea height to fit text */
    if (node.nodeName === 'TEXTAREA') {
        window.requestAnimationFrame(() => {
            node.style.setProperty('height', 'auto')
            node.style.setProperty('height', `${node.scrollHeight}px`)
          })
    }

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
                        hour.dataset.value = value
                        hour.setAttribute('type', 'text')
                        hour.classList.add('k-input-hour')
                        hour.dataset.type = 'hour'
                        return hour
                    case 'date':
                        const date = document.createElement('INPUT')
                        date.value = TimeUtils.toDateString(value)
                        date.dataset.value = value
                        date.setAttribute('type', 'text')
                        date.classList.add('k-input-hour')
                        date.dataset.type = 'date'
                        return date
                }
            })(type, this.object.get(key))

            this.inputs.push(input)
            input.setAttribute('name', key)
            this.fields.push(key)
            input.classList.add('k-input')
            if (fields[key]?.readonly) {
                input.classList.add('k-input-readonly')
                input.setAttribute('readonly', '1')
            }

            input.addEventListener('change', this.change.bind(this))
            input.addEventListener('keydown', this.keyDownEvents.bind(this))
            input.addEventListener('keyup', this.keyUpEvents.bind(this))


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