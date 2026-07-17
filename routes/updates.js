const path = require('path')
const fs = require('fs')
const spawn = require('child_process').spawn
const permissions = require('../lib/security/permissions')

module.exports = function (updates, accessControl, auditLog) {
  const router = require('express').Router()

  router.get('/', accessControl.requirePermission(permissions.settings.view), function (req, res) {
    updates.status(function (err, status) {
      if (err) return res.status(500).send(err.message)
      res.json(status)
    })
  })

  router.post('/install', accessControl.requirePermission(permissions.settings.edit), function (req, res) {
    updates.status(function (err, status) {
      if (err) return res.status(500).send(err.message)
      if (!status.available) return res.status(409).send('No newer online release is available')

      updates.download(status, function (err, downloaded) {
        if (err) return res.status(502).send(err.message)
        const script = path.join(updates.projectRoot, 'scripts', 'apply-update.ps1')
        const updateRoot = path.join(updates.projectRoot, '.updates')
        fs.mkdirSync(updateRoot, { recursive: true })
        const logPath = path.join(updateRoot, 'update.log')
        const log = fs.openSync(logPath, 'a')
        const args = [
          '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script,
          '-Manifest', downloaded.manifestPath,
          '-InstallRoot', updates.projectRoot,
          '-ProcessId', String(process.pid),
          '-RestartApplication'
        ]
        const child = spawn('powershell.exe', args, { detached: true, stdio: ['ignore', log, log], windowsHide: true })
        child.unref()
        fs.closeSync(log)
        auditLog.record(req, 'updates.install', { from: status.currentVersion, to: status.latestVersion, source: status.packageUrl })
        res.status(202).json({ accepted: true, from: status.currentVersion, to: status.latestVersion, log: '.updates/update.log' })
      })
    })
  })

  return router
}
