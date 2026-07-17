const async = require('async')
const fs = require('fs.extra')
const filesize = require('filesize')
const path = require('path')
const userhome = require('userhome')

const gamesLogFolder = {
  arma1: 'ArmA',
  arma2: 'ArmA 2',
  arma2oa: 'ArmA 2 OA',
  arma3: 'Arma 3',
  arma3_x64: 'Arma 3'
}

const numberOfLogsToKeep = 20

const Logs = function (config) {
  this.config = config

  if (this.config.type === 'linux') {
    fs.mkdirp(this.logsPath())
  }
}

Logs.generateLogFileName = function (prefix, suffix) {
  const dateStr = new Date().toISOString()
    .replace(/:/g, '-') // Replace time dividers with dash
    .replace(/T/, '_') // Remove date and time divider
    .replace(/\..+/, '') // Remove milliseconds
  return prefix + '_' + dateStr + '_' + suffix + '.rpt'
}

Logs.prototype.delete = function (filename, callback) {
  callback = callback || function () {}

  this.getLogFile(filename, function (err, logFile) {
    if (err) {
      return callback(err)
    } else {
      if (logFile && logFile.path) {
        fs.unlink(logFile.path, callback)
      } else {
        return callback(new Error('File not found'))
      }
    }
  })
}

Logs.prototype.generateLogFilePath = function (prefix, suffix) {
  return path.join(this.logsPath(), Logs.generateLogFileName(prefix, suffix))
}

Logs.prototype.logsPath = function () {
  if (this.config.type === 'linux') {
    return path.join(this.config.path, 'logs')
  }

  const gameLogFolder = gamesLogFolder[this.config.game]

  if (!gameLogFolder) {
    return null
  }

  if (this.config.type === 'windows') {
    return userhome('AppData', 'Local', gameLogFolder)
  }

  if (this.config.type === 'wine') {
    const username = process.env.USER
    return userhome('.wine', 'drive_c', 'users', username, 'Local Settings', 'Application Data', gameLogFolder)
  }

  return null
}

Logs.prototype.logFiles = function (callback) {
  const directory = this.logsPath()

  if (directory === null) {
    return callback(null, [])
  }

  fs.readdir(directory, function (err, files) {
    if (err) {
      callback(err)
      return
    }

    files = files.filter(function (file) {
      return file.endsWith('.rpt')
    }).map(function (file) {
      return {
        name: file,
        path: path.join(directory, file)
      }
    })

    async.filter(files, function (file, cb) {
      fs.stat(file.path, function (err, stat) {
        if (err) {
          return cb(err)
        }

        file.created = stat.birthtime.toISOString()
        file.modified = stat.mtime.toISOString()
        file.formattedSize = filesize(stat.size)
        file.size = stat.size
        cb(null, stat.isFile())
      })
    }, function (err, files) {
      if (err) {
        return callback(err)
      }

      files.sort(function (a, b) {
        return b.created.localeCompare(a.created) // Descending order
      })

      callback(null, files)
    })
  })
}

Logs.prototype.getLogFile = function (filename, callback) {
  this.logFiles(function (err, files) {
    if (err) {
      callback(err)
    } else {
      const validLogs = files.filter(function (file) {
        return file.name === filename
      })

      if (validLogs.length > 0) {
        callback(null, validLogs[0])
      } else {
        callback(null, null)
      }
    }
  })
}

Logs.prototype.readLogFile = function (filename, callback) {
  fs.readFile(filename, callback)
}

Logs.prototype.logServerProcess = function (serverProcess, prefix, suffix) {
  if (this.config.type !== 'linux') {
    return
  }

  let logStream = fs.createWriteStream(this.generateLogFilePath(prefix, suffix), {
    flags: 'a'
  })

  serverProcess.stdout.on('data', function (data) {
    if (logStream) {
      logStream.write(data)
    }
  })

  serverProcess.stderr.on('data', function (data) {
    if (logStream) {
      logStream.write(data)
    }
  })

  serverProcess.on('close', function (code) {
    if (logStream) {
      logStream.end()
      logStream = undefined
    }
  })

  serverProcess.on('error', function (err) {
    if (logStream && err) {
      logStream.write(err.toString())
    }
  })
}

Logs.prototype.cleanupOldLogFiles = function () {
  if (this.config.type !== 'linux') {
    return
  }

  const self = this

  self.logFiles(function (err, files) {
    if (err) {
      return
    }

    const oldLogFiles = files.slice(numberOfLogsToKeep)
    oldLogFiles.forEach(function (logFile) {
      self.delete(logFile.name)
    })
  })
}

module.exports = Logs
