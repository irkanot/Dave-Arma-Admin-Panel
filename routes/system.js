const express = require('express')
const permissions = require('../lib/security/permissions')
const getSystemMetrics = require('../lib/system-metrics')

module.exports = function (installRoot, accessControl) {
  const router = express.Router()
  router.get('/', accessControl.requirePermission(permissions.servers.view), function (req, res) {
    res.json(getSystemMetrics(installRoot))
  })
  return router
}
