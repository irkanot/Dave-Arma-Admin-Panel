const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/servers/players.html')

module.exports = Marionette.LayoutView.extend({
  template: _.template(tpl),
  templateHelpers: {
    players: function () {
      return _.sortBy(this.state.players, function (player) {
        return player.name
      })
    }
  }
})
