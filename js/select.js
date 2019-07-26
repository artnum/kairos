/* eslint-env browser */
/* global Popper */

var Select = function (input, qfunc) {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Not an Input element')
  }

  var list = document.createElement('DIV')
  list.classList.add('dropdown')
  var popper = null

  var select = (target) => {
    input.value = target.textContent
    input.dataset.value = target.dataset.value
  }

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
    }
    if (reset && set !== reset) {
      reset.dataset.hover = '0'
    }
  }

  var degenerate = () => {
    if (popper) { popper.destroy(); popper = null }
    if (list.parentNode) {
      list.parentNode.removeChild(list)
    }
    list.innerHTML = ''
  }

  var generate = (event) => {
    switch (event.key) {
      case 'Enter':
        for (let n = list.firstElementChild; n; n = n.nextElementSibling) {
          if (n.dataset.hover === '1') {
            select(n)
            degenerate()
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
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Escape':
      case 'Tab':
      case 'Alt':
      case 'AltGraph':
        return
      case 'Backspace':
      case 'Delete':
        if (input.value.length === 0) { return degenerate() }
    }
    window.requestAnimationFrame((event) => {
      if (!list.parentNode) {
        input.parentNode.insertBefore(list, input.nextSiblingElement)
        popper = new Popper(input, list, {removeOnDestroy: true, positionFixed: true, placement: 'bottom-start'})
      }
    })
    qfunc(input.value).then((data) => {
      let frag = document.createDocumentFragment()
      if (data.length < 1) {
        degenerate()
      } else {
        data.forEach((entry) => {
          let s = document.createElement('DIV')
          s.dataset.value = entry.value
          s.innerHTML = entry.label
          s.addEventListener('mouseover', (event) => {
            for (let i = list.firstElementChild; i; i = i.nextElementSibling) {
              if (i !== event.target) {
                i.dataset.hover = '0'
              }
            }
            event.target.dataset.hover = '1'
          })
          s.addEventListener('mousedown', (event) => { select(event.target); degenerate() })
          frag.appendChild(s)
        })
        window.requestAnimationFrame(() => {
          list.innerHTML = ''
          list.appendChild(frag)
        })
      }
    })
  }

  input.addEventListener('blur', (event) => degenerate)
  input.addEventListener('keyup', generate)
  input.addEventListener('focus', generate)
}
