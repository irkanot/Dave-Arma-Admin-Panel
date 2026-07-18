const $ = require('jquery')
const _ = require('underscore')
const Marionette = require('marionette')
const Ladda = require('ladda')
const sweetAlert = require('sweet-alert')

const tpl = require('tpl/missions/upload.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  events: {
    'click form button': 'submit'
  },

  submit: function (event) {
    event.preventDefault()
    const self = this
    const $form = this.$el.find('form')

    const $uploadBtn = $form.find('button[type=submit]')
    const laddaBtn = Ladda.create($uploadBtn.get(0))
    laddaBtn.start()

    $.ajax('/api/missions', {
      success: function (data) {
        laddaBtn.stop()
        self.render()
      },
      error: function (response) {
        laddaBtn.stop()
        sweetAlert({ title: 'Upload failed', text: response.responseText || 'Unable to import mission', type: 'error' })
      },
      files: $form.find(':file'),
      iframe: true
    })
  }
})
