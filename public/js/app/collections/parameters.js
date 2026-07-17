const Backbone = require('backbone')

const Parameter = require('app/models/parameter')

module.exports = Backbone.Collection.extend({
  model: Parameter
})
