var stallManager = require('../../../utils/stall-manager.js')

Page({
  data: {
    settings: {},
    levelInfo: {},
    todayRevenue: 0,
    todayOrders: 0,
    goalPercent: 0,
    lowStockProducts: []
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var settings = stallManager.getSettings()
    var levelInfo = stallManager.getLevelInfo()
    var products = stallManager.getProducts()
    var sales = stallManager.getSales()
    var today = stallManager.getTodayStr()

    var todaySales = sales.filter(function(s) { return s.date === today })
    var todayRevenue = todaySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
    var goalPercent = settings.dailyGoal > 0 ? Math.min(100, Math.round(todayRevenue / settings.dailyGoal * 100)) : 0

    var lowStockProducts = products.filter(function(p) { return p.quantity <= 3 })

    this.setData({
      settings: settings,
      levelInfo: levelInfo,
      todayRevenue: todayRevenue,
      todayOrders: todaySales.length,
      goalPercent: goalPercent,
      lowStockProducts: lowStockProducts
    })
  },

  toggleStall: function() {
    var settings = this.data.settings
    if (settings.isOpen) {
      stallManager.closeStall()
      wx.showToast({ title: '已打烊', icon: 'success' })
    } else {
      stallManager.openStall()
      wx.showToast({ title: '开始营业', icon: 'success' })
    }
    this.loadData()
  },

  goSale: function() {
    wx.navigateTo({ url: '/pages/create/stall/sale/sale' })
  },

  goInventory: function() {
    wx.navigateTo({ url: '/pages/create/stall/inventory/inventory' })
  },

  goHistory: function() {
    wx.navigateTo({ url: '/pages/create/stall/history/history' })
  },

  goStats: function() {
    wx.navigateTo({ url: '/pages/create/stall/stats/stats' })
  },

  goPriceBoard: function() {
    wx.navigateTo({ url: '/pages/create/stall/price-board/price-board' })
  },

  goChangeCalc: function() {
    wx.navigateTo({ url: '/pages/create/stall/change-calc/change-calc' })
  }
})
