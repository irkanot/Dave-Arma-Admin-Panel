const async = require('async')
const fs = require('fs')
const glob = require('glob')
const path = require('path')

module.exports = function (modPath, config, callback) {
  const basePath = path.resolve(config.path, modPath)
  let total = 0

  try {
    const stat = fs.lstatSync(basePath)
    if (stat.isSymbolicLink() && !fs.existsSync(path.join(basePath, 'addons'))) {
      return callback(null, 0)
    }
  } catch (err) {
    return callback(null, 0)
  }

  glob('**/*', { cwd: basePath, dot: true }, function (err, files) {
    if (err) {
      return callback(null, 0)
    }

    async.forEach(files, function (file, cb) {
      fs.stat(path.join(basePath, file), function stat (err, stats) {
        if (!err && (stats.isFile() || stats.isSymbolicLink())) {
          const size = stats.size || 0
          total += size
        }
        cb()
      })
    }, function (err) {
      callback(err, total)
    })
  })
}
