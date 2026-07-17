const fs = require('fs')
const path = require('path')
require('should')

const Users = require('../../lib/users')

describe('Users', function () {
  const filePath = path.join(__dirname, '..', 'tmp-users.json')

  afterEach(function () {
    try {
      fs.unlinkSync(filePath)
    } catch (e) {}
  })

  it('should create and persist Steam users', function (done) {
    const config = {
      security: {
        usersFilePath: filePath,
        users: []
      }
    }
    const users = new Users(config)

    users.create({
      username: 'davide',
      steamId: '76561198000000000',
      roles: ['admin']
    }, function (err, user) {
      if (err) {
        return done(err)
      }

      user.should.have.property('steamId', '76561198000000000')

      const saved = JSON.parse(fs.readFileSync(filePath))
      saved[0].should.have.property('username', 'davide')
      done()
    })
  })

  it('should update Steam display names from login profile', function (done) {
    const config = {
      security: {
        usersFilePath: filePath,
        users: []
      }
    }
    const users = new Users(config)

    users.create({
      username: '76561198000000000',
      displayName: '76561198000000000',
      steamId: '76561198000000000',
      roles: ['admin']
    }, function (err) {
      if (err) {
        return done(err)
      }

      users.syncSteamProfile({
        steamId: '76561198000000000',
        displayName: 'Steam Nickname'
      }, function (err, user) {
        if (err) {
          return done(err)
        }

        user.should.have.property('displayName', 'Steam Nickname')
        done()
      })
    })
  })
})
