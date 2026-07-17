const Backbone = require('backbone')
const Job = require('app/models/job')

module.exports = Backbone.Collection.extend({
  model: Job,
  url: '/api/jobs'
})
