var stallManager = require('../../../../utils/stall-manager.js')
var stallUtils = require('../../../../utils/stall-utils.js')

Page({
  data: {
    products: [],
    filteredProducts: [],
    categories: [],
    currentCategory: ''
  },

  onLoad: function() {
    this.setData({ categories: stallManager.getCategories() })
    stallUtils.setThemeColor()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var products = stallManager.getProducts()
    this.setData({ products: products })
    this.filterProducts()
  },

  filterCategory: function(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.category })
    this.filterProducts()
  },

  filterProducts: function() {
    var category = this.data.currentCategory
    var products = this.data.products
    var filtered = category ? products.filter(function(p) { return p.category === category }) : products
    this.setData({ filteredProducts: filtered })
  },

  goAdd: function() {
    wx.navigateTo({ url: '/pages/create/stall/add-product/add-product' })
  },

  editProduct: function(e) {
    wx.navigateTo({ url: '/pages/create/stall/add-product/add-product?id=' + e.currentTarget.dataset.id })
  },

  deleteProduct: function(e) {
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      success: function(res) {
        if (res.confirm) {
          stallManager.removeProduct(id)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }.bind(this)
    })
  }
})
