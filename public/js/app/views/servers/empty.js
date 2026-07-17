const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/servers/empty.html')

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template: _.template(tpl),

  initialize: function (options) {
    this.servers = options.servers
    this.session = options.session
  },

  templateHelpers: function () {
    const permissions = (this.session && this.session.get('permissions')) || []
    return {
      canCreateServer: permissions.indexOf('*') !== -1 || permissions.indexOf('servers.create') !== -1
    }
  }
})
