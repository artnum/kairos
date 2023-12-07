function CalendarUI (date = new Date(), holiday = null, options = {}) {
    if (isNaN(date.getTime()) || date.getTime() === 0) { date = new Date() }
    this.domNode = document.createElement('DIV')
    this.domNode.setAttribute('tabindex', '0')
    this.domNode.classList.add('k-calendar')
    this.domNode.addEventListener('mouseover', () => { this.domNode.focus() })
    this.domNode.addEventListener('click', this.click.bind(this))
    this.domNode.addEventListener('wheel', this.move.bind(this))
    this.holiday = holiday
    this.evtTarget = new EventTarget()
    this.today = date
    if (isNaN(this.today.getTime())) { this.today = new Date() }
    this.dates = []
    this.range = []

    if (options.begin && options.end) {
        if (!(options.begin instanceof Date)) { options.begin = new Date(options.begin) }
        if (!(options.end instanceof Date)) { options.end = new Date(options.end) }
        const begin = KDate.fromDate(options.begin)
        const end = KDate.fromDate(options.end)
        while (begin.compare(end, 'date') < 1) {
            this.range.push(begin.dateStamp())
            begin.setTime(begin.getTime() + 86400000)
        }
    }
}

CalendarUI.prototype.getWeekNumber = function (day) {
    if (day instanceof Date) {
        day = KDate.fromDate(day)
    }
    return day.getWeek()
}

CalendarUI.prototype.destroy = function () {
    if (this.domNode.parentNode) {
        window.requestAnimationFrame(() => { this.domNode.parentNode.removeChild(this.domNode) })
    }
    this.evtTarget.dispatchEvent(new CustomEvent('destroy', {detail: this}))
}

CalendarUI.prototype.getWeekdayName = function (weekday) {
    const today = new Date()
    while (today.getDay() != weekday) {
        today.setTime(today.getTime() + 86400000)
    }
    return (new Intl.DateTimeFormat(undefined, {weekday: 'long'})).format(today)
}

CalendarUI.prototype.getMonthName = function (month) {
    const today = new Date()
    if (isNaN(month)) { month = today.getMonth() }
    today.setMonth(month, 15)
    return (new Intl.DateTimeFormat(undefined, {month: 'long'})).format(today) 
}

CalendarUI.prototype.addEventListener = function (type, listener, options) {
    this.evtTarget.addEventListener(type, listener, options)
}

CalendarUI.prototype.click = function (event) {
    if (event.target?.dataset?.month) {
        this.today.setMonth(event.target.dataset.month)
        this.render()
        return 
    }
    if (event.target?.dataset?.date || event.target.classList.contains('k-weeknum')) {
        if (event.target.classList.contains('k-weeknum')) {
            for (let node = event.target.nextElementSibling; node; node = node.nextElementSibling) {
                this.dates.push(node.dataset.date)
                if (event.ctrlKey) { window.requestAnimationFrame(() => { node.classList.add('k-selected') }) }
            }
        } else {
            this.dates.push(event.target.dataset.date)
        }

        if (!event.ctrlKey) {
            const outEvent = new CustomEvent('select-day', {detail: this.dates}) 
            this.evtTarget.dispatchEvent(outEvent)
            this.dates = []
            for(const node of this.domNode.querySelectorAll('.k-day.k-selected')) {
                window.requestAnimationFrame(() => { node.classList.remove('k-selected')})
            }
        } else {
            window.requestAnimationFrame(() => {
                event.target.classList.add('k-selected')
            })
        }
        return
    }
    if (event.target.classList.contains('k-month-current')) {
        const select = document.createElement('DIV')
        select.classList.add('k-month-popper')
        let current = null
        for (let i = 0; i < 12; i++) {
            const option = document.createElement('DIV')
            option.innerHTML = this.getMonthName(i)
            option.dataset.value = i
            if (i === this.today.getMonth()) {
                current = option
            }
            select.appendChild(option)
        }
        new Promise(resolve => {
            window.requestAnimationFrame(() => {
                event.target.parentNode.appendChild(select)
                resolve(select)
            })
        })
        .then(select => {
            const popper = Popper.createPopper(event.target, select, {position: 'bottom-start'})
            select.addEventListener('wheel', event => {
                event.stopPropagation()
            })
            select.addEventListener('click', event => {
                if (event.target?.dataset?.value) {
                    this.today.setMonth(event.target.dataset.value)
                } else {
                    this.today.setMonth(this.today.getMonth())
                }
                popper.destroy()
                window.requestAnimationFrame(() => {
                    select.parentNode.removeChild(select)
                })
                this.render()
            })
            if (current) { current.scrollIntoView() }
        })
        return
    }
    if (event.target.classList.contains('k-year')) {
        const select = document.createElement('DIV')
        select.classList.add('k-month-popper')
        let current = null
        for (let i = parseInt(this.today.getFullYear()) - 10; i < parseInt(this.today.getFullYear()) + 11; i++) {
            const option = document.createElement('DIV')
            option.innerHTML = i
            option.dataset.value = i
            option.setAttribute('tabindex', i)
            if (this.today.getFullYear() === i) {
                current = option
            }
            select.appendChild(option)
        }
        new Promise(resolve => {
            window.requestAnimationFrame(() => {
                event.target.parentNode.appendChild(select)
                resolve(select)
            })
        })
        .then(select => {
            const popper = Popper.createPopper(event.target, select, {position: 'bottom-start'})
            select.addEventListener('wheel', (event) => {
                event.stopPropagation()
            })
            select.addEventListener('scroll', event => {
                if (select.scrollTop > select.scrollTopMax - 200) {
                    const startYear = parseInt(select.lastElementChild.dataset.value)
                    if (startYear >= 9999) { return }
                    for (let i = startYear; i < startYear + 10; i++) {
                        if (i > 9999) { break }
                        const option = document.createElement('DIV')
                        option.innerHTML = i
                        option.dataset.value = i
                        window.requestAnimationFrame(() => { select.appendChild(option, select.firstElementChild) })
                    }
                } else if (select.scrollTop < 200) {
                    const startYear = parseInt(select.firstElementChild.dataset.value)
                    if (startYear <= 1) { return }
                    for (let i = startYear; i > startYear - 10; i--) {
                        if (i < 1) { break }
                        const option = document.createElement('DIV')
                        option.innerHTML = i
                        option.dataset.value = i
                        window.requestAnimationFrame(() => { select.insertBefore(option, select.firstElementChild) })
                    }
                }
            }, {passive: true})
            select.addEventListener('click', event => {
                if (event.target?.dataset?.value) {
                    this.today.setFullYear(event.target.dataset.value)
                } else {
                    this.today.setMonth(this.today.getFullYear())
                }
                popper.destroy()
                window.requestAnimationFrame(() => {
                    select.parentNode.removeChild(select)
                })
                this.render()
            })
            if (current) { current.scrollIntoView() }
        })
        return
    }
}

CalendarUI.prototype.move = function (event) {
    event.stopPropagation()
    event.preventDefault()
    if (event.deltaY === 0) { return }
    if (event.deltaY < 0) {
        this.today.setMonth(this.today.getMonth() - 1)
    } else {
        this.today.setMonth(this.today.getMonth() + 1)
    }
    this.render()
}

CalendarUI.prototype.render = function () {
    return new Promise (resolve => {
        const first = new Date()
        first.setHours(12, 0, 0, 0)
        first.setFullYear(this.today.getFullYear(), this.today.getMonth(), 1)
        let dayNum = first.getDay()

        new Promise(resolve => {
            window.requestAnimationFrame(() => {
                this.domNode.innerHTML = `
                <div class="k-months"><span data-month="${first.getMonth() - 1}" class="k-month k-month-previous">${this.getMonthName(first.getMonth() - 1)}</span><span><span class="k-month k-month-current">${this.getMonthName(first.getMonth())}</span><span class="k-year">${first.getFullYear()}</span></span><span data-month="${first.getMonth() + 1}"  class="k-month k-month-next">${this.getMonthName(first.getMonth() + 1)}</span></div>
                <div class="k-days">
                    <div class="k-header"><span> </span><span>${this.getWeekdayName(1)}</span><span>${this.getWeekdayName(2)}</span><span>${this.getWeekdayName(3)}</span><span>${this.getWeekdayName(4)}</span><span>${this.getWeekdayName(5)}</span><span>${this.getWeekdayName(6)}</span><span>${this.getWeekdayName(0)}</span></div>
                    <div class="k-week"><span class="k-weeknum"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span></div>
                    <div class="k-week"><span class="k-weeknum"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span></div>
                    <div class="k-week"><span class="k-weeknum"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span></div>
                    <div class="k-week"><span class="k-weeknum"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span></div>
                    <div class="k-week"><span class="k-weeknum"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span></div>
                    <div class="k-week"><span class="k-weeknum"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span><span class="k-day"></span></div>
                </div>
            `
            resolve()
            })
        })
        .then(() => {
            const currentMonth = this.today.getMonth()
            /* set sunday at 7, then reduce by one so 0 => monday, 1 => tuesday, ..., 6 => sunday */
            if (dayNum === 0) { dayNum = 7 }
            dayNum-- 
            first.setTime(first.getTime() - (86400000 * dayNum))

            let node = this.domNode.firstElementChild.nextElementSibling.firstElementChild.nextElementSibling
            for (let i = 0; i < 6; i++) {
                const n = node
                const w = this.getWeekNumber(first)
                window.requestAnimationFrame(() => { n.firstElementChild.innerHTML = w })
                for (let j = 0, subnode = node.firstElementChild.nextElementSibling; j < 7; j++, subnode = subnode.nextElementSibling) {
                    const fulldate = first.toISOString().split('T')[0]
                    let isHoliday = false
                    if (this.holiday && this.holiday.isHoliday) {
                        if (this.holiday.isHoliday(fulldate) !== false) {
                            isHoliday = true
                        }
                    }

                    subnode.dataset.date = fulldate
                    
                    const date = new KDate()
                    date.setTime(first.getTime())

                    let inrange = false
                    if (this.range.indexOf(date.dateStamp()) !== -1) {
                        inrange = true
                    }
                    window.requestAnimationFrame(() => {
                        subnode.innerHTML = date.getDate()
                        if (this.dates.indexOf(fulldate) !== -1) { subnode.classList.add('k-selected') }
                        if (date.getMonth() !== currentMonth) {
                            subnode.classList.add('other-month')
                        }
                        if (date.getDay() === 0 || first.getDay() === 6) {
                            subnode.classList.add('k-weekend')
                        }
                        if (isHoliday) {
                            subnode.classList.add('k-holiday')
                        }
                        if (inrange) {
                            subnode.classList.add('k-inrange')
                        }
                    })
                    first.setTime(first.getTime() + 86400000)
                }
                node = node.nextElementSibling
            }
            return resolve(this.domNode)
        })
    })
}

function CalendarInputUI (domNode, holiday = null, options = {}) {
    if (!domNode) {
        domNode = document.createElement('INPUT')
        domNode.setAttribute('type', 'text')
    }
    domNode.setAttribute('autocomplete', 'off')
    this.holiday = holiday
    this.evtTarget = new EventTarget()
    this.options = options
    this.domNode = domNode
    if (this.domNode.value) {
        this.domNode.dataset.value = (new KDate(this.domNode.value)).toISOString()
        this.domNode.value = (new KDate(this.domNode.value)).longDate()
    } else if (this.domNode.dataset.value) {
        this.domNode.value = (new KDate(this.domNode.value)).longDate()
    } else {
        this.domNode.dataset.value = (new KDate()).toISOString()
    }

    const observer = new MutationObserver((mutlist) => {
        for (const mutation of mutlist) {
            if (mutation.type !== 'attributes') { continue }
            mutation.target.value = (new KDate(mutation.target.dataset.value)).longDate()
        }
    })

    observer.observe(this.domNode, {attributes: true, attributeFilter: ['data-value']})
       
    this.domNode.addEventListener('click', this.open.bind(this))
    this.domNode.addEventListener('focus', this.open.bind(this))
}

CalendarInputUI.prototype.open = function () {
    if (this.calendar) { return }
    this.calendar = new CalendarUI(new KDate(this.domNode.dataset.value), this.holiday, this.options)
    document.body.appendChild(this.calendar.domNode)
    this.calendar.domNode.style.setProperty('z-index', KAIROS.zMax())
    this.popper = Popper.createPopper(this.domNode, this.calendar.domNode)
    this.calendar.render()
    .then((domNode) => {
        this.popper.update()
        this.evtTarget.dispatchEvent(new CustomEvent('open', {detail: domNode}))
    })

    this.calendar.addEventListener('select-day', event => {
        const date = new KDate(event.detail.pop())
        this.domNode.dataset.value = date.toISOString()
        this.close()
    })
}

CalendarInputUI.prototype.close = function () {
    if (this.popper) {
        this.popper.destroy()
    }
    if (this.calendar) {
        this.calendar.domNode.parentNode.removeChild(this.calendar.domNode)
    }
    this.calendar = null
    this.popper = null
    return true
}

CalendarInputUI.prototype.addEventListener = function (type, listener, options) {
    this.evtTarget.addEventListener(type, listener, options)
}