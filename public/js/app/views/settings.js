const _ = require('underscore')
const $ = require('jquery')
const Backbone = require('backbone')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/settings.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  events: {
    'click .steamcmd-login': 'steamCmdLogin'
  },

  modelEvents: {
    change: 'render'
  },

  templateHelpers: {
    isTypeChecked: function (type) {
      return this.type === type ? 'checked' : ''
    }
  },

  initialize: function () {
    this.bind('ok', this.submit)
  },

  serialize: function () {
    return {
      game: this.$('form .game').val(),
      path: this.$('form .path').val(),
      type: this.$('form input[name="type"]:checked').val(),
      prefix: this.$('form .server-prefix').val(),
      steamAuth: {
        enabled: true,
        baseUrl: this.$('form .steam-auth-base-url').val(),
        sessionSecret: this.$('form .steam-auth-session-secret').val(),
        apiKey: this.$('form .steam-auth-api-key').val()
      },
      steamCmd: {
        executable: this.$('form .steamcmd-executable').val(),
        downloadPath: '',
        username: this.$('form .steamcmd-username').val(),
        password: this.$('form .steamcmd-password').val(),
        steamGuardCode: this.$('form .steamcmd-steamguard-code').val()
      },
      updates: {
        feedUrl: this.$('form .update-feed-url').val()
      }
    }
  },

  submit: function (modal) {
    modal.preventClose()

    const data = this.serialize()

    if (!data.path) {
      sweetAlert({
        title: 'Error',
        text: 'Server path cannot be empty',
        type: 'error'
      })
      return
    }

    this.model.save(data, {
      type: 'PUT',
      success: function () {
        modal.close()
      },
      error: function (model, response) {
        sweetAlert({
          title: 'Error',
          text: response.responseText || 'Unable to save settings',
          type: 'error'
        })
      }
    })
  },

  steamCmdLogin: function (event) {
    event.preventDefault()

    const data = this.serialize()
    this.model.save(data, {
      type: 'PUT',
      success: function () {
        $.ajax({
          url: '/api/steamcmd/login',
          type: 'POST',
          success: function () {
            Backbone.history.navigate('#jobs', true)
          },
          error: function (resp) {
            sweetAlert({
              title: 'Error',
              text: resp.responseText || 'Unable to start SteamCMD login',
              type: 'error'
            })
          }
        })
      },
      error: function (model, response) {
        sweetAlert({
          title: 'Error',
          text: response.responseText || 'Unable to save settings',
          type: 'error'
        })
      }
    })
  }
})
