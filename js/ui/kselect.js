function KSelectUI(input, store, options = {}) {
    if (!(input instanceof HTMLInputElement)) {
        throw new Error('Not an Input element')
    }
    this.mutObserve = new MutationObserver(this.mutation.bind(this))
    this.EvtTarget = new EventTarget()
    this.value = undefined
    this._oldValue = undefined
    this.allowFreeText = options.allowFreeText
    this.input = input
    this.mutObserve.observe(this.input, {attributes: true})
    this.attribute = this.attribute
    options = Object.assign({ attribute: 'name', allowFreeText: true, realSelect: false, noneElement: false }, options)

    /* on firefox, capture event happen after bubble event. It is unclear,
     * from w3c model event, if it is right or not, but, anyway, this allow
     * to workaround by capturing on parent element. The reason is to have
     * our events executed before any other event set on input.
     */
    this.inputEventTarget = document.createElement('DIV')
    this.inputEventTarget.style.setProperty('display', 'inline')
    this.inputEventTarget.style.setProperty('padding', '0')
    this.inputEventTarget.style.setProperty('margin', '0')
    this.inputEventTarget.style.setProperty('border', 'none')

    window.requestAnimationFrame(() => {
        const parent = this.input.parentNode
        parent.insertBefore(this.inputEventTarget, this.input.nextElementSibling)
        parent.removeChild(this.input)
        this.inputEventTarget.appendChild(this.input)
    })
    
    this.store = store
    this.options = options
    if (options.realSelect) {
        this.realSelectUI()
    }
    this.realSelect = options.realSelect
    input.setAttribute('autocomplete', 'off')
    let originalValue = input.value
    let obj = new Proxy(this, {
        get: function (obj, prop) {
            switch (prop) {
                case 'value':
                    if (!input.dataset.value) {
                        return input.value ? input.value : ''
                    } else {
                        return input.dataset.value
                    }
                case 'domNode':
                    return input
                default:
                    return obj[prop] ? obj[prop] : ''
            }
        },
        set: function (obj, prop, value) {
            switch (prop) {
                case 'value':
                    if (!value && !obj.allowFreeText) { break }
                    if (String(value).length <= 0) { break }
                    if (options.noneElement && value === '###') {
                        obj.setLabel(' < Aucune sélection > ')
                        obj.setValue('###')
                        return 
                    }
                    input.dataset.loading = '1'
                    store.get(value)
                    .then((entry) => {
                        if (entry) {
                            obj.lastEntry = entry
                            obj.setLabel(entry.label ? entry.label : entry[options.attribute])
                            obj.setValue(entry.value)
                            obj.colorize(entry.color)
                        } else {
                            if (obj.allowFreeText) {
                                obj.setLabel(value)
                                obj.setValue(value)
                            } else {
                                if (!obj.lastEntry) {
                                    obj.setLabel('')
                                    obj.setValue('')
                                } else {
                                    obj.setLabel(obj.lastEntry.label)
                                    obj.setValue(obj.lastEntry.value)
                                }
                            }
                        }
                        input.dataset.loading = '0'
                    })
                    break
                default:
                    input[prop] = value
            }
        }
    })
    obj.value = input.value
    this.object = obj
    var list = document.createElement('DIV')
    list.classList.add('kdropdown')
    list.style.position = 'absolute'
    this.popper = null

    const move = (k) => {
        this.mouseOverBlock = true
        let current = null
        for (let i = list.firstElementChild; i; i = i.nextElementSibling) {
            if (i.dataset.hover === '1') {
                current = i
                break
            }
        }
        let set = null
        let reset = null
        let moveStep = 1
        let wrapTarget = null
        switch (k) {
            case 'PageDown':
                if (list.firstElementChild) {
                    moveStep = Math.floor(list.getBoundingClientRect().height / list.firstElementChild.getBoundingClientRect().height)
                }
                wrapTarget = list.lastElementChild
            /* Fall through */
            case 'ArrowDown':
                if (!wrapTarget) {
                    wrapTarget = list.firstElementChild
                }
                if (current === null) {
                    current = list.firstElementChild
                    moveStep--
                }
                reset = current

                for (let i = 0; i < moveStep && current; i++) {
                    current = current.nextElementSibling
                }

                if (current) {
                    set = current
                } else {
                    set = wrapTarget
                }
                break
            case 'PageUp':
                if (list.firstElementChild) {
                    moveStep = Math.floor(list.getBoundingClientRect().height / list.firstElementChild.getBoundingClientRect().height)
                }
                wrapTarget = list.firstElementChild
            /* Fall through */
            case 'ArrowUp':
                if (!wrapTarget) {
                    wrapTarget = list.lastElementChild
                }
                if (current === null) {
                    current = list.lastElementChild
                    moveStep--
                }
                reset = current

                for (let i = 0; i < moveStep && current; i++) {
                    current = current.previousElementSibling
                }

                if (current) {
                    set = current
                } else {
                    set = wrapTarget
                }
                break
        }
        if (set) {
            set.dataset.hover = '1'
            const setBox = set.getBoundingClientRect()
            window.requestAnimationFrame(() => { list.scrollTop = (set.dataset.position - 1) * setBox.height })
            if (!options.allowFreeText) {
                this.select(set, true)
            }
        }
        if (reset && set !== reset) {
            reset.dataset.hover = '0'
        }
    }

    const degenerate = () => {
        this.opened = false
        if (this.popper) { this.popper.destroy(); this.popper = null }
        if (list.parentNode) {
            list.parentNode.removeChild(list)
        }
        list.innerHTML = ''

        KAIROS.removeClosableFromStack(degenerate)
    }

    const handleEvents = (event) => {
        switch (event.key) {
            case 'Enter':
                return
            case 'ArrowUp':
            case 'ArrowDown':
            case 'PageUp':
            case 'PageDown':
                event.preventDefault()
                event.stopPropagation()
                return move(event.key)
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'Alt':
            case 'AltGraph':
                break
            case 'Backspace':
            case 'Delete':
                if (input.value.length === 0 && !options.realSelect) {
                    return degenerate()
                }
                break
        }
        generate(input.value)
        return Promise.resolve()
    }

    this.degenerate = degenerate
    const generate = (value = null) => {
        return new Promise((resolve, reject) => {
            const input = this.input
            this.closableIdx = KAIROS.stackClosable(degenerate)
            const zMax = KAIROS.zMax()
            window.requestAnimationFrame(() => {
                list.style.zIndex = zMax
                if (!list.parentNode) {
                    document.body.appendChild(list)
                    this.popper = Popper.createPopper(input, list, { removeOnDestroy: true, positionFixed: true, placement: 'bottom-start' })
                }
            })
            if (value === null) {
                value = input.value
            }

            let currentRequest = performance.now()
            this.latestRequest = currentRequest
            let posCount = 0
            store.query({[options.attribute]: `${value}*`})
            .then((data) => {
                if (this.latestRequest !== currentRequest) { return }
                const frag = document.createDocumentFragment()
                for (const entry of data) {
                    const s = document.createElement('DIV')
                    s.dataset.value = entry.value ? entry.value : (entry.uid ? entry.uid : entry.id)
                    if (entry.color || entry.symbol) {
                        const symbol = document.createElement('SPAN')
                        symbol.innerHTML = ' ■ '
                        if (entry.symbol) {
                            symbol.innerHTML = entry.symbol
                            s.dataset.symbol = entry.symbol
                        }
                        if (entry.color) {
                            symbol.style.color = CSSColor(entry.color)
                            s.dataset.color = CSSColor(entry.color)
                        }
                        s.appendChild(symbol)
                        s.innerHTML += entry.label ? entry.label : entry[options.attribute]
                    } else {
                        s.innerHTML = entry.label ? entry.label : entry[options.attribute]
                    }
                    s.dataset.label = entry.label ? entry.label : (entry[options.attribute] ?  entry[options.attribute] : s.textContent)

                    s.addEventListener('mouseenter', event => this.handleMouseEnter(event.currentTarget) )
                    s.addEventListener('mouseleave', event => this.handleMouseLeave(event.currentTarget) )
                    s.addEventListener('mousedown', event => this.handleMousDown(event.currentTarget) )

                    posCount++
                    s.dataset.position = posCount
                    frag.appendChild(s)
                }
                const frame = new Promise((resolve) => {
                    if (options.noneElement) {
                        const s = document.createElement('DIV')
                        s.innerHTML = ' < Aucune selection > '
                        s.dataset.value = '###'
                        s.dataset.label = ' < Aucune selection > '
                        s.addEventListener('mouseenter', event => this.handleMouseEnter(event.currentTarget) )
                        s.addEventListener('mouseleave', event => this.handleMouseLeave(event.currentTarget) )
                        s.addEventListener('mousedown', event => this.handleMousDown(event.currentTarget) )
                        frag.insertBefore(s, frag.firstElementChild)
                    }
                    window.requestAnimationFrame(() => {
                        list.innerHTML = ''
                        list.appendChild(frag)
                        return resolve()
                    })
                })
                frame.then(_ => {
                    resolve()
                    input.focus()
                })
            })
            .catch(r => { console.log(r); resolve() })
        })
    }

    this.EvtTarget.addEventListener('open', () => { generate('') })
    this.EvtTarget.addEventListener('close', () => { degenerate() })

    input.addEventListener('blur', this.blur.bind(this))
    this.inputEventTarget.addEventListener('keyup', handleEvents.bind(this), {capture: true})
    this.inputEventTarget.addEventListener('keydown', (event) => {
        switch(event.key) {
            /* avoid caret to be moved around when using the list */
            case 'ArrowUp':
            case 'ArrowDown':
            case 'PageUp':
            case 'PageDown':
                event.preventDefault()
                event.stopPropagation()
                return
        }
        if (event.key === 'Tab' || event.key === 'Escape' || event.key === 'Enter') {
            if (!this.realSelect) {
                degenerate()
                //event.target.dispatchEvent(new KeyboardEvent(event))
                return
            }
            for (let n = list.firstElementChild; n; n = n.nextElementSibling) {
                if (n.dataset.hover === '1' && !this.allowFreeText) {
                    this.select(n)
                    degenerate()
                    //event.target.dispatchEvent(new KeyboardEvent(event))
                    return
                }
            }

            this.error()
            // error if needed
        }
    }, {capture: true})

    input.addEventListener('focus', (event) => {
        const input = event.target
        input.setSelectionRange(0, input.value.length)
        this.open()
    })

    obj.value = originalValue
    return obj
}

KSelectUI.prototype.handleMouseEnter = function (node) {
    if (this.mouseOverBlock) { this.mouseOverBlock = false; return }
    window.requestAnimationFrame(() => node.dataset.hover = '1')
}

KSelectUI.prototype.handleMouseLeave = function (node) {
    if (this.mouseOverBlock) { this.mouseOverBlock = false; return }
    window.requestAnimationFrame(() => node.dataset.hover = '0')
}

KSelectUI.prototype.handleMousDown = function (node) {
    this.select(node);
    this.degenerate()
}

KSelectUI.prototype.mutation = function (mutations) {
    for (const mutation of mutations) {
        if (mutation.attributeName === 'data-value') {
            if (this.object.value === mutation.target.dataset.value) { continue }
            this.object.value = mutation.target.dataset.value
            continue
        }
    }
}

KSelectUI.prototype.doChangeEvent = function () {
    if (this.value !== this._oldValue) {
        this.input.dispatchEvent(new Event('change', { bubbles: true }))
    }
}

KSelectUI.prototype.clear = function () {
    let element = this.input
    if (this.container) { element = this.container }
    element.classList.remove('colored')
    this.input.value = ''
    this.input.dataset.value = ''
}

KSelectUI.prototype.close = function () {
    this.EvtTarget.dispatchEvent(new CustomEvent('close', {}))
    if (this.realSelect) {
        this.store.get(this.input.dataset.value)
        .then(entry => {
            if (!entry) { return }
            this.setLabel(entry.label)
            this.colorize(entry.color)
        })
    }
}

KSelectUI.prototype.open = function () {
    this.EvtTarget.dispatchEvent(new CustomEvent('open', {}))
}

KSelectUI.prototype.toggle = function (event) {
    if (this.opened) {
        this.close()
        this.opened = false
    } else {
        this.open()
        this.opened = true
    }
}

KSelectUI.prototype.realSelectUI = function () {
    let arrow = document.createElement('SPAN')
    let container = document.createElement('DIV')
    this.container = container
    window.requestAnimationFrame(() => {
        String(this.input.classList).split(' ')
            .forEach(token => {
                if (token === '') { return; }
                container.classList.add(token)
                this.input.classList.remove(token)
            })
        container.classList.add('kselect')
        this.input.parentNode.insertBefore(container, this.input)
        this.input.parentNode.removeChild(this.input)
        container.appendChild(this.input)
        arrow.classList.add('arrow')
        arrow.addEventListener('click', this.toggle.bind(this), {capture: true})
        arrow.innerHTML = '<i class="fas fa-caret-down"> </i> '
        container.appendChild(arrow)
    })
}

KSelectUI.prototype.setValue = function (value) {
    if (!value) { return }
    this._oldValue = this.value
    this.value = value
    this.input.dataset.value = value
    this.doChangeEvent()
}

KSelectUI.prototype.setLabel = function (label) {
    if (!label) { return }
    this.input.value = label
}

KSelectUI.prototype.select = function (target, dontMessValue = false) {
    if (!target) { return }
    if (!dontMessValue) {
        this.setLabel(target.dataset.label)
    }
    this.colorize(target.dataset.color)
    this.setValue(target.dataset.value)
}

KSelectUI.prototype.colorize = function (color) {
    const element = this.container || this.input
    window.requestAnimationFrame(() => {
        if (color === undefined || color === null || color === false) {
            element.classList.remove('colored')
            element.style.removeProperty('--colored-color')
        } else {
            element.classList.add('colored')
            element.style.setProperty('--colored-color', CSSColor(color))
        }
    })
}

KSelectUI.prototype.error = function () {
    // nothing yet
}

KSelectUI.prototype.blur = function (event) {
    this.close()
}

KSelectUI.prototype.update = function () {
    if (!this.popper) { return }
    return this.popper.update()
}