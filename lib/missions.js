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

  const missionEntries = zip.getEntries().filter(function (entry) {
    return !entry.isDirectory && path.extname(entry.entryName).toLowerCase() === '.pbo'
  })

  if (missionEntries.length === 0) {
    return cb(new Error('Zip archive does not contain any .pbo mission file'))
  }

  async.parallelLimit(
    missionEntries.map(function (entry) {
      return function (next) {
        const filename = path.basename(entry.entryName).toLowerCase()
        fs.writeFile(self.missionPath(filename), entry.getData(), next)
      }
    }),
    4,
    function (err) {
      fs.unlink(uploadedFile.path, function () {})
      self.updateMissions()
      cb(err, missionEntries.length)
    }
  )
}

Missions.prototype.delete = function (missionName, cb) {
  const self = this
  fs.unlink(path.join(this.missionsPath(), missionName), function (err) {
    self.updateMissions()

    if (cb) {
      cb(err)
    }
  })
}

module.exports = Missions
