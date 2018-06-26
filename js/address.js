'use strict'

var Address = function (addr) {
  this.address = []

  if (addr.freeform) {
    this.address = addr.freeform.split(/(?:\r\n|\r|\n)/mg)
  } else {
    var a = addr.target

    if (a.o) {
      this.address.push(a.o)
    }
    if (a.sn || a.givenname) {
      this.address.push((a.sn ? a.sn + ' ' : '') + (a.givenname ? a.givenname : ''))
    }
    if (a.c || a.postalcode || a.l) {
      this.address.push((a.c ? a.c + ' ' : '') + (a.postalcode ? a.postalcode + ' ' : '') + (a.l ? a.l : ''))
    }
    if (a.mail) {
      this.address.push(a.mail)
    }
    if (a.telephonenumber) {
      this.address.push(a.telephonenumber)
    }
  }
}

Address.prototype.toHtml = function () {
  return this.address.join('<br />')
}

Address.prototype.toArray = function () {
  return this.address
}
