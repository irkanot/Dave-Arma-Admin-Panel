const Backbone = require('backbone')
const AuditEntry = require('app/models/audit_entry')

module.exports = Backbone.Collection.extend({
  model: AuditEntry,
  url: '/api/audit'
})
