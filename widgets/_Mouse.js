define([
  'dojo/_base/declare',
  'dojo/_base/lang'
], function (
  djDeclare,
  djLang
) {
  var _Mouse = djDeclare(null, {

    getAbsPos: function (event) {
      if (event.pageX && event.pageY) {
        return {x: event.pageX, y: event.pageY }
      } else {
        return this.getTargetAbsPos(event)
      }
    },

    getTargetAbsPos: function (event) {
      var x = 0, y = 0, el = event.target

      while (el) {
        if (el.tagName == 'BODY') {
          x += el.offsetLeft - (el.scrollLeft || document.documentElement.scrollLeft)
          y += el.offsetTop - (el.scrollTop || document.documentElement.scrollTop)
        }	else {
          x += el.offsetLeft - el.scrollLeft
          y += el.offsetTop - el.scrollTop
        }
        el = el.offsetParent
      }

      return { x: x, y: y}
    }

  })

  return _Mouse
})
