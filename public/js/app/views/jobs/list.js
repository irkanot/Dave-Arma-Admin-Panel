const _ = require('underscore')
const Marionette = require('marionette')

const JobView = require('app/views/jobs/list_item')
const tpl = require('tpl/jobs/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: JobView,
  childViewContainer: 'tbody',
  template: _.template(tpl),

  initialize: function () {
    this.refreshInterval = setInterval(function () {
      this.collection.fetch()
    }.bind(this), 5000)
  },

  onBeforeDestroy: function () {
    clearInterval(this.refreshInterval)
  }
})
