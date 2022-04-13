function CalendarUI (date = new Date()) {
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('k-calendar')
    this.domNode.addEventListener('click', this.click.bind(this))
    this.evtTarget = new EventTarget()
    this.today = date
    this.dates = []
}

// from https://weeknumber.com/how-to/javascript
// don't work for years below 100 !
CalendarUI.prototype.getWeekNumber = function (day) {
    const date = new Date(day.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    const week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                          - 3 + (week1.getDay() + 6) % 7) / 7);
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
                    subnode.dataset.date = fulldate
                    if (this.dates.indexOf(fulldate) !== -1) { window.requestAnimationFrame(() => { subnode.classList.add('k-selected') })}
                    const date = first.getDate()
                    window.requestAnimationFrame(() => { subnode.innerHTML = date })
                    if (first.getMonth() !== currentMonth) {
                        window.requestAnimationFrame(() => { subnode.classList.add('other-month') })
                    }
                    if (first.getDay() === 0 || first.getDay() === 6) {
                        window.requestAnimationFrame(() => { subnode.classList.add('k-weekend') })
                    }
                    first.setTime(first.getTime() + 86400000)
                }
                node = node.nextElementSibling
            }
            return resolve(this.domNode)
        })
    })
}