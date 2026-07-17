const _ = require('underscore')
const Backbone = require('backbone')
const Marionette = require('marionette')
const UserFormView = require('app/views/users/form')
const tpl = require('tpl/users/list_item.html')

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template: _.template(tpl),

  events: {
    'click .edit-user': 'editUser',
    'click .delete-user': 'deleteUser'
  },

  initialize: function (options) {
    this.users = options.users
    this.session = options.session
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return {
      canEditUsers: this.hasPermission('users.edit'),
      canDeleteUsers: this.hasPermission('users.delete')
    }
  },

  editUser: function (event) {
    event.preventDefault()
    if (!this.hasPermission('users.edit')) {
      return
    }

    const view = new UserFormView({ model: this.model, users: this.users })
    new Backbone.BootstrapModal({ content: view, title: 'Edit User' }).open()
  },

  deleteUser: function (event) {
    event.preventDefault()
    if (!this.hasPermission('users.delete')) {
      return
    }

    this.model.destroy({
      success: function () {
        this.users.fetch()
      }.bind(this)
    })
  }
})
