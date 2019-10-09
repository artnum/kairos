function MButton (button, choice = []) {
  let single = true
  this.Button = document.createElement('DIV')
  this.MButton = button
  if (choice && choice.length > 0) {
    single = false
    this.CButton = document.createElement('BUTTON')
    this.CButton.innerHTML = '+'
    this.subMenu = document.createElement('DIV')
    this.subMenu.classList.add('mbuttonSubmenu', 'mbutton')

    for (let i = 0; i < choice.length; i++) {
      let s = document.createElement('button')
      s.innerHTML = choice[i].label
      this.subMenu.appendChild(s)
      for (let k in choice[i].events) {
        s.addEventListener(k, function (event) {
          event.stopPropagation()
          choice[i].events[k](event)
          this.hide()
        }.bind(this))
      }
    }

    this.Popper = new Popper(this.Button, this.subMenu, {
      placement: 'top-end',
      modifiers: {
        preventOverflow: {
          enabled: true,
          boundariesElement: this.MButton
        }
      }
    })

    this.CButton.addEventListener('click', (event) => {
      if (this.subMenu.parentNode) {
        this.hide(event)
      } else {
        this.show(event)
      }
    })
  }

  window.requestAnimationFrame(() => {
    /* Style */
    this.Button.setAttribute('style', this.MButton.getAttribute('style'))
    this.MButton.removeAttribute('style')
    this.Button.classList.add('mbuttonMain', 'mbutton')
    this.MButton.classList.add('mbuttonLeft')
    if (!single) {
      this.CButton.classList.add('mbuttonRight')
    } else {
      this.Button.classList.add('mbuttonSingle')
    }

    /* Place */
    let p = button.parentNode
    p.insertBefore(this.Button, button)
    p.removeChild(button)
    this.Button.appendChild(button)
    if (!single) { this.Button.appendChild(this.CButton) }
  })
}

MButton.prototype.hide = function () {
  window.removeEventListener('click', this.hide.bind(this))
  window.requestAnimationFrame(() => {
    if (this.subMenu.parentNode) {
      this.subMenu.parentNode.removeChild(this.subMenu)
    }
  })
}

MButton.prototype.show = function (event) {
  event.stopPropagation()
  window.addEventListener('click', this.hide.bind(this))
  window.requestAnimationFrame(() => {
    this.Popper.update()
    this.Button.parentNode.insertBefore(this.subMenu, this.Button)
  })
}

MButton.prototype.addEventListener = function (type, listener, options = undefined) {
  this.MButton.addEventListener(type, listener, options)
}

MButton.prototype.removeEventListener = function (type, listener, options = undefined) {
  this.MButton.removeEventListener(type, listener, options)
}
