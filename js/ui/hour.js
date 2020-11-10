function HourBox (targetNode) {
    this.data = {
        value: HourBox.nowNextQuarter() // initialize at now
    }

    if (targetNode instanceof HTMLElement) {
        this.domNode = targetNode
    } else if (document.getElementById(targetNode)) {
        this.domNode = document.getElementById(targetNode)
    } else {
        this.domNode = document.createElement('INPUT')
        this.domNode.setAttribute('type', 'text')
    }
    window.requestAnimationFrame(() => {
        this.domNode.classList.add('HourBox')
    })
    let proxy = new Proxy(this, {
        set: (object, property, value) => {
            switch (property) {
                case 'value':
                    object.setValid()
                    let dt = object.toDateTime(value)
                    if (value instanceof Date) {
                        dt = value
                    }
                    if (dt === null) {
                        object.setInvalid()
                        object.data[property] = null
                    } else {
                        object.data[property] = dt
                    }
                    object.displayValue()
                    break
                default: object.data[property] = value
                    break
            }
        },
        get: (object, property) => {
            switch (property) {
                default: 
                    if (object[property]) {
                        return object[property]
                    }
                return object.data[property]
            }
        }
    })

    proxy.displayValue()
    let closeTimeSelector = function (event) {
        this.value = event.target.value
        this.closeTimeSelector()
        this.displayValue()
    }.bind(proxy)
    proxy.domNode.addEventListener('change', closeTimeSelector)
    proxy.domNode.addEventListener('blur', function(event) {
        if (!this.timeSelector.disableBlur) {
            closeTimeSelector(event)
        }
    }.bind(proxy))

    const hourSelector = `
    <div><span></span><span></span><span>11</span><span>12</span><span>1</span><span></span><span></span></div>
    <div><span></span><span></span><span class="n">23</span><span class="n">0</span><span class="n">13</span><span></span><span></span></div>
    <div><span>10</span><span class="n">22</span><span></span><span></span><span></span><span class="n">14</span><span>2</span></div>
    <div><span>9</span><span class="n">21</span><span></span><span>H</span><span></span><span class="n">15</span><span>3</span></div>
    <div><span>8</span><span class="n">20</span><span></span><span></span><span></span><span class="n">16</span><span>4</span></div>
    <div><span></span><span></span><span class="n">19</span><span class="n">18</span><span class="n">17</span><span></span><span></span></div>
    <div><span></span><span></span><span>7</span><span>6</span><span>5</span><span></span><span></span></div>
    `
    const minuteSelector = `
    <div><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div><span></span><span></span><span></span><span>00</span><span></span><span></span><span></span></div>
    <div><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div><span></span><span>45</span><span></span><span>M</span><span></span><span>15</span><span></span></div>
    <div><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div><span></span><span></span><span></span><span>30</span><span></span><span></span><span></span></div>
    <div><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    `

    proxy.timeSelector = document.createElement('DIV')
    proxy.timeSelector.classList.add('HBTimeSelector')
    proxy.tmpHour = null
    proxy.timeSelector.addEventListener('mousedown', function (event) {
        const content = parseInt(event.target.innerText)
        if (!isNaN(content)) {
            this.timeSelector.disableBlur = true
            if (this.tmpHour === null) {
                this.tmpHour = content
                window.requestAnimationFrame(() => {
                    this.timeSelector.innerHTML = minuteSelector
                })
            } else {
                this.timeSelector.disableBlur = false
                this.value = `${this.tmpHour}:${content}`
                this.displayValue()
                this.tmpHour = null
                this.closeTimeSelector()
            }
        }
    }.bind(proxy))

    proxy.domNode.addEventListener('focus', function (event) {
        const hourbox = event.target
        this.timeSelector.innerHTML = hourSelector
        KAIROS.stackClosable(this.closeTimeSelector.bind(this))
        window.requestAnimationFrame(() => {
            this.domNode.parentNode.insertBefore(this.timeSelector, this.domNode.nextElementSibling)
            Popper.createPopper(this.domNode, this.timeSelector, {placement: 'bottom', strategy: 'fixed'})
        })
    }.bind(proxy))

    return proxy
}

HourBox.nowNextQuarter = function () {
    const date = new Date()
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0)
    return date
}

HourBox.prototype.closeTimeSelector = function () {
    window.requestAnimationFrame(() => {
        if (this.timeSelector.parentNode) {
            this.timeSelector.parentNode.removeChild(this.timeSelector)
        }
    })
    this.tmpHour = null
}

HourBox.prototype.addEventListener = function (type, listener, options) {
    switch (type) {
        default: this.domNode.addEventListener(type, listener, options); break
    }
}

HourBox.prototype.setInvalid = function () {
    window.requestAnimationFrame(() => {
        this.domNode.classList.add('invalid')
    })
}

HourBox.prototype.setValid = function () {
    window.requestAnimationFrame(() => {
        this.domNode.classList.remove('invalid')
    })
}

HourBox.prototype.displayValue = function () {
    if (this.data['value'] !== null) {
        window.requestAnimationFrame(() => {
            const hour = this.data['value'].getHours()
            const minute = this.data['value'].getMinutes()
            
            this.domNode.value = `${hour < 10 ? '0' + String(hour) : String(hour)}:${minute < 10 ? '0' + String(minute) : String(minute)}`
        })
    }
}

HourBox.prototype.toDateTime = function (txtHour) {
    if (txtHour.length === 2) {
        txtHour = `0${txtHour}0`
    } else if (txtHour.length === 3) {
        txtHour = `0${txtHour}`
    }
    const hRegExp = /^\s*([0-9]{1,2})(?:\s*)?(?:[:,.]?\s*([0-9]{1,2}))\s*$/
    const matches = hRegExp.exec(txtHour)
    const date = new Date()
    if (matches === null) {
        /* when data comes from db it's an iso 8601 timestamp */
        const ms = Date.parse(txtHour)
        if (!isNaN(ms)) {
            date.setTime(ms)
            return date
        }
        return null
    }

    const hour = parseInt(matches[1], 10)
    const minute = parseInt (matches[2], 10)
    if (isNaN(hour) || isNaN(minute)) {
        return null
    }

    date.setHours(hour, minute, 0, 0)
    return date
}

HourBox.prototype.toString 