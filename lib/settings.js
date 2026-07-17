const _ = require('lodash')
const fs = require('fs')

const defaultSettingsFilePath = 'settings.json'
const githubUpdateFeed = 'https://github.com/irkanot/Dave-Arma-Admin-Panel/releases/latest/download/latest.json'

const normalizeUpdateFeed = function (feedUrl, baseUrl) {
  if (!feedUrl) return githubUpdateFeed

  const normalizedFeed = feedUrl.replace(/\/$/, '')
  const legacyFeed = baseUrl && baseUrl.replace(/\/$/, '') + '/releases/latest.json'
  return normalizedFeed === legacyFeed ? githubUpdateFeed : feedUrl
}

const Settings = function (config) {
  this.config = config
  this.filePath = config.settingsFilePath || defaultSettingsFilePath
  this.load()
  this.config.updates = this.config.updates || {}
  this.config.updates.feedUrl = normalizeUpdateFeed(this.config.updates.feedUrl, this.config.steamAuth && this.config.steamAuth.baseUrl)
}

Settings.prototype.getPublicSettings = function () {
  return _.extend(_.pick(this.config, ['game', 'path', 'type', 'prefix']), {
    steamAuthEnabled: true,
    steamAuth: _.extend({ enabled: true }, _.pick(this.config.steamAuth || {}, ['baseUrl']), {
      sessionSecretConfigured: !!(this.config.steamAuth && this.config.steamAuth.sessionSecret),
      apiKeyConfigured: !!(this.config.steamAuth && this.config.steamAuth.apiKey)
    }),
    steamCmd: _.extend(_.pick(this.config.steamCmd || {}, ['executable', 'downloadPath', 'username']), {
      passwordConfigured: !!(this.config.steamCmd && this.config.steamCmd.password)
    }),
    updates: _.pick(this.config.updates || {}, ['feedUrl'])
  })
}

Settings.prototype.load = function () {
  let data

  try {
    data = JSON.parse(fs.readFileSync(this.filePath))
  } catch (e) {
    return
  }

  this.apply(data)
}

Settings.prototype.apply = function (data) {
  const settings = _.pick(data, ['game', 'path', 'type', 'prefix'])

  Object.keys(settings).forEach(function (key) {
    if (settings[key] || key === 'prefix') {
      this.config[key] = settings[key]
    }
  }, this)

  if (data.steamCmd) {
    this.config.steamCmd = this.config.steamCmd || {}
    _.extend(this.config.steamCmd, _.pick(data.steamCmd, ['executable', 'downloadPath', 'username']))

    if (data.steamCmd.password) {
      this.config.steamCmd.password = data.steamCmd.password
    }

    this.config.steamCmd.steamGuardCode = data.steamCmd.steamGuardCode || ''
  }

  if (data.steamAuth) {
    this.config.steamAuth = this.config.steamAuth || {}
    this.config.steamAuth.enabled = true

    _.extend(this.config.steamAuth, _.pick(data.steamAuth, ['baseUrl']))

    if (data.steamAuth.sessionSecret) {
      this.config.steamAuth.sessionSecret = data.steamAuth.sessionSecret
    }

    if (data.steamAuth.apiKey) {
      this.config.steamAuth.apiKey = data.steamAuth.apiKey
    }
  }

  if (data.updates) {
    this.config.updates = this.config.updates || {}
    _.extend(this.config.updates, _.pick(data.updates, ['feedUrl']))
    this.config.updates.feedUrl = normalizeUpdateFeed(this.config.updates.feedUrl, this.config.steamAuth && this.config.steamAuth.baseUrl)
  }
}

Settings.prototype.save = function (data, cb) {
  const settings = _.pick(data, ['game', 'path', 'type', 'prefix', 'steamCmd', 'steamAuth', 'updates'])
  this.apply(settings)

  const savedSettings = this.getPublicSettings()

  if (this.config.steamCmd && this.config.steamCmd.password) {
    savedSettings.steamCmd.password = this.config.steamCmd.password
  }

  if (this.config.steamAuth && this.config.steamAuth.sessionSecret) {
    savedSettings.steamAuth.sessionSecret = this.config.steamAuth.sessionSecret
  }

  if (this.config.steamAuth && this.config.steamAuth.apiKey) {
    savedSettings.steamAuth.apiKey = this.config.steamAuth.apiKey
  }

  fs.writeFile(this.filePath, JSON.stringify(savedSettings, null, 2), cb)
}

module.exports = Settings
