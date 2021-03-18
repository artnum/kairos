'use strict'

function Address (addr) {
  this.address = []
  this.fields = []
  this.id = null
  this.type = '_client'

  if (addr.comment) {
    this.type = addr.comment
  }

  if (addr.freeform) {
    this.address = addr.freeform.split(/(?:\r\n|\r|\n)/mg)
    this.id = this.address.join('_')
  } else {
    let a = addr.target === undefined ? addr : addr.target
    this.id = a.IDent
    if (a.o) {
      this.address.push(`<span class="organization">${a.o}</span>`)
      this.fields.push('organization')
    }
    if (a.sn || a.givenname) {
      this.address.push(`<span class="names">${(a.sn ? `<span class="familyname">${a.sn}</span> ` : '') +
        (a.givenname ? `<span class="givenname">${a.givenname}</span>` : '')}</span>`)
      this.fields.push('name')
    }
    if (a.c || a.postalcode || a.l) {
      this.address.push(`<span class="address">${(a.postalcode ?  `<span class="postalcode">${a.postalcode}</span> ` : '') +
        (a.l ? `<span class="locality">${a.l}</span> ` : '') +
        (a.c ? `<span class="country">${a.c}</span> `: '')
        }</span>`)
      this.fields.push('locality')
    }
    if (a.mail) {
      this.address.push(`<a href="mailto:${a.mail}">${a.mail}</a>`)
      this.fields.push('mail')
    }
    if (a.telephonenumber) {
      this.address.push(`<a class="telephone" href="tel:${a.telephonenumber}">${a.telephonenumber}</a>`)
      this.fields.push('phone')
    }
  }
}

Address.load = function (dbContactEntry) {
  return new Promise ((resolve, reject) => {
    if (dbContactEntry.freeform) {
      resolve(new Address(dbContactEntry))
    } else {
      let url = new URL(`${KAIROS.getBase()}/store/${dbContactEntry.target}`)
      fetch(url).then(response => {
        if (!response.ok) { resolve(null); return }
        response.json().then(result => {
          if (result.length !== 1) { resolve(null); return }
          let data = Array.isArray(result.data) ? result.data[0] : result.data
          resolve(new Address(data))
        })
      })
    }
  })
}

Address.prototype.toHtml = function () {
  return `<address>${this.address.join('<br />')}</address>`
}

Address.prototype.toArray = function () {
  return this.address
}

Address.prototype.toString = function () {
  return `<address>${this.address.join(' ')}</address>`
}

Address.prototype.getType = function () {
  switch(this.type) {
    default: return this.type; break;
    case '_client': return 'Client'; break
    case '_retour': return 'Retour'; break
    case '_facturation': return 'Facturation'; break
    case '_responsable': return 'Responsable'; break
    case '_place': return 'Sur place'; break
  }
}