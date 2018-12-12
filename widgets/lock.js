/* eslint-env browser, amd */
define([
  'dojo/_base/declare',
  'artnum/Query',
  'artnum/Path'
], function (
  djDeclare,
  Query,
  Path
) {
  return djDeclare('location.lock', [], {
    constructor: function (target) {
      this.Key = null
      this.Target = target
      this.Timeout = null
      this.Locked = false
      this.Retry = null
      if (arguments[1]) {
        this.Key = arguments[1]
      }
    },

    on: function (value) {
      this.Target = value
    },

    mine: function () {
      return this.Locked
    },

    lock: async function () {
      if (this.Target === null) return true
      var start = Math.round((new Date()).getTime() / 1000)
      var result = await Query.exec(Path.url('store/.lock/' + this.Target), {method: 'POST', body: {operation: 'lock', key: this.Key, 'timestamp': start}})
      var diff = Math.round((new Date()).getTime() / 1000) - start // second taken to travel between server and client
      if (result.state === 'acquired') {
        window.UnloadCall[this.Target] = this.unlock.bind(this)
        this.Locked = true
        this.Key = result.key
        if (result.timeout && parseInt(result.timeout) > 0) {
          this.Timeout = setTimeout(this.lock.bind(this), (parseInt(result.timeout) - (diff + 30)) * 1000) // 30 seconds before end execute timeout
        }
        return true
      }

      return false
    },

    destroy: function () {
      this.unlock()
    },

    unlock: async function () {
      if (this.Timeout) {
        clearTimeout(this.Timeout) // clear current timeout
      }
      var result = await Query.exec(Path.url('store/.lock/' + this.Target), {method: 'POST', body: {operation: 'unlock', key: this.Key, 'timestamp': Math.round((new Date()).getTime() / 1000)}})
      if (result.state === 'unlocked') {
        delete window.UnloadCall[this.Target]
        this.Key = null
        this.Locked = false
      } else {
        console.warn('Unlock failed on ' + this.Target)
      }
    }
  })
})
