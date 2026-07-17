const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')
const BootstrapModal = require('backbone.bootstrap-modal')

const SettingsView = require('app/views/settings')
const tpl = require('tpl/admin/index.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  events: {
    'submit #admin-user-form': 'saveUser',
    'submit #admin-role-form': 'saveRole',
    'click .edit-admin-user': 'editUser',
    'click .delete-admin-user': 'deleteUser',
    'click .edit-admin-role': 'editRole',
    'click .delete-admin-role': 'deleteRole',
    'click #admin-settings': 'settings',
    'click #check-updates': 'checkUpdates',
    'click #install-update': 'installUpdate'
  },

  initialize: function (options) {
    this.settingsModel = options.settings
    this.session = options.session
    this.state = {
      users: [],
      roles: [],
      permissions: [],
      update: { currentVersion: '', available: false, manifestFound: false },
      activeUser: null,
      activeRole: null
    }
    this.load()
  },

  serializeData: function () {
    return _.extend({}, this.state, {
      canCreateUsers: this.hasPermission('users.create'),
      canEditUsers: this.hasPermission('users.edit'),
      canDeleteUsers: this.hasPermission('users.delete'),
      canEditSettings: this.hasPermission('settings.edit')
    })
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  load: function () {
    const self = this
    $.when(
      $.get('/api/users'),
      $.get('/api/roles'),
      $.get('/api/permissions'),
      $.get('/api/updates')
    ).done(function (users, roles, permissions, update) {
      self.state.users = users[0]
      self.state.roles = roles[0]
      self.state.permissions = permissions[0]
      self.state.update = update[0]
      self.render()
    }).fail(function (resp) {
      sweetAlert({ title: 'Error', text: responseText(resp), type: 'error' })
    })
  },

  saveUser: function (event) {
    event.preventDefault()
    if (!this.hasPermission(this.state.activeUser ? 'users.edit' : 'users.create')) {
      return
    }
    const user = {
      username: this.$('.admin-username').val().trim(),
      displayName: this.$('.admin-display-name').val().trim(),
      steamId: this.$('.admin-steam-id').val().trim(),
      roles: csv(this.$('.admin-user-roles').val()),
      serverIds: csv(this.$('.admin-server-ids').val())
    }
    const activeUser = this.state.activeUser
    const method = activeUser ? 'PUT' : 'POST'
    const url = activeUser ? '/api/users/' + encodeURIComponent(activeUser.username) : '/api/users'
    this.saveJson(method, url, user, 'User saved')
  },

  editUser: function (event) {
    event.preventDefault()
    const username = $(event.currentTarget).data('username')
    this.state.activeUser = this.state.users.filter(function (user) {
      return user.username === username
    })[0] || null
    this.render()
  },

  deleteUser: function (event) {
    event.preventDefault()
    if (!this.hasPermission('users.delete')) {
      return
    }
    const username = $(event.currentTarget).data('username')
    this.deleteResource('/api/users/' + encodeURIComponent(username), 'User deleted')
  },

  saveRole: function (event) {
    event.preventDefault()
    if (!this.hasPermission('users.edit')) {
      return
    }
    const role = {
      name: this.$('.admin-role-name').val().trim(),
      permissions: this.$('.admin-role-permission:checked').map(function () {
        return this.value
      }).get()
    }
    const activeRole = this.state.activeRole
    const method = activeRole ? 'PUT' : 'POST'
    const url = activeRole ? '/api/roles/' + encodeURIComponent(activeRole.name) : '/api/roles'
    this.saveJson(method, url, role, 'Role saved')
  },

  editRole: function (event) {
    event.preventDefault()
    const name = $(event.currentTarget).data('name')
    this.state.activeRole = this.state.roles.filter(function (role) {
      return role.name === name
    })[0] || null
    this.render()
  },

  deleteRole: function (event) {
    event.preventDefault()
    if (!this.hasPermission('users.delete')) {
      return
    }
    const name = $(event.currentTarget).data('name')
    this.deleteResource('/api/roles/' + encodeURIComponent(name), 'Role deleted')
  },

  settings: function (event) {
    event.preventDefault()
    if (!this.hasPermission('settings.edit')) {
      return
    }
    const view = new SettingsView({ model: this.settingsModel })
    new BootstrapModal({ content: view, animate: true, cancelText: false }).open()
  },

  checkUpdates: function (event) {
    event.preventDefault()
    this.load()
  },

  installUpdate: function (event) {
    event.preventDefault()
    if (!this.hasPermission('settings.edit')) return
    const button = this.$('#install-update')
    button.prop('disabled', true).text('Starting update...')
    $.ajax({
      url: '/api/updates/install',
      type: 'POST',
      success: function (result) {
        sweetAlert({
          title: 'Update started',
          text: 'Updating from ' + result.from + ' to ' + result.to + '. The panel will restart; reload this page in about one minute.',
          type: 'success'
        })
      },
      error: function (resp) {
        button.prop('disabled', false).text('Install update')
        sweetAlert({ title: 'Update error', text: responseText(resp), type: 'error' })
      }
    })
  },

  saveJson: function (method, url, data, message) {
    const self = this
    $.ajax({
      url,
      type: method,
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function () {
        sweetAlert({ title: 'Saved', text: message, type: 'success' })
        self.state.activeUser = null
        self.state.activeRole = null
        self.load()
      },
      error: function (resp) {
        sweetAlert({ title: 'Error', text: responseText(resp), type: 'error' })
      }
    })
  },

  deleteResource: function (url, message) {
    const self = this
    $.ajax({
      url,
      type: 'DELETE',
      success: function () {
        sweetAlert({ title: 'Deleted', text: message, type: 'success' })
        self.load()
      },
      error: function (resp) {
        sweetAlert({ title: 'Error', text: responseText(resp), type: 'error' })
      }
    })
  }
})

function csv (value) {
  return String(value || '').split(',').map(function (item) {
    return item.trim()
  }).filter(Boolean)
}

function responseText (resp) {
  return (resp && (resp.responseText || resp.statusText)) || 'Request failed'
}
