const _ = require('underscore')
const $ = require('jquery')
const Backbone = require('backbone')
const Marionette = require('marionette')
const BootstrapModal = require('backbone.bootstrap-modal')

const ServersListView = require('app/views/navigation/servers/list')
const SettingsView = require('app/views/settings')
const tpl = require('tpl/navigation.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  templateHelpers: function () {
    const session = this.session

    return {
      isActiveRoute: function (route) {
        return Backbone.history.fragment === route ? 'active' : ''
      },
      can: function (permission) {
        const permissions = session.get('permissions') || []
        return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
      },
      isAuthenticated: function () {
        return session.get('authenticated')
      },
      isSteamAuthEnabled: function () {
        return session.get('steamAuthEnabled')
      },
      displayName: function () {
        const user = session.get('user')
        return (user && (user.displayName || user.username || user.steamId)) || ''
      }
    }
  },

  events: {
    'click #settings': 'settings',
    'click #logout': 'logout'
  },

  initialize: function (options) {
    this.settingsModel = options.settings
    this.servers = options.servers
    this.session = options.session
    this.serversListView = new ServersListView({ collection: this.servers })
    this.listenTo(Backbone.history, 'route', this.render)
    this.listenTo(this.session, 'change', this.render)
  },

  onDomRefresh: function () {
    this.serversListView.setElement('#servers-list')
    this.serversListView.render()
  },

  settings: function (event) {
    event.preventDefault()
    const view = new SettingsView({ model: this.settingsModel })
    new BootstrapModal({ content: view, animate: true, cancelText: false }).open()
  },

  logout: function (event) {
    event.preventDefault()

    const self = this
    $.ajax({
      url: '/auth/logout',
      type: 'POST',
      success: function () {
        self.session.set({
          authenticated: false,
          user: null,
          permissions: []
        })
      }
    })
  }
})
