const _ = require('underscore')
const Backbone = require('backbone')
const Marionette = require('marionette')

const User = require('app/models/user')
const UserFormView = require('app/views/users/form')
const UserListItemView = require('app/views/users/list_item')
const tpl = require('tpl/users/index.html')

module.exports = Marionette.CompositeView.extend({
  childView: UserListItemView,
  childViewContainer: 'tbody',
  template: _.template(tpl),

  events: {
    'click #add-user': 'addUser'
  },

  initialize: function (options) {
    this.session = options.session
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return {
      canCreateUsers: this.hasPermission('users.create')
    }
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({
      model: item,
      users: this.collection,
      session: this.session
    }, childViewOptions))
  },

  addUser: function (event) {
    event.preventDefault()
    if (!this.hasPermission('users.create')) {
      return
    }

    const view = new UserFormView({ model: new User(), users: this.collection })
    new Backbone.BootstrapModal({ content: view, title: 'Add User' }).open()
  }
})
