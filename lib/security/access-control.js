const permissions = require('./permissions')

const rolePermissions = {
  admin: ['*'],
  operator: [
    permissions.missions.view,
    permissions.missions.upload
  ],
  user: [
    permissions.servers.view,
    permissions.servers.start
  ]
}

function normalizeSecurityConfig (config) {
  return config.security || {}
}

function normalizeUsers (securityConfig) {
  return securityConfig.users || []
}

function permissionListForRole (securityConfig, role) {
  const customRoles = securityConfig.roles || {}

  if (customRoles[role]) {
    return customRoles[role]
  }

  return rolePermissions[role] || []
}

function hasWildcard (permissions) {
  return permissions.indexOf('*') !== -1
}

function AccessControl (config) {
  this.config = config
  this.securityConfig = normalizeSecurityConfig(config)
  this.enabled = this.securityConfig.enabled === true
}

AccessControl.prototype.getUser = function (req) {
  if (req.user && req.user.roles) {
    return req.user
  }

  const steamId = req.user && req.user.steamId
  const username = req.auth && req.auth.user

  if (!username && !steamId) {
    return null
  }

  const users = normalizeUsers(this.securityConfig)

  for (let i = 0; i < users.length; i++) {
    if (
      (username && users[i].username === username) ||
      (steamId && users[i].steamId === steamId)
    ) {
      return users[i]
    }
  }

  return {
    username: username || steamId,
    steamId,
    displayName: req.user && req.user.displayName,
    roles: this.securityConfig.defaultRoles || ['user'],
    serverIds: []
  }
}

AccessControl.prototype.getUserPermissions = function (user) {
  let allPermissions = []
  const roles = user.roles || []

  roles.forEach(function (role) {
    allPermissions = allPermissions.concat(permissionListForRole(this.securityConfig, role))
  }, this)

  return allPermissions
}

AccessControl.prototype.hasPermission = function (user, permission) {
  if (!this.enabled) {
    return true
  }

  if (!user) {
    return false
  }

  const userPermissions = this.getUserPermissions(user)
  return hasWildcard(userPermissions) || userPermissions.indexOf(permission) !== -1
}

AccessControl.prototype.isAdmin = function (user) {
  return user && hasWildcard(this.getUserPermissions(user))
}

AccessControl.prototype.canAccessServer = function (user, server) {
  if (!this.enabled || !server) {
    return true
  }

  if (!user) {
    return false
  }

  if (this.isAdmin(user)) {
    return true
  }

  if (server.owner && server.owner.username && server.owner.username !== user.username) {
    return false
  }

  if (server.owner && server.owner.steamId && server.owner.steamId !== user.steamId) {
    return false
  }

  if (!user.serverIds || user.serverIds.length === 0) {
    return true
  }

  return user.serverIds.indexOf(server.id) !== -1
}

AccessControl.prototype.requirePermission = function (permission, getResource) {
  const self = this

  return function (req, res, next) {
    const user = self.getUser(req)

    if (self.enabled && !user) {
      return res.status(401).json({
        error: 'Authentication required',
        loginUrl: '/auth/steam'
      })
    }

    if (!self.hasPermission(user, permission)) {
      return res.status(403).json({ error: 'Forbidden', permission })
    }

    if (getResource) {
      const resource = getResource(req)
      if (resource && !self.canAccessServer(user, resource)) {
        return res.status(403).json({ error: 'Forbidden', permission })
      }
    }

    req.user = user
    next()
  }
}

AccessControl.permissions = permissions
AccessControl.defaultRolePermissions = rolePermissions

module.exports = AccessControl
