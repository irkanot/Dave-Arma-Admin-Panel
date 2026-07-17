const express = require('express')

const permissions = require('../lib/security/permissions')

module.exports = function (manager, mods, accessControl, auditLog, users) {
  const router = express.Router()

  function getRequestedServer (req) {
    return manager.getServer(req.params.server)
  }

  function normalizeOwner (owner) {
    if (!owner || !owner.username || !users) {
      return null
    }

    const user = users.find(owner.username)
    if (!user) {
      return null
    }

    return {
      displayName: user.displayName || user.username,
      username: user.username,
      steamId: user.steamId || ''
    }
  }

  router.get('/', accessControl.requirePermission(permissions.servers.view), function (req, res) {
    const servers = manager.getServers().filter(function (server) {
      return accessControl.canAccessServer(req.user, server)
    })
    res.json(servers)
  })

  router.post('/', accessControl.requirePermission(permissions.servers.create), function (req, res) {
    if (!req.body.title) {
      res.status(400).send('Server title cannot be empty')
      return
    }

    if (!accessControl.hasPermission(req.user, permissions.servers.assignOwner)) {
      delete req.body.owner
    } else {
      req.body.owner = normalizeOwner(req.body.owner)
    }

    const server = manager.addServer(req.body)
    auditLog.record(req, 'servers.create', { server: server.id })
    res.json(server)
  })

  router.get('/:server', accessControl.requirePermission(permissions.servers.view, getRequestedServer), function (req, res) {
    const server = manager.getServer(req.params.server)
    res.json(server)
  })

  router.put('/:server', accessControl.requirePermission(permissions.servers.edit, getRequestedServer), function (req, res) {
    if (!req.body.title) {
      res.status(400).send('Server title cannot be empty')
      return
    }

    const server = manager.getServer(req.params.server)
    if (!accessControl.hasPermission(req.user, permissions.servers.assignOwner)) {
      req.body.owner = server.owner
    } else {
      req.body.owner = normalizeOwner(req.body.owner)
    }

    server.update(req.body)
    manager.save()
    auditLog.record(req, 'servers.edit', { server: server.id })
    res.json(server)
  })

  router.delete('/:server', accessControl.requirePermission(permissions.servers.delete, getRequestedServer), function (req, res) {
    const server = manager.removeServer(req.params.server)
    auditLog.record(req, 'servers.delete', { server: req.params.server })
    res.json(server)
  })

  router.post('/:server/start', accessControl.requirePermission(permissions.servers.start, getRequestedServer), function (req, res) {
    const server = manager.getServer(req.params.server)
    try {
      server.start()
      auditLog.record(req, 'servers.start', { server: server.id, pid: server.pid })
      res.json({ status: 'ok', pid: server.pid })
    } catch (err) {
      auditLog.record(req, 'servers.start.failed', { server: server.id, error: err.message })
      res.status(500).json({ status: 'error', message: err.message })
    }
  })

  router.post('/:server/stop', accessControl.requirePermission(permissions.servers.stop, getRequestedServer), function (req, res) {
    const server = manager.getServer(req.params.server)
    server.stop(function () {
      auditLog.record(req, 'servers.stop', { server: server.id, pid: server.pid })
      if (!server.pid) {
        res.json({ status: true, pid: server.pid })
      } else {
        res.json({ status: false, pid: server.pid })
      }
    })
  })

  return router
}
