const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const path = require('path')
const serveStatic = require('serve-static')
const webpack = require('webpack')
const webpackMiddleware = require('webpack-dev-middleware')
const SocketServer = require('socket.io').Server

const config = require('./config')
const webpackConfig = require('./webpack.config')
const setupSteamAuth = require('./lib/setup-steam-auth')
const AccessControl = require('./lib/security/access-control')
const permissions = require('./lib/security/permissions')
const AuditLog = require('./lib/audit')
const Manager = require('./lib/manager')
const Missions = require('./lib/missions')
const Mods = require('./lib/mods')
const Logs = require('./lib/logs')
const Settings = require('./lib/settings')
const Users = require('./lib/users')
const Roles = require('./lib/roles')
const Jobs = require('./lib/jobs')
const Updates = require('./lib/updates')

const app = express()
const server = require('http').Server(app)
const io = new SocketServer(server)

const auth = setupSteamAuth(config, app)
const users = new Users(config)
const roles = new Roles(config)
const accessControl = new AccessControl(config)
const auditLog = new AuditLog(config)
const jobs = new Jobs(config)
const updates = new Updates(__dirname, config)

io.engine.use(auth.sessionMiddleware)
io.engine.use(auth.passportInitialize)
io.engine.use(auth.passportSession)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

morgan.token('user', function (req) {
  if (req.auth) {
    return req.auth.user
  }

  if (req.user) {
    return req.user.username || req.user.steamId || 'steam'
  }

  return 'anon'
})
app.use(morgan(config.logFormat || 'dev'))

// Production bundles are shipped in assets. Serve them explicitly so the UI
// also works when webpack dev middleware is not running (for example as a
// Windows service or from a packaged installation).
app.use(serveStatic(path.join(__dirname, 'assets')))
app.use(serveStatic(path.join(__dirname, 'public')))
app.use('/releases', serveStatic(path.resolve(__dirname, (config.updates && config.updates.releaseDirectory) || 'Releases'), { index: false }))
app.use(require('./routes/auth')(auth, accessControl, users, auditLog))

const settings = new Settings(config)
const logs = new Logs(config)

const manager = new Manager(config, logs)
manager.load()

const missions = new Missions(config)
const mods = new Mods(config)
mods.updateMods()

app.use('/api/logs', require('./routes/logs')(logs, accessControl, auditLog))
app.use('/api/missions', require('./routes/missions')(missions, accessControl, auditLog))
app.use('/api/mods', require('./routes/mods')(mods, accessControl, auditLog, jobs))
app.use('/api/servers', require('./routes/servers')(manager, mods, accessControl, auditLog, users))
app.use('/api/settings', require('./routes/settings')(settings, accessControl, auditLog))
app.use('/api/users', require('./routes/users')(users, accessControl, auditLog))
app.use('/api/roles', require('./routes/roles')(roles, accessControl, auditLog))
app.use('/api/permissions', require('./routes/permissions')(accessControl))
app.use('/api/audit', require('./routes/audit')(auditLog, accessControl))
app.use('/api/jobs', require('./routes/jobs')(jobs, accessControl))
app.use('/api/steamcmd', require('./routes/steamcmd')(config, jobs, accessControl, auditLog))
app.use('/api/updates', require('./routes/updates')(updates, accessControl, auditLog))
app.use('/api/system', require('./routes/system')(__dirname, accessControl))

function getSocketUser (socket) {
  return accessControl.getUser(socket.request)
}

function canSocketReceive (socket, permission) {
  return accessControl.hasPermission(getSocketUser(socket), permission)
}

function emitInitialState (socket) {
  const user = getSocketUser(socket)

  if (accessControl.enabled && !user) {
    socket.emit('auth', { required: true })
    return
  }

  if (accessControl.hasPermission(user, permissions.missions.view)) {
    socket.emit('missions', missions.missions)
  }

  if (accessControl.hasPermission(user, permissions.mods.view)) {
    socket.emit('mods', mods.mods)
  }

  if (accessControl.hasPermission(user, permissions.servers.view)) {
    socket.emit('servers', manager.getServers().filter(function (server) {
      return accessControl.canAccessServer(user, server)
    }).map(function (server) {
      return server.toJSON()
    }))
  }

  if (accessControl.hasPermission(user, permissions.settings.view)) {
    socket.emit('settings', settings.getPublicSettings())
  }
}

function emitToPermittedSockets (permission, eventName, dataFactory) {
  io.sockets.sockets.forEach(function (socket) {
    if (canSocketReceive(socket, permission)) {
      socket.emit(eventName, dataFactory(socket))
    }
  })
}

io.on('connection', function (socket) {
  emitInitialState(socket)
})

missions.on('missions', function (missions) {
  emitToPermittedSockets(permissions.missions.view, 'missions', function () {
    return missions
  })
})

mods.on('mods', function (mods) {
  emitToPermittedSockets(permissions.mods.view, 'mods', function () {
    return mods
  })
})

manager.on('servers', function () {
  emitToPermittedSockets(permissions.servers.view, 'servers', function (socket) {
    const user = getSocketUser(socket)
    return manager.getServers().filter(function (server) {
      return accessControl.canAccessServer(user, server)
    }).map(function (server) {
      return server.toJSON()
    })
  })
})

if (require.main === module) {
  const webpackCompiler = webpack(webpackConfig)

  app.use(webpackMiddleware(webpackCompiler, {
    publicPath: webpackConfig.output.publicPath
  }))

  server.listen(config.port, config.host)
}

module.exports = app
