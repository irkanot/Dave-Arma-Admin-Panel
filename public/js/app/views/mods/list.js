const _ = require('underscore')
const $ = require('jquery')
const Marionette = require('marionette')
const sweetAlert = require('sweet-alert')

const ListItemView = require('app/views/mods/list_item')
const tpl = require('tpl/mods/list.html')

const template = _.template(tpl)

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template,

  events: {
    'change .select-all-items': 'selectAll',
    'change .select-item': 'selectionChanged',
    'click .delete-selected': 'deleteSelected'
  },

  initialize: function (options) {
    this.filterValue = options.filterValue
    this.session = options.session
  },

  hasPermission: function (permission) {
    const permissions = (this.session && this.session.get('permissions')) || []
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1
  },

  templateHelpers: function () {
    return { canBulkDelete: this.hasPermission('mods.delete') }
  },

  selectAll: function (event) {
    this.$('.select-item').prop('checked', event.target.checked)
    this.selectionChanged()
  },

  selectionChanged: function () {
    const selected = this.$('.select-item:checked').length
    const total = this.$('.select-item').length
    this.$('.selected-count').text(selected)
    this.$('.delete-selected').prop('disabled', selected === 0)
    this.$('.select-all-items').prop('checked', total > 0 && selected === total)
  },

  deleteSelected: function () {
    const self = this
    const names = this.$('.select-item:checked').map(function () { return this.value }).get()
    if (!names.length || !this.hasPermission('mods.delete')) return
    sweetAlert({
      title: 'Delete ' + names.length + ' mods?',
      text: 'All selected mods will be deleted from the server.',
      type: 'warning',
      showCancelButton: true,
      confirmButtonClass: 'btn-danger',
      confirmButtonText: 'Delete selected'
    }, function () {
      self.$('.delete-selected').prop('disabled', true)
      $.ajax({
        url: '/api/mods/bulk-delete',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ names }),
        success: function () { self.collection.fetch() },
        error: function (resp) {
          sweetAlert({ title: 'Delete failed', text: resp.responseText || 'Unable to delete selected mods', type: 'error' })
          self.selectionChanged()
        }
      })
    })
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({
      model: item,
      session: this.session
    }, childViewOptions))
  },

  filter: function (child, index, collection) {
    const name = child.get('name').toLowerCase()

    if (name.indexOf(this.filterValue.toLowerCase()) >= 0) {
      return true
    }

    const modFile = child.get('modFile')
    if (modFile && modFile.name && modFile.name.toLowerCase().indexOf(this.filterValue.toLowerCase()) >= 0) {
      return true
    }

    const steamMeta = child.get('steamMeta')
    if (steamMeta && steamMeta.name && steamMeta.name.toLowerCase().indexOf(this.filterValue.toLowerCase()) >= 0) {
      return true
    }

    return false
  }
})
