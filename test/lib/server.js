require('should')

const Server = require('../../lib/server.js')

describe('Server', function () {
  describe('generateId()', function () {
    it('should include title', function () {
      const server = new Server(null, null, { title: 'title.with.lot.of.dots' })
      server.generateId().should.eql('title-with-lot-of-dots')
    })
  })

  describe('toJSON()', function () {
    it('should include title', function () {
      const server = new Server(null, null, { title: 'test' })
      server.toJSON().should.have.property('title', 'test')
    })
  })

  describe('createServerTitle()', function () {
    it('should apply the configured global prefix', function () {
      const server = new Server({ prefix: '[BVE] ', suffix: '' }, null, { title: 'Training' })
      server.createServerTitle(server.title).should.equal('[BVE] Training')
    })
  })
})
