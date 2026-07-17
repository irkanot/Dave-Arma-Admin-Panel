const Backbone = require('backbone')

const Server = require('app/models/server')

module.exports = Backbone.Collection.extend({
  comparator: function (a, b) {
    const aTitle = a.get('displayTitle') || a.get('title') || ''
    const bTitle = b.get('displayTitle') || b.get('title') || ''
    return aTitle.toLowerCase().localeCompare(bTitle.toLowerCase())
  },
  model: Server,
  url: '/api/servers/'
})
