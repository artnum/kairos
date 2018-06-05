define([
  'dojo/_base/declare',
  'dojo/_base/lang'
], function (
  djDeclare,
  djLang
) {
  var _Cluster = djDeclare(null, {

    servers: [],
    last: 0,

    setServers: function (servers) {
      if (djLang.isArray(servers)) {
        this.servers = servers
        this.last = Math.floor(Math.random() * this.servers.length)
      }
    },

    getUrl: function (path) {
      if (this.servers.length > 0) {
        if (this.servers.length == 1) {
          return this.servers[0] + '/' + path
        } else {
          if (this.last == this.servers.length) {
            this.last = 0
          }

          var s = this.servers[this.last]
          this.last++
          return s + '/' + path
        }
      }
      return path
    }
  })

  return _Cluster
})
