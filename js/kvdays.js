const KVDays = Object.freeze({
    Hs: 3600, // hours in seconds
    H: 3600000,
    D: 86400000,
    dec2HM (dec) {
        const H = Math.trunc(dec)
        return [H, Math.round((dec - H) * 60)]
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
            
            {
                const  [endH, endM] = this.dec2HM(dayTime[0][0])
                realEnd.setTime(nextDay.getTime())
                realEnd.setHours(endH, endM, 0, 0)
            }

            /* insert holidays and all here */

            /* chunks === null -> no time slot available for this day, forward 24h */
            let endAt
            for (const chunk of dayTime) {
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
            realEnd.setHours(endH, endM, 0, 0)
            nextDay.setTime(realEnd.getTime() + this.D)
        }
        // effectiveDuration is in second
        return [realEnd, effectiveDuration * this.Hs]
    },
    getRanges (begin, duration, conf) {
        let day0Conf = conf[begin.getDay()]
        while (day0Conf.chunks === null) {
            begin.setTime(begin.getTime() + this.D)
            day0Conf = conf[begin.getDay()]
        }
        ranges = []
        do {
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
                begin.setTime(end.getTime())
                do {
                    begin.setTime(begin.getTime() + this.D)
                } while (conf[begin.getDay()].chunks === null)
            }
        } while (duration > 0)
        return ranges.reverse() // reverse so reservations number follow chronological order
    }
})