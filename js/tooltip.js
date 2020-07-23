/* global Popper */
window.addEventListener('focus', (event) => {
  if (event.target && event.target.dataset && event.target.dataset.tooltip) {
    showTooltip(event.target)
  }
}, {passive: true, capture: true})
window.addEventListener('blur', (event) => {
  hideTooltip()
}, {passive: true, capture: true})

function showTooltip (node, value = null) {
  if (value || node.dataset.name || node.dataset.tooltip) {
    let content = value !== null ? value : (node.dataset.name ? node.dataset.name : node.dataset.tooltip)
    hideTooltip()
    let tt = document.createElement('DIV')
    tt.classList.add('smallTooltip')
    tt.innerHTML = content
    node.parentNode.insertBefore(tt, node)
    window.GlobalTooltipPopper = [Popper.createPopper(node, tt, {placement: 'top'}), tt]
  }
}

function hideTooltip () {
  if (window.GlobalTooltipPopper) {
    if (window.GlobalTooltipPopper[0] && window.GlobalTooltipPopper[0].destroy) {
      let node = window.GlobalTooltipPopper[1]
      window.requestAnimationFrame(() => node.parentNode.removeChild(node))
      window.GlobalTooltipPopper[0].destroy()
    }
    delete window.GlobalTooltipPopper
  }
}
