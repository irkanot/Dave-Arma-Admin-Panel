const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/login.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl)
})
