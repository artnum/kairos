function KTimeline(args) {
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
    document.body.appendChild(this.domNode)
    this.center = null
    this.set('offset', 260)
    this.setBlockSize(42)
    this.zoomCss = null
    this.timeout = null
    this.lastDay = null
    this.firstDay = null
    this.verticals = null
    this.lastClientXY = [0, 0]
    this.lastMod = 0
    this.eventStarted = null
    this.daysZoom = 0
    this.compact = false
    this.currentVerticalLine = 0

    this.verticals = []
    this.days = []
    this.weekNumber = []
    this.Entries = new Map()
    this.todayOffset = -1
    this.months = []
    this.timeout = null
    this.odd = true
    this.borderTimeInterval = null

    this.lastClientXY = []
    this.lastMod = ''
    this.xDiff = 0
    this.daysZoom = 14
    this.compact = false
    this.currentVerticalLine = 0
    this.displayOrder = []
    this.runningRequest = []
    this.extension = false
    this.LocalReservations = {}
    this.timelineMoving = false
    this.FirstLoad = true
    this.Holidays = null
    this.Tooltips = {}
    this.followMouse.stop = true

    this.center = new Date()
    this.center.setHours(0); this.center.setMinutes(0); this.center.setSeconds(0)

    if (KAIROS.centerTodayRatio) {
        this.center.setTime(this.center.getTime() + (this.daysZoom * KAIROS.centerTodayRatio / 2 * 86400000))
    }
    this.Viewport = new KView()

    this.Viewport.setEntryHeight(78)
    this.Viewport.setEntryInnerHeight(74)

    const kglobal = new KGlobal()
    kglobal.watch('k-project-highlight', 'highlight-project', function (name, oldValue, newValue) {
        if (oldValue) {
            window.requestAnimationFrame(() => {
                document.querySelectorAll(`div[data-kproject="${oldValue}"]`)
                    .forEach(node => {
                        node.style.removeProperty('--selected-color')
                        node.classList.remove('selected')
                    })
            })
        }
        if (newValue) {
            window.requestAnimationFrame(() => {
                document.querySelectorAll(`div[data-kproject="${newValue}"]`)
                    .forEach(node => {
                        node.style.setProperty('--selected-color', `hsla(0, 100%, 50%, 1)`)
                        node.classList.add('selected')
                    })
            })
        }
    })

        ; (new KView()).addRunOnMove(function () {
            const prj = (new KGlobal()).get('k-project-highlight')
            if (prj) {
                window.requestAnimationFrame(() => {
                    document.querySelectorAll(`div[data-kproject="${prj}"]`)
                        .forEach(node => {
                            node.style.setProperty('--selected-color', `hsla(0, 100%, 50%, 1)`)
                            node.classList.add('selected')
                        })
                })
            }
        })

    this.Viewport.addEventListener('EnterColumn', event => {
        const frame = document.getElementById('VerticalLineFrame')
        let i = 0;
        for (const node of frame.children) {
            if (event.detail.currentColumn === i) {
                node.classList.add('khover')
            }
            if (event.detail.currentColumn !== i) {
                node.classList.remove('khover')
            }
            i++
        }
    })
    this.Viewport.addEventListener('EnterRow', event => {
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

    this.Viewport.addEventListener('requestDayMove', event => {
        if (event.detail.days) {
            this.move(event.detail.days)
        }
    })

    this.zoomCss = document.createElement('style')
    this.Updater = new Worker(`${KAIROS.getBase()}/js/ww/updater.js?${localStorage.getItem('klogin-token')}`)
    this.Updater.onmessage = function (e) {
        if (!e || !e.data || !e.data.op) { return }
        switch (e.data.op) {
            case 'complements':
                const node = document.getElementById(`sub-${e.data.date}`)
                if (!node) { return }
                let html = ''
                for (let c in e.data.value) {
                    let val = e.data.value[c]
                    if (val.count > 0) {
                        let spanClass = 'info'
                        if (val.type === '4' && e.data.options && e.data.options.machinist) {
                            if (Math.round(e.data.options.machinist.length / 2) <= val.count) {
                                spanClass = 'error'
                            }
                        }
                        html += `<span class="spanReset ${spanClass}">${val.count} <i class="fas fa-square-full" style="color: #${c}"></i></span>`
                    }
                }
                window.requestAnimationFrame(() => { node.innerHTML = html })
                break
            case 'log': break
        }
    }.bind(this)

    document.body.appendChild(this.zoomCss)

    if (typeof window.Rent === 'undefined') {
        window.Rent = {}
    }
    if (typeof window.Rent.Days === 'undefined') {
        window.Rent.Days = {}
    }

    window.UnloadCall = {}
    this.postCreate()
}

KTimeline.prototype = {
    createWindow: function () {
        this.Window = document.createElement('div')
        this.Window.setAttribute('class', 'topWin')
        this.Window.setAttribute('style', 'display: none')

        this.Window.appendChild(document.createElement('div'))

        this.Window.firstChild.appendChild(document.createElement('span'))

        var li = document.createElement('li')
        li.setAttribute('class', 'fas fa-external-link-alt ')
        this.Window.firstChild.appendChild(li)
        li.addEventListener('click', function (event) {
            window.open(this.Window.currentUrl, '_blank')
        }.bind(this))

        li = document.createElement('li')
        li.setAttribute('class', 'fas fa-window-close')
        this.Window.firstChild.appendChild(li)
        li.addEventListener('click', function (event) {
            this.closeWindow()
        }.bind(this))

        var iframe = document.createElement('iframe')
        iframe.addEventListener('load', function (event) {
            var doc = event.target.contentDocument
            this.Window.firstChild.firstChild.innerHTML = doc.title
        }.bind(this))
        this.Window.appendChild(iframe)

        this.Window.firstChild.setAttribute('class', 'windowToolbar')

        document.body.appendChild(this.Window)
    },

    openWindow: function (url, real = false) {
        if (!real) {
            if (!this.Window) {
                this.createWindow()
            }

            url += (url.indexOf('?') > -1 ? '&' : '?') + '_timestamp=' + Date.now()
            this.Window.lastChild.setAttribute('src', url)
            this.Window.currentUrl = url

            this.Window.setAttribute('style', '')
        } else {
            window.open(url + (url.indexOf('?') > -1 ? '&' : '?') + '_timestamp=' + Date.now(), url.split('.')[0])
        }
    },

    closeWindow: function () {
        if (!this.Window) {
            return
        }
        this.Window.lastChild.setAttribute('src', '')
        this.Window.currentUrl = ''
        this.Window.setAttribute('style', 'display: none')
    },

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
        var style = ''
        var days = 1
        var classname = ''

        this.domNode.classList.remove('day', 'month', 'week', 'quarter', 'semester')
        switch (zoomValue) {
            case 'day':
                days = 2
                classname = 'day'
                break
            case 'month':
                days = 31
                classname = 'month'
                break
            case 'week':
                days = 14
                classname = 'week'
                break
            case 'quarter':
                days = 91
                classname = 'quarter'
                break
            case 'semester':
                days = 181
                classname = 'semester'
                break
            default:
                days = zoomValue
                break
        }

        if (days > 547) {
            days = 547
            KAIROS.warn('Zoom minimum atteint')
        }
        if (days < 2) {
            days = 2
            KAIROS.warn('Zoom maximum atteint')
        }

        this.daysZoom = days
        this.set('zoom', days)
        if (classname !== '') {
            this.domNode.classList.add(classname)
        }
        this.setBlockSize(Math.floor((document.documentElement.clientWidth - this.get('offset') - getScrollBarWidth()) / days))
        this.zoomCss.innerHTML = ` :root { --offset-width: ${this.get('offset')}px; }
                                   .timeline .line span { width: ${this.get('blockSize') - 2}px !important; }
                                  .timeline .header .tools { width: ${this.get('offset')}px !important; }
                                  .timeline .line { margin-left: ${this.get('offset')}px !important; }
                                  ${style}`
        this.resize()
        this.Viewport.setOrigin(this.firstDay)
        this.Viewport.setDayCount(days)
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
        switch (c) {
            case 'vs': return 'Valais'
            case 'vd': return 'Vaud'
            case 'ge': return 'Genève'
            case 'ju': return 'Jura'
            case 'ne': return 'Neuchâtel'
            case 'fr': return 'Fribourg catholique'
            case 'fr-prot': return 'Fribourg réformé'
            case 'be': return 'Berne'
            case 'fra': return 'France'
            default: return 'Suisse'
        }
    },

    makeDay: function (newDay) {
        var txtDate = ''
        newDay.setHours(12, 0, 0)
        var dayStamp = newDay.toISOString().split('T')[0]

        switch (newDay.getDay()) {
            case 0: txtDate = '<span class="dayname">Dim</span>' + newDay.getDate(); break
            case 1: txtDate = '<span class="dayname">Lun</span>' + newDay.getDate(); break
            case 2: txtDate = '<span class="dayname">Mar</span>' + newDay.getDate(); break
            case 3: txtDate = '<span class="dayname">Mer</span>' + newDay.getDate(); break
            case 4: txtDate = '<span class="dayname">Jeu</span>' + newDay.getDate(); break
            case 5: txtDate = '<span class="dayname">Ven</span>' + newDay.getDate(); break
            case 6: txtDate = '<span class="dayname">Sam</span>' + newDay.getDate(); break
        }

        var domDay = document.createElement('SPAN')
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

    toolTip: function (node, element, triggerElement) {
        this.toolTip_hide()
        document.body.appendChild(node)
        window.TooltipPopper = [Popper.createPopper(element, node, { placement: 'top-start' }), node, triggerElement]
        triggerElement.addEventListener('mouseout', this.toolTip_hide, { capture: true })
        triggerElement.addEventListener('mouseleave', this.toolTip_hide, { capture: true })
    },
    toolTip_hide: function () {
        if (window.TooltipPopper) {
            window.TooltipPopper[0].destroy()
            if (window.TooltipPopper[1] && window.TooltipPopper[1].parentNode) {
                window.TooltipPopper[1].parentNode.removeChild(window.TooltipPopper[1])
            }
            window.TooltipPopper = null
        }
    },

    resizeTimeline: function () {
        this.drawTimeline()
        this.drawVerticalLine()
    },

    resize: function () {
        this.resizeTimeline()
        this.Viewport.resize()
    },

    createMonthName: function (month, year, days, frag) {
        var n = document.createElement('DIV')
        n.setAttribute('style', 'width: ' + Math.floor((days * this.get('blockSize'))) + 'px')
        switch (month + 1) {
            case 1: n.innerHTML = `Janvier&nbsp;${year}`; break
            case 2: n.innerHTML = `Février&nbsp;${year}`; break
            case 3: n.innerHTML = `Mars&nbsp;${year}`; break
            case 4: n.innerHTML = `Avril&nbsp;${year}`; break
            case 5: n.innerHTML = `Mai&nbsp;${year}`; break
            case 6: n.innerHTML = `Juin&nbsp;${year}`; break
            case 7: n.innerHTML = `Juillet&nbsp;${year}`; break
            case 8: n.innerHTML = `Août&nbsp;${year}`; break
            case 9: n.innerHTML = `Septembre&nbsp;${year}`; break
            case 10: n.innerHTML = `Octobre&nbsp;${year}`; break
            case 11: n.innerHTML = `Novembre&nbsp;${year}`; break
            case 12: n.innerHTML = `Décembre&nbsp;${year}`; break
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
        for (var x = this.months.pop(); x; x = this.months.pop()) {
            x.parentNode.removeChild(x)
        }
    },

    createWeekNumber: function (number, days, frag) {
        var n = document.createElement('DIV')
        n.setAttribute('style', 'width: ' + Math.floor(days * this.get('blockSize')) + 'px')
        n.innerHTML = 'Semaine ' + number
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
        for (var x = this.weekNumber.pop(); x; x = this.weekNumber.pop()) {
            x.parentNode.removeChild(x)
        }
    },

    postCreate: function () {
        this.domNode.querySelector('#AppHeader').style.zIndex = KAIROS.zMax()
        const ktaskbar = new KTaskBar()
        const cornerBox = new KCornerBox()


        this.view = {}
        this.setZoom('week')

        window.addEventListener('k-set-center', event => {
            const origin = this.center
            const target = event.detail.date
            target.setHours(12, 0, 0, 0)
            target.setTime(target.getTime() - ((Math.floor(this.domNode.offsetWidth / this.get('blockSize') / 2) - 2) * 86400000))
            const diff = Math.floor((origin.getTime() - target.getTime()) / 86400000)
            if (Math.abs(diff) > 365) { return KAIROS.error('Déplacement trop loin dans le temps') }
            this.move(diff)
        })

        this.domNode.addEventListener('mouseup', this.mouseUpDown.bind(this))
        this.domNode.addEventListener('mousedown', this.mouseUpDown.bind(this))
        this.domNode.addEventListener('touchstart', this.mouseUpDown.bind(this), { passive: true })
        this.domNode.addEventListener('touchend', this.mouseUpDown.bind(this))
        this.domNode.addEventListener('dragstart', event => {
            window.requestAnimationFrame(() => { document.body.classList.add('kdragging') })
        })
        this.domNode.addEventListener('dragend', event => {
            this.stopBorderAutoScroll()
            window.requestAnimationFrame(() => { document.body.classList.remove('kdragging') })
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
            const originalObject = kGStore.get(kident.substr(6))
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
            newOrigin.setTime(this.firstDay.getTime() + kview.computeXBox(event.clientX) * 86400000)
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
        document.body.addEventListener('mouseleave', () => this.followMouse.stop = true)
        window.addEventListener('blur', () => {
            this.followMouse.stop = true
            this.stopBorderAutoScroll()
        })
        window.addEventListener('resize', () => { 
            this.setZoom(this.getZoom()) 
        }, { passive: true })
        this.domNode.addEventListener('wheel', this.eWheel.bind(this), { passive: true })
        this.wheelStopSignal = null
        window.addEventListener('keydown', event => {
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

        this.view.rectangle = getPageRect()


        document.addEventListener('click', (event) => {
            for (let [key, entry] of this.Entries) {
                if (entry.EntryStateOpen !== undefined && entry.EntryStateOpen !== null) {
                    entry.EntryStateOpen[0].destroy()
                    entry.EntryStateOpen[1].parentNode.removeChild(entry.EntryStateOpen[1])
                    entry.EntryStateOpen = null
                    this.Entries.set(key, entry)
                }
            }
        }, { capture: true })
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
            window.requestAnimationFrame(() => document.body.classList.remove('kmove'))
            this.followMouse.stop = true
        } else {
            window.requestAnimationFrame(() => document.body.classList.add('kmove'))
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
        this.toolTip_hide()
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

        let top = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0)
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
        this.toolTip_hide()
        if (this._mask) { return }
        if (event.shiftKey) {
            if (event.deltaY < 0) {
                this.moveXRight(7)
            } else {
                this.moveXLeft(7)
            }
            return
        }
        const move = 1
        if (event.deltaX < 0) {
            this.moveXLeft(move)
        } else if (event.deltaX > 0) {
            this.moveXRight(move)
        }
    },

    getDateRange: function () {
        return { begin: this.firstDay, end: this.lastDay }
    },

    today: function () {
        this.move(Math.round((this.center.getTime() - (new Date()).getTime()) / 86400000) + 6)
    },

    move: function (x) {
        if (x === 0) { return }
        if (x < 0) {
            this.moveXRight(Math.abs(x))
        } else {
            this.moveXLeft(x)
        }
    },

    moveXRight: function (x) {
        this.center.setTime(this.center.getTime() + Math.abs(x) * 86400000)
        this.Viewport.move(-x)
        this.firstDay = this.Viewport.get('date-origin')
        this.update()
        this.drawTimeline()
        this.drawVerticalLine()
    },
    moveOneRight: function () {
        this.moveXRight(1)
    },
    moveRight: function () {
        var move = 1
        if (this.days.length > 7) {
            move = Math.floor(this.days.length / 7)
        }
        this.moveXRight(move)
    },
    moveXLeft: function (x) {
        this.center.setTime(this.center.getTime() - Math.abs(x) * 86400000)
        this.Viewport.move(x)
        this.firstDay = this.Viewport.get('date-origin')
        this.update()
        this.drawTimeline()
        this.drawVerticalLine()
    },
    moveOneLeft: function () {
        this.moveXLeft(1)
    },
    moveLeft: function () {
        var move = 1
        if (this.days.length > 7) {
            move = Math.floor(this.days.length / 7)
        }
        this.moveXLeft(move)
    },

    drawTimeline: function () {
        const avWidth = this.domNode.offsetWidth
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
            if (x.domNode.parentNode) {
                x.domNode.parentNode.removeChild(x.domNode)
            }
        }

        var docFrag = document.createDocumentFragment()
        var hFrag = document.createDocumentFragment()
        var shFrag = document.createDocumentFragment()
        let subLineFrag = document.createDocumentFragment()

        if (!this.Holidays) {
            this.Holidays = new Holiday(this.center.getFullYear())
        } else {
            this.Holidays.addYear(this.center.getFullYear())
        }

        if (!this.firstDay) {
            this.firstDay = new Date()
            this.firstDay.setTime(this.center.getTime() - ((Math.floor(avWidth / this.get('blockSize') / 2) - 1) * 86400000))
        }
        for (const entry of this.Entries) {
            entry[1].set('origin', this.firstDay)
        }
        this.Viewport.setOrigin(this.firstDay)
        function sameDay(a, b) {
            return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
        }

        for (var day = this.firstDay, i = 0; i < this.get('zoom'); i++) {
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

            if (this.Viewport.get('day-width') > 15) {
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

            var d = this.makeDay(day)
            d.domNode.style.display = 'inline-block'
            d.domNode.style.maxWidth = `${this.get('blockSize')}px`
            d.domNode.style.width = `${this.get('blockSize')}px`
            d.domNode.style.overflow = 'hidden'
            if (typeof window.Rent.Days[d.stamp] === 'undefined') {
                window.Rent.Days[d.stamp] = {}
            }

            this.days.push(d)
            if (this.get('blockSize') > 20) {
                docFrag.appendChild(d.domNode)
            }

            day = new Date(day.getTime() + 86400000)
            this.lastDay = day
            dayCount++; dayMonthCount++
        }
        if (dayCount > 0) {
            this.createWeekNumber(currentWeek, dayCount, hFrag)
        }
        if (dayMonthCount > 0) {
            this.createMonthName(currentMonth, currentYear, dayMonthCount, shFrag)
        }

        this.Viewport.setViewportWidth(this.get('zoom') * this.get('blockSize'))
        this.Viewport.setMargins(120, 14, 50, this.get('offset'))

        window.requestAnimationFrame(() => {
            this.domNode.querySelector('#TL_subline').innerHTML = ''
            this.domNode.querySelector('#TL_subline').appendChild(subLineFrag)
            this.domNode.querySelector('#TL_line').appendChild(docFrag)
            this.domNode.querySelector('#TL_header').appendChild(hFrag)
            this.domNode.querySelector('#TL_supHeader').appendChild(shFrag)
        })
    },

    drawVerticalLine: function () {
        const draw = () => {
            return new Promise(resolve => {
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
                    day.setTime(this.firstDay.getTime() + (i * 86400000))
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
        }
        if (!this.vDrawPromise) { this.vDrawPromise = Promise.resolve() }
        this.vDrawPromise.then(() => draw())
    },

    loadEntries: function () {
        return new Promise((resolve, reject) => {
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
                if (!response.ok) { throw new Error('ERR:server') }
                return response.json()
            })
            .then(result => {
                if (!result || !result.success) { throw new Error('ERR:server') }
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
                                        throw new Error('Failed to load entry', { cause })
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
                this.Viewport.setEntryCount(loadedEntries.length)
                let i = 0
                return Promise.allSettled(loadedEntries.map(e => {
                    return new Promise((resolve, reject) => {
                        const row = i++
                        e.set('origin', this.firstDay)
                            .then(_ => {
                                this.Viewport.bindObjectToRow(row, e)
                                e._ROW = row
                                e.set('row', row)
                                resolve(e)
                            })
                            .catch(cause => {
                                reject(new Error('Failed to load entry', { cause }))
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
        this.currentPosition = 0
        this.update()
      
        this.loadEntries({ state: 'SOLD' })
        .then(() => {
            this.update()
            this.Updater.postMessage({ op: 'ready' })
            this.drawTimeline()
        })
      
    },

    refresh: function () {
        if (!this.timelineMoving) {
            const begin = new Date()
            const end = new Date()

            const daterange = this.getDateRange()
            if (daterange.begin === null || daterange.end === null) { return }

            begin.setTime(daterange.begin.getTime())
            end.setTime(daterange.end.getTime())
            begin.setTime(begin.getTime() - 604800000)
            end.setTime(end.getTime() + 604800000)

            this.Updater.postMessage({ op: 'move', begin: begin, end: end })
        }
    },

    update: function (force = false) {
        this.refresh()
        this.Viewport.runRunOnMove()
    },

    print: function (url) {
        window.open(url)
    },

    setOpen: function (ident) {
        if (!this.Open) { this.Open = [] }
        if (this.Open.indexOf(ident) === -1) { this.Open.push(ident) }
    },

    unsetOpen: function (ident) {
        if (this.Open) {
            var idx = this.Open.indexOf(ident)
            if (idx !== -1) {
                this.Open.splice(idx, 1)
            }
        }
    },

    isOpen: function (ident) {
        if (this.Open) {
            if (this.Open.indexOf(ident) === -1) { return false }
            return true
        }
        return false
    },

    setModify: function (ident) {
        if (!this.Mod) { this.Mod = [] }
        if (this.Mod.indexOf(ident) === -1) { this.Mod.push(ident) }
    },

    unsetModify: function (ident) {
        if (this.Mod) {
            var idx = this.Mod.indexOf(ident)
            if (idx !== -1) {
                this.Mod.splice(idx, 1)
            }
        }
    },

    isModify: function (ident) {
        if (this.Mod) {
            if (this.Mod.indexOf(ident) === -1) { return false }
            return true
        }
        return false
    },

    minimizeMaximize: function (event) {
        var node = this.nMinimizeMaximize
        var inode = node
        var max = false
        if (arguments[1]) {
            max = true
        }
        if (inode.nodeName !== 'I') {
            for (inode = inode.firstChild; inode.nodeName !== 'I'; inode = inode.nextSibling);
        }
        while (node && !node.getAttribute('data-artnum-maximize')) {
            node = node.parentNode
        }
        if (!max && node.getAttribute('data-artnum-maximize') === 'yes') {
            node.setAttribute('data-artnum-maximize', 'no')
        } else {
            node.setAttribute('data-artnum-maximize', 'yes')
        }
    }
}