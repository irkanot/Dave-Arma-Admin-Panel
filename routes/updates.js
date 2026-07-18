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
    const updateRoot = path.join(updates.projectRoot, '.updates')
    const logPath = path.join(updateRoot, 'update.log')
    const statePath = path.join(updateRoot, 'current.json')
    fs.mkdirSync(updateRoot, { recursive: true })
    routeLog(logPath, 'UPDATE BUTTON PRESSED')
    routeLog(logPath, 'Panel PID: ' + process.pid)
    routeLog(logPath, 'Install root: ' + updates.projectRoot)

    updates.status(function (err, status) {
      if (err) return fail(res, logPath, statePath, null, 'Update check failed: ' + err.message, 500)
      routeLog(logPath, 'Online status: current=' + status.currentVersion + ', latest=' + (status.latestVersion || 'unknown') + ', available=' + status.available)
      if (!status.available) return fail(res, logPath, statePath, status, 'No newer online release is available', 409)

      routeLog(logPath, 'Downloading ' + status.packageUrl)
      updates.download(status, function (err, downloaded) {
        if (err) return fail(res, logPath, statePath, status, 'Download failed: ' + err.message, 502)
        try {
          routeLog(logPath, 'Download and SHA256 verification completed: ' + downloaded.packagePath)
          const script = path.join(updates.projectRoot, 'scripts', 'update-runner.bat')
          if (!fs.existsSync(script)) return fail(res, logPath, statePath, status, 'Batch runner not found: ' + script, 500)
          fs.writeFileSync(statePath, JSON.stringify({
            version: status.latestVersion,
            status: 'launching',
            message: 'Starting external batch updater',
            updatedAt: new Date().toISOString(),
            package: path.basename(downloaded.packagePath)
          }, null, 2))
          routeLog(logPath, 'Node executable: ' + process.execPath)
          routeLog(logPath, 'Batch runner: ' + script)
          const cmd = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
          const args = ['/d', '/c', 'call', script, downloaded.manifestPath, updates.projectRoot, String(process.pid), process.execPath]
          // Do not inherit handles: Windows services and background launchers may
          // have no valid console streams, which prevents child creation.
          const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true })
          let answered = false
          child.once('error', function (spawnError) {
            if (answered) return
            answered = true
            fail(res, logPath, statePath, status, 'Unable to start updater: ' + spawnError.message, 500)
          })
          child.once('spawn', function () {
            if (answered) return
            answered = true
            routeLog(logPath, 'CONFIRMED: updater process spawned with PID ' + child.pid)
            child.unref()
            auditLog.record(req, 'updates.install', { from: status.currentVersion, to: status.latestVersion, source: status.packageUrl })
            res.status(202).json({ accepted: true, updaterPid: child.pid, from: status.currentVersion, to: status.latestVersion, log: '.updates/update.log' })
          })
        } catch (launchError) {
          fail(res, logPath, statePath, status, 'Updater preparation failed: ' + launchError.message, 500)
        }
      })
    })
  })

  return router
}

function routeLog (logPath, message) {
  fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] ' + message + '\r\n')
}

function fail (res, logPath, statePath, status, message, httpStatus) {
  routeLog(logPath, 'FAILED: ' + message)
  fs.writeFileSync(statePath, JSON.stringify({
    version: status && status.latestVersion,
    status: 'failed',
    message,
    updatedAt: new Date().toISOString()
  }, null, 2))
  if (!res.headersSent) res.status(httpStatus || 500).send(message)
}
