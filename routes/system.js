const express = require('express')
const getSystemMetrics = require('../lib/system-metrics')

module.exports = function (installRoot, accessControl) {
  const router = express.Router()
  router.get('/', function (req, res) {
    const user = accessControl.getUser(req)
    if (accessControl.enabled && !user) {
      return res.status(401).json({ error: 'Authentication required', loginUrl: '/auth/steam' })
    }
    try {
      res.set('Cache-Control', 'no-store')
      res.json(getSystemMetrics(installRoot))
    } catch (err) {
      res.status(500).json({ error: 'Unable to collect server metrics: ' + err.message })
    }
  })
  return router
}
