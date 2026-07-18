const fs = require('fs')
const os = require('os')
const path = require('path')
const express = require('express')
const request = require('supertest')

const createUpdatesRoute = require('../../routes/updates')

describe('Updates route', function () {
  it('starts the batch runner with manifest, root, PID and Node path', function (done) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-update-route-'))
    const scripts = path.join(root, 'scripts')
    const releases = path.join(root, 'Releases')
    fs.mkdirSync(scripts)
    fs.mkdirSync(releases)
    const runner = path.join(scripts, 'update-runner.bat')
    const argsOutput = path.join(root, 'runner-args.txt')
    fs.writeFileSync(runner, '@echo off\r\necho %* > "' + argsOutput + '"\r\n')
    const manifestPath = path.join(releases, 'latest.json')
    const packagePath = path.join(releases, 'update.zip')
    fs.writeFileSync(manifestPath, '{}')
    fs.writeFileSync(packagePath, 'test')

    const updates = {
      projectRoot: root,
      status: function (callback) {
        callback(null, { currentVersion: '1.0.0', latestVersion: '1.0.1', available: true, packageUrl: 'https://example.invalid/update.zip' })
      },
      download: function (status, callback) {
        callback(null, { manifestPath, packagePath })
      }
    }
    const accessControl = { requirePermission: function () { return function (req, res, next) { next() } } }
    const auditLog = { record: function () {} }
    const app = express()
    app.use('/api/updates', createUpdatesRoute(updates, accessControl, auditLog))

    request(app).post('/api/updates/install').expect(202).end(function (err, response) {
      if (err) return done(err)
      response.body.should.have.property('updaterPid')
      setTimeout(function () {
        try {
          const values = fs.readFileSync(argsOutput, 'utf8')
          values.should.match(/latest\.json/)
          values.should.match(/node\.exe/i)
          fs.rmSync(root, { recursive: true, force: true })
          done()
        } catch (assertionError) {
          done(assertionError)
        }
      }, 500)
    })
  })
})
