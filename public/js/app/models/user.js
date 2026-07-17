const Backbone = require('backbone')

module.exports = Backbone.Model.extend({
  idAttribute: 'username',
  defaults: {
    username: '',
    displayName: '',
    steamId: '',
    roles: ['user'],
    serverIds: []
  },
  urlRoot: '/api/users'
})
