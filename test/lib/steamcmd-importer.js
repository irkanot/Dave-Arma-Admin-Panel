require('should')
const path = require('path')
const fs = require('fs')

const importer = require('../../lib/mods/steamcmdImporter')

describe('SteamCMD importer', function () {
  it('should derive default download and deploy paths', function () {
    const config = {
      path: 'C:\\ArmaServer'
    }

    importer.downloadPath(config).should.equal(path.join('C:\\ArmaServer', '_steamcmd_workshop'))
    importer.workshopItemPath(config, '123').should.equal(path.join('C:\\ArmaServer', '_steamcmd_workshop', 'steamapps', 'workshop', 'content', '107410', '123'))
    importer.deployedModPath(config, '123').should.equal(path.join('C:\\ArmaServer', '@workshop_123'))
  })

  it('should accept a SteamCMD directory on Windows', function () {
    const config = {
      path: 'C:\\ArmaServer',
      steamCmd: {
        executable: __dirname
      }
    }

    importer.executablePath(config).should.equal(path.join(__dirname, process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh'))
  })

  it('should derive clean mod folder names from Workshop metadata', function () {
    const tempPath = path.join(__dirname, '..', 'tmp-workshop-meta')

    try {
      fs.mkdirSync(tempPath)
    } catch (e) {}

    fs.writeFileSync(path.join(tempPath, 'meta.cpp'), 'publishedid = 450814997;\nname = "CBA_A3";\n')

    importer.modFolderName(tempPath, '450814997').should.equal('@CBA_A3')

    fs.rmSync(tempPath, { recursive: true, force: true })
  })

  it('should fall back to Workshop ID for nameless items', function () {
    importer.modFolderName(__dirname, '123').should.equal('@workshop_123')
  })

  it('should detect installed Workshop IDs from existing mod metadata', function () {
    const tempRoot = path.join(__dirname, '..', 'tmp-installed-mods')
    const modPath = path.join(tempRoot, '@CBA_A3')

    fs.mkdirSync(modPath, { recursive: true })
    fs.writeFileSync(path.join(modPath, 'meta.cpp'), 'publishedid = 450814997;\nname = "CBA_A3";\n')

    importer.installedWorkshopIds({ path: tempRoot }).should.have.property('450814997', '@CBA_A3')

    fs.rmSync(tempRoot, { recursive: true, force: true })
  })

  it('should keep installed items eligible for SteamCMD validation', function () {
    const installed = {}
    installed['450814997'] = '@CBA_A3'
    importer.idsToDownload(['450814997', '123'], installed)
      .should.eql(['450814997', '123'])
  })
})
