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
      bootstrapFirstAdmin(req, users, accessControl, auditLog)
      syncSteamProfile(req, users)
      res.redirect('/')
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

function bootstrapFirstAdmin (req, users, accessControl, auditLog) {
  if (!accessControl.enabled || !users || users.all().length > 0 || !req.user || !req.user.steamId) {
    return
  }

  users.create({
    username: req.user.steamId,
    displayName: req.user.displayName || req.user.steamId,
    steamId: req.user.steamId,
    roles: ['admin']
  }, function () {})

  if (auditLog) {
    auditLog.record(req, 'auth.bootstrapAdmin', { steamId: req.user.steamId })
  }
}

function syncSteamProfile (req, users) {
  if (!users || !req.user || !req.user.steamId) {
    return
  }

  users.syncSteamProfile(req.user, function () {})
}
