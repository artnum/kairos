define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/when'
], function (
  djDeclare,
  djLang,
  djDeferred,
  djWhen) {
  return djDeclare('location.update', [], {

    lastUpdate: 0,

    update: function () {
      if (this.lastUpdate != 0 && !arguments[0]) {
        if ((Date.now() - this.lastUpdate) < 350) { return }
      }
      this.lastUpdate = Date.now()

      if (this._update) {
        return this._update(arguments)
      }
    }

  })
})
