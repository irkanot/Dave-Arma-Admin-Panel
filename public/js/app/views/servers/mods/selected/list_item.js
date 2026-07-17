const $ = require('jquery')
const _ = require('underscore')

const ModListItemView = require('app/views/mods/list_item')
const tpl = require('tpl/servers/mods/selected/list_item.html')

const template = _.template(tpl)

module.exports = ModListItemView.extend({
  template,

  templateHelpers: function () {
    const superTemplateHelpers = ModListItemView.prototype.templateHelpers.call(this)
    return Object.assign({}, superTemplateHelpers, {
      canEditServer: this.options.canEditServer
    })
  },

  events: {
    'click button.delete': 'delete',
    'change select#difficulty': 'changed',
    'change input#name': 'changed'
  },

  changed: function (e) {
    if (!this.options.canEditServer) {
      return
    }

    const val = $(e.target).val()
    this.model.set(e.target.id, val)
  },

  delete: function (e) {
    e.preventDefault()
    if (!this.options.canEditServer) {
      return
    }

    this.model.destroy()
  }
})
