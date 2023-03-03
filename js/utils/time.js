  const TimeUtils = {
    dateFromHourString (string, date = new Date()) {
      if (string.trim().length === 3) {
        const subMilitaryRegexp = /\s*([0-9]{1})([0-9]{2})/
        if (subMilitaryRegexp.test(string)) {
          const subMValue = subMilitaryRegexp.exec(string)
          const submH = Number(subMValue[1])
          const submM = Number(subMValue[2])
          if (submH <= 24 && submM <= 60) {
            date.setHours(submH)
            date.setMinutes(submM)
            date.setSeconds(0)
            return date
          }
        }
      }
      if (string.trim().length === 4) {
        const militaryRegexp = /\s*([0-9]{2})([0-9]{2})/
        if (militaryRegexp.test(string)) {
          const mValue = militaryRegexp.exec(string)
          const mH = Number(mValue[1])
          const mM = Number(mValue[2])
          if (mH <= 24 && mM <= 60) {
            date.setHours(mH)
            date.setMinutes(mM)
            date.setSeconds(0)
            return date
          }
        }
      }
      const rExp = /\s*([0-9]*)\s*[h.:,-/\s]?\s*([0-9]*)/
      if (!rExp.test(string)) { return new Date(undefined) }
      const value = rExp.exec(string)
      const h = Number(value[1])
      const m = Number(value[2])
      if (h > 24) { return new Date(undefined) }
      if (m > 60) { return new Date(undefined) }
      date.setHours(h)
      date.setMinutes(m)
      date.setSeconds(0)
      return date
    },
    dateToHourString (date) {
      const object = date instanceof Date ? date : new Date(date)
      if (isNaN(object.getTime())) { return '' }
      return `${String(object.getHours()).padStart(2, '0')}:${String(object.getMinutes()).padStart(2, '0')}`
    },
    toHourString (seconds) {
        let hours = Math.floor(seconds / 3600)
        let minutes = Math.floor((seconds / 60) - (hours * 60))
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    },
    toDateString (date) {
        if (!date) { return '' }
        const object = date instanceof Date ? date : new Date(date)
        if (isNaN(object.getTime())) { return '' }

        return `${String(object.getDate()).padStart(2, '0')}.${String(object.getMonth() + 1).padStart(2, '0')}.${object.getFullYear()}`
    },
    fromDateString (string, origin = new Date()) {
      const EUMonths = {
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

      const dateReg = /^\s*([0-9]+)\s*[\.\/\-]?\s*([0-9]+|[a-zäéû]+)\s*[\.\/\-]?\s*([0-9]+)?\s*$/gi
      let date = dateReg.exec(string)
      if (date !== null) {
          if (date) {
              let d = parseInt(date[1])
              let m = parseInt(date[2])
              if (isNaN(m)) {
                  date[2] = date[2].toLocaleLowerCase()
                  if (EUMonths[date[2]] !== undefined) {
                      m = EUMonths[date[2]]
                  } else {
                      for(let month in EUMonths) {
                          if (month.indexOf(date[2]) === 0) {
                              m = EUMonths[month]
                              break
                          }
                      }
                  }
              }
              let y = (new Date()).getFullYear()
              if (date[3] !== undefined) {
                  y = parseInt(date[3])
                  if (date[3].length < 4) {
                      y += 2000
                  }
              }
              return new Date(y, m - 1, d, 12, 0, 0, 0)
          }
      } else {
        return new Date(undefined)
      }
    },
    fromHourString (value) {
        const rExp = /\s*([0-9]*)\s*(?:(?:([m|M]|[h|H]){1}\s*([0-9]*))|(?:([.:,]{1})\s*([0-9]*))){0,1}\s*/
        let intValue
        if (rExp.test(value)) {
          value = rExp.exec(value)
          if (!value[2] && !value[4]) {
            intValue = Number(value[1])
          } else if (String(value[2]).toLowerCase() === 'h' || String(value[2]).toLowerCase() === 'm') {
            intValue = Number(value[1]) * Number(String(value[2]).toLowerCase() === 'h' ? 60 : 1)
            if (String(value[2]).toLowerCase() === 'h' && value[3]) {
              if (value[3].length === 1) {
                value[3] += '0'
              } else if (value[3].length > 2) {
                value[3] = value[3].substr(0, 2)
              }
              intValue += Number(value[3])
            }
          } else {
            intValue = Number(value[1]) * 60
            if (value[5].length === 1) {
              value[5] += '0'
            } else if (value[5].length > 2) {
              value[5] = value[5].substr(0, 2)
            }
            switch (value[4]) {
              case ':':
                if (value[5]) {
                  intValue += Number(value[5])
                }
                break
              case ',': case '.':
                if (value[5]) {
                  intValue += 0.6 * Number(value[5])
                }
                break
            }
          }
        }
        return intValue * 60
    },
    // from https://weeknumber.com/how-to/javascript
    getWeekNumber (day) {
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
}