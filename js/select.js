/* eslint-env browser */
/* global Popper */

var Select = function (input, store, options = {allowFreeText: true, realSelect: false}) {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Not an Input element')
  }
  this.value = undefined
  this._oldValue = undefined
  this.allowFreeText = options.allowFreeText
  this.input = input
  if (options.realSelect) {
    this.realSelectUI()
  }
  input.setAttribute('autocomplete', 'off')
  let originalValue = input.value
  let obj = new Proxy(this, {
    get: function (obj, prop) {
      switch (prop) {
        case 'value':
          if (!input.dataset.value) {
            return input.value ? input.value : ''
          } else {
            return input.dataset.value
          }
        case 'domNode':
          return input
        default:
          return obj[prop] ? obj[prop] : ''
      }
    },
    set: function (obj, prop, value) {
      switch (prop) {
        case 'value':
          if (!value) { break }
          input.dataset.loading = '1'
          store.get(value)
          .then((entry) => {
            if (entry) {
              obj.lastEntry = entry
              obj.setLabel(entry.label)
              obj.setValue(entry.value)
              obj.colorize(entry.color)
            } else {
              if (obj.allowFreeText) {
                obj.setLabel(value)
                obj.setValue(value)
              } else {
                if (!obj.lastEntry) {
                  obj.setLabel('')
                  obj.setValue('')
                } else {
                  obj.setLabel(obj.lastEntry.label)
                  obj.setValue(obj.lastEntry.value)
                }
              }
            }
            input.dataset.loading = '0'
          })
          break
        default:
          input[prop] = value
      }
    }
  })

  var list = document.createElement('DIV')
  list.classList.add('dropdown')
  var popper = null

  var move = (k) => {
    let current = null
    for (let i = list.firstElementChild; i; i = i.nextElementSibling) {
      if (i.dataset.hover === '1') {
        current = i
        break
      }
    }
    let set = null
    let reset = null
    let moveStep = 1
    let wrapTarget = null
    switch (k) {
      case 'PageDown':
        if (list.firstElementChild) {
          moveStep = Math.floor(list.getBoundingClientRect().height / list.firstElementChild.getBoundingClientRect().height)
        }
        wrapTarget = list.lastElementChild
        /* Fall through */
      case 'ArrowDown':
        if (!wrapTarget) {
          wrapTarget = list.firstElementChild
        }
        if (current === null) {
          current = list.firstElementChild
          moveStep--
        }
        reset = current

        for (let i = 0; i < moveStep && current; i++) {
          current = current.nextElementSibling
        }

        if (current) {
          set = current
        } else {
          set = wrapTarget
        }
        break
      case 'PageUp':
        if (list.firstElementChild) {
          moveStep = Math.floor(list.getBoundingClientRect().height / list.firstElementChild.getBoundingClientRect().height)
        }
        wrapTarget = list.firstElementChild
      /* Fall through */
      case 'ArrowUp':
        if (!wrapTarget) {
          wrapTarget = list.lastElementChild
        }
        if (current === null) {
          current = list.lastElementChild
          moveStep--
        }
        reset = current

        for (let i = 0; i < moveStep && current; i++) {
          current = current.previousElementSibling
        }

        if (current) {
          set = current
        } else {
          set = wrapTarget
        }
        break
    }
    if (set) {
      set.dataset.hover = '1'
      if (set.getBoundingClientRect().bottom > list.getBoundingClientRect().bottom) {
        set.scrollIntoView()
      } else if (set.getBoundingClientRect().top < list.getBoundingClientRect().top) {
        set.scrollIntoView(false)
      }
      if (!options.allowFreeText) {
        this.select(set, true)
      }
    }
    if (reset && set !== reset) {
      reset.dataset.hover = '0'
    }
  }

  var degenerate = () => {
    KAIROS.removeClosableFromStack(degenerate)
    if (popper) { popper.destroy(); popper = null }
    if (list.parentNode) {
      list.parentNode.removeChild(list)
    }
    list.innerHTML = ''
  }

  var handleTab = (event) => {
    switch (event.key) {
      case 'Tab':
        for (let n = list.firstElementChild; n; n = n.nextElementSibling) {
          if (n.dataset.hover === '1') {
            this.select(n)
            degenerate()
            return
          }
        }
        break
    }
  }

  var generate = (event) => {
    if (event.type === 'focus') {
      input.setSelectionRange(0, input.value.length)
    }
    if (event.key) {
      delete input.dataset.value
    }
    switch (event.key) {
      case 'Enter':
        for (let n = list.firstElementChild; n; n = n.nextElementSibling) {
          if (n.dataset.hover === '1') {
            this.select(n)
            degenerate()
            input.blur()
            return
          }
        }
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageUp':
      case 'PageDown':
        event.preventDefault()
        return move(event.key)
      case 'Escape':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Alt':
      case 'AltGraph':
        return
      case 'Backspace':
      case 'Delete':
        if (input.value.length === 0 && !options.realSelect) { 
          return degenerate() 
        }
    }
    this.closableIdx = KAIROS.stackClosable(degenerate)
    window.requestAnimationFrame((event) => {
      if (!list.parentNode) {
        input.parentNode.insertBefore(list, input.nextSiblingElement)
        popper = Popper.createPopper(input, list, {removeOnDestroy: true, positionFixed: true, placement: 'bottom-start'})
      }
    })
    let value = input.value
    let currentValue = undefined
    if (event.type === 'focus' && options.realSelect) {
      currentValue = input.dataset.value
      value = ''
    }
    let currentRequest = performance.now()
    this.latestRequest = currentRequest
    store.query(value, currentValue)
    .then((data) => {
      if (this.latestRequest !== currentRequest) { return }
      const frag = document.createDocumentFragment()
      if (data.length < 1) {
        degenerate()
      } else {
        let selected = null
        data.forEach((entry) => {
          let s = document.createElement('DIV')
          s.dataset.value = entry.value
          if (entry.color || entry.symbol) {
            let symbol = document.createElement('SPAN')
            symbol.innerHTML = ' ■ '
            if (entry.symbol) {
              symbol.innerHTML = entry.symbol
              s.dataset.symbol = entry.symbol
            }
            if (entry.color) {
              symbol.style.color = entry.color
              s.dataset.color = entry.color
            }
            s.appendChild(symbol)
            s.innerHTML += entry.label
          } else {
            s.innerHTML = entry.label
          }
          s.dataset.label = entry.printableLabel ? entry.printableLabel : s.textContent
          if (entry.selected || entry.value === currentValue || (!this.allowFreeText && data.length === 1)) {
            selected = s
          }
          s.addEventListener('mouseover', (event) => {
            for (let i = list.firstElementChild; i; i = i.nextElementSibling) {
              if (i !== event.target) {
                i.dataset.hover = '0'
              }
            }
            event.target.dataset.hover = '1'
          })
          s.addEventListener('mousedown', (event) => { event.stopPropagation(); this.select(event.target); degenerate() })
          frag.appendChild(s)
        })
        window.requestAnimationFrame(() => {
          list.innerHTML = ''
          list.appendChild(frag)
          if (selected) {
            this.select(selected)
            selected.dataset.hover = '1'
            selected.scrollIntoView()
          } else {
            if (!options.allowFreeText) {
              this.select(list.firstElementChild, true)
            }
          }
        })
      }
    })
  }

  input.addEventListener('blur', degenerate)
  input.addEventListener('keyup', generate)
  input.addEventListener('keydown', handleTab)
  input.addEventListener('keypress',
  (event) => { 
    if (event.key === 'Enter') {
      event.stopPropagation(); 
      event.preventDefault() 
    }
  }, {capture: true})
  input.addEventListener('focus', generate)

  obj.value = originalValue
  return obj
}

Select.prototype.doChangeEvent = function () {
  if (this.value !== this._oldValue) {
    this.input.dispatchEvent(new Event('change', {bubbles: true}))
  }
}

Select.prototype.clear = function () {
  let element = this.input
  if (this.container) { element = this.container }
  element.classList.remove('colored')
  this.input.value = ''
  this.input.dataset.value = ''
}

Select.prototype.realSelectUI = function () {
  let arrow = document.createElement('SPAN')
  let container = document.createElement('DIV')
  this.container = container
  window.requestAnimationFrame(() => {
    String(this.input.classList).split(' ')
    .forEach(token => {
      if (token === '') { return; }
      container.classList.add(token)
      this.input.classList.remove(token)
    })
    container.classList.add('kselect')
    this.input.parentNode.insertBefore(container, this.input)
    this.input.parentNode.removeChild(this.input)
    container.appendChild(this.input)
    arrow.classList.add('arrow')
    arrow.innerHTML = '<i class="fas fa-caret-down"> </i> '
    container.appendChild(arrow)
  })
}

Select.prototype.setValue = function (value) {
  this._oldValue = this.value
  this.value = value
  this.input.dataset.value = value
  this.doChangeEvent()
}

Select.prototype.setLabel = function (label) {
  this.input.value = label
}

Select.prototype.select = function (target, dontMessValue = false) {
  if (!dontMessValue) {
    this.setLabel(target.dataset.label)
  }
  this.colorize(target.dataset.color)
  this.setValue(target.dataset.value)
}

Select.prototype.colorize = function (color) {
  const element = this.container || this.input
  window.requestAnimationFrame(() => {
    if (color === undefined || color === null || color === false) {
      element.classList.remove('colored')
      element.style.removeProperty('--colored-color')
    } else {
      element.classList.add('colored')
      element.style.setProperty('--colored-color', color)
    }
  })
}