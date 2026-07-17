const $ = require('jquery')
const Backbone = require('backbone')

const LayoutView = require('app/views/layout')
const NavigationView = require('app/views/navigation')
const LoginView = require('app/views/login')
const ServersView = require('app/views/servers/list')
const LogsListView = require('app/views/logs/list')
const MissionsView = require('app/views/missions/index')
const ModsView = require('app/views/mods/index')
const ServerView = require('app/views/servers/view')
const Logs = require('app/collections/logs')
const Missions = require('app/collections/missions')
const Mods = require('app/collections/mods')
const Settings = require('app/models/settings')
const Servers = require('app/collections/servers')
const Users = require('app/collections/users')
const AuditEntries = require('app/collections/audit_entries')
const Jobs = require('app/collections/jobs')
const UsersView = require('app/views/users/index')
const AuditListView = require('app/views/audit/list')
const JobsListView = require('app/views/jobs/list')
const AdminView = require('app/views/admin/index')

const $body = $('body')
const missions = new Missions()
const mods = new Mods()
const settings = new Settings()
const servers = new Servers()
const users = new Users()
const session = new Backbone.Model({
  authenticated: false,
  permissions: [],
  securityEnabled: false,
  steamAuthEnabled: false
})
const layoutView = new LayoutView({ el: $body }).render()

function applyServerPrefix () {
  const prefix = settings.get('prefix') || ''
  servers.each(function (server) {
    server.set('displayTitle', prefix + (server.get('title') || ''))
  })
}

module.exports = Backbone.Router.extend({

  routes: {
    logs: 'logs',
    missions: 'missions',
    mods: 'mods',
    audit: 'audit',
    jobs: 'jobs',
    admin: 'admin',
    login: 'login',
    users: 'users',
    'servers/:id': 'server',
    '': 'home'
  },

  initialize: function () {
    layoutView.navigation.show(new NavigationView({ settings, servers, session }))

    let initialized = false
    const startHistory = function () {
      if (!initialized) {
        initialized = true
        Backbone.history.start()
      }
    }

    $.get('/api/me', function (_session) {
      session.set(_session)
      if (session.get('permissions').indexOf('*') !== -1 || session.get('permissions').indexOf('users.view') !== -1) {
        users.fetch()
      }

      if (session.get('securityEnabled') && !session.get('authenticated')) {
        startHistory()
      }
    })

    /* global io */
    const socket = io.connect()
    socket.on('missions', function (_missions) {
      missions.set(_missions)
    })
    socket.on('mods', function (_mods) {
      mods.set(_mods)
    })
    socket.on('servers', function (_servers) {
      servers.set(_servers)
      applyServerPrefix()
      startHistory()
    })
    socket.on('settings', function (_settings) {
      settings.set(_settings)
      applyServerPrefix()
    })
  },

  home: function () {
    if (this.requireLogin()) {
      return
    }
    layoutView.content.show(new ServersView({ collection: servers, users, session }))
  },

  logs: function () {
    if (this.requireLogin()) {
      return
    }
    const logs = new Logs()
    logs.fetch()
    layoutView.content.show(new LogsListView({ collection: logs, session }))
  },

  missions: function () {
    if (this.requireLogin()) {
      return
    }
    layoutView.content.show(new MissionsView({ missions, session }))
  },

  mods: function () {
    if (this.requireLogin()) {
      return
    }
    layoutView.content.show(new ModsView({ mods, session }))
  },

  users: function () {
    if (this.requireLogin()) {
      return
    }
    users.fetch()
    layoutView.content.show(new UsersView({ collection: users, session }))
  },

  admin: function () {
    if (this.requireLogin()) {
      return
    }
    layoutView.content.show(new AdminView({ settings, session }))
  },

  login: function () {
    layoutView.content.show(new LoginView())
  },

  audit: function () {
    if (this.requireLogin()) {
      return
    }
    const auditEntries = new AuditEntries()
    auditEntries.fetch()
    layoutView.content.show(new AuditListView({ collection: auditEntries }))
  },

  jobs: function () {
    if (this.requireLogin()) {
      return
    }
    const jobs = new Jobs()
    jobs.fetch()
    layoutView.content.show(new JobsListView({ collection: jobs }))
  },

  server: function (id) {
    if (this.requireLogin()) {
      return
    }
    const server = servers.get(id)
    if (server) {
      layoutView.content.show(new ServerView({
        model: server,
        missions,
        mods,
        users,
        session
      }))
    } else {
      this.navigate('#', true)
    }
  },

  requireLogin: function () {
    if (session.get('securityEnabled') && !session.get('authenticated')) {
      this.navigate('login', { replace: true })
      layoutView.content.show(new LoginView())
      return true
    }

    return false
  }

})
