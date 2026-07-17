const _ = require('underscore')
const Backbone = require('backbone')
const Marionette = require('marionette')

const tpl = require('tpl/navigation/servers/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  className: function () {
    return Backbone.history.fragment === 'servers/' + this.model.get('id') ? 'active' : ''
  },
  tagName: 'li',
  template
})
