const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')

const UploadView = require('app/views/missions/upload')
const ListView = require('app/views/missions/list')
const tpl = require('tpl/missions/index.html')

module.exports = Marionette.LayoutView.extend({
  template: _.template(tpl),
  templateHelpers: function () {
    return {
      filterValue: this.filterValue,
      canUploadMissions: this.hasPermission('missions.upload')
    }
  },

  regions: {
    uploadView: '#upload',
    listView: '#list'
  },

  events: {
    'click #refresh': 'refresh',
    'keyup #filterMissions': 'updateFilter'
  },

  initialize: function (options) {
    this.session = options.session
    this.filterValue = ''
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  updateFilter: function (event) {
    this.filterValue = event.target.value
    this.listView.currentView.filterValue = this.filterValue
    this.listView.currentView.render()
  },

  onRender: function () {
    if (this.hasPermission('missions.upload')) {
      this.uploadView.show(new UploadView())
    }
    this.listView.show(new ListView({
      collection: this.options.missions,
      filterValue: this.filterValue,
      session: this.session
    }))
  },

  refresh: function (event) {
    event.preventDefault()
    $.ajax({
      url: '/api/missions/refresh',
      type: 'POST',
      success: function (resp) {

      },
      error: function (resp) {

      }
    })
  }
})
