const _ = require('underscore')
const Marionette = require('marionette')

const ListItemView = require('app/views/servers/missions/available/list_item')
const tpl = require('tpl/servers/missions/available/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template: _.template(tpl),

  initialize: function (options) {
    this.filterValue = options.filterValue
    this.canEditServer = options.canEditServer
  },

  filter: function (child, index, collection) {
    return child.get('name').toLowerCase().indexOf(this.filterValue.toLowerCase()) >= 0
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    const self = this
    const options = _.extend({
      model: item,
      canEditServer: this.canEditServer
    }, childViewOptions)
    const view = new ChildViewType(options)
    view.on('add', function (model) {
      self.trigger('add', model)
    })
    return view
  }
})
