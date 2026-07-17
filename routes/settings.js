const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (settings, accessControl, auditLog) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.settings.view), function (req, res) {
    res.json(settings.getPublicSettings())
  })

  router.put('/', accessControl.requirePermission(permissions.settings.edit), function (req, res) {
    settings.save(req.body, function (err) {
      if (err) {
        return res.status(500).send(err)
      }

      auditLog.record(req, 'settings.update', settings.getPublicSettings())
      res.json(settings.getPublicSettings())
    })
  })

  return router
}
