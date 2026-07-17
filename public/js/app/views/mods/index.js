const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const ListView = require('app/views/mods/list')
const tpl = require('tpl/mods/index.html')

const template = _.template(tpl)

module.exports = Marionette.LayoutView.extend({
  template,
  templateHelpers: function () {
    return {
      filterValue: this.filterValue,
      canImportMods: this.hasPermission('mods.import')
    }
  },

  regions: {
    listView: '#list'
  },

  events: {
    'submit #import-html': 'importHtml',
    'click #update-workshop': 'updateWorkshop',
    'click #refresh': 'refresh',
    'keyup #filterMods': 'updateFilter'
  },

  initialize: function (options) {
    this.session = options.session
    this.filterValue = ''
    this.modsListView = new ListView({
      collection: this.options.mods,
      filterValue: this.filterValue,
      session: this.session
    })
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  importHtml: function (event) {
    event.preventDefault()
    event.stopPropagation()

    const $button = this.$('#import-html button[type=submit]')
    const fileInput = this.$('#presetHtml')[0]
    const file = fileInput && fileInput.files[0]
    if (!file) {
      sweetAlert({ title: 'Error', text: 'Select an HTML preset first', type: 'error' })
      return false
    }

    const formData = new window.FormData()
    formData.append('presetHtml', file)
    $button.prop('disabled', true).text('Import started...')

    $.ajax({
      url: '/api/mods/import-html',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function (job) {
        sweetAlert({
          title: 'Import started',
          text: 'Job ' + job.id + ' is running. Open Jobs to follow progress.',
          type: 'success'
        })
      },
      error: function (resp) {
        sweetAlert({ title: 'Error', text: resp.responseText || 'Unable to import preset', type: 'error' })
      },
      complete: function () {
        $button.prop('disabled', false).text('Import from HTML')
      }
    })

    return false
  },

  updateWorkshop: function (event) {
    event.preventDefault()
    const $button = this.$('#update-workshop')
    $button.prop('disabled', true).text('Update check started...')
    $.ajax({
      url: '/api/mods/update-workshop',
      type: 'POST',
      success: function (job) {
        sweetAlert({
          title: 'Workshop update started',
          text: 'Job ' + job.id + ' is running. Open Jobs to follow progress.',
          type: 'success'
        })
      },
      error: function (resp) {
        sweetAlert({ title: 'Error', text: resp.responseText || 'Unable to update Workshop mods', type: 'error' })
      },
      complete: function () {
        $button.prop('disabled', false).text('Check & update Workshop mods')
      }
    })
  },

  updateFilter: function (event) {
    this.filterValue = event.target.value
    this.modsListView.filterValue = this.filterValue
    this.modsListView.render()
  },

  onRender: function () {
    this.listView.show(this.modsListView)
  },

  refresh: function (event) {
    event.preventDefault()
    const mods = this.options.mods
    $.ajax({
      url: '/api/mods/refresh',
      type: 'POST',
      success: function () {
        mods.fetch()
      },
      error: function () {

      }
    })
  }
})
