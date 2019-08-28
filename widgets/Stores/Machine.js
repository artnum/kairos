/* eslint-env browser, amd */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  djLang,
  Path,
  Query
) {
  return djDeclare('location.Stores.Machine', [], {
    entries: [],
    get: function (id) {
      return new Promise((resolve, reject) => {
        let entry = null
        Query.exec(Path.url(`store/Machine/${id}`)).then((results) => {
          if (results.success && results.length === 1) {
            entry = results.data[0]
            entry.label = `${id} ${entry.cn}`
            entry.value = id
          }
          resolve(entry)
        })
      })
    },
    query: function (txt) {
      return new Promise((resolve, reject) => {
        let searchName = txt.toAscii()
        let searchId = searchName
        if (txt) {
          if (txt.indexOf(' ') !== -1) {
            let x = txt.split(' ', 2)
            if (!isNaN(parseInt(x[0], 10)) && String(parseInt(x[0], 10)) === x[0]) {
              searchId = x[0]
              searchName = x[1].toAscii()
            }
          }
        }
        let entries = []
        var highlight = function (val, txt) {
          let s = txt.toLowerCase().toAscii().indexOf(val.toLowerCase())
          if (s !== -1) {
            return txt.substring(0, s) + '<span class="match">' +
              txt.substring(s, s + val.length) + '</span>' +
              txt.substring(s + val.length)
          }
          return txt
        }
        Query.exec(Path.url('store/Machine', {params: {'search.cn': `${searchName}*`, 'search.description': `${searchId}*`, 'search.airaltref': `${searchId}*`}})).then((result) => {
          if (result.success && result.length > 0) {
            result.data.forEach((entry) => {
              let name = highlight(searchName, entry.cn)

              let id = highlight(searchId, entry.uid)
              entry.label = `${id} ${name}`
              entry.value = entry.uid
              entry.sortInteger = parseInt(entry.uid)
              if (isNaN(entry.sortInteger)) { entry.sortInteger = Infinity }
              entries.push(entry)
            })
          }

          entries.sort((a, b) => {
            let v = a.sortInteger - b.sortInteger
            if (v === 0) {
              v = a.cn.localeCompare(b.cn)
              if (v === 0) {
                if (!isNaN(parseInt(a.description)) && !isNaN(parseInt(b.description))) {
                  v = parseInt(a.description) - parseInt(b.description)
                } else {
                  v = a.description.localeCompare(b.description)
                }
              }
            }
            return v
          })

          this.entries = entries
          resolve(this.entries)
        })
      })
    },
    getIdentity: function (object) {
      if (object.uid) {
        return object.uid
      } else {
        return object.id
      }
    }
  })
})
