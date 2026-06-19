var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    stallName: '',
    products: []
  },

  onLoad: function() {
    this.loadData()
    this.setThemeColor()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var settings = stallManager.getSettings()
    var products = stallManager.getProducts().filter(function(p) { return p.quantity > 0 })

    this.setData({
      stallName: settings.stallName || '我的小铺',
      products: products
    })
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  }
})
