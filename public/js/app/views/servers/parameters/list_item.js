const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')

const tpl = require('tpl/servers/parameters/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template,

  events: {
    'click button.delete': 'delete',
    'change input#parameter': 'changed',
    'click button.clone': 'clone'
  },

  changed: function (e) {
    const val = $(e.target).val()
    this.model.set(e.target.id, val)
  },

  delete: function (e) {
    e.preventDefault()
    this.model.destroy()
  }
})
