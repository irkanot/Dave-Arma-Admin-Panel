const _ = require('underscore')
const Marionette = require('marionette')

const ListItemView = require('app/views/logs/list_item')
const tpl = require('tpl/logs/list.html')

const template = _.template(tpl)

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template,

  initialize: function (options) {
    this.session = options.session
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({
      model: item,
      session: this.session
    }, childViewOptions))
  }
})
