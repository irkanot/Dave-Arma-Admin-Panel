const _ = require('underscore')
const Backbone = require('backbone')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/servers/form.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  initialize: function (options) {
    this.servers = options.servers
    this.users = options.users
    this.session = options.session
    this.bind('ok', this.submit)
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return {
      canAssignOwner: this.hasPermission('servers.assignOwner'),
      users: this.users ? this.users.toJSON() : []
    }
  },

  serialize: function () {
    const data = {
      additionalConfigurationOptions: this.$('form .additional-configuration-options').val(),
      admin_password: this.$('form .admin-password').val(),
      allowed_file_patching: this.$('form .allowed-file-patching').prop('checked') ? 2 : 1,
      auto_start: this.$('form .auto-start').prop('checked'),
      battle_eye: this.$('form .battle-eye').prop('checked'),
      file_patching: this.$('form .file-patching').prop('checked'),
      forcedDifficulty: this.$('form .forcedDifficulty').val(),
      max_players: this.$('form .max-players').val(),
      motd: this.$('form .motd').val(),
      number_of_headless_clients: this.$('form .headless-clients').val(),
      password: this.$('form .password').val(),
      persistent: this.$('form .persistent').prop('checked'),
      port: this.$('form .port').val(),
      title: this.$('form .title').val(),
      von: this.$('form .von').prop('checked'),
      verify_signatures: this.$('form .verify_signatures').prop('checked')
    }

    if (this.hasPermission('servers.assignOwner')) {
      const username = this.$('form .owner').val()
      if (username && this.users) {
        const user = this.users.get(username)
        data.owner = user
          ? {
              displayName: user.get('displayName'),
              username: user.get('username'),
              steamId: user.get('steamId')
            }
          : null
      } else {
        data.owner = null
      }
    }

    return data
  },

  submit: function (modal) {
    modal.preventClose()

    const data = this.serialize()

    if (!data.title) {
      sweetAlert({
        title: 'Error',
        text: 'Server title cannot be empty',
        type: 'error'
      })
      return
    }

    this.model.set(data)

    const self = this

    this.model.save({}, {
      success: function () {
        modal.close()
        self.servers.fetch({
          success: function () {
            Backbone.history.navigate('#servers/' + self.model.get('id'), true)
          }
        })
      },
      error: function (model, response) {
        sweetAlert({
          title: 'Error',
          text: 'An error occurred, please consult the logs',
          type: 'error'
        })
      }
    })
  }
})
