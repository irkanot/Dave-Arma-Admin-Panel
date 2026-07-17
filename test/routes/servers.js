require('should')

const bodyParser = require('body-parser')
const express = require('express')
const request = require('supertest')

const AccessControl = require('../../lib/security/access-control')
const permissions = require('../../lib/security/permissions')
const serversRoute = require('../../routes/servers')

function buildApp (username) {
  const config = {
    security: {
      enabled: true,
      roles: {
        editor: [
          permissions.servers.view,
          permissions.servers.edit
        ]
      },
      users: [{
        username: 'admin',
        steamId: '76561198000000001',
        roles: ['admin']
      }, {
        username: 'owner',
        displayName: 'Steam Owner',
        steamId: '76561198000000002',
        roles: ['user']
      }, {
        username: 'editor',
        steamId: '76561198000000003',
        roles: ['editor']
      }]
    }
  }
  const accessControl = new AccessControl(config)
  const users = {
    find: function (name) {
      return config.security.users.filter(function (user) {
        return user.username === name
      })[0] || null
    }
  }
  const server = {
    id: 'test',
    title: 'Test',
    owner: {
      username: 'editor',
      steamId: '76561198000000003'
    },
    update: function (data) {
      this.title = data.title
      this.owner = data.owner
    }
  }
  const manager = {
    addServer: function (data) {
      return data
    },
    getServer: function () {
      return server
    },
    getServers: function () {
      return [server]
    },
    save: function () {}
  }
  const auditLog = {
    record: function () {}
  }
  const app = express()

  app.use(bodyParser.json())
  app.use(function (req, res, next) {
    req.auth = { user: username }
    next()
  })
  app.use('/api/servers', serversRoute(manager, null, accessControl, auditLog, users))

  return app
}

describe('Servers route', function () {
  it('should normalize server owners assigned by admins', function (done) {
    request(buildApp('admin'))
      .post('/api/servers')
      .send({
        title: 'Owned server',
        owner: {
          username: 'owner',
          steamId: 'wrong'
        }
      })
      .expect(200)
      .expect(function (res) {
        res.body.owner.should.eql({
          displayName: 'Steam Owner',
          username: 'owner',
          steamId: '76561198000000002'
        })
      })
      .end(done)
  })

  it('should keep existing owner when non-admins edit a server', function (done) {
    request(buildApp('editor'))
      .put('/api/servers/test')
      .send({
        title: 'Updated',
        owner: {
          username: 'admin',
          steamId: '76561198000000001'
        }
      })
      .expect(200)
      .expect(function (res) {
        res.body.owner.should.eql({
          username: 'editor',
          steamId: '76561198000000003'
        })
      })
      .end(done)
  })
})
