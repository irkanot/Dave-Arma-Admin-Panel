const Marionette = require('marionette')

const ListItemView = require('app/views/navigation/servers/list_item')

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: ListItemView
})
