const events = require('events')
const fs = require('fs')

const Server = require('./server')

const filePath = 'servers.json'

const Manager = function (config, logs) {
  this.config = config
  this.logs = logs
  this.serversArr = []
  this.serversHash = {}
}

Manager.prototype = new events.EventEmitter()

Manager.prototype.addServer = function (options) {
  const server = this._addServer(options)
  this.save()
  return server
}

Manager.prototype.removeServer = function (id) {
  const server = this.serversHash[id]

  if (!server) {
    return {}
  }

  const index = this.serversArr.indexOf(server)
  if (index > -1) {
    this.serversArr.splice(index, 1)
  }
  this.save()

  if (server.pid) {
    server.stop()
  }

  return server
}

Manager.prototype._addServer = function (data) {
  const server = new Server(this.config, this.logs, data)
  this.serversArr.push(server)
  this.serversArr.sort(function (a, b) {
    return a.title.localeCompare(b.title)
  })
  this.serversHash[server.id] = server

  const self = this
  const statusChanged = function () {
    self.emit('servers')
  }
  server.on('state', statusChanged)

  return server
}

Manager.prototype.getServer = function (id) {
  return this.serversHash[id]
}

Manager.prototype.getServers = function () {
  return this.serversArr
}

Manager.prototype.load = function () {
  const self = this

  fs.readFile(filePath, function (err, data) {
    if (err) {
      console.log('Could not load any existing servers configuration, starting fresh')
      return
    }

    try {
      JSON.parse(data).forEach(function (server) {
        self._addServer(server)
      })
    } catch (e) {
      console.error('Manager load error: ' + e)
    }

    self.getServers().forEach(function (server) {
      if (server.auto_start) {
        server.start()
      }
    })
  })
}

Manager.prototype.save = function () {
  const data = []
  const self = this

  this.serversArr.sort(function (a, b) {
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  })

  this.serversHash = {}
  this.serversArr.forEach(function (server) {
    data.push({
      additionalConfigurationOptions: server.additionalConfigurationOptions,
      admin_password: server.admin_password,
      allowed_file_patching: server.allowed_file_patching,
      auto_start: server.auto_start,
      battle_eye: server.battle_eye,
      file_patching: server.file_patching,
      forcedDifficulty: server.forcedDifficulty,
      max_players: server.max_players,
      missions: server.missions,
      mods: server.mods,
      motd: server.motd,
      number_of_headless_clients: server.number_of_headless_clients,
      owner: server.owner,
      parameters: server.parameters,
      password: server.password,
      persistent: server.persistent,
      port: server.port,
      title: server.title,
      von: server.von,
      verify_signatures: server.verify_signatures
    })

    self.serversHash[server.id] = server
  })

  fs.writeFile(filePath, JSON.stringify(data), function (err) {
    if (err) {
      console.error('Manager save error: ' + err)
    } else {
      self.emit('servers')
    }
  })
}

module.exports = Manager
