module.exports = function (auth, accessControl, users, auditLog) {
  const router = require('express').Router()

  router.get('/api/me', function (req, res) {
    const user = accessControl.getUser(req)
    const securityEnabled = accessControl.enabled
    const permissions = user
      ? accessControl.getUserPermissions(user)
      : (securityEnabled ? [] : ['*'])

    res.json({
      authenticated: !!user,
      securityEnabled,
      steamAuthEnabled: auth.enabled,
      user,
      permissions
    })
  })

  router.get('/auth/steam', function (req, res, next) {
    if (!auth.enabled) {
      return res.status(404).send('Steam authentication is not enabled')
    }

    auth.passport.authenticate('steam')(req, res, next)
  })

  router.get('/auth/steam/return', function (req, res, next) {
    if (!auth.enabled) {
      return res.status(404).send('Steam authentication is not enabled')
    }

    auth.passport.authenticate('steam', {
      failureRedirect: '/'
    })(req, res, function () {
      registerSteamUser(req, users, accessControl, auditLog, function (err) {
        if (err) return next(err)
        res.redirect('/')
      })
    })
  })

  router.post('/auth/logout', function (req, res, next) {
    req.logout(function (err) {
      if (err) {
        return next(err)
      }

      res.json({ success: true })
    })
  })

  return router
}

function registerSteamUser (req, users, accessControl, auditLog, cb) {
  if (!accessControl.enabled || !users || !req.user || !req.user.steamId) {
    return cb()
  }

  const existing = users.findBySteamId(req.user.steamId)
  if (existing) {
    return users.syncSteamProfile(req.user, cb)
  }

  const firstUser = users.all().length === 0
  users.create({
    username: req.user.steamId,
    displayName: req.user.displayName || req.user.steamId,
    steamId: req.user.steamId,
    roles: [firstUser ? 'admin' : 'default']
  }, function (err, user) {
    if (err) return cb(err)

    if (auditLog) {
      auditLog.record(req, firstUser ? 'auth.bootstrapAdmin' : 'auth.register', {
        steamId: req.user.steamId,
        roles: user.roles
      })
    }

    cb()
  })
}
