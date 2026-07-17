const _ = require('underscore')

const ModsListView = require('app/views/mods/list')
const ListItemView = require('app/views/servers/mods/available/list_item')
const tpl = require('tpl/servers/mods/available/list.html')

module.exports = ModsListView.extend({
  childView: ListItemView,
  template: _.template(tpl),

  buildChildView: function (item, ChildViewType, childViewOptions) {
    const options = _.extend({
      model: item,
      selectedModsCollection: this.options.selectedModsCollection,
      canEditServer: this.options.canEditServer,
      session: this.session
    }, childViewOptions)
    const view = new ChildViewType(options)
    return view
  }
})
