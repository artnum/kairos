/* https://stackoverflow.com/questions/2158991/fire-javascript-event-when-a-div-is-in-view */

function getPageRect () {
  var isquirks = document.compatMode !== 'BackCompat'
  var page = isquirks ? document.documentElement : document.body
  var x = window.pageXOffset
  var y = window.pageYOffset
  var w = 'innerWidth' in window ? window.innerWidth : page.clientWidth
  var h = 'innerHeight' in window ? window.innerHeight : page.clientHeight
  return [x, y, x + w, y + h]
}

function getElementRect (element) {
  var x = 0, y = 0
  var w = element.offsetWidth, h = element.offsetHeight
  while (element.offsetParent !== null) {
    x += element.offsetLeft
    y += element.offsetTop
    element = element.offsetParent
  }
  return [x, y, x + w, y + h]
}
function rectsIntersect (a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
}

function intoYView (e) {
  var page = getPageRect()
  var element = getElementRect(e)

  if (element[1] >= page[1] && element[1] <= page[3]) { return true }
  return false
}
