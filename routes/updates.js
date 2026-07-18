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
        const script = path.join(updates.projectRoot, 'scripts', 'update-runner.bat')
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
        fs.appendFileSync(logPath, '\r\n[' + new Date().toISOString() + '] UPDATE REQUEST ACCEPTED\r\n')
        fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] Panel PID: ' + process.pid + '\r\n')
        fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] Node executable: ' + process.execPath + '\r\n')
        fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] Batch runner: ' + script + '\r\n')
        const cmd = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
        const args = ['/d', '/c', 'call', script, downloaded.manifestPath, updates.projectRoot, String(process.pid), process.execPath]
        // The detached cmd process owns a separate, visible console and survives
        // termination of the panel process that launched it.
        const child = spawn(cmd, args, { detached: true, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: false })
        fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] Updater spawned with PID ' + child.pid + '\r\n')
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
        auditLog.record(req, 'updates.install', { from: status.currentVersion, to: status.latestVersion, source: status.packageUrl })
        res.status(202).json({ accepted: true, from: status.currentVersion, to: status.latestVersion, log: '.updates/update.log' })
      })
    })
  })

  return router
}
