const _ = require('lodash')
const events = require('events')
const gamedig = require('gamedig')
const Gamedig = gamedig.GameDig || gamedig
const slugify = require('slugify')

const ArmaServer = require('arma-server')

const queryInterval = 5000
const queryTypes = {
  arma1: 'arma',
  arma2: 'arma2',
  arma2oa: 'arma2',
  arma3: 'arma3',
  arma3_x64: 'arma3',
  cwa: 'operationflashpoint',
  ofp: 'operationflashpoint',
  ofpresistance: 'operationflashpoint'
}

const Server = function (config, logs, options) {
  this.config = config
  this.logs = logs
  this.update(options)
}

Server.prototype = new events.EventEmitter()

Server.prototype.createServerTitle = function (title) {
  if (this.config.prefix) {
    title = this.config.prefix + title
  }

  if (this.config.suffix) {
    title = title + this.config.suffix
  }

  return title
}

Server.prototype.generateId = function () {
  return slugify(this.title).replace(/\./g, '-')
}

Server.prototype.update = function (options) {
  this.additionalConfigurationOptions = options.additionalConfigurationOptions
  this.admin_password = options.admin_password
  this.allowed_file_patching = options.allowed_file_patching
  this.auto_start = options.auto_start
  this.battle_eye = options.battle_eye
  this.file_patching = options.file_patching
  this.forcedDifficulty = options.forcedDifficulty || null
  this.max_players = options.max_players
  this.missions = options.missions
  this.mods = options.mods || []
  this.motd = options.motd || null
  this.number_of_headless_clients = options.number_of_headless_clients || 0
  this.owner = options.owner || null
  this.password = options.password
  this.parameters = options.parameters
  this.persistent = options.persistent
  this.port = options.port || 2302
  this.title = options.title
  this.von = options.von
  this.verify_signatures = options.verify_signatures

  this.id = this.generateId()
  this.port = parseInt(this.port, 10) // If port is a string then gamedig fails
}

Server.prototype.queryStatus = function () {
  if (!this.instance) {
    return
  }

  const self = this
  Gamedig.query({
    type: queryTypes[this.config.game],
    host: '127.0.0.1',
    port: self.port
  })
    .then(function (state) {
      if (!self.instance) {
        return
      }

      self.state = state
      self.startHeadlessClientsIfNeeded()

      self.emit('state')
    })
    .catch(function () {
      if (!self.instance) {
        return
      }

      self.state = null
      self.emit('state')
    })
}

Server.prototype.getParameters = function () {
  let parameters = []

  if (this.config.parameters && Array.isArray(this.config.parameters)) {
    parameters = parameters.concat(this.config.parameters)
  }

  if (this.parameters && Array.isArray(this.parameters)) {
    parameters = parameters.concat(this.parameters)
  }

  return parameters
}

Server.prototype.getAdditionalConfigurationOptions = function () {
  let additionalConfigurationOptions = ''

  if (this.config.additionalConfigurationOptions) {
    additionalConfigurationOptions += this.config.additionalConfigurationOptions
  }

  if (this.additionalConfigurationOptions) {
    if (additionalConfigurationOptions) {
      additionalConfigurationOptions += '\n'
    }

    additionalConfigurationOptions += this.additionalConfigurationOptions
  }

  return additionalConfigurationOptions
}

Server.prototype.start = function () {
  if (this.instance) {
    return this
  }

  const parameters = this.getParameters()
  this.headlessClientInstances = []

  const server = new ArmaServer.Server({
    additionalConfigurationOptions: this.getAdditionalConfigurationOptions(),
    admins: this.config.admins,
    allowedFilePatching: this.allowed_file_patching || 1,
    battleEye: this.battle_eye ? 1 : 0,
    config: this.id,
    disableVoN: this.von ? 0 : 1,
    game: this.config.game,
    filePatching: this.file_patching || false,
    forcedDifficulty: this.forcedDifficulty || null,
    headlessClients: this.number_of_headless_clients > 0 ? ['127.0.0.1'] : null,
    hostname: this.createServerTitle(this.title),
    localClient: this.number_of_headless_clients > 0 ? ['127.0.0.1'] : null,
    missions: this.missions,
    mods: this.mods,
    motd: (this.motd && this.motd.split('\n')) || null,
    parameters,
    password: this.password,
    passwordAdmin: this.admin_password,
    path: this.config.path,
    persistent: this.persistent ? 1 : 0,
    platform: this.config.type,
    players: this.max_players,
    port: this.port,
    serverMods: this.config.serverMods,
    verifySignatures: this.verify_signatures ? 2 : 0
  })
  server.writeServerConfig()
  let instance

  try {
    instance = server.start()
  } catch (err) {
    this.state = null
    this.pid = null
    this.instance = null
    this.emit('state')
    throw err
  }

  const self = this

  instance.on('error', function (err) {
    clearInterval(self.queryStatusInterval)
    self.state = null
    self.pid = null
    self.instance = null

    self.stopHeadlessClients()
    self.emit('state')
    console.error('Failed to start server process:', err.message)
  })

  instance.on('close', function (code) {
    clearInterval(self.queryStatusInterval)
    self.state = null
    self.pid = null
    self.instance = null

    self.stopHeadlessClients()

    self.emit('state')
  })

  this.pid = instance.pid
  this.instance = instance
  this.queryStatusInterval = setInterval(function () {
    self.queryStatus()
  }, queryInterval)

  this.logs.logServerProcess(this.instance, this.id, 'server')
  this.logs.cleanupOldLogFiles()

  this.emit('state')

  return this
}

Server.prototype.startHeadlessClientsIfNeeded = function () {
  if (this.number_of_headless_clients > 0 && this.headlessClientInstances.length === 0) {
    this.startHeadlessClients()
  }
}

Server.prototype.startHeadlessClients = function () {
  const parameters = this.getParameters()
  const self = this
  const headlessClientInstances = _.times(this.number_of_headless_clients, function (i) {
    const headless = new ArmaServer.Headless({
      filePatching: self.file_patching,
      game: self.config.game,
      host: '127.0.0.1',
      mods: self.mods,
      parameters,
      password: self.password,
      path: self.config.path,
      platform: self.config.type,
      port: self.port
    })
    const headlessInstance = headless.start()
    self.logs.logServerProcess(headlessInstance, self.id, 'hc_' + (i + 1))
    return headlessInstance
  })

  this.headlessClientInstances = headlessClientInstances
}

Server.prototype.stop = function (cb) {
  let handled = false

  this.instance.on('close', function (code) {
    if (!handled) {
      handled = true

      if (cb) {
        cb()
      }
    }
  })

  this.instance.kill()

  setTimeout(function () {
    if (!handled) {
      handled = true

      if (cb) {
        cb()
      }
    }
  }, 5000)

  return this
}

Server.prototype.stopHeadlessClients = function () {
  this.headlessClientInstances.forEach(function (headlessClientInstance) {
    headlessClientInstance.kill()
  })
  this.headlessClientInstances = []
}

Server.prototype.toJSON = function () {
  return {
    additionalConfigurationOptions: this.additionalConfigurationOptions,
    admin_password: this.admin_password,
    allowed_file_patching: this.allowed_file_patching,
    auto_start: this.auto_start,
    battle_eye: this.battle_eye,
    displayTitle: this.createServerTitle(this.title),
    id: this.id,
    file_patching: this.file_patching,
    forcedDifficulty: this.forcedDifficulty,
    max_players: this.max_players,
    missions: this.missions,
    motd: this.motd,
    mods: this.mods,
    number_of_headless_clients: this.number_of_headless_clients,
    owner: this.owner,
    parameters: this.parameters,
    password: this.password,
    persistent: this.persistent,
    pid: this.pid,
    port: this.port,
    state: this.state,
    title: this.title,
    von: this.von,
    verify_signatures: this.verify_signatures
  }
}

module.exports = Server
