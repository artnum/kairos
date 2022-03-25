const KVDays = Object.freeze({
    Hs: 3600, // hours in seconds
    H: 3600000,
    D: 86400000,
    holidays: new Holiday(new Date().getFullYear()), // init with current year
    dec2HM (dec) {
        const H = Math.trunc(dec)
        return [H, Math.round((dec - H) * 60)]
    },
    HM2dec (h, m) {
        return h + (m / 60)
    },
    getChunksFromDay (day, conf) {
        const chunks = []
        const dayTime = conf[day.getDay()]
        const dayHour = this.HM2dec(day.getHours(), day.getMinutes())
        let chunkStarted = false
        if (dayTime.chunks === null) { return chunks }
        for (const chunk of dayTime.chunks) {
            if (chunkStarted) { chunks.push(chunk)}
            if (dayHour >= chunk[0] && dayHour <= chunk[1]) {
                if (dayHour !== chunk[1]) { chunks.push([dayHour,chunk[1]]) }
                chunkStarted = true
            }
        }
        return chunks
    },
    getChunksUpToDay (day, conf) {
        const chunks = []
        const dayTime = conf[day.getDay()]
        const dayHour = this.HM2dec(day.getHours(), day.getMinutes())
        for (const chunk of dayTime) {
            if (dayHour >= chunk[0] && dayHour <= chunk[1]) {
                if (dayHour !== chunk[0]) { chunks.push([chunk[0], dayHour]) }
            } else {
                chunks.push(chunk)
            }
        }
        return chunks
    },
    getDurationForChunks (chunks) {
        let duration = 0
        for (const chunk of chunks) {
            duration += chunk[1] - chunk[0]
        }
        return duration * this.Hs
    },
    initDayStartTime (day, conf) {
        const dayTime = conf[day.getDay()]
        if (dayTime.chunks === null) { day.setHours(24, 0, 0, 0); return day }
        const [h, m] = this.dec2HM(dayTime.chunks[0][0])
        day.setHours(h, m, 0, 0)
        return day
    },
    getEnd (begin, duration, conf) {
        let effectiveDuration = 0
        const realEnd = new Date()
        const nextDay = new Date()
        nextDay.setTime(begin.getTime())
        while (duration > 0) {
            const dayConf = conf[nextDay.getDay()]
            let dayTime = dayConf.chunks
            if (dayTime === null) { break }
            if(this.holidays.isHolidayInAnyOf(nextDay, KAIROS.holidays)) { break }

            /* chunks === null -> no time slot available for this day, forward 24h */
            let endAt
            for (const chunk of this.getChunksFromDay(nextDay, conf)) {
                lastChunk = chunk
                let timeAv = chunk[1] - chunk[0]
                if (duration <= timeAv) {
                    timeAv = duration                            
                }
                if(duration - timeAv <= dayConf.round) {
                    timeAv = duration
                }
                endAt = chunk[0] + timeAv
                duration -= timeAv
                effectiveDuration += timeAv
                if (duration <= 0) { break }
            }

            const [endH, endM] = this.dec2HM(endAt)
            realEnd.setTime(nextDay.getTime())
            realEnd.setHours(endH, endM, 0, 0)
            nextDay.setTime(realEnd.getTime() + this.D)
            this.initDayStartTime(nextDay, conf)
        }
        // effectiveDuration is in second
        return [realEnd, effectiveDuration * this.Hs]
    },
    getContinuousEnd (begin, duration, conf) {
        let effectiveDuration = 0
        const realEnd = new Date()
        const nextDay = new Date()
        const startHour = this.HM2dec(begin.getHours(), begin.getMinutes())
        nextDay.setTime(begin.getTime())
        while (duration > 0) {
            const dayConf = conf[nextDay.getDay()]
            let dayTime = dayConf.chunks
            if (dayTime === null) { nextDay.setTime(nextDay.getTime() + this.D); continue }
            if(this.holidays.isHolidayInAnyOf(nextDay, KAIROS.holidays)) { nextDay.setTime(nextDay.getTime() + this.D); continue }     
            {
                const  [endH, endM] = this.dec2HM(dayTime[0][0])
                realEnd.setTime(nextDay.getTime())
                realEnd.setHours(endH, endM, 0, 0)
            }

            /* chunks === null -> no time slot available for this day, forward 24h */
            let endAt
            let lastChunk
            for (const chunk of dayTime) {
                lastChunk = chunk
                if (chunk[1] < startHour) { continue; }
                if (startHour < chunk[0]) { continue; }
                let timeAv = chunk[1] - startHour
                if (duration <= timeAv) {
                    timeAv = duration                            
                }
                if(duration - timeAv <= dayConf.round) {
                    timeAv = duration
                }
                endAt = startHour + timeAv
                duration -= timeAv
                effectiveDuration += timeAv
                if (duration <= 0) { break }
            }
            if (!endAt) {
                let timeAv = lastChunk[1] - startHour
                if (duration <= timeAv) {
                    timeAv = duration                            
                }
                if(duration - timeAv <= dayConf.round) {
                    timeAv = duration
                }
                endAt = startHour + timeAv
                duration -= timeAv
                effectiveDuration += timeAv
            }
            const [endH, endM] = this.dec2HM(endAt)
            realEnd.setHours(endH, endM, 0, 0)
            nextDay.setTime(realEnd.getTime() + this.D)
        }
        // effectiveDuration is in second
        return [realEnd, effectiveDuration * this.Hs]
    },
    getRanges (begin, duration, conf) {
        const skipDays = (begin) => {
            let isHoliday = false
            let isCloseDay = false

            do {
                isHoliday = false
                while (this.holidays.isHolidayInAnyOf(begin, KAIROS.holidays)) {
                    isHoliday = true
                    begin.setTime(begin.getTime() + this.D)
                }
                
                isCloseDay = false
                let day0Conf = conf[begin.getDay()]
                while (day0Conf.chunks === null) {
                    isCloseDay = true
                    begin.setTime(begin.getTime() + this.D)
                    day0Conf = conf[begin.getDay()]
                }
            } while (isHoliday || isCloseDay)
            return begin.getTime()
        }

        ranges = []
        do {
            begin.setTime(skipDays(begin))
            const day0Conf = KAIROS.days[begin.getDay()]

            const [beginH, beginM] = this.dec2HM(day0Conf.chunks[0][0])
            begin.setHours(beginH, beginM, 0, 0)

            const [end, effDuration] = this.getEnd(begin, duration, conf)

            const rBegin = new Date()
            rBegin.setTime(begin.getTime())
            const rEnd = new Date()
            rEnd.setTime(end.getTime())
            ranges.push([rBegin, rEnd, effDuration])
            duration  -= effDuration / this.Hs
            if (duration > 0) {
                begin.setTime(end.getTime() + this.D)
            }
        } while (duration > 0)
        return ranges.reverse() // reverse so reservations number follow chronological order
    }
})