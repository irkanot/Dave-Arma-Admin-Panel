const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/logs/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template,

  events: {
    'click .destroy': 'deleteLog'
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
      canDeleteLog: this.hasPermission('logs.delete')
    }
  },

  deleteLog: function (event) {
    const self = this
    if (!this.hasPermission('logs.delete')) {
      return
    }
    sweetAlert({
      title: 'Are you sure?',
      text: 'The log will be deleted from the server!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonClass: 'btn-danger',
      confirmButtonText: 'Yes, delete it!'
    },
    function () {
      self.model.destroy()
    })
  }
})
