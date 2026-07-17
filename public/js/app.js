const $ = require('jquery')
const Backbone = require('backbone')

window.$ = $
window.jQuery = $
window.Backbone = Backbone

require('bootstrap/dist/css/bootstrap.css')
require('bootstrap/dist/js/bootstrap.bundle')
require('ladda/dist/ladda-themeless.min.css')
require('sweetalert/dist/sweetalert.css')
require('sweetalert/dist/sweetalert.css')
require('../css/styles.css')
require('jquery.iframe-transport')
require('backbone.bootstrap-modal')

$(function () {
  const Router = require('app/router')
  window.appRouter = new Router()
})
