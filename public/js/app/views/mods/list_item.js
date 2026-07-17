const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/mods/list_item.html')

const template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template,

  events: {
    'click .destroy': 'deleteMod'
  },

  initialize: function (options) {
    this.session = options.session
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    const modFile = this.model.get('modFile')
    const steamMeta = this.model.get('steamMeta')

    let link = null
    let title = null

    if (steamMeta && steamMeta.id) {
      if (steamMeta.id) {
        link = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + steamMeta.id
      }

      if (steamMeta.name) {
        title = steamMeta.name
      }
    }

    if (modFile && modFile.name) {
      title = modFile.name
    }

    return {
      link,
      title,
      missingTarget: !!this.model.get('missingTarget'),
      linkTarget: this.model.get('linkTarget'),
      canDeleteMod: this.hasPermission('mods.delete')
    }
  },

  deleteMod: function (event) {
    const self = this
    if (!this.hasPermission('mods.delete')) {
      return
    }
    sweetAlert({
      title: 'Are you sure?',
      text: 'The mod will be deleted from the server!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonClass: 'btn-danger',
      confirmButtonText: 'Yes, delete it!'
    },
    function () {
      self.model.destroy()
    })
  }
})
