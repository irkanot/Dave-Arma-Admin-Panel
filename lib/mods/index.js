const async = require('async')
const events = require('events')
const filesize = require('filesize')
const fs = require('fs.extra')
const path = require('path')

const folderSize = require('./folderSize')
const modFile = require('./modFile')
const steamMeta = require('./steamMeta')

const Mods = function (config) {
  this.config = config
  this.mods = []
}

Mods.prototype = new events.EventEmitter()

Mods.prototype.delete = function (mod, cb) {
  const self = this
  fs.rmrf(path.join(this.config.path, mod), function (err) {
    cb(err)

    if (!err) {
      self.updateMods()
    }
  })
}

Mods.prototype.updateMods = function () {
  const self = this
  fs.readdir(self.config.path, function (err, files) {
    if (err) {
      console.log(err)
      return
    }

    const mods = files.filter(function (file) {
      return self.isModDirectory(file)
    })

    async.map(mods, self.resolveModData.bind(self), function (err, mods) {
      if (err) {
        console.log(err)
        return
      }

      self.mods = mods
      self.emit('mods', mods)
    })
  })
}

Mods.prototype.isModDirectory = function (name) {
  if (name.indexOf('@workshop_') === 0 || name === '_steamcmd_workshop') {
    return false
  }

  const isModName = name.charAt(0) === '@' || ['csla', 'ef', 'gm', 'rf', 'spe', 'vn', 'ws'].indexOf(name) !== -1
  if (!isModName) {
    return false
  }

  const fullPath = path.join(this.config.path, name)
  const addonsPath = path.join(fullPath, 'addons')

  try {
    const stat = fs.lstatSync(fullPath)
    return stat.isDirectory() || stat.isSymbolicLink() || fs.existsSync(addonsPath)
  } catch (err) {
    return false
  }
}

Mods.prototype.resolveModData = function (modPath, cb) {
  const self = this
  const linkInfo = self.linkInfo(modPath)
  async.parallel({
    folderSize: function (cb) {
      folderSize(modPath, self.config, cb)
    },
    modFile: function (cb) {
      modFile(modPath, self.config, cb)
    },
    steamMeta: function (cb) {
      steamMeta(modPath, self.config, cb)
    }
  }, function (err, results) {
    if (err) {
      return cb(err)
    }

    cb(null, {
      name: modPath,
      size: results.folderSize,
      formattedSize: filesize(results.folderSize),
      modFile: results.modFile,
      steamMeta: results.steamMeta,
      linkTarget: linkInfo.target,
      linkTargetExists: linkInfo.exists,
      missingTarget: !!(linkInfo.target && !linkInfo.exists)
    })
  })
}

Mods.prototype.linkTarget = function (modPath) {
  return this.linkInfo(modPath).target
}

Mods.prototype.linkInfo = function (modPath) {
  try {
    const fullPath = path.join(this.config.path, modPath)
    const stat = fs.lstatSync(fullPath)
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath)
      return {
        target,
        exists: fs.existsSync(target)
      }
    }
  } catch (err) {}

  return {
    target: null,
    exists: true
  }
}

module.exports = Mods
