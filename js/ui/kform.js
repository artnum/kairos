function KFormUI (object) {
    this.object = object
    this.fields = []
    this.inputs = []
    this.changePipeline = Promise.resolve()
    this.domNode = document.createElement('FORM')
    this.domNode.classList.add('k-form-ui')
    this.evtTarget = new EventTarget()
    this.domNode.getParentObject = function () {
        return this
    }.bind(this)
    this.parentNode = this.domNode
    if (object) {
        this.object.addEventListener('delete', this.deleteForm.bind(this))
        this.object.addEventListener('update', (event) => { this.updateFormFields() })
        this.object.addEventListener('begin-update', this.beginObjectUpdate.bind(this))
        this.object.addEventListener('end-update', this.endObjectUpdate.bind(this))
    }
}

KFormUI.prototype.addEventListener = function (type, listener, options = {}) {
    this.evtTarget.addEventListener(type, listener, options)
}

KFormUI.prototype.removeEventListener = function (type, listener, options = {}) {
    this.evtTarget.addEventListener(type, listener, options)
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

/* if interface attach us to something that must disappear on delete or something else */
KFormUI.prototype.attachToParent = function (parent) {
    this.parentNode = parent
    this.parentNode.classList.add('k-form-ui')
}

KFormUI.prototype.change = function (event) {
    const node = event.target
    let uiNode = node
    if (node.dataset.type === 'datehour') {
        uiNode = node.parentNode
    }
    if (this.object) { uiNode.classList.add('k-changed') }

    this.changePipeline
    .then(() => {
        this.changePipeline = new Promise(resolve => {
            const value = this.getInputValue(node)
            if (this.object) {
                const name = uiNode.getAttribute('name')
                this.object.set(name, value)
                KStore.save(this.object)
                .then(kobject => {
                    uiNode.classList.remove('k-changed')
                    this.updateFormFields(name)
                    resolve(kobject)
                })
                .catch(reason => {
                    uiNode.classList.remove('k-changed')
                    uiNode.classList.add('k-invalid')
                    resolve(null)
                })
            } else {
                this.setInputValue(node, value)
                resolve(null)
            }
        })
        .then(kobject => {
            if (!kobject) { return }
            this.evtTarget.dispatchEvent(new CustomEvent('change', {detail: {
                target: this, 
                name: node.getAttribute('name'), 
                value: this.get(node.getAttribute('name')),
            }}))
        })
    })
    
}

KFormUI.prototype.deleteForm = function () {
    if (!this.parentNode) { return }
    const parent = this.parentNode.parentNode
    window.requestAnimationFrame(() => { parent.removeChild(this.parentNode) })
}

KFormUI.prototype.beginObjectUpdate = function () {
    for(const input of this.inputs) {
        window.requestAnimationFrame(() => {
            input.classList.add('k-update-begin')
            input.setAttribute('readonly', '1')
        })
    }
}

KFormUI.prototype.getAllValues = function () {
    const object = {}
    for (const input of this.inputs) {
        const name = input.getAttribute('name')
        const value = this.getInputValue(input)
        switch (input.dataset.type) {
            default: object[name] = value; break
            case 'date':
            case 'datehour':
                if (isNaN(value.getTime())) { break }
                object[name] = value.toISOString()
                break
        }
    }
    return object
}

KFormUI.prototype.clear = function () {
    for (const input of this.inputs) {
        this.setInputValue(input, '')
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

KFormUI.prototype.getInputValue = function (input) {
    switch(input.dataset.type) {
        case 'date': return TimeUtils.fromDateString(input.value); break;
        case 'hour': return TimeUtils.fromHourString(input.value); break;
        case 'datehour': 
            let node = input.parentNode
            const date = TimeUtils.fromDateString(node.firstElementChild.value)
            TimeUtils.dateFromHourString(node.lastElementChild.value, date)
            return date
        default: return input.value
    }
}

KFormUI.prototype.setInputValue = function (input, value) {
        switch(input.dataset.type) {
            default: input.value = value; break
            case 'date': input.dataset.value = value; input.value = TimeUtils.toDateString(value); break;
            case 'hour': input.dataset.value = value; input.value = TimeUtils.toHourString(value); break;
            case 'datehour': 
                input.dataset.value = value
                input.firstElementChild.value = TimeUtils.toDateString(value)
                input.lastElementChild.value = TimeUtils.dateToHourString(value)
                break
        }
}

KFormUI.prototype.get = function (name) {
    return this.object.get(name)
}

KFormUI.prototype.set = function (name, value) {
    return this.object.set(name, value)
}

KFormUI.prototype.save = function () {
    return KStore.save(this.object)
}

KFormUI.prototype.updateFormFields = function (name = null) {
    if (!this.object) { return }
    for (const key of this.fields) {
        /* version field are always updated */
        if (name !== null && (name !== key && key !== 'version')) { continue }
        const input = this.domNode.querySelector(`[name="${key}"]`)
        if (input) {
            const value = this.object.get(input.getAttribute('name'))
            if (input.dataset.value) {
                if (value !== input.dataset.value) {
                   this.setInputValue(input, value)
                }
            } else {
                if (value !== input.value) {
                    this.setInputValue(input, value)
                }
            }
        }
    }
}

KFormUI.prototype.keyDownEvents = function (event) {
    if (!this.object) { return }
    const node = event.target
    switch (event.key) {
        case 'Escape':
            this.setInputValue(node, this.object.get(node.getAttribute('name')))
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
        if (this.object) { this.domNode.id = this.object.get('id') }
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
                    case 'datehour':
                        return (() => {
                            const container = document.createElement('DIV')
                            container.classList.add('k-input')
                            container.dataset.value = value
                            container.dataset.type = 'datehour'

                            const date = document.createElement('INPUT')
                            date.value = TimeUtils.toDateString(value)
                            date.setAttribute('type', 'text')
                            date.classList.add('k-input-hour')
                            date.dataset.type = 'datehour'

                            const hour = document.createElement('INPUT')
                            hour.value = TimeUtils.dateToHourString(value)
                            hour.setAttribute('type', 'text')
                            hour.classList.add('k-input-hour')
                            hour.dataset.type = 'datehour'

                            container.appendChild(date)
                            container.appendChild(hour)
                            return container
                        })()

                }
            })(type, this.object ? this.object.get(key) : '')

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