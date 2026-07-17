const _ = require('underscore')
const Backbone = require('backbone')

function callMethod (view, methodName, args) {
  const method = view[methodName]
  if (typeof method === 'function') {
    return method.apply(view, args || [])
  }
}

function normalizeEvents (events) {
  if (typeof events === 'function') {
    return events()
  }

  return events || {}
}

function bindEntityEvents (view, entity, events) {
  events = normalizeEvents(events)

  Object.keys(events).forEach(function (eventName) {
    const handler = events[eventName]
    if (typeof handler === 'string') {
      view.listenTo(entity, eventName, view[handler])
    } else if (typeof handler === 'function') {
      view.listenTo(entity, eventName, handler)
    }
  })
}

function Region (options) {
  this.view = options.view
  this.selector = options.selector
  this.currentView = null
}

Region.prototype.show = function (view) {
  if (this.currentView && this.currentView.remove) {
    this.currentView.remove()
  }

  this.currentView = view
  view.render()
  this.view.$(this.selector).empty().append(view.el)
  return view
}

Region.prototype.empty = function () {
  if (this.currentView && this.currentView.remove) {
    this.currentView.remove()
  }

  this.currentView = null
  this.view.$(this.selector).empty()
}

const BaseView = Backbone.View.extend({
  constructor: function (options) {
    options = options || {}
    const initialize = this.initialize
    this.options = options

    this.initialize = function () {
      this.options = options
      return initialize.apply(this, arguments)
    }

    Backbone.View.apply(this, arguments)
    this.initialize = initialize
    this.options = options

    if (this.model) {
      bindEntityEvents(this, this.model, this.modelEvents)
    }

    if (this.collection) {
      bindEntityEvents(this, this.collection, this.collectionEvents)
      this.listenTo(this.collection, 'add remove reset sort', this.render)
    }
  },

  render: function () {
    const template = this.template

    if (template) {
      this.$el.html(template(this.serializeTemplateData()))
    }

    this.delegateEvents()
    this.setupRegions()
    this.renderChildren()
    callMethod(this, 'onRender')
    callMethod(this, 'onDomRefresh')

    return this
  },

  serializeTemplateData: function () {
    let data = this.model ? _.clone(this.model.toJSON()) : {}
    if (typeof this.serializeData === 'function') {
      data = _.extend(data, this.serializeData())
    }
    const helpers = _.result(this, 'templateHelpers') || {}

    return _.extend(data, helpers)
  },

  setupRegions: function () {
    const regions = _.result(this, 'regions') || {}

    Object.keys(regions).forEach(function (name) {
      this[name] = new Region({
        view: this,
        selector: regions[name]
      })
    }, this)
  },

  renderChildren: function () {},

  destroy: function () {
    this.remove()
  }
})

const CollectionView = BaseView.extend({
  render: function () {
    this.$el.empty()
    this.renderChildren()
    callMethod(this, 'onRender')
    callMethod(this, 'onDomRefresh')
    return this
  },

  renderChildren: function () {
    const collection = this.collection
    const ChildView = this.childView

    if (!collection || !ChildView) {
      return
    }

    collection.each(function (model, index) {
      const view = this.buildChildView(model, ChildView, this.getChildViewOptions(model, index))
      this.$el.append(view.render().el)
    }, this)
  },

  getChildViewOptions: function (model, index) {
    if (typeof this.childViewOptions === 'function') {
      return this.childViewOptions(model, index)
    }

    return this.childViewOptions || {}
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({ model: item }, childViewOptions))
  }
})

const CompositeView = BaseView.extend({
  renderChildren: function () {
    const collection = this.collection
    let ChildView = this.childView
    const target = this.childViewContainer ? this.$(this.childViewContainer) : this.$el

    if (!collection || !ChildView) {
      return
    }

    target.empty()

    if (collection.length === 0 && this.emptyView) {
      ChildView = this.emptyView
      const emptyView = this.buildChildView(null, ChildView, this.getChildViewOptions(null, 0))
      target.append(emptyView.render().el)
      return
    }

    collection.each(function (model, index) {
      if (typeof this.filter === 'function' && !this.filter(model, index, collection)) {
        return
      }

      const view = this.buildChildView(model, ChildView, this.getChildViewOptions(model, index))
      target.append(view.render().el)
    }, this)
  },

  getChildViewOptions: function (model, index) {
    if (typeof this.childViewOptions === 'function') {
      return this.childViewOptions(model, index)
    }

    return this.childViewOptions || {}
  },

  buildChildView: function (item, ChildViewType, childViewOptions) {
    return new ChildViewType(_.extend({ model: item }, childViewOptions))
  }
})

module.exports = {
  View: BaseView,
  ItemView: BaseView,
  LayoutView: BaseView,
  CollectionView,
  CompositeView,
  Region
}
