const $ = require('jquery')
const _ = require('underscore')
const Backbone = require('backbone')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const FormView = require('app/views/servers/form')
const InfoView = require('app/views/servers/info')
const MissionsView = require('app/views/servers/missions/index')
const ModsView = require('app/views/servers/mods/index')
const ParametersListView = require('app/views/servers/parameters/list')
const PlayersView = require('app/views/servers/players')
const tpl = require('tpl/servers/view.html')

module.exports = Marionette.LayoutView.extend({
  template: _.template(tpl),

  regions: {
    infoView: '#tab-info',
    missionsView: '#tab-missions',
    modsView: '#tab-mods',
    parametersView: '#parameters',
    playersView: '#tab-players',
    settingsView: '#settings'
  },

  events: {
    'click .nav-tabs a': 'tabs',
    submit: 'save'
  },

  modelEvents: {
    change: 'serverUpdated'
  },

  initialize: function (options) {
    this.missions = options.missions
    this.mods = options.mods
    this.users = options.users
    this.session = options.session
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return {
      canEditServer: this.hasPermission('servers.edit'),
      canViewMissions: this.hasPermission('missions.view'),
      canViewMods: this.hasPermission('mods.view')
    }
  },

  onRender: function () {
    this.infoView.show(new InfoView({ model: this.model, session: this.session }))
    this.missionsView.show(new MissionsView({ missions: this.missions, model: this.model, session: this.session }))
    this.modsView.show(new ModsView({ model: this.model, mods: this.mods, server: this.model, session: this.session }))
    this.parametersView.show(new ParametersListView({ model: this.model }))
    this.playersView.show(new PlayersView({ model: this.model }))
    this.settingsView.show(new FormView({
      model: this.model,
      users: this.users,
      session: this.session
    }))
  },

  serverUpdated: function () {
    this.infoView.currentView.render()
    this.parametersView.currentView.render()
    this.playersView.currentView.render()
    this.settingsView.currentView.render()
  },

  save: function (e) {
    e.preventDefault()

    if (!this.hasPermission('servers.edit')) {
      return
    }

    const self = this
    const oldId = this.model.get('id')
    const data = this.settingsView.currentView.serialize()

    if (!data.title) {
      sweetAlert({
        title: 'Error',
        text: 'Server title cannot be empty',
        type: 'error'
      })
      return
    }

    _.extend(data, this.missionsView.currentView.serialize())
    _.extend(data, this.modsView.currentView.serialize())
    _.extend(data, this.parametersView.currentView.serialize())

    this.model.save(data, {
      success: function () {
        const newId = self.model.get('id')
        if (oldId !== newId) {
          Backbone.history.navigate('#servers/' + newId, true)
        } else {
          self.serverUpdated()
        }
      },
      error: function (model, response) {
        sweetAlert({
          title: 'Error',
          text: 'An error occurred, please consult the logs',
          type: 'error'
        })
      }
    })
  },

  tabs: function (e) {
    e.preventDefault()
    const target = $(e.target).attr('href')

    this.$('.nav-link').removeClass('active')
    $(e.target).addClass('active')

    this.$('.tab-pane').removeClass('active show')
    this.$(target).addClass('active show')
  }
})
