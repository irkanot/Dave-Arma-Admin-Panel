const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (jobs, accessControl) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.jobs.view), function (req, res) {
    res.json(jobs.all())
  })

  return router
}
