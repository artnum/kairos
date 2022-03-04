  const TimeUtils = {
    toHourString (seconds) {
        let hours = Math.floor(seconds / 3600)
        let minutes = Math.floor((seconds / 60) - (hours * 60))
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    },
    toDateString (date) {
        const object = new Date(date)
        return object.toLocaleDateString()
    },
    fromDateString (string) {
      return string
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
    }
}