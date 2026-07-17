const _ = require('underscore')
const Marionette = require('marionette')

const ListItemView = require('app/views/missions/list_item')
const tpl = require('tpl/missions/list.html')

const template = _.template(tpl)

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template,

  initialize: function (options) {
    this.filterValue = options.filterValue
    this.session = options.session
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({
      model: item,
      session: this.session
    }, childViewOptions))
  },

  filter: function (child, index, collection) {
    return child.get('name').toLowerCase().indexOf(this.filterValue.toLowerCase()) >= 0
  }
})
