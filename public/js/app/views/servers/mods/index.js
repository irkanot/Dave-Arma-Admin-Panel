const _ = require('underscore')
const sweetAlert = require('sweet-alert')

const ServerMods = require('app/collections/server_mods')
const ServerMod = require('app/models/server_mod')
const ModsView = require('app/views/mods/index')
const AvailableModsListView = require('app/views/servers/mods/available/list')
const SelectedModsListView = require('app/views/servers/mods/selected/list')
const tpl = require('tpl/servers/mods/index.html')

const template = _.template(tpl)

module.exports = ModsView.extend({
  template,

  regions: {
    availableView: '#available',
    selectedView: '#selected'
  },

  modelEvents: {
    change: 'serverUpdated'
  },

  events: {
    'keyup #filterMods': 'updateFilter',
    'submit #server-import-html': 'importHtmlModList'
  },

  initialize: function (options) {
    ModsView.prototype.initialize.call(this, options)
    this.session = options.session
    this.canEditServer = this.hasPermission('servers.edit')

    this.selectedModsCollection = new ServerMods(this.serverMods())

    this.availableModsListView = new AvailableModsListView({
      collection: this.options.mods,
      selectedModsCollection: this.selectedModsCollection,
      filterValue: this.filterValue,
      canEditServer: this.canEditServer
    })
    this.selectedModsListView = new SelectedModsListView({
      collection: this.selectedModsCollection,
      canEditServer: this.canEditServer
    })

    this.listenTo(this.selectedModsCollection, 'update', this.availableModsListView.render)
  },

  templateHelpers: function () {
    return {
      filterValue: this.filterValue,
      canEditServer: this.canEditServer
    }
  },

  updateFilter: function (event) {
    this.filterValue = event.target.value

    this.availableModsListView.filterValue = this.filterValue
    this.availableModsListView.render()
    this.selectedModsListView.filterValue = this.filterValue
    this.selectedModsListView.render()
  },

  onRender: function () {
    this.availableView.show(this.availableModsListView)
    this.selectedView.show(this.selectedModsListView)
  },

  serverMods: function () {
    return this.model.get('mods')
      .map(function (mod) {
        return {
          name: mod
        }
      })
  },

  importHtmlModList: function (event) {
    event.preventDefault()
    event.stopPropagation()

    if (!this.canEditServer) {
      return false
    }

    const fileInput = this.$('#serverPresetHtml')[0]
    const file = fileInput && fileInput.files[0]
    if (!file) {
      sweetAlert({ title: 'Error', text: 'Select an HTML preset first', type: 'error' })
      return false
    }

    const reader = new window.FileReader()
    reader.onload = this.importHtmlContents.bind(this)
    reader.onerror = function () {
      sweetAlert({ title: 'Error', text: 'Unable to read selected file', type: 'error' })
    }
    reader.readAsText(file)

    return false
  },

  importHtmlContents: function (event) {
    const workshopIds = this.parseWorkshopIds(event.target.result)
    if (!workshopIds.length) {
      sweetAlert({ title: 'No Workshop IDs found', text: 'The selected HTML file does not contain Steam Workshop IDs.', type: 'warning' })
      return
    }

    const installedByWorkshopId = this.installedModsByWorkshopId()
    const added = []
    const alreadySelected = []
    const missing = []

    workshopIds.forEach(function (workshopId) {
      const mod = installedByWorkshopId[workshopId]
      if (!mod) {
        missing.push(workshopId)
        return
      }

      const name = mod.get('name')
      if (this.selectedModsCollection.get(name)) {
        alreadySelected.push(name)
        return
      }

      this.selectedModsCollection.add(new ServerMod({ name }))
      added.push(name)
    }, this)

    this.selectedModsCollection.sort()
    this.selectedModsListView.render()
    this.availableModsListView.render()

    const text = [
      added.length + ' added',
      alreadySelected.length + ' already selected',
      missing.length + ' not installed'
    ].join(', ') + '.'

    sweetAlert({
      title: 'Mod list imported',
      text,
      type: missing.length ? 'warning' : 'success'
    })
  },

  parseWorkshopIds: function (html) {
    const ids = []
    const patterns = [
      /steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+)/gi,
      /steamcommunity\.com\/workshop\/filedetails\/\?id=(\d+)/gi,
      /(?:^|[?&])id=(\d{5,})/gi
    ]

    patterns.forEach(function (pattern) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        if (ids.indexOf(match[1]) === -1) {
          ids.push(match[1])
        }
      }
    })

    return ids
  },

  installedModsByWorkshopId: function () {
    const installed = {}
    this.options.mods.each(function (mod) {
      const steamMeta = mod.get('steamMeta')
      if (steamMeta && steamMeta.id && !mod.get('missingTarget')) {
        installed[String(steamMeta.id)] = mod
      }
    })

    return installed
  },

  serverUpdated: function () {
    this.selectedModsCollection.set(this.serverMods())
  },

  serialize: function () {
    this.selectedModsCollection.sort()
    return {
      mods: this.selectedModsCollection.toJSON()
        .map(function (mod) {
          return mod.name
        })
    }
  }
})
