function MButton(button, choice = []) {
  this.single = true
  this.name = ''
  this.Button = document.createElement('DIV')
  this.domNode = this.Button
  this.Events = {}
  this.linkedState = []
  this._value = undefined
  this._oldValue = undefined

  this.domNode.getParentObject = function() {
    return this
  }.bind(this)

  if (button instanceof HTMLElement) {
    this.MButton = button
    if (button.hasAttribute('name')) {
      this.name = button.getAttribute('name')
    }
  } else {
    this.MButton = document.createElement('BUTTON')
    this.MButton.innerHTML = button
  }

  this.MButton.setAttribute('type', 'button')
  this.MutObserver = new MutationObserver((mutList, observer) => {
    for (const mutation of mutList) {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'disabled') {
          if (mutation.target.hasAttribute('disabled')) {
            this.setDisabled(true, true)
          } else {
            this.setDisabled(false, true)
          }
        }
      }
    }
  })

  this.MutObserver.observe(this.MButton, {attributes: true})
  Object.assign(this, {
    _disabled: false
  })
  
  if (this.MButton.hasAttribute('disabled')) {
    this.setDisabled(true, true)
  } else {
    this.setDisabled(false, true)
  }

  ;['name', 'id'].forEach((attr) => {
    if (this.MButton.hasAttribute(attr)) {
      const val = this.MButton.getAttribute(attr)
      this.MButton.removeAttribute(attr)
      if (attr === 'name') {
        this.MButton.setAttribute('name', `${val}#`)
      }
      this.Button.setAttribute(attr, val)
    }
  })

  if (Array.isArray(choice) && choice.length > 0) {
    this.single = false
    this.CButton = document.createElement('BUTTON')
    this.CButton.innerHTML = '+'
    this.subMenu = document.createElement('DIV')
    this.subMenu.classList.add('mbuttonSubmenu')

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
    Object.defineProperty(this.MButton, '_value', {
      get: this.getValue.bind(this),
      set: this._setValue.bind(this)
    })
    new Proxy(this.MButton, {
      set: function(target, property, value, receiver) {
        if (property === 'value') {
          this._setValue(value)
        } else {
          target[property] = value
        }
        this.doChangeEvent()
      }.bind(this)
    })    
    Object.assign(this, {
      state: 0,
      values: [choice.unset, choice.set],
      _value: null,
    })
  }
  if (this.MButton.parentNode) { this.place() }
}

MButton.prototype.place = function () {
  this.initialized = new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      /* Style */
      if (this.MButton.getAttribute('style')) {
        this.Button.setAttribute('style', this.MButton.getAttribute('style'))
        this.MButton.removeAttribute('style')
      }
      if (this.MButton.classList.contains('flavored')) {
        this.MButton.classList.remove('flavored')
        this.Button.classList.add('flavored')
      }
      this.Button.classList.add('mbuttonMain', 'mbutton')
      this.MButton.classList.add('mbuttonLeft')
      if (!this.single) {
        this.CButton.classList.add('mbuttonRight')
      } else {
        this.Button.classList.add('mbuttonSingle')
      }

      /* Place */
      let p = this.MButton.parentNode
      if (p) {
        p.insertBefore(this.Button, this.MButton)
        p.removeChild(this.MButton)
      }

      this.Button.appendChild(this.MButton)
      if (!this.single) { this.Button.appendChild(this.CButton) }

      if (this.MButton.dataset.flavor) {
        this.setColorFlavor(this.MButton.dataset.flavor)
      }
    })
  })
  return this.initialized
}

MButton.parse = function (dom) {
  if (!(dom instanceof HTMLElement)) { return }
  const buttons = dom.querySelectorAll('.mbutton')
  const results = []
  for (const button of buttons) {
    const mbutton = new MButton(button)
    results.push(mbutton)
  }
  return results
}

MButton.prototype.setLabel = function (label) {
  this.MButton.innerHTML = label
}

MButton.prototype.getDomNode = function () {
  return this.Button
}

MButton.prototype.doChangeEvent = function () {
  if (this._oldValue !== this._value) {
    this.MButton.dispatchEvent(new Event('change', {bubbles: true}))
  }
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
    this.Button.parentNode.insertBefore(this.subMenu, this.Button)
    this.Popper.update()
  })
}

MButton.prototype.getDisabled = function () {
  return this._disabled
}

/* straight is when value is 1, linked button is enabled, when value is 0, linked button
 * is disabled. reverse = 1 is the opposite.
 * As setLinkedState call setDisabled, 1 must be 0 to enable
 */ 
MButton.prototype.linkDisabledState = function (linked, reverse = false) {
  this.linkedState.push([linked, reverse])
  this.setLinkedState(this.state)
}

MButton.prototype.setLinkedState = function (value) {
  for (let i = 0; i < this.linkedState.length; i++) {
    this.linkedState[i][0].setDisabled(this.linkedState[i][1] ? value : !value)
  }
}

MButton.prototype.setDisabled = function (value, fromMbutton = false) {
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
      if (!fromMbutton) { this.MButton.setAttribute('disabled', '1') }
      if (this.CButton !== undefined) {
        this.CButton.setAttribute('disabled', '1')
      }
      this._disabled = true
      this.setLinkedState(true)

  } else {
      this.Button.removeAttribute('disabled')
      if (!fromMbutton) { this.MButton.removeAttribute('disabled') }
      if (this.CButton !== undefined) {
        this.CButton.removeAttribute('disabled')
      }
      this._disabled = false
  }
  this.setLinkedState(this._disabled ? false : this.state)
}

MButton.prototype.setColorFlavor = function (flavor) {
  switch (flavor.toLowerCase()) {
    case 'yellow': flavor = 'yellow'; break
    case 'red': flavor = 'red'; break
    case 'green': flavor = 'green'; break
    default: flavor = ''; break
  }
  window.requestAnimationFrame(() => {
    this.Button.classList.remove('yellow', 'red', 'green')    
    if (flavor) {
      this.Button.classList.add(flavor)
    }
  })
}

MButton.prototype.getValue = function () {
  if (this._disabled) {
    if (typeof this.values[0] === 'function') {
      return this.values[0]()
    } else {
      return this.values[0] ?? ''
    }
  } else {
    return this._value
  }
}

/* when loading from db use _setValue */
MButton.prototype._setValue = function (value) {
  if (value === undefined || value === 'false' || !value || value === 0 || value === '0') {
    this.state = 0
    window.requestAnimationFrame(() => this.Button.classList.remove('set'))
  } else {
    this.state = 1
    window.requestAnimationFrame(() => this.Button.classList.add('set'))
  }
  this.setLinkedState(this.state)
  this._oldValue = this._value
  this._value = value

  if (Array.isArray(this.values[this.state])) {
    this.setLabel(this.values[this.state][1])
  }

  return this.values[this.state]
}

MButton.prototype.setValue = function (value) {
  let v = this._setValue(value)
  if (this.state) {
    if (this.Events['set'] !== undefined && this.Events['set'] instanceof Function) {
      this.Events['set']()
    }
  } else {
    if (this.Events['unset'] !== undefined && this.Events['unset'] instanceof Function) {
      this.Events['unset']()
    }
  }
  if (typeof value === 'boolean') {
    if (typeof v === 'function') {
      this._value = v()
    } else if (Array.isArray(v)) {
      this._value = v[0]
    } else {
      this._value = v
    }
  } else {
    this._value = value
  }

  this.MButton.dataset.value = this._value
  this.domNode.dataset.value = this._value
  
  this.doChangeEvent()
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
  switch (type.toLowerCase()) {
    default:
      this.MButton.addEventListener(type, listener, options)
      break
    case 'set':
    case 'unset':
      this.Events[type.toLowerCase()] = listener
      break
  }
}

MButton.prototype.removeEventListener = function (type, listener, options = undefined) {
  switch (type.toLowerCase()) {
    default:
      this.MButton.removeEventListener(type, listener, options)
      break
    case 'set':
    case 'unset':
      delete this.Events[type.toLowerCase()]
      break
  }
}