const _ = require('underscore')
const Marionette = require('marionette')

const MissionParameter = require('app/models/mission_parameter')
const ListItemView = require('app/views/servers/missions/parameters/list_item')
const tpl = require('tpl/servers/missions/parameters/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template: _.template(tpl),

  events: {
    'click .add-parameter': 'addParameter'
  },

  childViewOptions: function (model, index) {
    return {
      index
    }
  },

  addParameter: function (e) {
    e.preventDefault()
    this.collection.add(new MissionParameter())
  }
})
