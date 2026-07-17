const _ = require('underscore')

const ServerMod = require('app/models/server_mod')
const ModListItemView = require('app/views/mods/list_item')
const tpl = require('tpl/servers/mods/available/list_item.html')

const template = _.template(tpl)

module.exports = ModListItemView.extend({
  template,
  templateHelpers: function () {
    const superTemplateHelpers = ModListItemView.prototype.templateHelpers.call(this)
    const name = this.model.get('name')
    const modSelected = this.options.selectedModsCollection.get(name)

    return Object.assign({}, superTemplateHelpers, {
      canEditServer: this.options.canEditServer,
      isDisabledButton: function () {
        return modSelected ? 'disabled' : ''
      }
    })
  },

  events: {
    'click .add-mod': 'addMod'
  },

  addMod: function (e) {
    e.preventDefault()
    if (!this.options.canEditServer) {
      return
    }

    const name = this.model.get('name')
    if (this.options.selectedModsCollection.get(name)) {
      return
    }

    this.options.selectedModsCollection.add(new ServerMod({ name }))
  }
})
