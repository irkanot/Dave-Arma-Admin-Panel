const express = require('express')
const permissions = require('../lib/security/permissions')
const steamcmdImporter = require('../lib/mods/steamcmdImporter')

module.exports = function (config, jobs, accessControl, auditLog) {
  const router = express.Router()

  router.post('/login', accessControl.requirePermission(permissions.settings.edit), function (req, res) {
    const job = jobs.create('steamcmd.login', {
      username: (config.steamCmd && config.steamCmd.username) || 'anonymous'
    })

    jobs.run(job, function (job, reporter, done) {
      steamcmdImporter.login(config, reporter, done)
    })

    auditLog.record(req, 'steamcmd.login', { job: job.id })
    res.status(202).json(job)
  })

  return router
}
