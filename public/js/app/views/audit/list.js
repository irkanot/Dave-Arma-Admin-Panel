const _ = require('underscore')
const Marionette = require('marionette')

const AuditEntryView = require('app/views/audit/list_item')
const tpl = require('tpl/audit/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: AuditEntryView,
  childViewContainer: 'tbody',
  template: _.template(tpl)
})
