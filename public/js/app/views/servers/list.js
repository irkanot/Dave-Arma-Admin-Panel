const _ = require('underscore')
const $ = require('jquery')
const Backbone = require('backbone')
const Marionette = require('marionette')

const Server = require('app/models/server')
const AddServerView = require('app/views/servers/form')
const EmptyView = require('app/views/servers/empty')
const ListItemView = require('app/views/servers/list_item')
const tpl = require('tpl/servers/list.html')

const template = _.template(tpl)

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template,

  emptyView: EmptyView,

  initialize: function (options) {
    this.users = options.users
    this.session = options.session
    this.metrics = {}
    this.metricsLoading = true
    this.metricsError = ''
    this.refreshMetrics()
    this.metricsTimer = setInterval(this.refreshMetrics.bind(this), 5000)
  },

  onBeforeDestroy: function () {
    clearInterval(this.metricsTimer)
  },

  refreshMetrics: function () {
    const self = this
    $.get('/api/system').done(function (metrics) {
      self.metrics = metrics
      self.metricsLoading = false
      self.metricsError = ''
      self.render()
    }).fail(function (response) {
      self.metricsLoading = false
      self.metricsError = (response.responseJSON && response.responseJSON.error) || response.responseText || 'Unable to read server resources'
      self.render()
    })
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return {
      canCreateServer: this.hasPermission('servers.create'),
      metrics: this.metrics,
      metricsLoading: this.metricsLoading,
      metricsError: this.metricsError
    }
  },

  events: {
    'click #add-server': 'addServer'
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    // build the final list of options for the item view type
    let options = _.extend({ model: item, session: this.session }, childViewOptions)

    if (ChildViewType === EmptyView) {
      options = _.extend({ servers: this.collection, session: this.session }, options)
    }

    // create the item view instance
    const view = new ChildViewType(options)
    // return it
    return view
  },

  addServer: function () {
    const view = new AddServerView({
      model: new Server(),
      servers: this.collection,
      users: this.users,
      session: this.session
    })
    new Backbone.BootstrapModal({ content: view, servers: this.collection }).open()
  }
})
