const fs = require('fs')
const path = require('path')
require('should')

const Settings = require('../../lib/settings')

describe('Settings', function () {
  const filePath = path.join(__dirname, '..', 'tmp-settings.json')

  afterEach(function () {
    try {
      fs.unlinkSync(filePath)
    } catch (e) {}
  })

  it('should save runtime settings and apply them to config', function (done) {
    const config = {
      game: 'arma3',
      path: '/old/path',
      type: 'linux',
      prefix: '[OLD] ',
      steamAuth: {
        enabled: false,
        baseUrl: 'http://localhost:3000',
        sessionSecret: 'old-secret',
        apiKey: 'old-api-key'
      },
      steamCmd: {},
      updates: { feedUrl: 'http://old/releases/latest.json' },
      settingsFilePath: filePath
    }
    const settings = new Settings(config)

    settings.save({
      game: 'arma3_x64',
      path: '/new/path',
      type: 'windows',
      prefix: '[BVE] ',
      steamAuth: {
        enabled: false,
        baseUrl: 'http://127.0.0.1:3000',
        sessionSecret: 'new-secret',
        apiKey: ''
      },
      steamCmd: {
        executable: 'C:\\steamcmd\\steamcmd.exe',
        downloadPath: 'D:\\steam-workshop',
        username: 'anonymous',
        password: 'not-saved'
      },
      updates: {
        feedUrl: 'https://updates.example.test/latest.json'
      }
    }, function (err) {
      if (err) {
        return done(err)
      }

      config.should.have.property('game', 'arma3_x64')
      config.should.have.property('path', '/new/path')
      config.should.have.property('type', 'windows')
      config.should.have.property('prefix', '[BVE] ')
      config.steamAuth.should.have.property('enabled', true)
      config.steamAuth.should.have.property('baseUrl', 'http://127.0.0.1:3000')
      config.steamAuth.should.have.property('sessionSecret', 'new-secret')
      config.steamAuth.should.have.property('apiKey', 'old-api-key')
      config.steamCmd.should.have.property('executable', 'C:\\steamcmd\\steamcmd.exe')
      config.steamCmd.should.have.property('password', 'not-saved')
      config.steamCmd.should.have.property('steamGuardCode', '')
      config.updates.should.have.property('feedUrl', 'https://updates.example.test/latest.json')

      const saved = JSON.parse(fs.readFileSync(filePath))
      saved.should.have.property('path', '/new/path')
      saved.should.have.property('prefix', '[BVE] ')
      saved.steamAuth.should.have.property('enabled', true)
      saved.steamAuth.should.have.property('baseUrl', 'http://127.0.0.1:3000')
      saved.steamAuth.should.have.property('sessionSecretConfigured', true)
      saved.steamAuth.should.have.property('apiKeyConfigured', true)
      saved.steamAuth.should.have.property('sessionSecret', 'new-secret')
      saved.steamAuth.should.have.property('apiKey', 'old-api-key')
      saved.steamCmd.should.have.property('downloadPath', 'D:\\steam-workshop')
      saved.steamCmd.should.have.property('password', 'not-saved')
      saved.steamCmd.should.have.property('passwordConfigured', true)
      saved.steamCmd.should.not.have.property('steamGuardCode')
      saved.updates.should.have.property('feedUrl', 'https://updates.example.test/latest.json')
      done()
    })
  })
})
