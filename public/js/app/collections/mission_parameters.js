const Backbone = require('backbone')

const MissionParameter = require('app/models/mission_parameter')

module.exports = Backbone.Collection.extend({
  model: MissionParameter
})
