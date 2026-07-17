const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (accessControl) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.users.view), function (req, res) {
    res.json(flattenPermissions(permissions))
  })

  return router
}

function flattenPermissions (tree) {
  const list = [{
    section: 'system',
    action: 'all',
    name: '*'
  }]

  Object.keys(tree).sort().forEach(function (section) {
    Object.keys(tree[section]).sort().forEach(function (action) {
      list.push({
        section,
        action,
        name: tree[section][action]
      })
    })
  })

  return list
}
