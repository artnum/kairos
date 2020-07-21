function MButton(button, choice = []) {
  let single = true
  this.Button = document.createElement('DIV')
  this.MButton = button
  button.setAttribute('type', 'button')

  Object.defineProperty(this.MButton, 'disabled', {
    get: this.getDisabled.bind(this),
    set: this.setDisabled.bind(this)
  })
  Object.assign(this, {
    _disabled: false
  })
  
  if (this.MButton.hasAttribute('disabled')) {
    this.setDisabled(true)
  }

  ;['name', 'id'].forEach((attr) => {
    if (this.MButton.hasAttribute(attr)) {
      let val = this.MButton.getAttribute(attr)
      this.MButton.removeAttribute(attr)
      this.Button.setAttribute(attr, val)
    }
  })

  if (Array.isArray(choice) && choice.length > 0) {
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

    this.Popper = Popper.createPopper(this.Button, this.subMenu, {
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
  } else if (
    typeof choice === 'object' &&
    choice !== null &&
    choice.set !== undefined &&
    choice.unset !== undefined
  ) {
    this.MButton.addEventListener('click', this.trigger.bind(this))
    Object.defineProperty(this.MButton, 'value', {
      get: this.getValue.bind(this),
      set: this.setValue.bind(this)
    })
    Object.assign(this, {
      state: 0,
      values: [choice.unset, choice.set],
      _value: null,
    })
    this.MButton.value = false
  }

  window.requestAnimationFrame(() => {
    /* Style */
    if (this.MButton.getAttribute('style')) {
      this.Button.setAttribute('style', this.MButton.getAttribute('style'))
      this.MButton.removeAttribute('style')
    }
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

MButton.prototype.getDisabled = function () {
  return this._disabled
}

MButton.prototype.setDisabled = function (value) {
  switch(value) {
    case 'on':
    case '1':
    case 'true':
    case 'disabled':
      value = true
      break
  }

  if (value) {
      this.Button.setAttribute('disabled', '1')
      this.MButton.setAttribute('disabled', '1')
      if (this.CButton !== undefined) {
        this.CButton.setAttribute('disabled', '1')
      }
      this.MButton.value = false
      this._disabled = true
  } else {
      this.Button.removeAttribute('disabled')
      this.MButton.removeAttribute('disabled')
      if (this.CButton !== undefined) {
        this.CButton.removeAttribute('disabled')
      }
      this._disabled = false
  }
}

MButton.prototype.getValue = function () {
  return this._value
}

/* when loading from db use _setValue */
MButton.prototype._setValue = function (value) {
  if (value === undefined || value === 'false' || !value) {
    this.state = 0
    window.requestAnimationFrame(() => this.Button.classList.remove('set'))
  } else {
    this.state = 1
    window.requestAnimationFrame(() => this.Button.classList.add('set'))
  }
  this._value = value
  return this.values[this.state]
}

MButton.prototype.setValue = function (value) {
  let v = this._setValue(value)
  if (typeof value === 'boolean') {
    if (typeof v === 'function') {
      this._value = v()
    } else {
      this._value = v
    }
  } else {
    this._value = value
  }
  this.MButton.dispatchEvent(new CustomEvent('change'))
  this.Button.dispatchEvent(new CustomEvent('change'))
  return this._value
}

MButton.prototype.trigger = function (event) {
  event.preventDefault()
  if (this.state === 1) {
    this.MButton.value = false
  } else {
    this.MButton.value = true
  }
}

MButton.prototype.addEventListener = function (type, listener, options = undefined) {
  this.MButton.addEventListener(type, listener, options)
}

MButton.prototype.removeEventListener = function (type, listener, options = undefined) {
  this.MButton.removeEventListener(type, listener, options)
}