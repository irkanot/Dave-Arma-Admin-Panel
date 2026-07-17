const Backbone = require('backbone')

function BootstrapModal (options) {
  this.options = options || {}
  this.content = this.options.content
  this.prevented = false
}

BootstrapModal.prototype.open = function () {
  const title = this.options.title || ''
  const okText = this.options.okText === false ? false : (this.options.okText || 'OK')
  const cancelText = this.options.cancelText === false ? false : (this.options.cancelText || 'Cancel')

  this.prevented = false
  this.$backdrop = Backbone.$('<div class="modal-backdrop fade show"></div>')
  this.$el = Backbone.$([
    '<div class="modal fade show" tabindex="-1" role="dialog" style="display: block;">',
    '  <div class="modal-dialog modal-lg" role="document">',
    '    <div class="modal-content">',
    '      <div class="modal-header">',
    '        <h5 class="modal-title"></h5>',
    '        <button type="button" class="btn-close" aria-label="Close"></button>',
    '      </div>',
    '      <div class="modal-body"></div>',
    '      <div class="modal-footer"></div>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join(''))

  this.$el.find('.modal-title').text(title)
  this.$el.find('.modal-body').append(this.content.render().el)

  if (cancelText) {
    this.$el.find('.modal-footer').append('<button type="button" class="btn btn-secondary modal-cancel">' + cancelText + '</button>')
  }

  if (okText) {
    this.$el.find('.modal-footer').append('<button type="button" class="btn btn-primary modal-ok">' + okText + '</button>')
  }

  this.$el.on('click', '.btn-close, .modal-cancel', this.close.bind(this))
  this.$el.on('click', '.modal-ok', this.ok.bind(this))

  Backbone.$('body').append(this.$backdrop).append(this.$el).addClass('modal-open')
  return this
}

BootstrapModal.prototype.ok = function (event) {
  if (event) {
    event.preventDefault()
  }

  this.prevented = false
  this.content.trigger('ok', this)

  if (!this.prevented) {
    this.close()
  }
}

BootstrapModal.prototype.preventClose = function () {
  this.prevented = true
}

BootstrapModal.prototype.close = function () {
  if (this.content && this.content.remove) {
    this.content.remove()
  }

  if (this.$el) {
    this.$el.remove()
  }

  if (this.$backdrop) {
    this.$backdrop.remove()
  }

  Backbone.$('body').removeClass('modal-open')
}

Backbone.BootstrapModal = BootstrapModal

module.exports = BootstrapModal
