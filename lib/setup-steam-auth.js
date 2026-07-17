const session = require('express-session')
const passport = require('passport')
const SteamStrategy = require('passport-steam').Strategy
const steamProfile = require('./steam-profile')

function getSteamAuthConfig (config) {
  return config.steamAuth || {}
}

function getBaseUrl (config) {
  const steamAuth = getSteamAuthConfig(config)

  if (steamAuth.baseUrl) {
    return steamAuth.baseUrl.replace(/\/$/, '')
  }

  return 'http://localhost:' + config.port
}

module.exports = function (config, app) {
  const steamAuth = getSteamAuthConfig(config)
  // Steam OpenID is the only supported dashboard authentication method.
  const enabled = true
  const baseUrl = getBaseUrl(config)
  const sessionMiddleware = session({
    secret: steamAuth.sessionSecret || 'change-me',
    resave: false,
    saveUninitialized: false
  })
  const passportInitialize = passport.initialize()
  const passportSession = passport.session()

  app.use(sessionMiddleware)
  app.use(passportInitialize)
  app.use(passportSession)

  passport.serializeUser(function (user, done) {
    done(null, user)
  })

  passport.deserializeUser(function (user, done) {
    done(null, user)
  })

  if (enabled) {
    passport.use(new SteamStrategy({
      returnURL: steamAuth.returnUrl || baseUrl + '/auth/steam/return',
      realm: steamAuth.realm || baseUrl + '/',
      apiKey: steamAuth.apiKey || '',
      profile: !!steamAuth.apiKey
    }, function (identifier, profile, done) {
      const steamId = (profile && profile.id) || steamIdFromIdentifier(identifier)
      const profileDisplayName = getProfileDisplayName(profile)

      steamProfile.fetchDisplayName(steamId, function (err, publicDisplayName) {
        if (err) {
          return done(err)
        }

        done(null, {
          steamId,
          displayName: publicDisplayName || profileDisplayName || steamId,
          photos: (profile && profile.photos) || []
        })
      })
    }))
  }

  return {
    enabled,
    passport,
    sessionMiddleware,
    passportInitialize,
    passportSession
  }
}

function steamIdFromIdentifier (identifier) {
  const match = String(identifier || '').match(/\/openid\/id\/(\d+)$/)
  return match ? match[1] : ''
}

function getProfileDisplayName (profile) {
  if (!profile) {
    return ''
  }

  return profile.displayName ||
    (profile._json && profile._json.personaname) ||
    (profile._json && profile._json.realname) ||
    ''
}
