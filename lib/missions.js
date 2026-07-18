const async = require('async')
const AdmZip = require('adm-zip')
const events = require('events')
const filesize = require('filesize')
const fs = require('fs.extra')
const path = require('path')

const Missions = function (config) {
  this.config = config
  this.missions = []

  this.updateMissions()
}

Missions.prototype = new events.EventEmitter()

Missions.prototype.missionsPath = function () {
  return path.join(this.config.path, 'mpmissions')
}

Missions.prototype.missionPath = function (name) {
  return path.join(this.missionsPath(), name)
}

Missions.prototype.updateMissions = function (cb) {
  const self = this
  fs.readdir(this.missionsPath(), function (err, files) {
    if (err) {
      console.log(err)

      if (cb) {
        return cb(err)
      }

      return
    }

    async.map(files, function (filename, cb) {
      fs.stat(self.missionPath(filename), function (err, stat) {
        if (err) {
          console.log(err)
          return cb(err)
        }

        const filenameWithoutPbo = path.basename(filename, '.pbo')
        let worldName = path.extname(filenameWithoutPbo)
        const missionName = path.basename(filenameWithoutPbo, worldName)
        worldName = worldName.replace('.', '')

        cb(null, {
          dateCreated: new Date(stat.ctime),
          dateModified: new Date(stat.mtime),
          missionName,
          name: filename,
          size: stat.size,
          sizeFormatted: filesize(stat.size),
          worldName
        })
      })
    }, function (err, missions) {
      if (!err) {
        self.missions = missions
        self.emit('missions', missions)
      }

      if (cb) {
        cb(err, missions)
      }
    })
  })
}

Missions.prototype.handleUpload = function (uploadedFile, cb) {
  const filename = decodeURI(uploadedFile.originalname.toLowerCase())
  const self = this
  fs.move(uploadedFile.path, path.join(this.missionsPath(), filename), function (err) {
    self.updateMissions()

    if (cb) {
      cb(err)
    }
  })
}

Missions.prototype.handleZipUpload = function (uploadedFile, cb) {
  const self = this
  let zip

  try {
    zip = new AdmZip(uploadedFile.path)
  } catch (err) {
    return cb(err)
  }

  const allEntries = zip.getEntries()
  if (allEntries.length > 10000) return finish(new Error('Zip archive contains too many entries'))
  const unsafeEntry = allEntries.find(function (entry) { return !safeZipPath(entry.entryName) })
  if (unsafeEntry) return finish(new Error('Zip archive contains an unsafe path: ' + unsafeEntry.entryName))

  const missionEntries = allEntries.filter(function (entry) {
    return !entry.isDirectory && path.extname(entry.entryName).toLowerCase() === '.pbo'
  })

  if (missionEntries.length > 0) {
    return async.parallelLimit(
      missionEntries.map(function (entry) {
        return function (next) {
          const filename = path.basename(entry.entryName).toLowerCase()
          fs.writeFile(self.missionPath(filename), entry.getData(), next)
        }
      }),
      4,
      function (err) { finish(err, missionEntries.length) }
    )
  }

  const files = allEntries.filter(function (entry) {
    return !entry.isDirectory && !/^(__MACOSX|\.DS_Store)(\/|$)/i.test(normalizeZipPath(entry.entryName))
  })
  if (files.length === 0) return finish(new Error('Zip archive is empty'))

  const prefix = commonRoot(files.map(function (entry) { return normalizeZipPath(entry.entryName) }))
  const relativeFiles = files.map(function (entry) {
    const normalized = normalizeZipPath(entry.entryName)
    return { entry, relative: prefix ? normalized.slice(prefix.length + 1) : normalized }
  }).filter(function (item) { return item.relative })

  if (!relativeFiles.some(function (item) { return item.relative.toLowerCase() === 'mission.sqm' })) {
    return finish(new Error('Zip archive is not a valid unpacked mission: mission.sqm must be in the mission root'))
  }

  const missionName = path.basename(decodeURI(uploadedFile.originalname), path.extname(uploadedFile.originalname))
  if (!safeMissionName(missionName)) return finish(new Error('Invalid mission folder name: ' + missionName))
  const destination = self.missionPath(missionName)
  if (fs.existsSync(destination)) return finish(new Error('Mission already exists: ' + missionName))

  try {
    fs.mkdirSync(destination, { recursive: true })
    relativeFiles.forEach(function (item) {
      const output = path.join(destination, ...item.relative.split('/'))
      fs.mkdirSync(path.dirname(output), { recursive: true })
      fs.writeFileSync(output, item.entry.getData())
    })
    finish(null, 1)
  } catch (err) {
    fs.rmSync(destination, { recursive: true, force: true })
    finish(err)
  }

  function finish (err, count) {
    fs.unlink(uploadedFile.path, function () {})
    self.updateMissions(function (refreshError) {
      cb(err || refreshError, count || 0)
    })
  }
}

Missions.prototype.delete = function (missionName, cb) {
  const self = this
  fs.rm(path.join(this.missionsPath(), missionName), { recursive: true, force: false }, function (err) {
    self.updateMissions()

    if (cb) {
      cb(err)
    }
  })
}

function normalizeZipPath (value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
}

function safeZipPath (value) {
  const normalized = normalizeZipPath(value)
  return normalized.length > 0 && !path.posix.isAbsolute(normalized) && !normalized.split('/').some(function (part) {
    return part === '..' || part.indexOf('\0') !== -1
  })
}

function commonRoot (names) {
  const firstParts = names.map(function (name) { return name.split('/')[0] })
  return names.every(function (name) { return name.indexOf('/') !== -1 }) && firstParts.every(function (part) { return part === firstParts[0] }) ? firstParts[0] : ''
}

function safeMissionName (name) {
  return !!name && name !== '.' && name !== '..' && !/[\\/:*?"<>|]/.test(name)
}

module.exports = Missions
