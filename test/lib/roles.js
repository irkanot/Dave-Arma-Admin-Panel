const fs = require('fs')
const path = require('path')
require('should')

const Roles = require('../../lib/roles')

describe('Roles', function () {
  const filePath = path.join(__dirname, '..', 'tmp-roles.json')

  afterEach(function () {
    try {
      fs.unlinkSync(filePath)
    } catch (e) {}
  })

  it('should create and persist role permissions', function (done) {
    const config = {
      security: {
        rolesFilePath: filePath,
        roles: {}
      }
    }
    const roles = new Roles(config)

    roles.create({
      name: 'moderator',
      permissions: ['mods.view', 'jobs.view']
    }, function (err, role) {
      if (err) {
        return done(err)
      }

      role.should.have.property('name', 'moderator')
      config.security.roles.should.have.property('moderator')

      const saved = JSON.parse(fs.readFileSync(filePath))
      saved.moderator.should.containEql('mods.view')
      done()
    })
  })
})
