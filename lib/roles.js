const fs = require('fs')

const AccessControl = require('./security/access-control')

const defaultRolesFilePath = 'roles.json'

function Roles (config) {
  this.config = config
  this.filePath = (config.security && config.security.rolesFilePath) || defaultRolesFilePath

  if (!this.config.security) {
    this.config.security = {}
  }

  this.config.security.roles = this.load()
  if (!Object.prototype.hasOwnProperty.call(this.config.security.roles, 'default')) {
    this.config.security.roles.default = []
    this.save(function () {})
  }
}

Roles.prototype.load = function () {
  try {
    return JSON.parse(fs.readFileSync(this.filePath))
  } catch (e) {
    return this.config.security.roles || AccessControl.defaultRolePermissions
  }
}

Roles.prototype.all = function () {
  return Object.keys(this.config.security.roles || {}).sort().map(function (name) {
    return {
      name,
      permissions: this.config.security.roles[name] || []
    }
  }, this)
}

Roles.prototype.find = function (name) {
  const roles = this.config.security.roles || {}
  if (!roles[name]) {
    return null
  }

  return {
    name,
    permissions: roles[name]
  }
}

Roles.prototype.save = function (cb) {
  fs.writeFile(this.filePath, JSON.stringify(this.config.security.roles || {}, null, 2), cb)
}

Roles.prototype.create = function (data, cb) {
  const name = normalizeName(data.name)
  if (!name) {
    return cb(new Error('Role name is required'))
  }

  if (this.find(name)) {
    return cb(new Error('Role already exists'))
  }

  this.config.security.roles[name] = normalizePermissions(data.permissions)
  this.save(function (err) {
    cb(err, {
      name,
      permissions: data.permissions || []
    })
  })
}

Roles.prototype.update = function (name, data, cb) {
  name = normalizeName(name)
  if (!this.find(name)) {
    return cb(new Error('Role not found'))
  }

  this.config.security.roles[name] = normalizePermissions(data.permissions)
  this.save(function (err) {
    cb(err, {
      name,
      permissions: data.permissions || []
    })
  })
}

Roles.prototype.remove = function (name, cb) {
  name = normalizeName(name)
  if (!this.find(name)) {
    return cb(new Error('Role not found'))
  }

  if (name === 'admin') {
    return cb(new Error('The admin role cannot be deleted'))
  }

  delete this.config.security.roles[name]
  this.save(cb)
}

function normalizeName (name) {
  return String(name || '').trim()
}

function normalizePermissions (permissions) {
  if (!Array.isArray(permissions)) {
    return []
  }

  return permissions.map(function (permission) {
    return String(permission || '').trim()
  }).filter(Boolean)
}

module.exports = Roles
