const _ = require('underscore')
const Marionette = require('marionette')

const ListItemView = require('app/views/mods/list_item')
const tpl = require('tpl/mods/list.html')

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
    const name = child.get('name').toLowerCase()

    if (name.indexOf(this.filterValue.toLowerCase()) >= 0) {
      return true
    }

    const modFile = child.get('modFile')
    if (modFile && modFile.name && modFile.name.toLowerCase().indexOf(this.filterValue.toLowerCase()) >= 0) {
      return true
    }

    const steamMeta = child.get('steamMeta')
    if (steamMeta && steamMeta.name && steamMeta.name.toLowerCase().indexOf(this.filterValue.toLowerCase()) >= 0) {
      return true
    }

    return false
  }
})
