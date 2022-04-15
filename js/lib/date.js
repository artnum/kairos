function KDate () {
    switch(arguments.length) {
        case 0: this.date = new Date(); break
        case 1: this.date = new Date(arguments[0]); break
        case 2: this.date = new Date(arguments[0], arguments[1]); break
        case 3: this.date = new Date(arguments[0], arguments[1], arguments[2]); break
        case 4: this.date = new Date(arguments[0], arguments[1], arguments[2], arguments[3]); break
        case 5: this.date = new Date(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break
        case 6: this.date = new Date(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]); break
        case 7: this.date = new Date(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]); break
    }
}

/* italian, french, german, english month name for parsing */
KDate.EUMonths = {
    'gennaio': 1,
    'janvier': 1,
    'january': 1,
    'januar': 1,
    'febbraio': 2,
    'fevrier': 2,
    'février': 2,
    'february': 2,
    'feburar': 2,
    'marzo': 3,
    'mars': 3,
    'march': 3,
    'marz': 3,
    'märz': 3,
    'aprile': 4,
    'avril': 4,
    'april': 4,
    'maggio': 5,
    'mai': 5,
    'may': 5,
    'guigno': 6,
    'juin': 6,
    'june': 6,
    'juni': 6,
    'luglio': 7,
    'juillet': 7,
    'july': 7,
    'juli': 7,
    'agosto': 8,
    'aout': 8,
    'août': 8,
    'august': 8,
    'settembre': 9,
    'septembre': 9,
    'september': 9,
    'ottobre': 10,
    'octobre': 10,
    'october': 10,
    'oktober': 10,
    'novembre': 11,
    'november': 11,
    'dicembre': 12,
    'decembre': 12,
    'décembre': 12,
    'dezember': 12,
    'december': 12
}

KDate.now = function () {
    const kd = new KDate()
    kd.date = Date.now()
    return kd
}

KDate.parse = function (str) {
    const kd = new KDate()
    kd.date = Date.parse(str)
    return kd
}

KDate.UTC = function () {
    const kd = new KDate()
    switch(arguments.length) {
        case 1: kd.date = Date.UTC(arguments[0]); break
        case 2: kd.date = Date.UTC(arguments[0], arguments[1]); break
        case 3: kd.date = Date.UTC(arguments[0], arguments[1], arguments[2]); break
        case 4: kd.date = Date.UTC(arguments[0], arguments[1], arguments[2], arguments[3]); break
        case 5: kd.date = Date.UTC(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break
        case 6: kd.date = Date.UTC(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]); break
        case 7: kd.date = Date.UTC(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]); break
    }
    return kd
}

KDate.fromDate = function (date) {
    const kd = new KDate()
    kd.date = new Date()
    kd.date.setTime(date.getTime())
    return kd
}

KDate.easter = function (year) {
    year = parseInt(year)
    const C = Math.floor(year / 100)
    const N = year - 19 * Math.floor(year / 19)
    const K = Math.floor((C - 17) / 25)
    let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15
    I = I - 30 * Math.floor((I / 30))
    I = I - Math.floor(I / 28) * (1 - Math.floor(I / 28) * Math.floor(29 / (I + 1)) * Math.floor((21 - N) / 11))
    let J = year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4)
    J = J - 7 * Math.floor(J / 7)
    const L = I - J
    const month = 3 + Math.floor((L + 40) / 44)
    const day = L + 28 - 31 * Math.floor(month / 4)

    return new KDate(year, month - 1, day, 12, 0, 0)
}

KDate.prototype.compare = function (date, what = 'datetime') {
    switch (what) {
        default:
        case 'datetime':
            return (() => {
                const d = this.date.getTime() - date.getTime()
                if (d < 0) { return -1 }
                if (d > 0) { return 1 }
                return 0
            })()
        case 'date':
            return (() => {
                const v1 = this.date.getFullYear() * 365 + (this.date.getMonth() + 1) * 31 + this.date.getDate()
                const v2 = date.getFullYear() * 365 + (date.getMonth() + 1) * 31 + date.getDate()
                const d = v1 - v2
                if (d < 0) { return -1 }
                if (d > 0) { return 1 }
                return 0            
            })()
        case 'time':
            return (() => {
                const v1 = (this.date.getHours() * 1440 + this.date.getMinutes()  * 60 + this.date.getSeconds() + this.date.getTimezoneOffset() * 60) * 1000 + this.date.getMilliseconds()
                const v2 = (date.getHours() * 1440 + date.getMinutes()  * 60 + date.getSeconds() + date.getTimezoneOffset() * 60) * 1000 + date.getMilliseconds()
                const d = v1 - v2
                if (d < 0) { return -1 }
                if (d > 0) { return 1 }
                return 0
            })
    }
}

KDate.prototype.difference = function (date, what = 'day') {
    const diff = this.getTime() - date.getTime()
    switch(what) {
        default:
        case 'millisecond': return diff
        case 'second': return Math.round(diff / 1000)
        case 'minute': return Math.round(diff / 60000)
        case 'hour': return Math.round(diff / 3600000)
        case 'day': return Math.round(diff / 86400000)
        case 'month': return this.getMonth() - date.getMonth() + (12 * (this.getFullYear() - date.getFullYear()))
        case 'year': return this.getFullYear() - date.getFullYear()
    }
}

/* *** From https://weeknumber.net/how-to/javascript *** */
KDate.prototype.getWeek = function () {
    var date = new Date(this.getTime())
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
    var week1 = new Date(date.getFullYear(), 0, 4)
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

KDate.prototype.getWeekYear = function () {
    var date = new Date(this.getTime())
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
    return date.getFullYear()
}

/* *** From myself *** */
/* join date part with hour part and return a new date */
KDate.prototype.join = function (hour) {
    var date = new KDate(this.getTime())

    date.setHours(hour.getHours())
    date.setMinutes(hour.getMinutes())
    date.setSeconds(hour.getSeconds())
    date.setMilliseconds(hour.getMilliseconds())

    return date
}

KDate.prototype.hours = function () {
    return this.getHours() + (this.getMinutes() / 60) + (this.getSeconds() / 60 / 60)
}

KDate.prototype.shortDate = function (prefix = false) {
    if (!prefix) {
        return `${String(this.getDate())}.${String(this.getMonth() + 1)}`
    } else {
        return `${String(this.getDate()).padStart(2, '0')}.${String(this.getMonth() + 1).padStart(2, '0')}`
    }
}

KDate.prototype.fullDate = function () {
    return `${String(this.getDate()).padStart(2, '0')}.${String(this.getMonth() + 1).padStart(2, '0')}.${String(this.getFullYear())}`
}

KDate.prototype.dateStamp = function () {
    return `${String(this.getFullYear())}-${String(this.getMonth() + 1).padStart(2, '0')}-${String(this.getDate()).padStart(2, '0')}`
}

KDate.prototype.longDate = function () {
    const day = new Intl.DateTimeFormat(undefined, {weekday: 'short'}).format(this.date)
    return `${day} ${this.fullDate()}`

}

KDate.prototype.join = function (time) {
    const joined = KDate.fromDate(this.date)
    joined.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds())
    return joined
}

KDate.prototype.shortHour = function () {
    var h = this.getHours()
    var m = this.getMinutes()
    if (h < 10) { h = '0' + h }
    if (m < 10) { m = '0' + m }
    return h + ':' + m
}

KDate.EUParse = function (txt, origin = null) {
    const durationReg = /^\s*([0-9]+)\s*(ja|j|s|m|a|d|y|w|g|t)?\s*$/gi
    const dateReg = /^\s*([0-9]+)\s*[\.\/\-]?\s*([0-9]+|[a-zäéû]+)\s*[\.\/\-]?\s*([0-9]+)?\s*$/gi
    let duration = durationReg.exec(txt)
    let date = dateReg.exec(txt)
    if (date !== null && duration === null) {
        if (date) {
            let d = parseInt(date[1])
            let m = parseInt(date[2])
            if (isNaN(m)) {
                date[2] = date[2].toLocaleLowerCase()
                if (KDate.EUMonths[date[2]] !== undefined) {
                    m = KDate.EUMonths[date[2]]
                } else {
                    for (let month in KDate.EUMonths) {
                        if (month.indexOf(date[2]) === 0) {
                            m = KDate.EUMonths[month]
                            break
                        }
                    }
                }
            }
            let y = (new KDate()).getFullYear()
            if (date[3] !== undefined) {
                y = parseInt(date[3])
                if (date[3].length < 4) {
                    y += 2000
                }
            }
            return new KDate(y, m - 1, d)
        }
    } else if (duration !== null) {
        if (!origin) {
            origin = new Date()
        }
        if (duration[2] === undefined) {
            duration[2] = 'j'
        }
        switch (duration[2].toLowerCase()) {
            // Jour or Day
            case 'j':
            case 'd':
            case 't':
            case 'g':
                return new KDate(origin.getFullYear(), origin.getMonth(), origin.getDate() + parseInt(duration[1]))
            // Semaine or Week
            case 's':
            case 'w':
                return new KDate(origin.getFullYear(), origin.getMonth(), origin.getDate() + (parseInt(duration[1]) * 7))
            // Mois or Month
            case 'm':
                return new KDate(origin.getFullYear(), origin.getMonth() + parseInt(duration[1]), origin.getDate())
            // An or Year
            case 'a':
            case 'y':
            case 'ja':
                return new KDate(origin.getFullYear() + parseInt(duration[1]), origin.getMonth(), origin.getDate())
        }
    } else {
        return new KDate(undefined)
    }
}


KDate.prototype.getDate = function () {
    return this.date.getDate.apply(this.date, arguments)
}
KDate.prototype.getDay = function () {
    return this.date.getDay.apply(this.date, arguments)
}
KDate.prototype.getFullYear = function () {
    return this.date.getFullYear.apply(this.date, arguments)
}
KDate.prototype.getHours = function () {
    return this.date.getHours.apply(this.date, arguments)
}
KDate.prototype.getMilliseconds = function () {
    return this.date.getMilliseconds.apply(this.date, arguments)
}
KDate.prototype.getMinutes = function () {
    return this.date.getMinutes.apply(this.date, arguments)
}
KDate.prototype.getMonth = function () {
    return this.date.getMonth.apply(this.date, arguments)
}
KDate.prototype.getSeconds = function () {
    return this.date.getSeconds.apply(this.date, arguments)
}
KDate.prototype.getTime = function () {
    return this.date.getTime.apply(this.date, arguments)
}
KDate.prototype.getTimezoneOffset = function () {
    return this.date.getTimezoneOffset.apply(this.date, arguments)
}
KDate.prototype.getUTCDate = function () {
    return this.date.getUTCDate.apply(this.date, arguments)
}
KDate.prototype.getUTCDay = function () {
    return this.date.getUTCDay.apply(this.date, arguments)
}
KDate.prototype.getUTCFullYear = function () {
    return this.date.getUTCFullYear.apply(this.date, arguments)
}
KDate.prototype.getUTCHours = function () {
    return this.date.getUTCHours.apply(this.date, arguments)
}
KDate.prototype.getUTCMilliseconds = function () {
    return this.date.getUTCMilliseconds.apply(this.date, arguments)
}
KDate.prototype.getUTCMinutes = function () {
    return this.date.getUTCMinutes.apply(this.date, arguments)
}
KDate.prototype.getUTCMonth = function () {
    return this.date.getUTCMonth.apply(this.date, arguments)
}
KDate.prototype.getUTCSeconds = function () {
    return this.date.getUTCSeconds.apply(this.date, arguments)
}
KDate.prototype.getYear = function () {
    return this.date.getYear.apply(this.date, arguments)
}
KDate.prototype.setDate = function () {
    return this.date.setDate.apply(this.date, arguments)
}
KDate.prototype.setFullYear = function () {
    return this.date.setFullYear.apply(this.date, arguments)
}
KDate.prototype.setHours = function () {
    return this.date.setHours.apply(this.date, arguments)
}
KDate.prototype.setMilliseconds = function () {
    return this.date.setMilliseconds.apply(this.date, arguments)
}
KDate.prototype.setMinutes = function () {
    return this.date.setMinutes.apply(this.date, arguments)
}
KDate.prototype.setMonth = function () {
    return this.date.setMonth.apply(this.date, arguments)
}
KDate.prototype.setSeconds = function () {
    return this.date.setSeconds.apply(this.date, arguments)
}
KDate.prototype.setTime = function () {
    return this.date.setTime.apply(this.date, arguments)
}
KDate.prototype.setUTCDate = function () {
    return this.date.setUTCDate.apply(this.date, arguments)
}
KDate.prototype.setUTCFullYear = function () {
    return this.date.setUTCFullYear.apply(this.date, arguments)
}
KDate.prototype.setUTCHours = function () {
    return this.date.setUTCHours.apply(this.date, arguments)
}
KDate.prototype.setUTCMilliseconds = function () {
    return this.date.setUTCMilliseconds.apply(this.date, arguments)
}
KDate.prototype.setUTCMinutes = function () {
    return this.date.setUTCMinutes.apply(this.date, arguments)
}
KDate.prototype.setUTCMonth = function () {
    return this.date.setUTCMonth.apply(this.date, arguments)
}
KDate.prototype.setUTCSeconds = function () {
    return this.date.setUTCSeconds.apply(this.date, arguments)
}
KDate.prototype.setYear = function () {
    return this.date.setYear.apply(this.date, arguments)
}
KDate.prototype.toDateString = function () {
    return this.date.toDateString.apply(this.date, arguments)
}
KDate.prototype.toGMTString = function () {
    return this.date.toGMTString.apply(this.date, arguments)
}
KDate.prototype.toISOString = function () {
    return this.date.toISOString.apply(this.date, arguments)
}
KDate.prototype.toJSON = function () {
    return this.date.toJSON.apply(this.date, arguments)
}
KDate.prototype.toLocaleDateString = function () {
    return this.date.toLocaleDateString.apply(this.date, arguments)
}
KDate.prototype.toLocaleTimeString = function () {
    return this.date.toLocaleTimeString.apply(this.date, arguments)
}
KDate.prototype.toLocaleString = function () {
    return this.date.toLocaleString.apply(this.date, arguments)
}
KDate.prototype.toString = function () {
    return this.date.toString.apply(this.date, arguments)
}
KDate.prototype.toTimeString = function () {
    return this.date.toTimeString.apply(this.date, arguments)
}
KDate.prototype.toUTCString = function () {
    return this.date.toUTCString.apply(this.date, arguments)
}

KDate.prototype.valueOf = function () {
    return this.date.valueOf.apply(this.date, arguments)
}