const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/layout.html')

module.exports = Marionette.LayoutView.extend({
  template: _.template(tpl),

  regions: {
    navigation: '#navigation',
    content: '#content'
  }
})
