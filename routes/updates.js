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
        const script = path.join(updates.projectRoot, 'scripts', 'update-helper.js')
        const updateRoot = path.join(updates.projectRoot, '.updates')
        fs.mkdirSync(updateRoot, { recursive: true })
        const logPath = path.join(updateRoot, 'update.log')
        const statePath = path.join(updateRoot, 'current.json')
        fs.writeFileSync(statePath, JSON.stringify({
          version: status.latestVersion,
          status: 'launching',
          message: 'Starting external Node.js updater',
          updatedAt: new Date().toISOString(),
          package: path.basename(downloaded.packagePath)
        }, null, 2))
        fs.appendFileSync(logPath, '\r\n[' + new Date().toISOString() + '] Launching external updater with ' + process.execPath + '\r\n')
        const log = fs.openSync(logPath, 'a')
        const args = [script, '--manifest', downloaded.manifestPath, '--root', updates.projectRoot, '--pid', String(process.pid)]
        const child = spawn(process.execPath, args, { detached: true, stdio: ['ignore', log, log], windowsHide: true })
        child.on('error', function (spawnError) {
          const message = 'Unable to start updater: ' + spawnError.message
          fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] ' + message + '\r\n')
          fs.writeFileSync(statePath, JSON.stringify({
            version: status.latestVersion,
            status: 'failed',
            message,
            updatedAt: new Date().toISOString(),
            package: path.basename(downloaded.packagePath)
          }, null, 2))
        })
        child.unref()
        fs.closeSync(log)
        auditLog.record(req, 'updates.install', { from: status.currentVersion, to: status.latestVersion, source: status.packageUrl })
        res.status(202).json({ accepted: true, from: status.currentVersion, to: status.latestVersion, log: '.updates/update.log' })
      })
    })
  })

  return router
}
