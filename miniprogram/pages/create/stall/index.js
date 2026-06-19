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
    // 从云端同步数据
    stallManager.syncFromCloud()
    this.loadData()
    this.setThemeColor()
  },

  onShow: function() {
    this.loadData()
    this.setThemeColor()
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
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
  },

  editDailyGoal: function() {
    var that = this
    var currentGoal = this.data.settings.dailyGoal || 50
    wx.showModal({
      title: '设置今日目标',
      editable: true,
      placeholderText: '输入目标金额（元）',
      content: String(currentGoal),
      success: function(res) {
        if (res.confirm && res.content) {
          var goal = parseInt(res.content)
          if (isNaN(goal) || goal < 0) {
            wx.showToast({ title: '请输入有效金额', icon: 'none' })
            return
          }
          var settings = stallManager.getSettings()
          settings.dailyGoal = goal
          stallManager.saveSettings(settings)
          that.loadData()
          wx.showToast({ title: '目标已更新', icon: 'success' })
        }
      }
    })
  }
})
