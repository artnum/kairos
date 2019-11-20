/* eslint-env amd, browser */
/* global Histoire */
define(['dojo/_base/declare'], function (djDeclare) {
  return djDeclare('location.rform.handler', [], {
    HTML: {
      note: function (entry) {
        let n = document.createElement('DIV')
        n.classList.add('noteline')
        n.innerHTML = `<span class="message">${entry.details.content}</span><span class="metadata"><span class="date">${new Date(entry.date).fullDate()}</span> <span class="hour">${new Date(entry.date).shortHour()}</span>/<span class="user initials" title="${entry._user.name}">${entry._user.name.initials()}</span><span>`
        console.log(this)
        n.addEventListener('dblclick', (event) => {
          let node = event.target
          for (; node && node.nodeName !== 'DIV'; node = node.parentNode) ;
          node.style.position = 'relative'
          let div = document.createElement('DIV')
          div.style.position = 'absolute'
          div.style.left = 0
          div.style.top = 0
          div.style.backgroundColor = 'hsla(var(--default-bg-color-base), 0.8)'
          node.appendChild(div)
          window.addEventListener('keyup', function (event) {
            console.log('note overlay', event, this)
            let node = this
            for (; node && node.nodeName !== 'DIV'; node = node.parentNode) ;
            node.parentNode.style.position = ''
            node.parentNode.removeChild(node)
          }.bind(node))
        })
        return n
      },
      offerLine: function (entry) {
        let n = document.createElement('DIV')
        if (parseInt(entry.superseeded)) {
          n.classList.add('superseeded')
        }
        entry.total = 0
        if (isNaN((entry.price = parseFloat(entry.price)))) { return }
        if (isNaN((entry.quantity = parseFloat(entry.quantity)))) { return }
        if (isNaN((entry.discount = parseFloat(entry.discount)))) { return }

        entry.total = entry.price * entry.quantity * (1 - (entry.discount / 100))
        n.innerHTML = `<span class="description">${entry.description}</span>
                       <span class="quantity">${entry.quantity}</span>
                       <span class="unit">${entry.unit}</span>
                       <span class="price">${entry.price}</span>
                       <span class="discount">${entry.discount}</span>
                       <span class="total">${entry.total}</span>`
        return n
      }
    },

    Actions: {
      offer: function (event) {
        let addOffer = false
        if (event.type !== 'keyup' && event.type !== 'blur') { return }
        let p = event.target
        for (; p && p.nodeName !== 'DIV'; p = p.parentNode);
        let inputs = p.querySelectorAll('*[name]')
        let totalNode = null
        let values = {offerPrice: 0, offerQuantity: 0, offerDiscount: 0, total: 0, description: ''}
        for (let i of inputs) {
          let name = i.getAttribute('name')
          if (i.value) {
            if (!Number.isNaN(Number.parseFloat(i.value))) {
              values[name] = Number.parseFloat(i.value)
            }
          }
          if (name === 'offerDescription') { values.description = i.value }
          if (name === 'offerUnit') { values.unit = i.value }
          if (name === 'offerTotal') { totalNode = i }
        }
        values.total = Math.roundHalf(values.offerPrice *
                                      values.offerQuantity *
                                      (1 - values.offerDiscount / 100), 2)
        window.requestAnimationFrame(() => {
          totalNode.innerHTML = String(values.total).toMoney()
        })
        values.price = values.offerPrice
        values.quantity = values.offerQuantity
        values.discount = values.offerDiscount
        if (event.type === 'keyup' && event.key === 'Enter') {
          p.parentNode.insertBefore(this.HTML.offerLine(values), p)
        }
      },
      note: function (event) {
        let addNote = false
        if (event.type === 'keyup') {
          if (event.key === 'Enter' && !event.ctrlKey && !event.shiftKey) {
            if (event.target.value !== '' && event.target.value.trim() !== '') {
              addNote = true
            }
          }
        }
        if (addNote) {
          let node = this.nNewNote
          Histoire.NOTE('Reservation', this.reservation.id, event.target.value).then((id) => {
            if (node) {
              Histoire.Get(id).then((entry) => {
                window.requestAnimationFrame(() => {
                  node.insertBefore(this.HTML.note(entry), node.firstChild)
                  event.target.value = ''
                  node.scrollTo(0, 0)
                })
              })
            }
          })
        }
      }
    }
  })
})
