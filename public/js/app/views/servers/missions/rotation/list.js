const _ = require('underscore')
const Marionette = require('marionette')

const MissionRotation = require('app/models/mission_rotation')
const ListItemView = require('app/views/servers/missions/rotation/list_item')
const tpl = require('tpl/servers/missions/rotation/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template: _.template(tpl),

  events: {
    'click .add-mission': 'addMission'
  },

  initialize: function (options) {
    this.server = options.server
    this.canEditServer = options.canEditServer
  },

  templateHelpers: function () {
    return {
      canEditServer: this.canEditServer
    }
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({
      model: item,
      canEditServer: this.canEditServer
    }, childViewOptions))
  },

  addMission: function (e) {
    e.preventDefault()
    if (!this.canEditServer) {
      return
    }

    this.collection.add(new MissionRotation({
      difficulty: this.server.missionDifficulty()
    }))
  }
})
