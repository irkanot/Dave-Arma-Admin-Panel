const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (auditLog, accessControl) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.audit.view), function (req, res) {
    res.json(auditLog.all())
  })

  return router
}
