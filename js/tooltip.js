/* global Popper */
window.addEventListener('focus', (event) => {
  console.log(event)
  if (event.target && event.target.dataset && event.target.dataset.tooltip) {
    showTooltip(event.target)
  }
}, {passive: true, capture: true})
window.addEventListener('blur', (event) => {
  hideTooltip()
}, {passive: true, capture: true})

function showTooltip (node) {
  if (node.dataset.name || node.dataset.tooltip) {
    let content = node.dataset.name ? node.dataset.name : node.dataset.tooltip
    hideTooltip()
    let tt = document.createElement('DIV')
    tt.classList.add('smallTooltip')
    tt.innerHTML = content
    node.parentNode.insertBefore(tt, node)
    window.GlobalTooltipPopper = new Popper(node, tt, {placement: 'top-start', removeOnDestroy: true})
  }
}

function hideTooltip () {
  if (window.GlobalTooltipPopper) {
    if (window.GlobalTooltipPopper.destroy) {
      window.GlobalTooltipPopper.destroy()
    }
    delete window.GlobalTooltipPopper
  }
}
