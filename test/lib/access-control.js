require('should')

const AccessControl = require('../../lib/security/access-control')

function requestForUser (username) {
  return {
    auth: {
      user: username
    }
  }
}

describe('AccessControl', function () {
  describe('hasPermission()', function () {
    it('should allow admins to do everything', function () {
      const accessControl = new AccessControl({
        security: {
          enabled: true,
          users: [{
            username: 'admin',
            roles: ['admin']
          }]
        }
      })
      const user = accessControl.getUser(requestForUser('admin'))

      accessControl.hasPermission(user, 'mods.delete').should.eql(true)
    })

    it('should keep operators limited to missions', function () {
      const accessControl = new AccessControl({
        security: {
          enabled: true,
          users: [{
            username: 'operator',
            roles: ['operator']
          }]
        }
      })
      const user = accessControl.getUser(requestForUser('operator'))

      accessControl.hasPermission(user, 'missions.upload').should.eql(true)
      accessControl.hasPermission(user, 'mods.delete').should.eql(false)
      accessControl.hasPermission(user, 'servers.start').should.eql(false)
    })

    it('should map steam users by SteamID64', function () {
      const accessControl = new AccessControl({
        security: {
          enabled: true,
          users: [{
            username: 'steam-admin',
            steamId: '76561198000000000',
            roles: ['admin']
          }]
        }
      })
      const user = accessControl.getUser({
        user: {
          steamId: '76561198000000000',
          displayName: 'Steam Admin'
        }
      })

      user.should.have.property('username', 'steam-admin')
      accessControl.hasPermission(user, 'settings.edit').should.eql(true)
    })
  })

  describe('canAccessServer()', function () {
    it('should block non-admin users from servers owned by someone else', function () {
      const accessControl = new AccessControl({
        security: {
          enabled: true,
          users: [{
            username: 'user',
            roles: ['user']
          }]
        }
      })
      const user = accessControl.getUser(requestForUser('user'))
      const server = {
        id: 'private-server',
        owner: {
          username: 'other-user'
        }
      }

      accessControl.canAccessServer(user, server).should.eql(false)
    })

    it('should allow admins to access owned servers', function () {
      const accessControl = new AccessControl({
        security: {
          enabled: true,
          users: [{
            username: 'admin',
            roles: ['admin']
          }]
        }
      })
      const user = accessControl.getUser(requestForUser('admin'))
      const server = {
        id: 'private-server',
        owner: {
          username: 'other-user'
        }
      }

      accessControl.canAccessServer(user, server).should.eql(true)
    })
  })
})
