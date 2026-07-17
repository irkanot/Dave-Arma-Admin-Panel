const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: process.env.NODE_ENV || 'development',

  // Entry point for static analyzer
  entry: path.join(__dirname, 'public', 'js', 'app.js'),

  output: {
    // Where to build results
    path: path.join(__dirname, 'assets'),

    // Filename to use in HTML
    filename: 'bundle.js',

    // Path to use in HTML
    publicPath: '/'
  },

  resolve: {
    alias: {
      app: path.join(__dirname, 'public', 'js', 'app'),
      'backbone.bootstrap-modal': path.join(__dirname, 'public', 'js', 'app', 'bootstrap-modal'),
      marionette: path.join(__dirname, 'public', 'js', 'app', 'marionette-legacy'),
      'sweet-alert': 'sweetalert',
      tpl: path.join(__dirname, 'public', 'js', 'tpl')
    }
  },

  plugins: [
    new webpack.ProvidePlugin({
      _: 'underscore',
      $: 'jquery',
      Backbone: 'backbone',
      jQuery: 'jquery'
    })
  ],

  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.html$/, type: 'asset/source' },
      { test: /\.json$/, type: 'json' },
      { test: /\.(png|jpe?g|gif|svg)$/i, type: 'asset/inline' },
      { test: /\.(woff2?|ttf|eot)$/i, type: 'asset/resource' }
    ]
  },

  devtool: 'inline-source-map'
}
