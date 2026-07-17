const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/jobs/list_item.html')

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template: _.template(tpl)
})
