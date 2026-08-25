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

  onPullDownRefresh: async function() {
    try {
      await stallManager.syncFromCloud()
      this.loadData()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
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
    wx.navigateTo({ url: '/packageCreate/pages/create/stall/add-product/add-product' })
  },

  editProduct: function(e) {
    wx.navigateTo({ url: '/packageCreate/pages/create/stall/add-product/add-product?id=' + e.currentTarget.dataset.id })
  },

  deleteProduct: function(e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      // D3：提示销售引用影响——删除后历史利润按 0 成本计算、相关库存回滚失效
      content: '确定要删除这个商品吗？若它已有销售记录，历史利润统计将不再计入其成本。',
      success: function(res) {
        if (res.confirm) {
          stallManager.removeProduct(id)
          that.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
