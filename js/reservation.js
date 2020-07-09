/* eslint-env browser */

const ReservationProxy = {
  _formats: {
    iso8601: ['begin', 'end', 'deliveryBegin', 'deliveryEnd'],
    json: ['other']
  },
  set: function (object, prop, value) {
    let type = 'text'
    for (let key in this._formats) {
      if (this._formats[key].indexOf(prop) !== -1) {
        type = key
        break
      }
    }
    switch (type) {
      default:
      case 'text':
        if (value === null) { value = '' }
        object[prop] = value
        break
      case 'iso8601':
        if (value instanceof Date) {
          object.prop = value
        } else {
          object[prop] = Date.parse(value)
        }
        break
      case 'json':
        if (typeof value === 'object') {
          object[prop] = value
        } else {
          object[prop] = JSON.parse(value)
        }
        break
    }
  }
}
