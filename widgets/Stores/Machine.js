/* eslint-env browser, amd */
/* global APPConf */
define([
  'dojo/_base/declare'
], function (
  djDeclare,
) {
  return djDeclare('kairos.Stores.Machine', [], {
    get: function (id) {
      if (KAIROS.Cache.MachineStore === undefined) {
        KAIROS.Cache.MachineStore = new Map()
      }
      return new Promise((resolve, reject) => {
        const url = new URL(`${KAIROS.getBase()}/store/Machine/${id}`)

        if (KAIROS.Cache.MachineStore.has(url.toString())) {
          const cache = KAIROS.Cache.MachineStore.get(url.toString())
          if ((new Date()).getTime() - cache.time < KAIROS.Cache._timeout) {
            resolve(cache.values)
            return;
          }
        }

        fetch(url)
        .then(response => {
          if (!response.ok) { return {length: 0, data: null} }
          return response.json()
        })
        .then(result => {
          if (result.length === 1) {
            entry = Array.isArray(result.data) ? result.data[0] : result.data
            entry.label = `${id} ${entry.cn}`
            entry.value = id

            entry.lastFetch = new Date().getTime()
          }
          KAIROS.Cache.MachineStore.set(url.toString(), {values: entry, time: (new Date()).getTime()})
          resolve(entry)
        })
      })
    },

    query: function (txt) {
      if (KAIROS.Cache.MachineStore === undefined) {
        KAIROS.Cache.MachineStore = new Map()
      }
      return new Promise((resolve, reject) => {
        let searchName = txt.toAscii()
        let searchId = searchName
        if (txt) {
          if (txt.indexOf(' ') !== -1) {
            let x = txt.split(' ', 2)
            if (!isNaN(parseInt(x[0], 10)) && String(parseInt(x[0], 10)) === x[0]) {
              searchId = x[0]
              if (x[1].trim() === '') {
                searchName = searchId
              } else {
                searchName = x[1].toAscii()
              }
            }
          }
        }

        const highlight = function (val, txt) {
          let s = txt.toLowerCase().toAscii().indexOf(val.toLowerCase())
          if (s !== -1) {
            return txt.substring(0, s) + '<span class="match">' +
              txt.substring(s, s + val.length) + '</span>' +
              txt.substring(s + val.length)
          }
          return txt
        }
  
        const url = new URL(`${KAIROS.getBase()}/store/Machine`)
        if (searchName) {
          url.searchParams.append('search.cn', `${searchName}*`)
          url.searchParams.append('search.description', `${searchName}*`)
          url.searchParams.append('search.airref', `*${searchName}*`)
        }
        if (KAIROS.Cache.MachineStore.has(url.toString())) {
          const cache = KAIROS.Cache.MachineStore.get(url.toString())
          if ((new Date()).getTime() - cache.time < KAIROS.Cache._timeout) {
            resolve(cache.values)
            return;
          }
        }

        fetch(url)
        .then(response => {
            if (!response.ok) { return {length: 0, data: null} }
            return response.json()
        })
        .then(result => {
          const entries = []
          for (let i = 0; i < result.length; i++) {
            const entry = result.data[i]

            const name = highlight(searchName, entry.cn)
            const id = highlight(searchId, entry.uid)

            entry.label = `${id} ${name}`
            entry.value = entry.uid
            entry.sortInteger = parseInt(entry.uid)
            if (isNaN(entry.sortInteger)) { entry.sortInteger = Infinity }
            entries.push(entry)
          }
          return entries
        })
        .then(entries => {
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

          KAIROS.Cache.MachineStore.set(url.toString(), {values: entries, time: (new Date()).getTime()})
          resolve(entries)
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
