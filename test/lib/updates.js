const fs = require('fs')
const http = require('http')
const path = require('path')
require('should')

const Updates = require('../../lib/updates')

describe('Updates', function () {
  it('should compare semantic versions', function () {
    Updates.compareVersions('1.2.0', '1.1.9').should.be.above(0)
    Updates.compareVersions('1.0.0', '1.0.0').should.equal(0)
  })

  it('should expose a newer online release', function (done) {
    const root = path.join(__dirname, '..', 'tmp-updates')
    const releases = path.join(root, 'Releases')
    fs.mkdirSync(releases, { recursive: true })
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.0.0' }))
    const server = http.createServer(function (req, res) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ version: '1.1.0', package: 'release.zip', sha256: 'abc' }))
    })
    server.listen(0, '127.0.0.1', function () {
      const port = server.address().port
      const feedUrl = 'http://127.0.0.1:' + port + '/latest.json'
      new Updates(root, { updates: { feedUrl } }).status(function (err, status) {
        server.close()
        fs.rmSync(root, { recursive: true, force: true })
        if (err) return done(err)
        status.available.should.equal(true)
        status.packageUrl.should.equal('http://127.0.0.1:' + port + '/release.zip')
        done()
      })
    })
  })
})
