const request = require('supertest')

const app = require('../app')

function requestPath (path, contentType, done) {
  request(app)
    .get(path)
    .expect('Content-Type', contentType)
    .expect(200)
    .end(done)
}

function protectedPath (path, done) {
  request(app)
    .get(path)
    .expect('Content-Type', /json/)
    .expect(401)
    .end(done)
}

describe('App', function () {
  it('should serve main page', function (done) {
    requestPath('/', /html/, done)
  })

  it('should serve logs', function (done) {
    protectedPath('/api/logs', done)
  })

  it('should serve missions', function (done) {
    protectedPath('/api/missions', done)
  })

  it('should serve mods', function (done) {
    protectedPath('/api/mods', done)
  })

  it('should serve servers', function (done) {
    protectedPath('/api/servers', done)
  })

  it('should serve settings', function (done) {
    protectedPath('/api/settings', done)
  })

  it('should serve current auth state', function (done) {
    requestPath('/api/me', /json/, done)
  })

  it('should serve users', function (done) {
    protectedPath('/api/users', done)
  })

  it('should serve roles', function (done) {
    protectedPath('/api/roles', done)
  })

  it('should serve permissions', function (done) {
    protectedPath('/api/permissions', done)
  })

  it('should serve audit log', function (done) {
    protectedPath('/api/audit', done)
  })

  it('should serve jobs', function (done) {
    protectedPath('/api/jobs', done)
  })
})
