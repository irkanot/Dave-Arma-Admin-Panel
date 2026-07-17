const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/users/form.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  initialize: function (options) {
    this.users = options.users
    this.bind('ok', this.submit)
  },

  serialize: function () {
    return {
      username: this.$('.username').val(),
      steamId: this.$('.steam-id').val(),
      roles: this.$('.roles').val().split(',').map(function (role) {
        return role.trim()
      }).filter(Boolean),
      serverIds: this.$('.server-ids').val().split(',').map(function (serverId) {
        return serverId.trim()
      }).filter(Boolean)
    }
  },

  submit: function (modal) {
    modal.preventClose()

    const data = this.serialize()

    if (!data.username) {
      sweetAlert({ title: 'Error', text: 'Username is required', type: 'error' })
      return
    }

    this.model.save(data, {
      success: function () {
        modal.close()
        this.users.fetch()
      }.bind(this),
      error: function (model, response) {
        sweetAlert({
          title: 'Error',
          text: response.responseText || 'Unable to save user',
          type: 'error'
        })
      }
    })
  }
})
