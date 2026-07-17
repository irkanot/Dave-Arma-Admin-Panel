const _ = require('underscore')
const Marionette = require('marionette')

const ServerMod = require('app/models/server_mod')
const ListItemView = require('app/views/servers/mods/selected/list_item')
const tpl = require('tpl/servers/mods/selected/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template: _.template(tpl),

  events: {
    'click .add-mod': 'addMod'
  },

  initialize: function (options) {
    this.canEditServer = options.canEditServer
    this.filterValue = options.filterValue || ''
    this.listenTo(this.collection, 'update reset sort', this.render)
  },

  filter: function (child) {
    const name = String(child.get('name') || '').toLowerCase()
    return name.indexOf(String(this.filterValue || '').toLowerCase()) >= 0
  },

  templateHelpers: function () {
    return {
      canEditServer: this.canEditServer,
      selectedCount: this.collection.length
    }
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({
      model: item,
      canEditServer: this.canEditServer
    }, childViewOptions))
  },

  addMod: function (event) {
    event.preventDefault()
    if (!this.canEditServer) {
      return
    }

    const input = this.$('#manualModName')
    const name = input.val().trim()
    if (!name) {
      return
    }

    if (!this.collection.get(name)) {
      this.collection.add(new ServerMod({ name }))
      this.collection.sort()
    }

    input.val('')
    this.render()
  }
})
