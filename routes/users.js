const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (users, accessControl, auditLog) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.users.view), function (req, res) {
    res.json(users.all())
  })

  router.post('/', accessControl.requirePermission(permissions.users.create), function (req, res) {
    users.create(req.body, function (err, user) {
      if (err) {
        return res.status(400).send(err.message)
      }

      auditLog.record(req, 'users.create', { username: user.username })
      res.status(201).json(user)
    })
  })

  router.put('/:username', accessControl.requirePermission(permissions.users.edit), function (req, res) {
    users.update(req.params.username, req.body, function (err, user) {
      if (err) {
        return res.status(404).send(err.message)
      }

      auditLog.record(req, 'users.edit', { username: user.username })
      res.json(user)
    })
  })

  router.delete('/:username', accessControl.requirePermission(permissions.users.delete), function (req, res) {
    users.remove(req.params.username, function (err) {
      if (err) {
        return res.status(404).send(err.message)
      }

      auditLog.record(req, 'users.delete', { username: req.params.username })
      res.status(204).send()
    })
  })

  return router
}
