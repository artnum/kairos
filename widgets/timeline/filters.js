/* global define  */
'use strict'

define([
  'dojo/_base/declare',
  'dojo/_base/lang'
], function (
  Declare,
  Lang) {
  return Declare('location.timeline.filter', [], {Filters: {
    entries: [],
    reservations: [],
    trans: null,
    init: function () {
      this.entries = []
      this.reservations = []
      this.trans = null
      this.trans = window.App.DB.transaction('reservations', 'readonly').objectStore('reservations')
    },
    select: function (reservation, entry) {
      if (this.entries.indexOf(entry) === -1) {
        this.entries.push(entry)
      }
      if (this.reservations.indexOf(reservation) === -1) {
        this.reservations.push(reservation)
      }
    },
    beginDay: function (date, onSet = null, on = 'entry') {
      return this.day(date, 'begin', onSet, on)
    },
    endDay: function (date, onSet = null, on = 'entry') {
      return this.day(date, 'end', onSet, on)
    },
    day: function (date, type = 'begin', onSet = null, on = 'entry') {
      return new Promise(function (resolve, reject) {
        var ts = new Date()
        ts.setTime(date.getTime())
        ts.setHours(0, 0, 0, 0)
        ts = ts.getTime()

        if (this.trans === null) { reject(new Error('Init must be called before search')); return }

        this.trans.openCursor().onsuccess = function (event) {
          var cursor = event.target.result
          if (!cursor) { resolve(); return }

          var value = cursor.value
          if (onSet && onSet.indexOf(value.target) === -1) { cursor.continue(); return }
          cursor.continue()

          var tsX = new Date(value[type])
          tsX.setHours(0, 0, 0, 0)
          tsX = tsX.getTime()
          switch (on) {
            default: case 'entry':
              if (tsX === ts) {
                this.select(value.id, value.target)
              }
              break
            case 'complements':
              for (var i = 0; i < value.complements.length; i++) {
                if (value.complements[i].follow === '0') {
                  tsX = new Date(value.complements[i][type])
                  tsX.setHours(0, 0, 0, 0)
                  tsX = tsX.getTime()
                  if (tsX === ts) {
                    this.select(value.id, value.target)
                  }
                }
              }
              break
          }
        }.bind(this)
      }.bind(this))
    },
    dateRange: function (date, onSet = null, on = 'entry') {
      return new Promise(function (resolve, reject) {
        var ts = date.getTime()

        if (this.trans === null) { reject(new Error('Init must be called before search')); return }
        this.trans.openCursor().onsuccess = function (event) {
          var cursor = event.target.result
          if (!cursor) { resolve(); return }
          var value = cursor.value
          if (onSet && onSet.indexOf(value.target) === -1) { cursor.continue(); return }

          var tsBegin = new Date(value.begin).getTime()
          var tsEnd = new Date(value.end).getTime()
          switch (on) {
            default: case 'entry':
              if (tsBegin <= ts && tsEnd >= ts) {
                this.select(value.id, value.target)
              }
              break
            case 'complement':
              for (var i = 0; i < value.complements.length; i++) {
                var cBegin = tsBegin
                var cEnd = tsEnd
                if (value.complements[i].follow === '0') {
                  cBegin = new Date(value.complements[i].begin).getTime()
                  cEnd = new Date(value.complements[i].end).getTime()
                }
                if (cBegin <= ts && cEnd >= ts) {
                  this.select(value.id, value.target)
                }
              }
              break
          }

          cursor.continue()
        }.bind(this)
      }.bind(this))
    },
    find: function (test, onSet = null) {
      return new Promise(function (resolve, reject) {
        if (this.trans === null) { reject(new Error('Init must be called before search')); return }

        this.trans.openCursor().onsuccess = function (event) {
          var cursor = event.target.result
          if (!cursor) { resolve(); return }

          var value = cursor.value
          if (onSet && onSet.indexOf(value.target) === -1) { cursor.continue(); return }

          if (test(value)) {
            this.select(value.id, value.target)
          }

          cursor.continue()
        }.bind(this)
      }.bind(this))
    },
    _checkValueRecurse: function (object, value) {
      if (Array.isArray(object)) {
        for (var i = 0; i < object.length; i++) {
          if (this._checkValueRecurse(object[i], value)) {
            return true
          }
        }
      } else if (object !== null && typeof object === 'object') {
        for (var k in object) {
          if (this._checkValueRecurse(object[k], value)) {
            return true
          }
        }
      } else {
        if (object === value) {
          return true
        }
      }

      return false
    },
    contains: function (val, props = null, onSet = null) {
      return new Promise(function (resolve, reject) {
        if (this.trans === null) { reject(new Error('Init must be called before search')); return }

        this.trans.openCursor.onsuccess = function (event) {
          var cursor = event.target.result
          if (!cursor) { resolve(); return }

          var value = cursor.value
          if (onSet && onSet.indexOf(value.target) === -1) { cursor.continue(); return }

          if (props === null) {
            if (this._checkValueRecurse(value, val)) {
              this.select(value.id, value.target)
            }
          } else {
            if (value[props]) {
              if (this._checkValueRecurse(value[props], val)) {
                this.select(value.id, value.target)
              }
            }
          }

          cursor.continue()
        }.bind(this)
      }.bind(this))
    }
  }})
})
