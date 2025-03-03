function KTimeline(options = {}) {
    if (KTimeline._instance) { return KTimeline._instance }

    this.domNode = document.createElement('div')
    this.domNode.classList.add('timeline', 'noextender')
    this.domNode.innerHTML = `<div class="headerContainer" id="AppHeader" data-stop-follow-mouse='1'>
        <div id="scrollshow"></div>
        <div id="TL_supHeader" class="header"><div class="tools"></div></div>
        <div id="TL_header" class="header"><div class="tools"></div></div>
        <div id="TL_line" class="line"></div>
        <div id="TL_subline" class="line subline"></div>
        </div>
        <div id="TL_domEntries" class="reservationContainer"></div>
        <div id="VerticalLineFrame"></div>`
    
    const parentNode = options.parentNode || document.body
    this.parentNode = parentNode
    parentNode.appendChild(this.domNode)

    this.center = null
    this.set('offset', 260)
    this.setBlockSize(42)
    this.zoomCss = null

    this.verticals = []
    this.days = []
    this.weekNumber = []
    this.todayOffset = -1
    this.months = []
    this.borderTimeInterval = null

    this.daysZoom = 14
    this.Holidays = null
    this.Tooltips = {}
    this.followMouse.stop = true

    const kview = new KView()
    const center = new Date()
    center.setHours(0, 0, 0)
    kview.set('date-center', center)
    if (KAIROS.centerTodayRatio) {
        kview.get('date-center').setTime(kview.get('date-center').getTime() + (this.daysZoom * KAIROS.centerTodayRatio / 2 * 86400000))
    }


    kview.setEntryHeight(78)
    kview.setEntryInnerHeight(74)

    const kglobal = new KGlobal()
    kglobal.watch('k-project-highlight', 'highlight-project', function (name, oldValue, newValue) {
        if (oldValue) {
            document.querySelectorAll(`div[data-kproject="${oldValue}"]`)
                .forEach(node => {
                    window.requestAnimationFrame(() => {
                        node.style.removeProperty('--selected-color')
                        node.classList.remove('selected')
                    })
                })
        }
        if (newValue) {
            document.querySelectorAll(`div[data-kproject="${newValue}"]`)
                .forEach(node => {
                    window.requestAnimationFrame(() => {
                        node.style.setProperty('--selected-color', `hsla(0, 100%, 50%, 1)`)
                        node.classList.add('selected')
                    })
            })
        }
    })

    ; (new KView()).addRunOnMove(_ => {
        const prj = (new KGlobal()).get('k-project-highlight')
        if (!prj) { return }
        const list = document.querySelectorAll(`div[data-kproject="${prj}"]`)
        for (let i = 0; i < list.length; i++) {
            const node = list[i]
            window.requestAnimationFrame(() => {
                node.style.setProperty('--selected-color', `hsla(0, 100%, 50%, 1)`)
                node.classList.add('selected')
            })
        }
    })

    kview.addEventListener('EnterColumn', event => {
        const frame = document.getElementById('VerticalLineFrame')
        let i = 0;
        for (const node of frame.children) {
            if (event.detail.currentColumn === i) {
                window.requestAnimationFrame(() => node.classList.add('khover'))
            }
            if (event.detail.currentColumn !== i) {
                window.requestAnimationFrame(() => node.classList.remove('khover'))
            }
            i++
        }
    })
    kview.addEventListener('EnterRow', event => {
        const kview = new KView()
        const inRow = kview.getRowObject(event.detail.currentRow)

        this.domNode.querySelectorAll('.reservationContainer div.khover').forEach(node => {
            window.requestAnimationFrame(() => node.classList.remove('khover'))
        })
        if (inRow) {
            inRow.KUI.getDomNode()
                .then(node => {
                    window.requestAnimationFrame(() => node.classList.add('khover'))
                })
        }
    })

    kview.addEventListener('requestDayMove', event => {
        if (event.detail.days) {
            this.move(event.detail.days)
        }
    })

    this.zoomCss = document.createElement('style')
    this.Updater = new Worker(`$ww/updater.js`)
    
    parentNode.appendChild(this.zoomCss)

    this.postCreate()

    KTimeline._instance = this
}

KTimeline.prototype = {
    info: function (txt, code) {
        KAIROS.info(txt, code)
    },
    warn: function (txt, code) {
        KAIROS.warn(txt, code)
    },
    error: function (txt, code) {
        KAIROS.error(txt, code)
    },
    log: function (level, txt, code) {
        KAIROS.log(level, txt, code)
    },

    setBlockSize: function (value) {
        this.set('blockSize', value)
        document.documentElement.style.setProperty('--blocksize', `${value}px`)
    },

    setZoom: function (zoomValue) {
        const kview = new KView()

        this.domNode.classList.remove('day', 'month', 'week', 'quarter', 'semester')
        switch (zoomValue) {
            case 'day':
                this.daysZoom = 2
                this.domNode.classList.add('day')
                break
            case 'month':
                this.daysZoom = 31
                this.domNode.classList.add('month')
                break
            case 'week':
                this.daysZoom = 14
                this.domNode.classList.add('week')
                break
            case 'quarter':
                this.daysZoom = 91
                this.domNode.classList.add('quarter')
                break
            case 'semester':
                this.daysZoom = 181
                this.domNode.classList.add('semester')
                break
            default:
                this.daysZoom = zoomValue
                break
        }

        if (this.daysZoom > 547) {
            this.daysZoom = 547
            KAIROS.warn(I18N.$('Zoom_maximum_atteint'))
        }
        if (this.daysZoom < 2) {
            this.daysZoom = 2
            KAIROS.warn(I18N.$('Zoom_minimum_atteint'))
        }

        this.set('zoom', this.daysZoom)
        this.setBlockSize(Math.floor((document.documentElement.clientWidth - this.get('offset') - getScrollBarWidth()) / this.daysZoom))
        this.zoomCss.innerHTML = ` :root { --offset-width: ${this.get('offset')}px; }
                                   .timeline .line span { width: ${this.get('blockSize') - 2}px !important; }
                                  .timeline .header .tools { width: ${this.get('offset')}px !important; }
                                  .timeline .line { margin-left: ${this.get('offset')}px !important; }`
        this.resize()
        kview.setDayCount(this.daysZoom)
        this.update()
    },

    set: function (key, value) {
        if (!this.DATA) { this.DATA = new Map() }
        this.DATA.set(key, value)
    },

    get: function (key) {
        if (!this.DATA) { this.DATA = new Map() }
        return this.DATA.get(key)
    },


    getZoom: function () {
        return this.daysZoom
    },

    zoomIn: function () {
        if (this.getZoom() > 7) {
            this.setZoom(this.getZoom() - 5)
        }
    },

    zoomOut: function () {
        if (this.getZoom()< 180) {
            this.setZoom(this.getZoom() + 5)
        }
    },

    zoomInN: function (n) {
        this.setZoom(this.getZoom() - 7)
    },

    zoomOutN: function (n) {
        this.setZoom(this.getZoom() + 7)
    },

    _trCantonName: function (c) {
        return I18N.$(`_${c}`)
    },

    makeDay: function (newDay) {
        let txtDate = ''
        newDay.setHours(12, 0, 0)
        const dayStamp = newDay.toISOString().split('T')[0]

        switch (newDay.getDay()) {
            case 0: txtDate = `<span class="dayname">${I18N.$('Dim')}</span>${newDay.getDate()}`; break
            case 1: txtDate = `<span class="dayname">${I18N.$('Lun')}</span>${newDay.getDate()}`;  break
            case 2: txtDate = `<span class="dayname">${I18N.$('Mar')}</span>${newDay.getDate()}`; break
            case 3: txtDate = `<span class="dayname">${I18N.$('Mer')}</span>${newDay.getDate()}`; break
            case 4: txtDate = `<span class="dayname">${I18N.$('Jeu')}</span>${newDay.getDate()}`; break
            case 5: txtDate = `<span class="dayname">${I18N.$('Ven')}</span>${newDay.getDate()}`; break
            case 6: txtDate = `<span class="dayname">${I18N.$('Sam')}</span>${newDay.getDate()}`;break
        }

        const domDay = document.createElement('SPAN')
        domDay.setAttribute('data-artnum-day', dayStamp)
        domDay.classList.add('day')

        const today = new Date()
        let holiday = this.Holidays.isHoliday(newDay)
        if (holiday && newDay.getDay() !== 0) {
            domDay.classList.add('holiday')
            let cantons = []
            holiday.c.forEach((c) => {
                cantons.push(this._trCantonName(c))
            })
            let text = `Férié ${holiday.name}: ${cantons[0]}`
            if (holiday.c.length > 1) {
                text = `Férié ${holiday.name}: ${cantons.join(', ')}`
            }
            if (this.Tooltips[newDay.toISOString().split('T')[0]]) {
                this.Tooltips[newDay.toISOString().split('T')[0]].dispose()
            }
            this.Tooltips[newDay.toISOString().split('T')[0]] = new Tooltip(domDay, { title: text, placement: 'bottom' })
        } else {
            if (newDay.getDay() === 0 || newDay.getDay() === 6) {
                domDay.classList.add('weekend')
            }
        }
        if (newDay.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
            domDay.classList.add('today')
        }

        domDay.innerHTML = txtDate
        return { stamp: dayStamp, domNode: domDay, visible: true, _date: newDay }
    },

    resize: function () {
        this.drawTimeline()
        this.drawVerticalLine()
        new KView().resize()
    },

    createMonthName: function (month, year, days, frag) {
        const n = document.createElement('DIV')
        n.setAttribute('style', 'width: ' + Math.floor((days * this.get('blockSize'))) + 'px')
        switch (month + 1) {
            case 1: n.innerHTML = `${I18N.$('Janvier')}&nbsp;${year}`; break
            case 2: n.innerHTML = `${I18N.$('Fevrier')}&nbsp;${year}`; break
            case 3: n.innerHTML = `${I18N.$('Mars')}&nbsp;${year}`; break
            case 4: n.innerHTML = `${I18N.$('Avril')}&nbsp;${year}`; break
            case 5: n.innerHTML = `${I18N.$('Mai')}&nbsp;${year}`; break
            case 6: n.innerHTML = `${I18N.$('Juin')}&nbsp;${year}`; break
            case 7: n.innerHTML = `${I18N.$('Juillet')}&nbsp;${year}`; break
            case 8: n.innerHTML = `${I18N.$('Août')}&nbsp;${year}`; break
            case 9: n.innerHTML = `${I18N.$('Septembre')}&nbsp;${year}`; break
            case 10: n.innerHTML = `${I18N.$('Octobre')}&nbsp;${year}`; break
            case 11: n.innerHTML = `${I18N.$('Novembre')}&nbsp;${year}`; break
            case 12: n.innerHTML = `${I18N.$('Decembre')}&nbsp;${year}`; break
        }
        if (month % 2) {
            n.setAttribute('class', 'monthName even')
        } else {
            n.setAttribute('class', 'monthName odd')
        }
        frag.appendChild(n)
        this.months.push(n)
    },
    destroyMonthName: function () {
        for (let x = this.months.pop(); x; x = this.months.pop()) {
            x.parentNode.removeChild(x)
        }
    },

    createWeekNumber: function (number, days, frag) {
        const n = document.createElement('DIV')
        n.setAttribute('style', 'width: ' + Math.floor(days * this.get('blockSize')) + 'px')
        n.innerHTML = `${I18N.$('Semaine')} ${number}`
        if (days * this.get('blockSize') < 80) {
            n.innerHTML = number
        }
        if (number % 2) {
            n.setAttribute('class', 'weekNumber even')
        } else {
            n.setAttribute('class', 'weekNumber odd')
        }
        frag.appendChild(n)
        this.weekNumber.push(n)
    },
    destroyWeekNumber: function () {
        for (let x = this.weekNumber.pop(); x; x = this.weekNumber.pop()) {
            x.parentNode.removeChild(x)
        }
    },

    setCenter: function (target) {
        const origin = (new KView()).get('date-center')
        const diff = (origin.getTime() / 86400000) - (target.getTime() / 86400000)
        this.move(diff)
    },

    postCreate: function () {
        this.domNode.querySelector('#AppHeader').style.zIndex = KAIROS.zMax()
        new KTaskBar()
        new KCornerBox()

        this.setZoom('week')

        this.domNode.addEventListener('mouseup', this.mouseUpDown.bind(this))
        this.domNode.addEventListener('mousedown', this.mouseUpDown.bind(this))
        this.domNode.addEventListener('touchstart', this.mouseUpDown.bind(this), { passive: true })
        this.domNode.addEventListener('touchend', this.mouseUpDown.bind(this))
        this.domNode.addEventListener('dragstart', _ => {
            window.requestAnimationFrame(() => { this.parentNode.classList.add('kdragging') })
        })
        this.domNode.addEventListener('dragend', _ => {
            this.stopBorderAutoScroll()
            window.requestAnimationFrame(() => { this.parentNode.classList.remove('kdragging') })
        })
        this.domNode.addEventListener('drop', event => {
            event.preventDefault()
            this.stopBorderAutoScroll()
            const kview = new KView()

            let entryNode = event.target
            const YPosition = kview.getMouseYPosition()
            const rowObject = kview.getRowFromPX(YPosition)
            if (!rowObject) { return }
            while (entryNode && entryNode.classList && !entryNode.classList.contains('kentry')) { entryNode = entryNode.parentNode }
            if (!entryNode) { return; }
            const kident = event.dataTransfer.getData('text/plain')
            if (!kident) { return }
            if (!kident.startsWith('kid://')) { return }
            kGStore = new KObjectGStore()
            const originalObject = kGStore.get(kident.substring(6))
            originalObject.getUINode().destroyClonedNode()
            let object = event.ctrlKey ? originalObject.clone() : originalObject
            if (event.ctrlKey) {      
                object.comment = ''
            }
            if (object.getType() !== 'kreservation') { return }
            const kstore = new KStore(object.getType())
            const [begin, end] = [new Date(object.get('begin')), new Date(object.get('end'))]
            const diff = end.getTime() - begin.getTime()
            const newOrigin = new Date()
            newOrigin.setTime(kview.get('date-origin').getTime() + kview.computeXBox(event.clientX) * 86400000)
            KVDays.initDayStartTime(newOrigin, KAIROS.days)

            const beginDiff = newOrigin.getTime() - begin.getTime()
            begin.setTime(newOrigin.getTime())
            end.setTime(begin.getTime() + diff)
            object.set('begin', begin.toISOString())
            object.set('end', end.toISOString())
            rowObject.get('id')
                .then(id => {
                    object.set('target', id)
                    kstore.set(object)
                })

            const kmselect = new KMultiSelect()
            if (kmselect.active) {
                kmselect.remove(originalObject.get('id'))
                for (const r of kmselect.get()) {
                    const y = parseFloat(r.clonedNode.style.top.substring(0, r.clonedNode.style.top.length - 2))
                    r.destroyClonedNode()
                    const object = event.ctrlKey ? r.object.clone() : r.object
                    if (event.ctrlKey) {                        
                        object.comment = ''
                    }
                    const begin = new Date(object.get('begin'))
                    const end = new Date(object.get('end'))
                    const diff = Math.abs(end.getTime() - begin.getTime())
                    if (event.shiftKey) {
                        begin.setTime(newOrigin.getTime())
                    } else {
                        begin.setTime(begin.getTime() + beginDiff)
                    }
                    KVDays.initDayStartTime(begin, KAIROS.days)
                    end.setTime(begin.getTime() + diff)
                    object.set('begin', begin.toISOString())
                    object.set('end', end.toISOString())
                    if (event.altKey) {
                        kview.getRowFromPX(OriginalY).get('id')
                            .then(id => {
                                object.set('target', id)
                                kstore.set(object)
                            })
                    } else {
                        kview.getRowFromPX(y).get('id')
                            .then(id => {
                                object.set('target', id)
                                kstore.set(object)
                            })
                    }

                    r.resetMultiple()
                }
                kmselect.clear()
            }
        })
        /* ----- end of drop event ----- */

        this.domNode.addEventListener('dragover', event => {
            event.preventDefault()
        })

        this.domNode.addEventListener('drag', kdebounce(event => {
            const kview = new KView()
            const atBorder = kview.isMouseAtWindowBorder()
            if (atBorder === -1) {
                if (!this.borderTimeInterval) {
                    this.borderTimeInterval = window.setInterval(() => this.move(1), 250)
                }
            } else if (atBorder === 1) {
                if (!this.borderTimeInterval) {
                    this.borderTimeInterval = window.setInterval(() => this.move(-1), 250)
                }
            } else {
                this.stopBorderAutoScroll()
            }
        }, 20))

        window.addEventListener('mousemove', () => this.followMouse())
        window.addEventListener('touchmove', () => this.followMouse())
        window.addEventListener('dblclick', iAddReservation.bind(this))
        window.addEventListener('click', iGrowAddReservation.bind(this))
        window.addEventListener('mousemove', iFollowGrowAddReservation.bind(this))
        window.addEventListener('keyup', iGrowAddReservationEnd.bind(this))
        window.addEventListener('global-keypress', event => {
            switch (event.key) {
                case 'Enter': return iAddReservation(event)
                case 'Delete':
                    if (event.shiftKey) {
                        event.preventDefault()
                        kmselect = new KMultiSelect()
                        if (kmselect.active) {
                            const kstore = new KStore('kreservation')
                            for (const uiobject of kmselect.get()) {
                                kstore.delete(uiobject.object.get('id'))
                            }
                            kmselect.clear()
                        }
                        return
                    }
                    return iDeleteReservation(event)
                case 'F3':
                    event.preventDefault()
                    return iZoomCurrentBox(event)
            }
        })
        this.parentNode.addEventListener('mouseleave', () => this.followMouse.stop = true)
        window.addEventListener('blur', () => {
            this.followMouse.stop = true
            this.stopBorderAutoScroll()
        })
        window.addEventListener('resize', () => { 
            this.setZoom(this.getZoom()) 
        }, { passive: true })
        this.domNode.addEventListener('wheel', this.eWheel.bind(this), { passive: true })
        this.wheelStopSignal = null
        window.addEventListener('keyup', event => {
            if (event.key === 'Alt') { event.preventDefault() }
        })
        window.addEventListener('keydown', event => {
            if (event.key === 'Alt') { 
                event.preventDefault() 
                return
            }
            if (event.key === 'Control') {
                if (this.wheelStopSignal) { this.wheelStopSignal.abort() }
                this.wheelStopSignal = new AbortController()
                this.domNode.addEventListener('wheel', this.wheelZoom.bind(this), { signal: this.wheelStopSignal.signal })
            }
        })

        window.addEventListener('keyup', event => {
            if (event.key === 'Control') {
                if (this.wheelStopSignal) {
                    this.wheelStopSignal.abort()
                    this.wheelStopSignal = null
                }
            }
        })
        window.addEventListener('blur', event => {
            if (this.wheelStopSignal) {
                this.wheelStopSignal.abort()
                this.wheelStopSignal = null
            }
        })
    },

    stopBorderAutoScroll: function () {
        if (this.borderTimeInterval) {
            clearInterval(this.borderTimeInterval)
            this.borderTimeInterval = null
        }
    },

    mouseUpDown: function (event) {
        for (let n = event.target; n; n = n.parentNode) {
            if (n?.dataset?.stopFollowMouse) { this.followMouse.stop = true; return; }
        }

        if (event.type === 'mouseup' || event.type === 'touchstart') {
            window.requestAnimationFrame(() => this.parentNode.classList.remove('kmove'))
            this.followMouse.stop = true
        } else {
            window.requestAnimationFrame(() => this.parentNode.classList.add('kmove'))
            if (KAIROS.mouse.clientX >= 200) {
                this.followMouse.multiplicator = 1
                if (event.target.classList.contains('weekNumber')) {
                    this.followMouse.multiplicator = 7
                }
                if (event.target.classList.contains('monthName')) {
                    this.followMouse.multiplicator = 30
                }
                this.followMouse.stop = false
            }
        }
    },

    followMouse: throttle(function () {
        if (this.followMouse.stop) { return }
        KAIROS.clearSelection()
        if (!this.followMouse.multiplicator) { this.followMouse.multiplicator = 1 }
        if (!this.followMouse.accumulator) { this.followMouse.accumulator = { x: 0, y: 0 } }
        this.followMouse.accumulator.x += KAIROS.mouse.clientX - KAIROS.mouse.lastX
        this.followMouse.accumulator.y += (KAIROS.mouse.clientY - KAIROS.mouse.lastY) * 0.25
        if (Math.abs(this.followMouse.accumulator.x) > this.get('blockSize') * 0.75) {
            if (this.followMouse.accumulator.x < 0) {
                this.moveXRight(1 * this.followMouse.multiplicator)
            } else {
                this.moveXLeft(1 * this.followMouse.multiplicator)
            }
            this.followMouse.accumulator.x = 0
        }

        let top = (window.scrollY || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0)
        if (this.followMouse.accumulator.y < 0) {
            window.scrollTo(0, top + Math.abs(this.followMouse.accumulator.y))
        } else {
            window.scrollTo(0, top - Math.abs(this.followMouse.accumulator.y))
        }
        this.followMouse.accumulator.y = 0
    }, 30),


    wheelZoom: function (event) {
        event.preventDefault()
        if (event.deltaY < 0) {
            this.zoomInN(event.deltaY)
        } else {
            this.zoomOutN(-event.deltaY)
        }
    },

    eWheel: function (event) {
        /* TODO Put this in configuration */
        const move = 1
        const shiftFactor = 7

        if (event.shiftKey) {
            if (event.deltaY < 0) {
                this.moveXRight(move * shiftFactor)
            } else {
                this.moveXLeft(move * shiftFactor)
            }
            return
        }
        if (event.deltaX < 0) {
            this.moveXLeft(move)
        } else if (event.deltaX > 0) {
            this.moveXRight(move)
        }
    },

    getDateRange: function () {
        const kview = new KView()
        return {
            begin: new Date(kview.get('date-center').getTime() - (Math.floor(kview.get('width') / 2) - 1) * 86400000),
            end: new Date(kview.get('date-center').getTime() + (Math.floor(kview.get('width') / 2) - 1) * 86400000)
        }
    },

    move: function (x) {
        if (x === 0) { return }
        if (this.moveTimeout) { return }
        this.moveTimeout = setTimeout(() => {
            const r = x < 0 ? this.moveXRight(Math.abs(x)) : this.moveXLeft(x)
            this.moveTimeout = null
            return r
        }, 100)
    },

    moveXRight: function (x) {
        console.log('moveXRight', x)
        const kview = new KView()
        kview.move(-x)
        kview.get('date-center').setTime(kview.get('date-center').getTime() + Math.abs(x) * 86400000)
        this.update()
        .then(_ => {
            this.drawTimeline()
            this.drawVerticalLine()
        })
    },

    moveXLeft: function (x) {
        console.log('moveXLeft', x)
        const kview = new KView()
        kview.move(x)
        kview.get('date-center').setTime(kview.get('date-center').getTime() - Math.abs(x) * 86400000)
        this.update()
        .then(_ => {
            this.drawTimeline()
            this.drawVerticalLine()
        })
    },

    drawTimeline: function () {
        const kview = new KView()
        const avWidth = this.parentNode.getBoundingClientRect().width
        let currentWeek = 0
        let dayCount = 0
        let currentMonth = -1
        let dayMonthCount = 0
        let currentYear = -1
        const months = []
        this.todayOffset = -1
        this.weekOffset = -1
        this.destroyWeekNumber()
        this.destroyMonthName()
        for (var x = this.days.pop(); x != null; x = this.days.pop()) {
            if (!x.domNode.parentNode) { continue }
            x.domNode.parentNode.removeChild(x.domNode)
        }

        var docFrag = document.createDocumentFragment()
        var hFrag = document.createDocumentFragment()
        var shFrag = document.createDocumentFragment()
        let subLineFrag = document.createDocumentFragment()
        
        this.Holidays = new Holiday(kview.get('date-center').getFullYear())
        
        if (!kview.get('date-origin')) {
            kview.set('date-origin', new Date(kview.get('date-center').getTime() - ((Math.floor(avWidth / this.get('blockSize') / 2) - 1) * 86400000)))
        }

        function sameDay(a, b) {
            return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
        }

        let day
        for (day = kview.get('date-origin'), i = 0; i < this.get('zoom'); i++) {
            if (sameDay(day, new Date())) {
                this.todayOffset = i
            }

            if (currentWeek !== TimeUtils.getWeekNumber(day)) {
                if (currentWeek === 0) {
                    currentWeek = TimeUtils.getWeekNumber(day)
                } else {
                    if (this.weekOffset === -1) { this.weekOffset = i }
                    this.createWeekNumber(currentWeek, dayCount, hFrag)
                    dayCount = 0
                    currentWeek = TimeUtils.getWeekNumber(day)
                }
            }
            if (currentMonth !== day.getMonth()) {
                if (currentMonth === -1) {
                    currentMonth = day.getMonth()
                    if (currentMonth % 2) { months.push(i) }
                    currentYear = day.getFullYear()
                } else {
                    this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag)
                    dayMonthCount = 0
                    currentMonth = day.getMonth()
                    if (currentMonth % 2) { months.push(i) }
                    currentYear = day.getFullYear()
                }
            }

            if (kview.get('day-width') > 15) {
                day.setHours(12, 0, 0)
                let subLineCell = document.createElement('SPAN')
                subLineCell.dataset.date = day.toISOString().split('T')[0]
                subLineCell.innerHTML = `<i  data-action="get-pdf-day" class="far fa-calendar-alt"></i> <i data-action="plan-resource" class="fas fa-car"></i>`
                subLineCell.setAttribute('id', `sub-${day.toISOString().split('T')[0]}`)
                subLineCell.style.width = `var(--blocksize)`
                subLineFrag.appendChild(subLineCell)

                subLineCell.addEventListener('click', event => {
                    event.stopPropagation()
                    let node = event.target
                    while (node && !node.dataset.date) { node = node.parentNode }
                    if (!node || !node.dataset.date) { return }

                    const date = new Date(node.dataset.date)
                    if (isNaN(date.getTime())) { return }

                    switch (event.target.dataset.action) {
                        default: return;
                        case 'get-pdf-day':
                            const klogin = new KLogin(KAIROS.URL(KAIROS.kaalURL))
                            klogin.genUrl(new URL(`${KAIROS.getBase()}/pdfs/day/${node.dataset.date}`), {}, klogin.getShareType('share-limited'))
                                .then(url => {
                                    return window.open(url, '_blank')
                                })
                                .catch(error => {
                                    KAIROS.error(error)
                                })
                            break
                        case 'plan-resource':
                            return KIOpenResourceAllocation(date);
                    }
                })
            }

            const d = this.makeDay(day)
            d.domNode.style.display = 'inline-block'
            d.domNode.style.maxWidth = `${this.get('blockSize')}px`
            d.domNode.style.width = `${this.get('blockSize')}px`
            d.domNode.style.overflow = 'hidden'

            this.days.push(d)
            if (this.get('blockSize') > 20) {
                docFrag.appendChild(d.domNode)
            }

            day = new Date(day.getTime() + 86400000)
            dayCount++; dayMonthCount++
        }

        if (dayCount > 0) {
            this.createWeekNumber(currentWeek, dayCount, hFrag)
        }
        if (dayMonthCount > 0) {
            this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag)
        }

        kview.setViewportWidth(this.get('zoom') * this.get('blockSize'))
        kview.setMargins(120, 14, 50, this.get('offset'))
        window.requestAnimationFrame(() => {
            this.domNode.querySelector('#TL_subline').innerHTML = ''
            this.domNode.querySelector('#TL_subline').appendChild(subLineFrag)
            this.domNode.querySelector('#TL_line').appendChild(docFrag)
            this.domNode.querySelector('#TL_header').appendChild(hFrag)
            this.domNode.querySelector('#TL_supHeader').appendChild(shFrag)
        })
    },

    drawVerticalLine: function () {
        return new Promise(resolve => {
            const kview = new KView()
            const frame = document.getElementById('VerticalLineFrame')
            if (!frame) { resolve(); return }
            const dayLength = this.days.length
            const frameLength = frame.children.length
            const blocksize = this.get('blockSize')
            const offset = this.get('offset')

            const chain = Promise.resolve()

            for (let i = dayLength; i < frameLength; i++) {
                const node = frame.children[i]
                chain.then(() => {
                    return new Promise(resolve => {
                        window.requestAnimationFrame(() => {
                            if (node.parentNode) { frame.removeChild(node); }
                            resolve()
                        })
                    })
                })
            }
            const today = new Date()
            for (let i = 0; i < dayLength; i++) {
                const day = new Date()
                day.setTime(kview.get('date-origin').getTime() + (i * 86400000))
                const node = frame.children[i] || document.createElement('DIV')
                if (!frame.children[i]) {
                    chain.then(() => {
                        return new Promise((resolve) => {
                            window.requestAnimationFrame(() => {
                                frame.appendChild(node)
                                resolve()
                            })
                        })
                    })
                }

                const classes = ['vertical']
                const left = offset + (blocksize * i)
                if (i % 2) {
                    classes.push('even')
                } else {
                    classes.push('odd')
                }

                /* priority on showing holiday : a non working staturday can be 
                    used to work, if it's an holiday, need to pay more
                */
                if (this.Holidays.isHolidayInAnyOf(day, KAIROS.holidays)) {
                    classes.push('nowork')
                    classes.push('holiday')
                } else if (KAIROS.days[day.getDay()].chunks === null) {
                    classes.push('nowork')
                }

                if (day.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
                    classes.push('today')
                }

                chain.then(() => {
                    return new Promise(resolve => {
                        window.requestAnimationFrame(() => {
                            node.style.setProperty('left', `${left}px`)
                            node.setAttribute('class', classes.join(' '))
                            resolve()
                        })
                    })
                })
            }
            chain.then(() => {
                resolve()
            })
        })
    },

    loadEntries: function () {
        return new Promise((resolve, reject) => {
            const kview = new KView()
            const url = KAIROS.URL(`${KAIROS.stores.kentry.store}/_query`)
            kfetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    '#and': {
                        disabled: '0',
                        deleted: '--'
                    }
                })
            })
            .then(response => {
                if (!response.ok) { throw new Error(I18N.$('ERR:server')) }
                return response.json()
            })
            .then(result => {
                if (!result || !result.success) { throw new Error(I18N.$('ERR:server')) }
                return Array.isArray(result.data) ? result.data : [result.data]
            })
            .then(entries => {
                return Promise.allSettled(
                    entries
                        .filter(e => Number(e.order) >= 0 && Number(e.disabled) === 0)
                        .map(entry => {
                            return new Promise((resolve, reject) => {
                                KEntry.load(entry[KAIROS.stores.kentry.uid.remote])
                                    .then(kentry => {
                                        kentry.sortValue = parseInt(entry.order)
                                        return resolve(kentry)
                                    })
                                    .catch(cause => {
                                        throw new Error(I18N.$('ERR:server'), { cause })
                                    })
                            })
                        })
                )
            })
            .then(loadedEntries => {
                loadedEntries = loadedEntries
                    .filter(e => e.status === 'fulfilled')
                    .map(e => e.value)
                    .sort((a, b) => a.sortValue - b.sortValue)
                loadedEntries.forEach(e => e.register(this.Updater))
                kview.setEntryCount(loadedEntries.length)
                let i = 0
                return Promise.allSettled(loadedEntries.map(e => {
                    return new Promise((resolve, reject) => {
                        const row = i++
                        e.set('origin', kview.get('date-origin'))
                            .then(_ => {
                                kview.bindObjectToRow(row, e)
                                e._ROW = row
                                e.set('row', row)
                                resolve(e)
                            })
                            .catch(cause => {
                                reject(new Error(I18N.$('ERR:server'), { cause }))
                            })
                    })
                }))
            })
            .then(kentries => {
                kentries = kentries
                    .filter(e => e.status === 'fulfilled')
                    .map(e => e.value)
                const domNode = this.domNode.querySelector('#TL_domEntries')
                kentries.map(e => e.render(domNode))
                return resolve()
            })
            .catch(reason => {
                reject(reason)
            })
        })
    },

    run: function () {
        this.loadEntries({ state: 'SOLD' })
        .then(() => {
            this.update()
            this.drawTimeline()
            return KAIROS.getClientId()
        })
        .then(clientid => {
            this.Updater.postMessage({ op: 'ready', token: localStorage.getItem('klogin-token'), clientid: clientid})
        })
    },

    refresh: function () {
        const begin = new Date()
        const end = new Date()
        const daterange = this.getDateRange()
        if (daterange.begin === null || daterange.end === null) { return }

        begin.setTime(daterange.begin.getTime())
        end.setTime(daterange.end.getTime())
        begin.setTime(begin.getTime() - 604800000)
        end.setTime(end.getTime() + 604800000)

        this.Updater.postMessage({ op: 'move', begin: begin, end: end })
    },

    update: function () {
        return new Promise(resolve => {
            this.refresh()
            new KView().runRunOnMove()
            return resolve()
        })
    }
}