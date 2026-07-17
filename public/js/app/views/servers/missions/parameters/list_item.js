const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/servers/missions/parameters/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template,

  events: {
    'click button.parameter-delete': 'delete',
    'change input': 'changed'
  },

  changed: function (e) {
    const val = $(e.target).val()
    this.model.set(e.target.dataset.attr, val)
  },

  delete: function (e) {
    e.preventDefault()
    this.model.destroy()
  },

  templateHelpers: function () {
    return {
      index: this.options.index
    }
  }
})
