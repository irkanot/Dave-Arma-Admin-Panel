const fs = require('fs')

const defaultUsersFilePath = 'users.json'

function Users (config) {
  this.config = config
  this.filePath = (config.security && config.security.usersFilePath) || defaultUsersFilePath

  if (!this.config.security) {
    this.config.security = {}
  }

  this.config.security.users = this.load()
}

Users.prototype.load = function () {
  try {
    return JSON.parse(fs.readFileSync(this.filePath))
  } catch (e) {
    return this.config.security.users || []
  }
}

Users.prototype.all = function () {
  return this.config.security.users
}

Users.prototype.find = function (username) {
  return this.all().filter(function (user) {
    return user.username === username
  })[0] || null
}

Users.prototype.findBySteamId = function (steamId) {
  return this.all().filter(function (user) {
    return user.steamId === steamId
  })[0] || null
}

Users.prototype.save = function (cb) {
  fs.writeFile(this.filePath, JSON.stringify(this.all(), null, 2), cb)
}

Users.prototype.create = function (data, cb) {
  if (!data.username) {
    return cb(new Error('Username is required'))
  }

  if (this.find(data.username)) {
    return cb(new Error('User already exists'))
  }

  const user = {
    username: data.username,
    displayName: data.displayName || data.username,
    steamId: data.steamId || '',
    roles: data.roles || ['default'],
    serverIds: data.serverIds || []
  }

  this.all().push(user)
  this.save(function (err) {
    cb(err, user)
  })
}

Users.prototype.update = function (username, data, cb) {
  const user = this.find(username)

  if (!user) {
    return cb(new Error('User not found'))
  }

  user.steamId = data.steamId || user.steamId || ''
  user.displayName = data.displayName || user.displayName || user.username
  user.roles = data.roles || user.roles || ['default']
  user.serverIds = data.serverIds || user.serverIds || []

  this.save(function (err) {
    cb(err, user)
  })
}

Users.prototype.syncSteamProfile = function (profile, cb) {
  const steamId = profile && profile.steamId
  const user = steamId ? this.findBySteamId(steamId) : null

  if (!user) {
    return cb(null, null)
  }

  const displayName = normalizeDisplayName(profile.displayName, steamId)
  if (!displayName || user.displayName === displayName) {
    return cb(null, user)
  }

  user.displayName = displayName
  this.save(function (err) {
    cb(err, user)
  })
}

Users.prototype.remove = function (username, cb) {
  const users = this.all()
  const nextUsers = users.filter(function (user) {
    return user.username !== username
  })

  if (nextUsers.length === users.length) {
    return cb(new Error('User not found'))
  }

  this.config.security.users = nextUsers
  this.save(cb)
}

module.exports = Users

function normalizeDisplayName (displayName, steamId) {
  displayName = String(displayName || '').trim()
  return displayName && displayName !== steamId ? displayName : ''
}
