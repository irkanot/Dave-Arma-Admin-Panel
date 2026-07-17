const Backbone = require('backbone')
const User = require('app/models/user')

module.exports = Backbone.Collection.extend({
  model: User,
  url: '/api/users'
})
