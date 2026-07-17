const Backbone = require('backbone')

module.exports = Backbone.Model.extend({
  defaults: {
    game: 'arma3',
    path: '',
    type: '',
    prefix: '',
    steamAuthEnabled: true,
    steamAuth: {
      enabled: true,
      baseUrl: ''
    },
    steamCmd: {},
    updates: { feedUrl: '' }
  },
  url: '/api/settings'
})
