function compareDate (a, b) {
  let _a = new Date(a)
  let _b = new Date(b)

  _a.setHours(12, 0, 0, 0)
  _b.setHours(12, 0, 0, 0)
  return _a.getTime() - _b.getTime()
}

Date.prototype.briefDate = function () {
  var d = this.getDate()
  var m = this.getMonth() + 1
  var y = this.getFullYear()
  if (d < 10) { d = `0${d}` }
  if (m < 10) { m = `0${m}` }

  return `${d}.${m}.${String(y).slice(-2)}`
}

/* locale time to iso 8601 string, no timezone */
Date.prototype.toISO8601 = function() {
  function pad (number) {
    if (number < 10) { return '0' + number}
    return number
  }

  return this.getUTCFullYear() +
    '-' + pad( this.getMonth() + 1 ) +
    '-' + pad( this.getDate() ) +
    'T' + pad( this.getHours() ) +
    ':' + pad( this.getMinutes() ) +
    ':' + pad( this.getSeconds() ) +
    '.' + (this.getMilliseconds() / 1000).toFixed(3).slice(2, 5)
}