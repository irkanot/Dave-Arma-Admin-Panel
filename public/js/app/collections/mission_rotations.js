const Backbone = require('backbone')

const MissionRotation = require('app/models/mission_rotation')

module.exports = Backbone.Collection.extend({
  model: MissionRotation
})
