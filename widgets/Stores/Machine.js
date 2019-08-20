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
        Query.exec(Path.url(`store/Machine/?search.description=${id}&search.airaltref=${id}`)).then((results) => {
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
        Query.exec(Path.url('store/Machine', {params: {'search.cn': `${searchName}*`, 'search.description': `${searchId}*`}})).then((result) => {
          if (result.success && result.length > 0) {
            result.data.forEach((entry) => {
              let s = entry.cn.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
              let name = entry.cn
              if (s !== -1) {
                name = entry.cn.substring(0, s) + '<span class="match">' +
                  entry.cn.substring(s, s + searchName.length) + '</span>' +
                  entry.cn.substring(s + searchName.length)
              }

              let id = entry.description
              s = entry.description.toLowerCase().toAscii().indexOf(searchId.toLowerCase())
              if (s !== -1) {
                id = entry.description.substring(0, s) + '<span class="match">' +
                  entry.description.substring(s, s + searchId.length) + '</span>' +
                  entry.description.substring(s + searchId.length)
              }

              entry.label = `${id} ${name}`
              entry.value = entry.description
              if (entry.airaltref) {
                if (!Array.isArray(entry.airaltref)) {
                  entry.airaltref = [ entry.airaltref ]
                }
                entry.airaltref.forEach((ref) => {
                  let e = Object.assign({}, entry)
                  e.description = ref
                  e.label = `${ref} ${name}`
                  e.value = ref
                  entries.push(e)
                })
              }
              entries.push(entry)
            })
          }

          entries.sort((a, b) => {
            let v = a.cn.localeCompare(b.cn)
            if (v === 0) {
              if (!isNaN(parseInt(a.description)) && !isNaN(parseInt(b.description))) {
                v = parseInt(a.description) - parseInt(b.description)
              } else {
                v = a.description.localeCompare(b.description)
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
