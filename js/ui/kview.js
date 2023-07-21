/* global view object */
function KViewCell (day) {
    this.day = day
    this.content = []
    this.size = 0
}

KViewCell.prototype.set = function (id, object) {
    for (const c of this.content) {
        if (c.id === String(id)) { return }
    }
    this.content.push({id: String(id), object: object})
    this.size = this.content.length
}

KViewCell.prototype.get = function (id) {
    const idx = this.indexOf(id)
    if (idx !== -1) { return this.content[idx].object }
    return undefined
}

KViewCell.prototype.delete = function (id) {
    const idx = this.indexOf(id)
    if (idx !== -1) { this.content.splice(idx, 1) }
    this.size = this.content.length
}

KViewCell.prototype.has = function (id) {
    return this.indexOf(id) !== -1
}

KViewCell.prototype.indexOf = function (id) {
    for (let i = 0; i < this.content.length; i++) {
        if (this.content[i].id === String(id)) {
            return i
        }
    }
    return -1
}

KViewCell.prototype.clear = function () {
    this.content.forEach(element => element.object.mark('hide'))
    this.content = []
    this.size = 0
}

KViewCell.prototype.entries = function () {
    let i = 0
    const iter = {
        next: function () {
            if (i < this.content.length) {
                const result = {value: [this.content[i].id, this.content[i].object], done: false}
                i++;
                return result
            }
            return {done: true}
        }.bind(this),
        [Symbol.iterator]: function() { return iter }.bind(this)
    }

    return iter
}

function KView () {
    if (KView._instance) { return KView._instance }
    this.data = new Map()
    this.currentBox = [-1, -1]
    this.eventTarget = new EventTarget()
    this.mouseHandlerRun = false
    window.addEventListener('keydown', this.handleKeyMove.bind(this), {capture: true})
    window.addEventListener('mousemove', this.startMouseHandler.bind(this), {capture: true, passive: true})
    /* rowDescription is used to move around row and hide them. As, in the 
     * grid, row are not contiguous, they stay in place and the actual index
     * of the row is set in rowDescription. If the index is lower than 0, row
     * is hidden.
     * rowDescription indexes starts at 1 as to hide by reversing their value
     * (6 -> -6, we keep their index while hidding). As 0 === -0 is true, it
     * is not possible to use 0 index.
     */
    this.rowDescription = null
    this.grid = null
    this.gridOffset = 0
    this.runOnMove = new Map()
    this.runOnMoveId = 0
    KView._instance = this
}

/**
 * Return the current absolute Y position of the mouse.
 * @returns {number} Pixel position of the mouse.
 */
KView.prototype.getMouseYPosition = function () {
    return KAIROS.mouse.clientY + window.scrollY
}

/**
 * Return the current absolute X position of the mouse.
 * @returns {number} Pixel position of the mouse.
 */
KView.prototype.getMouseXPosition = function () {
    return KAIROS.mouse.clientX
}

/**
 * 
 * @returns {number} -1 if mouse is at left side, 1 if mouse is at right side, 0 otherwhise
 */
KView.prototype.isMouseAtWindowBorder = function () {
    const x = this.getMouseXPosition()
    if (x <= 30 || x + 30 >= window.innerWidth) {
        return x <= 30 ? -1 : 1 
    }
    return 0
}

KView.prototype.addRunOnMove = function (callback, id = null) {
    if (id === null) { id = ++this.runOnMoveId }
    this.runOnMove.set(id, callback)
    return id
}

KView.prototype.delRunOnMove = function (id) {
    return this.runOnMove.delete(id)
}

KView.prototype.runRunOnMove = function () {
    /* run after animation frame */
    new Promise((resolve) => {
        window.requestAnimationFrame(() => { resolve() })
    })
    .then(() => {
        for (const [_, cb] of this.runOnMove) {
            if (typeof cb === 'function') { window.requestIdleCallback(() => { cb() }) }
        }
    })
}

KView.prototype.addEventListener = function (event, listener, options) {
    this.eventTarget.addEventListener(event, listener, options)
}

KView.prototype.startMouseHandler = function () {
    if (this.mouseHandlerRun) { return }
    this.mouseHandlerRun = true
    this.handleMouseMove()
}

KView.prototype.stopMouseHandler = function () {
    this.mouseHandlerRun = false
}

/* compute values when some value changes */
KView.prototype.compute = function () {
    const daysec = 86400

    if (this.data.has('viewport-width') && this.data.has('day-count')) {
        const viewportWidth = this.data.get('viewport-width')
        const dayCount = this.data.get('day-count')
        const dayWidth = viewportWidth / dayCount
        const secondWidth = dayWidth / daysec

        this.data.set('day-width', dayWidth)
        this.data.set('second-width', secondWidth)
    }

    if (this.data.has('entry-height') && this.data.has('entry-count')) {
        const entries = this.data.get('entry-height')
        const count = this.data.get('entry-count')
        this.data.set('viewport-height', entries * count)
    }

    if (this.data.has('entry-count') && this.data.has('day-count')) {
        if (this.grid === null) {
            const date = this.get('date-origin')
            let day0 = Math.floor(date.getTime() / daysec / 1000)
            const height = this.data.get('entry-count')
            const width = 360
            const newGrid = new Array(width * height)
            
            /* copy old grid into new grid */
            for (i = 0; i < newGrid.length; i++) {
                newGrid[i] = new KViewCell(day0 + Math.floor(i / (this.data.get('entry-count') + 1)))
            }
            this.rowDescription = new Array(height)
            for (let i = 0; i < height; i++) {
                this.rowDescription[i] = [i, null, true]
            }
            this.grid = newGrid
            this.gridOffset = Math.round(width / 2)
        }
    }

}

KView.prototype.showRow = function (idx) {
    this.rowDescription[idx][2] = true
    this.rowDescription[idx][1].KUI.setHidden(false)
}

KView.prototype.hideRow = function (idx) {
    this.rowDescription[idx][2] = false
    this.rowDescription[idx][1].KUI.setHidden(true)
}

/* Convert grid x to pixel x */
KView.prototype.getPixelX = function (gridX) {
    return (gridX + 1) * this.data.get('day-width') + this.gridOffset
}

KView.prototype.getPixelY = function (gridY) {
    return this.data.get('entry-height') * gridY + this.data.get('margin-top')
}

/**
 * Get absolute row
 * @param {number} y Position of the row
 * @returns 
 */
KView.prototype.getY = function (y) {
    if (!this.rowDescription) { return -1 }
    if (y < 0) { return - 1}
    if (y >= this.rowDescription.length) { return - 1 }
    return y
}

/** 
 * Get row index in based on virtual Y position. The index is only for the
 * currently shown rows, hidden ones are skipped.
 * @param {number} y Position of the row
 * @returns {number} Index, in rowDescription, of the row
 */
KView.prototype.getRowIndex = function (y) {
    if (!this.rowDescription) { return -1 }
    if (y < 0) { return -1 }
    let pos = 0
    for (let i = 0; i < this.rowDescription.length; i++) {
        if (this.rowDescription[i][1] === null 
            || this.rowDescription[i][0] < 0
            || !this.rowDescription[i][2]) { continue }    
        if (y === 0) { pos = i; break }
        y--
    }

    if (pos >= this.rowDescription.length || !this.rowDescription[pos][2]) { return -1 }
    return pos
}

/**
 * Get the relative Y position for a given rowid
 * @param {number} rowid Id of the row
 * @returns {number} Relative position
 */
KView.prototype.getRelativeRowY = function (rowid) {
    let r = 0
    for (let i = 0; i < this.rowDescription.length; i++) {
        if (this.rowDescription[i][1] === null 
            || this.rowDescription[i][0] < 0
            || !this.rowDescription[i][2]) { continue }
        if (String(this.rowDescription[i][1].id) === String(rowid)) {
            return r
        }
        r++
    }
    return -1
}

KView.prototype.getRowIndexFromPX = function (px) {
    return this.getRowIndex(this.getYFromPX(px))
}

/**
 * Get the row at given pixel position.
 * @param {number} px Absolute number of pixels in Y position
 * @returns {object|null} Row object if found or null
 */
KView.prototype.getRowFromPX = function (px) {
    if (!this.rowDescription) { return null }
    const y = this.getYFromPX(px)
    if (y < 0) { return null }
    const row = this.rowDescription[this.getRowIndex(y)]
    if (!row) { return null }
    return row[1]
}

/**
 * Get the Y position from a given pixel position
 * @param {number} px Absolute number of pixels in Y position
 * @returns {number} Y position
 */
KView.prototype.getYFromPX = function (px) {
    if (!this.rowDescription) { return -1 }
    const y = Math.abs(Math.floor((px - this.data.get('margin-top')) / this.data.get('entry-height')))
    if (y < 0 || y >= this.rowDescription.length) { return -1 }
    return y
}

KView.prototype.getObjectRowById = function (id) {
    for (let i = 0; i < this.rowDescription.length; i++) {
        if (!this.rowDescription[i]) { continue; }
        if (!this.rowDescription[i][1]) { continue; }
        if (String(this.rowDescription[i][1].id) === String(id)) {
            return i
        }
    }
    return -1
}

KView.prototype.getObjectRow = function (object) {
    return this.getObjectRowById(object.id)
}

KView.prototype.getRowObject = function (row) {
    if (!this.rowDescription) { return null }
    if (!this.rowDescription[row]) { return null }
    return this.rowDescription[row][1]
}

KView.prototype.bindObjectToRow = function (row, object) {
    row = parseInt(row)
    if (row < 0 || row >= this.rowDescription.length) { return }
    this.rowDescription[row][1] = object
}

KView.prototype.getEffectiveHeight = function () {
    let size = 0
    for (i = 0; i < this.rowDescription.length; i++) {
        if (this.rowDescription[i][0] > 0) { size++ }
    }
    return size
}

/* swap visual row */
KView.prototype.swapRow = function (y1, y2) {
    const idx = this.rowDescription[y1]
    this.rowDescription[y1] = this.rowDescription[y2]
    this.rowDescription[y1] = idx
}

/* gpos wrap around on X */
KView.prototype.getGPos = function (x, y) {
    y = this.getRowIndex(y)
    const gpos = x * this.get('entry-count') + y + (this.gridOffset * this.get('entry-count'))
    return gpos
}

KView.prototype.getCell = function (x, y) {
    if (!this.grid) { return null }
    return this.grid[this.getGPos(x, y)]
}

KView.prototype.getRelativeColFromDate = function (dateStart, log = false) {
    const origin = this.get('date-origin')
    const date = new Date()
    date.setTime(dateStart.getTime())
    const box = Math.round(((date.getTime() - origin.getTime()) / 86400000))
    if (box >= this.get('day-count')) { return Infinity }
    return isNaN(box) ? -1 : box
}

KView.prototype.getXFromDate = function (date) {
    const origin = this.get('date-origin')
    if (!(date instanceof Date)) { date = new Date(date) }
    date.setHours(12, 0, 0, 0)
    const x = Math.ceil((date.getTime() - origin.getTime()) / 86400000)
    return x
}

/* we use 12:00 when calculate date, we work at the day level so hour don't count */
KView.prototype.getCellFromDate = function (date, y) {
    return this.getCell(this.getXFromDate(date), y)
}

KView.prototype.getRowFromDates = function (dateStart, dateEnd, y) {
    const origin = this.get('date-origin')
    dateStart = new Date(dateStart.getTime())
    dateStart.setHours(12, 0, 0, 0)
    dateEnd = new Date(dateEnd.getTime())
    dateEnd.setHours(12, 0, 0, 0)
    const row = []
    let xs, xe

    xs = Math.round((dateStart.getTime() - origin.getTime()) / 86400000)
    xe = xs + Math.round((dateEnd.getTime() - dateStart.getTime()) / 86400000)

    for (let i = xs; i <= xe; i++) {
        row.push(this.getCell(i, y))
    }
    return row
}

/**
 * Get the top position of a given row.
 * @param {number|object} row Row object, ui object or id
 * @returns {number} Top position in pixels
 */
KView.prototype.getRowTop = function (row) {
    if (row instanceof KEntry) {
        row = row.id
    } else if (row instanceof KUIEntry) {
        row = row.dataObject.id
    }
    if (row < 0) { return -1 }
    const topPos = this.getRelativeRowY(row)
    if (topPos < 0) { return -1 }
    return this.data.get('margin-top') + (this.data.get('entry-height') * topPos)
}

KView.prototype.getViewRange = function () {
    return [this.gridOffset, this.gridOffset + this.get('day-count')]
}

KView.prototype.clearLeftCol = function () {
    for (let i = 0; i < this.get('entry-count'); i++) { 
        this.grid[i].clear() 
    }
}

KView.prototype.moveLeft = function () {
    for (let i = 0; i < this.grid.length - this.get('entry-count'); i++) {
        this.grid[i] = this.grid[i + this.get('entry-count')]
    }
}

KView.prototype.clearRightCol = function () {
    for (let i = this.grid.length - this.get('entry-count'); i < this.grid.length; i++) { 
        this.grid[i].clear() 
    }
}

KView.prototype.moveRight = function () {
    for (let i = this.grid.length - this.get('entry-count') - 1; i >= this.get('entry-count'); i--) {
        this.grid[i + this.get('entry-count')] = this.grid[i]
    }
    for (let i = 0; i < this.get('entry-count'); i++) {
        this.grid[i].day--
    }
}

KView.prototype.move = function (days) {
    if (!this.grid) { return }
    const dateOrigin = this.get('date-origin')
    dateOrigin.setTime(dateOrigin.getTime() - (days * 86400000))
    this.set('date-origin', dateOrigin)

    /* negative value add a row in front to create place for the new day in the futur 
     * positive value add a row at the back to create place for the new day in the past
     */

    const gridDays = Math.abs(days)
    if (days > 0) {
        if (-gridDays + this.gridOffset < 0) {
            const cellAdd = Math.abs(gridDays - this.gridOffset) * this.get('entry-count')
            for (i = 0; i < cellAdd; i++) {
                this.grid.unshift(new KViewCell())
            }
            this.gridOffset = 0
        } else {
            this.gridOffset -= gridDays
        }
        /* 365 is one year */
        while (this.grid.length > 365 * this.get('entry-count')) {
            for (i = 0; i < this.get('entry-count'); i++) {
                this.grid.pop()
            }
        }
    } else if (gridDays > 0) {
        const moveCell = gridDays * this.get('entry-count')
        if (this.gridOffset * this.get('entry-count') + this.get('day-count') * this.get('entry-count') + moveCell > this.grid.length) {
            const cellAdd = this.gridOffset * this.get('entry-count') + this.get('day-count') * this.get('entry-count') + moveCell - this.grid.length
            for (i = 0; i < cellAdd; i++) {
                this.grid.push(new KViewCell())
            }
        }
        this.gridOffset += gridDays
        /* 365 is one year */
        while (this.grid.length > 365 * this.get('entry-count')) {
            for (i = 0; i < this.get('entry-count'); i++) {
                this.grid.shift()
            }
        }
    }

    const range = this.getViewRange()
    const displacement = Math.abs(this.get('entry-count') * days * 2)
    range[1] = range[1] * this.get('entry-count')
    range[0] = range[0] * this.get('entry-count')
    return this.render([range[0] - displacement, range[1] + displacement])
}


KView.prototype._directRender = function (range = null) {
    if (!this.grid) { return }
    if (!range) {
        range = this.getViewRange()
        range[1] = range[1] * this.get('entry-count')
        range[0] = range[0] * this.get('entry-count')
    }
    const toUnrender = new Map()
    const toPlace = new Map()
    for (let i = range[0]; i <= range[1]; i++) {
        const cell = this.grid[i]
        if (!cell) { continue }
        let order = 0
        for (const [key, object] of cell.entries()) {        
            if(object.isDestroyed()) {
                toUnrender.set(object.get('id'), object)
                cell.delete(key)
                continue
            }
            const p = this.getRowObject(Math.round((i - (range[0]))  % this.get('entry-count')))
            if (!p) { continue }
            const uinode = object.getUINode()
            if (!uinode) { continue }
            if (typeof uinode.setStackMaxSize === 'function') {
                uinode.setStackMaxSize(cell.size) 
                uinode.setOrder(order)
            }
            if (!object.cell0) { object.cell0 = i }
            if (object.cell0 > i) { object.cell0 = i }
            if (!object.cellN) { object.cellN = i }
            if (object.cellN < i) { object.cellN = i }
            toPlace.set(object.get('id'), [p.KUI, object])
            toUnrender.set(object.get('id'), null)
            order++
        }
    }

    for (const [_, p] of toPlace) {
        const uinode = p[1].getUINode()
        if (uinode) {
            p[0].getDomNode()
            .then(domNode => {
                uinode.render(domNode).then(node => {
                    if (!node || !domNode) { return }
                    domNode.appendChild(node)    
                })
            })
            continue 
        }
        p[0].placeReservation(p[1])
        .then(uireservation => {
            if (!uireservation) { return }
            uireservation.render()
        })
    }


    for (const [_, o] of toUnrender) {
        if (!o) { continue }
        const ui = o.getUINode()
        if (ui) { ui.unrender() }
    }

    window.setTimeout(() => this._clearOutsideRange(range), 3)
}

KView.prototype.render = kdebounce(function (range) { this._directRender(range) }, 10)

KView.prototype._clearOutsideRange = function (range) {
    const toUnrender = new Map()
    for (let i = range[0] - 1; i >= 0; i--) {
        const cell = this.grid[i]
        if (!cell) { continue; }
        /* unrender outside range */
        for (const [key, object] of cell.entries()) {
            if (object.cell0 && object.cell0 !== i) { continue }
            if (object.cellN && object.cellN !== i) { continue }
            toUnrender.set(object.get('id'), object)
            if(object.isDestroyed()) {
                cell.delete(key)
            }        
        }
    }
    for (let i = range[1] + 1; i < this.grid.length; i++) {
        const cell = this.grid[i]
        if (!cell) { continue; }
        /* unrender outside range */
        for (const [key, object] of cell.entries()) {
            if (object.cell0 && object.cell0 !== i) { continue }
            if (object.cellN && object.cellN !== i) { continue }
            toUnrender.set(object.get('id'), object)
            if(object.isDestroyed()) {
                cell.delete(key)
            }        
        }
    }
    
    for (const [_, o] of toUnrender) {
        if (!o) { continue }
        const ui = o.getUINode()
        if (ui) { ui.unrender() }
    }
}

KView.prototype.resize = function () {
    this.compute()  
    return this._directRender()
}

KView.prototype.setMargins = function (top, right, bottom, left) {
    this.data.set('margin-left', left)
    this.data.set('margin-right', right)
    this.data.set('margin-top', top)
    this.data.set('margin-bottom', bottom)
}

KView.prototype.set = function (name, value) {
    return this.data.set(name, value)
}

KView.prototype.get = function (name) {
    switch(name) {
        case 'date-end':
            return (() => { 
                const d = new Date()
                d.setTime(this.data.get('date-origin').getTime() + (this.get('day-count') * 86400000))
                return d
            })()
        case 'date-origin':
            return (() => {
                const d = new Date()
                d.setTime(this.data.get(name).getTime())
                return d
            })()
        default: 
            return this.data.get(name)
    }
}

KView.prototype.setOrigin = function (date) {
    date.setHours(12, 0, 0, 0)
    this.data.set('date-origin', date)
}

KView.prototype.setDayCount = function (days) {
    this.data.set('day-count', days)
    this.compute()
}

KView.prototype.setViewportWidth = function (width) {
    this.data.set('viewport-width', width)
    this.compute()
}

KView.prototype.setViewportHeight = function (height) {
    this.data.set('viewport-height', height)
    this.compute()
}

KView.prototype.setViewport = function (width, height) {
    this.data.set('viewport-width', width)
    this.data.set('viewport-height', height)
    this.compute()
}

KView.prototype.setEntryHeight = function (height) {
    this.data.set('entry-height', height)
    this.compute()
}

KView.prototype.setEntryInnerHeight = function (height) {
    this.data.set('entry-inner-height', height)
    this.compute()
}

KView.prototype.setEntryCount = function (entries) {
    this.data.set('entry-count', entries)
    this.compute()
}

KView.prototype.computeXBox = function (xpos) {
    return Math.floor((xpos - this.get('margin-left')) / this.data.get('day-width'))
}

KView.prototype.handleMouseMove = function () {
    if (!this.mouseHandlerRun) { return }
    const marginLeft = this.data.get('margin-left') || 0
    const marginRight = this.data.get('margin-right') || 0

    const previousBox = [this.currentBox[0], this.currentBox[1]]
    const currentBox = [-1, -1]
    let changedBox = [false, false]
    const start = performance.now()
    new Promise(resolve => {
        if (KAIROS.mouse.clientX > marginLeft && KAIROS.mouse.clientX < window.innerWidth - marginRight) {
            const xpos = (KAIROS.mouse.clientX + window.scrollX) - marginLeft
            currentBox[0] = parseInt(Math.trunc(xpos / this.data.get('day-width')))
        }
        
        currentBox[1] = this.getYFromPX(KAIROS.mouse.clientY + window.scrollY)

        if (currentBox[0] !== this.currentBox[0]) {
            changedBox[0] = true
            this.currentBox[0] = currentBox[0]
            this.eventTarget.dispatchEvent(new CustomEvent('LeaveColumn', {detail: {currentColumn: this.currentBox[0], previousColumn: previousBox[0]}}))
        }

        if (currentBox[1] !== this.currentBox[1]) {
            changedBox[1] = true
            this.currentBox[1] = currentBox[1]
            this.eventTarget.dispatchEvent(new CustomEvent('LeaveRow', {detail: {currentRow: this.currentBox[1], previousRow: previousBox[1]}}))
        }

        if (currentBox[0] > -1 && currentBox[1] > -1) {
            if (changedBox[1] && currentBox[1] != previousBox[1]) { this.eventTarget.dispatchEvent(new CustomEvent('EnterRow', {detail: {currentRow: this.currentBox[1], previousRow: previousBox[1]}})) }
            if (changedBox[0] && currentBox[0] != previousBox[0]) { this.eventTarget.dispatchEvent(new CustomEvent('EnterColumn', {detail: {currentColumn: this.currentBox[0], previousColumn: previousBox[0]}})) }
        }
        resolve()
    })
    .then(_ => {
        const duration = performance.now() - start
        setTimeout(this.handleMouseMove.bind(this), 100 - duration)
        return
    })
}

KView.prototype.handleKeyMove = function (event) {
    if (
        event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLFormElement ||
        event.target instanceof HTMLSelectElement
       ) 
    {
        return  
    }
    const nextBox = [0, 0]
    switch (event.key) {
        default: return
        case 'Down':
        case 'ArrowDown':
            if (event.shiftKey) {
                nextBox[1] = Math.round(this.get('entry-count') / 3)
            } else {
                nextBox[1] = 1
            }
            event.preventDefault()
            break
        case 'Up':
        case 'ArrowUp':
            if (event.shiftKey) {
                nextBox[1] = -Math.round(this.get('entry-count') / 3)
            } else {
                nextBox[1] = -1
            }
            event.preventDefault()
            break
        case 'Left':
        case 'ArrowLeft':
            event.preventDefault()
            if (event.shiftKey) {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: -7}}))
            } else {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: -3}}))
            }
            break
        case 'Right':
        case 'ArrowRight':
            event.preventDefault()
            if (event.shiftKey) {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: 7}}))
            } else {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: 3}}))
            }
            break
        case 'PageUp':
            return
        case 'PageDown':
            return
        case 'End':
            event.preventDefault()
            nextBox[1] = this.get('entry-count') - 1 - this.currentBox[1]
            break
        case 'Home':
            event.preventDefault()
            nextBox[1] = -this.currentBox[1]
            break
    }
    this.stopMouseHandler()
    if (!this.currentBox[0]) { this.currentBox[0] = 0 }
    if (!this.currentBox[1]) { this.currentBox[1] = 0 }
    this.currentBox[0] += nextBox[0]
    this.currentBox[1] += nextBox[1]
    if (this.currentBox[0] < 0) { this.currentBox[0] = this.get('day-count') - 1 }
    if (this.currentBox[1] < 0) { this.currentBox[1] = this.get('entry-count') - 1 }

    if (this.currentBox[0] > this.get('day-count') - 1) {
        this.currentBox[0] = 0
    }

    
    if (this.currentBox[1] > this.get('entry-count') - 1) {
        this.currentBox[1] = 0
    }

    if (this.currentBox[1] < 0) {
        this.currentBox[1] = this.get('entry-count') -1 
    }

    const pxYPos = this.currentBox[1] * this.get('entry-height') + this.get('margin-top')
    if ( pxYPos > document.documentElement.clientHeight + window.scrollY - this.get('entry-height') || pxYPos < window.scrollY + this.get('entry-height')) {
        let scrollY = this.currentBox[1] / 2 * this.get('entry-height') + this.get('margin-top')
        if (scrollY < document.documentElement.clientHeight / 2) {
            scrollY = 0
        }
        window.scroll(0, scrollY)
    }
    
    this.eventTarget.dispatchEvent(new CustomEvent('LeaveRow', {detail: {currentRow: this.currentBox[1], previousRow: this.currentBox[1] - nextBox[1]}}))
    this.eventTarget.dispatchEvent(new CustomEvent('EnterRow', {detail: {currentRow: this.currentBox[1], previousRow: this.currentBox[1] - nextBox[1]}}))
    this.eventTarget.dispatchEvent(new CustomEvent('LeaveColumn', {detail: {currentColumn: this.currentBox[0], previousColumn: this.currentBox[0] - nextBox[0]}}))
    this.eventTarget.dispatchEvent(new CustomEvent('EnterColumn', {detail: {currentColumn: this.currentBox[0], previousColumn: this.currentBox[0] - nextBox[0]}}))
}

KView.prototype.getCurrentBox = function () {
    return {x: this.currentBox[0], y: this.getRowIndex(this.currentBox[1])}
}

KView.prototype.getCurrentGridBox = function () {
    return {
        x: this.currentBox[0] + this.gridOffset, 
        y: this.getRowIndex(this.currentBox[1]), 
        flat: ((this.currentBox[0] + this.gridOffset) * this.get('entry-count')) + this.getY(this.currentBox[1])}
}

/* x and y hint where object is about so we don't search the whole array */
KView.prototype.getAllCellForObject = function (id, x, y) {
    const cells = []
    while (x >= 0) {
        const cell = this.getCell(x--, y)
        if (!cell.has(id)) { break }
        cells.push(cell)
    }
    while (x < this.cell.length) {
        const cell = this.getCell(++x, y)
        if (!cell.has(id)) { break }
        cells.push(cell)
    }
    return cells
}

KView.prototype.findObjectOnGrid = function (id) {
    let firstFound = false
    const cells = []
    for (const cell of this.grid) {
        if (!cell.has(id) && firstFound) { break }
        if (cell.has(id)) {
            firstFound = true
            cells.push(cell)
        }
    }
}

KView.prototype.setObjectOnGrid = function (id, object, x0, x1, y) {
    for (; x0 <= x1; x0++) {
        const cell = this.getCell(x0, y)
        cell.set(id, object)
    }
}

KView.prototype.getObjectsOnGrid = function (x, y) {
    const cell = this.getCell(x, y)
    return cell.entries()
}

KView.prototype.removeObject = function (id) {
    let firstFound = false
    for (const cell of this.grid) {
        if (!cell.has(id) && firstFound) { break }
        if (cell.has(id)) {
            firstFound = true
            cell.delete(id)
        }
    }
}

KView.prototype.removeObjectOnGrid = function (id, x, y) {
    const cells = this.getAllCellForObject(id, x, y)
    if (cells.length <= 0) { return }
    for(const cell of cells) {
        cell.delete(id)
    }
}

KView.prototype.moveObjectOnGrid = function (id, srcX, srcY, destX, destY) {
    const cells = this.getAllCellForObject(id, srcX, srcY)
    if (cells.length <= 0) { return }
    const object = cells[0].get(id)
    const length = cells.length;
    this.removeObjectOnGrid(id, srcX, srcY)
    this.setObjectOnGrid(id, object, destX, destX + length, destY)
}