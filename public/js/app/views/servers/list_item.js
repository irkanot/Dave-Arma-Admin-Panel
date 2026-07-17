const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/servers/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template,

  events: {
    'click .clone': 'clone',
    'click .delete': 'delete',
    'click .start': 'start',
    'click .stop': 'stop'
  },

  modelEvents: {
    change: 'serverUpdated'
  },

  initialize: function (options) {
    this.session = options.session
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return {
      canStart: this.hasPermission('servers.start'),
      canStop: this.hasPermission('servers.stop'),
      canCreate: this.hasPermission('servers.create'),
      canDelete: this.hasPermission('servers.delete')
    }
  },

  clone: function (e) {
    if (!this.hasPermission('servers.create')) {
      return
    }

    const title = this.model.get('title') + ' Clone'
    const clone = this.model.clone()
    clone.set({ id: null, title, auto_start: false })
    clone.save()
  },

  delete: function (event) {
    const self = this
    if (!this.hasPermission('servers.delete')) {
      return
    }

    sweetAlert({
      title: 'Are you sure?',
      text: 'Your server configuration will be deleted!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonClass: 'btn-danger',
      confirmButtonText: 'Yes, delete it!'
    },
    function () {
      self.model.destroy()
    })
  },

  start: function (event) {
    const self = this
    event.preventDefault()
    if (!this.hasPermission('servers.start')) {
      return
    }

    this.model.start(function (err) {
      if (err) {
        sweetAlert({
          title: 'Error',
          text: err.responseText,
          type: 'error'
        })
        return
      }

      self.render()
    })
  },

  stop: function (event) {
    const self = this
    event.preventDefault()
    if (!this.hasPermission('servers.stop')) {
      return
    }

    sweetAlert({
      title: 'Are you sure?',
      text: 'The server will stopped.',
      type: 'warning',
      showCancelButton: true,
      confirmButtonClass: 'btn-warning',
      confirmButtonText: 'Yes, stop it!'
    },
    function () {
      self.model.stop(function (err) {
        if (err) {
          sweetAlert({
            title: 'Error',
            text: err.responseText,
            type: 'error'
          })
          return
        }

        self.render()
      })
    })
  },

  serverUpdated: function (event) {
    this.render()
  }
})
