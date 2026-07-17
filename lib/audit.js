const fs = require('fs')

const defaultFilePath = 'audit.json'

function AuditLog (config) {
  this.filePath = (config.audit && config.audit.filePath) || defaultFilePath
}

AuditLog.prototype.all = function () {
  try {
    const entries = JSON.parse(fs.readFileSync(this.filePath))
    return entries.reverse()
  } catch (e) {
    return []
  }
}

AuditLog.prototype.record = function (req, action, data) {
  const filePath = this.filePath
  const user = req.user || (req.auth && { username: req.auth.user }) || { username: 'anonymous' }
  const entry = {
    at: new Date().toISOString(),
    user: user.username,
    action,
    data: data || {}
  }

  fs.readFile(filePath, function (err, raw) {
    let entries = []

    if (!err) {
      try {
        entries = JSON.parse(raw)
      } catch (e) {
        entries = []
      }
    }

    entries.push(entry)

    fs.writeFile(filePath, JSON.stringify(entries, null, 2), function (err) {
      if (err) {
        console.error('Audit log error: ' + err)
      }
    })
  })
}

module.exports = AuditLog
