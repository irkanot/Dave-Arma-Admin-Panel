const express = require('express')
const permissions = require('../lib/security/permissions')
const getSystemMetrics = require('../lib/system-metrics')

module.exports = function (installRoot, accessControl) {
  const router = express.Router()
  router.get('/', accessControl.requirePermission(permissions.servers.view), function (req, res) {
    try {
      res.json(getSystemMetrics(installRoot))
    } catch (err) {
      res.status(500).json({ error: 'Unable to collect server metrics: ' + err.message })
    }
  })
  return router
}
