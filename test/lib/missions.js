const AdmZip = require('adm-zip')
const fs = require('fs')
const os = require('os')
const path = require('path')

const Missions = require('../../lib/missions')

describe('Missions', function () {
  it('imports a wrapped ZIP as one unpacked mission folder', function (done) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-missions-'))
    const missionsPath = path.join(root, 'mpmissions')
    fs.mkdirSync(missionsPath)
    const uploadPath = path.join(root, 'upload.zip')
    const zip = new AdmZip()
    zip.addFile('example.Altis/mission.sqm', Buffer.from('version=53;'))
    zip.addFile('example.Altis/scripts/init.sqf', Buffer.from('hint "ok";'))
    zip.writeZip(uploadPath)
    const missions = new Missions({ path: root })

    missions.handleZipUpload({ path: uploadPath, originalname: 'example.Altis.zip' }, function (err, count) {
      try {
        if (err) throw err
        count.should.equal(1)
        fs.existsSync(path.join(missionsPath, 'example.Altis', 'mission.sqm')).should.equal(true)
        fs.existsSync(path.join(missionsPath, 'example.Altis', 'example.Altis')).should.equal(false)
        fs.existsSync(path.join(missionsPath, 'example.Altis', 'scripts', 'init.sqf')).should.equal(true)
        fs.rmSync(root, { recursive: true, force: true })
        done()
      } catch (assertionError) {
        fs.rmSync(root, { recursive: true, force: true })
        done(assertionError)
      }
    })
  })

  it('imports a root-level mission ZIP into the ZIP-named folder', function (done) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-missions-'))
    fs.mkdirSync(path.join(root, 'mpmissions'))
    const uploadPath = path.join(root, 'upload.zip')
    const zip = new AdmZip()
    zip.addFile('mission.sqm', Buffer.from('version=53;'))
    zip.addFile('description.ext', Buffer.from('author="test";'))
    zip.writeZip(uploadPath)
    const missions = new Missions({ path: root })

    missions.handleZipUpload({ path: uploadPath, originalname: 'plain.Tanoa.zip' }, function (err) {
      try {
        if (err) throw err
        fs.existsSync(path.join(root, 'mpmissions', 'plain.Tanoa', 'mission.sqm')).should.equal(true)
        fs.rmSync(root, { recursive: true, force: true })
        done()
      } catch (assertionError) {
        fs.rmSync(root, { recursive: true, force: true })
        done(assertionError)
      }
    })
  })
})
