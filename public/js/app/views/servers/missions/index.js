const _ = require('underscore')
const Marionette = require('marionette')

const MissionRotations = require('app/collections/mission_rotations')
const AvailableListView = require('app/views/servers/missions/available/list')
const RotationListView = require('app/views/servers/missions/rotation/list')
const tpl = require('tpl/servers/missions/index.html')

module.exports = Marionette.LayoutView.extend({
  template: _.template(tpl),
  templateHelpers: function () {
    return {
      filterValue: this.filterValue
    }
  },

  regions: {
    availableView: '#available',
    rotationView: '#rotation'
  },

  events: {
    'keyup #filterMissions': 'updateFilter'
  },

  modelEvents: {
    change: 'serverUpdated'
  },

  initialize: function (options) {
    this.missions = options.missions
    this.session = options.session
    this.canEditServer = this.hasPermission('servers.edit')
    this.filterValue = ''

    this.rotationCollection = new MissionRotations(this.model.get('missions'))

    const self = this

    this.availableListView = new AvailableListView({
      collection: this.missions,
      filterValue: this.filterValue,
      canEditServer: this.canEditServer
    })
    this.availableListView.on('add', function (model) {
      self.rotationCollection.add([{
        difficulty: self.model.missionDifficulty(),
        name: model.get('name').replace('.pbo', '')
      }])
    })

    this.rotationListView = new RotationListView({
      collection: this.rotationCollection,
      server: this.model,
      canEditServer: this.canEditServer
    })
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  onRender: function () {
    this.availableView.show(this.availableListView)
    this.rotationView.show(this.rotationListView)
  },

  updateFilter: function (event) {
    this.filterValue = event.target.value
    this.availableView.currentView.filterValue = this.filterValue
    this.availableView.currentView.render()
  },

  serverUpdated: function () {
    this.rotationCollection.set(this.model.get('missions'))
  },

  serialize: function () {
    return {
      missions: this.rotationCollection.toJSON()
    }
  }
})
