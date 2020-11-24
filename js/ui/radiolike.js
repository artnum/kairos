function RadioLike (element) {
    if (!(element instanceof HTMLElement)) {
        throw new Error('Not an HTML element')
    }

    this.domNode = element
    this.domNode.dataset.state = 'unset'

    if (this.domNode.dataset.flavor) {
        let flavor
        switch (this.domNode.dataset.flavor.toLowerCase()) {
            case 'yellow': flavor = 'yellow'; break
            case 'red': flavor = 'red'; break
            case 'green': flavor = 'green'; break
            default: flavor = ''; break
        }
        window.requestAnimationFrame(() => {
            this.domNode.classList.remove('yellow', 'red', 'green')    
            if (flavor) {
                this.domNode.classList.add(flavor)
            }
        })
    }

    this.value = this.domNode.dataset.value
    this.domNode.addEventListener('click', event => {
        if (this.getState()) {
            this.setState(false)
        } else {
            this.setState(true)
        }
    })
}

RadioLike.prototype.setState = function (set) {
    if (set) {
        this.domNode.dataset.state = 'set'
    } else {
        this.domNode.dataset.state = 'unset'
    }
}

RadioLike.prototype.getState = function () {
    if (this.domNode.dataset.state === 'set') {
        return true
    } else {
        return false
    }
}

RadioLike.prototype.addEventListener = function (type, listener, options) {
    this.domNode.addEventListener(type, listener, options)
}


function RadioLikeGroup (root) {
    if (!(root instanceof HTMLElement)) {
        throw new Error('Not an HTML element')
    }

    this.data = {}
    this.Elements = []

    let noneSelected = true
    root.querySelectorAll('.radiolike').forEach(element => {
        let idx = this.Elements.length
        this.Elements.push(new RadioLike(element))
        if (this.Elements[idx].domNode.dataset.checked && noneSelected) {
            this.Elements[idx].setState(true)
            noneSelected = false
        }
        this.Elements[idx].addEventListener('click', () => {
            for (let i = 0; i < this.Elements.length; i++) {
                if (i === idx) {
                    this.Elements[i].setState(true)
                } else {
                    this.Elements[i].setState(false)
                }
            }
        })
    })

    return new Proxy(this, {
        set: (obj, property, value) => {
            obj.data[property] = value
        },
        get: (obj, property) => {
            switch (property) {
                case 'value':
                    for (let i = 0; i < obj.Elements.length; i++) {
                        if (obj.Elements[i].getState()) {
                            return obj.Elements[i].value
                        }
                    }
                default: 
                    if (obj.hasOwnProperty(property)) {
                        return obj[property]
                    }
                    return obj.data[property]
            }
        }
    })
}

