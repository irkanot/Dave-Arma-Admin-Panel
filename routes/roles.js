const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (roles, accessControl, auditLog) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.users.view), function (req, res) {
    res.json(roles.all())
  })

  router.post('/', accessControl.requirePermission(permissions.users.edit), function (req, res) {
    roles.create(req.body, function (err, role) {
      if (err) {
        return res.status(400).send(err.message)
      }

      auditLog.record(req, 'roles.create', { role: role.name })
      res.status(201).json(role)
    })
  })

  router.put('/:name', accessControl.requirePermission(permissions.users.edit), function (req, res) {
    roles.update(req.params.name, req.body, function (err, role) {
      if (err) {
        return res.status(404).send(err.message)
      }

      auditLog.record(req, 'roles.edit', { role: role.name })
      res.json(role)
    })
  })

  router.delete('/:name', accessControl.requirePermission(permissions.users.delete), function (req, res) {
    roles.remove(req.params.name, function (err) {
      if (err) {
        return res.status(400).send(err.message)
      }

      auditLog.record(req, 'roles.delete', { role: req.params.name })
      res.status(204).send()
    })
  })

  return router
}
