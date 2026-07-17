const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/servers/missions/available/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template,

  events: {
    'click .add': 'add'
  },

  templateHelpers: function () {
    return {
      canEditServer: this.options.canEditServer
    }
  },

  add: function () {
    if (!this.options.canEditServer) {
      return
    }

    this.trigger('add', this.model)
  }
})
