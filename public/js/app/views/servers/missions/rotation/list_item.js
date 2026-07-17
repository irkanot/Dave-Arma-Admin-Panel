const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')

const MissionParameters = require('app/collections/mission_parameters')
const ParametersListView = require('app/views/servers/missions/parameters/list')
const tpl = require('tpl/servers/missions/rotation/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.LayoutView.extend({
  tagName: 'tr',
  template,

  events: {
    'click button.delete': 'delete',
    'change select#difficulty': 'changed',
    'change input#name': 'changed'
  },

  regions: {
    parametersView: '.parameters'
  },

  initialize: function (options) {
    this.parametersCollection = new MissionParameters(this.model.get('params'))
    this.parametersCollection.on('all', this.updateMissionParameters, this)
    this.parametersListView = new ParametersListView({ collection: this.parametersCollection })
    this.canEditServer = options.canEditServer
  },

  templateHelpers: function () {
    return {
      canEditServer: this.canEditServer
    }
  },

  updateMissionParameters: function () {
    this.model.set('params', this.parametersCollection.toJSON())
  },

  changed: function (e) {
    if (!this.canEditServer) {
      return
    }

    const val = $(e.target).val()
    this.model.set(e.target.id, val)
  },

  delete: function (e) {
    e.preventDefault()
    if (!this.canEditServer) {
      return
    }

    this.model.destroy()
  },

  onRender: function () {
    this.parametersView.show(this.parametersListView)
    const difficulty = this.model.get('difficulty')
    const $option = this.$el.find("#difficulty option[value='" + difficulty + "']")
    $option.attr('selected', 'selected')
  }
})
