const bodyParser = require('body-parser')
const express = require('express')
const request = require('supertest')

const AccessControl = require('../../lib/security/access-control')
const permissions = require('../../lib/security/permissions')
const missionsRoute = require('../../routes/missions')

function buildApp () {
  const config = {
    security: {
      enabled: true,
      roles: {
        uploader: [
          permissions.missions.upload
        ]
      },
      users: [{
        username: 'uploader',
        roles: ['uploader']
      }]
    }
  }
  const app = express()
  const accessControl = new AccessControl(config)

  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(function (req, res, next) {
    req.auth = { user: 'uploader' }
    next()
  })
  app.use('/api/missions', missionsRoute({}, accessControl, { record: function () {} }))

  return app
}

describe('Missions route', function () {
  it('should return a clear gone response for legacy Workshop downloads', function (done) {
    request(buildApp())
      .post('/api/missions/workshop')
      .send('id=123')
      .expect(410)
      .expect(/Workshop mission download was removed/)
      .end(done)
  })
})
