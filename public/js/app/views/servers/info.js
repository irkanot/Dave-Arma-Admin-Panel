const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/servers/info.html')

module.exports = Marionette.LayoutView.extend({
  template: _.template(tpl),

  events: {
    'click #start': 'start',
    'click #stop': 'stop'
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
      canStartServer: this.hasPermission('servers.start'),
      canStopServer: this.hasPermission('servers.stop')
    }
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
      event.preventDefault()

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
  }
})
