Page({
  data: {
    drawingCount: 0,
    todaySales: 0
  },

  onLoad: function() {
    this.loadStats()
    this.setThemeColor()
  },

  onShow: function() {
    this.loadStats()
    this.setThemeColor()

    // 更新 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  loadStats: function() {
    var drawings = wx.getStorageSync('drawings') || []
    var sales = wx.getStorageSync('stallSales') || []
    var today = this.getTodayStr()
    var todaySales = sales.filter(function(s) { return s.date === today })

    this.setData({
      drawingCount: drawings.length,
      todaySales: todaySales.length
    })
  },

  getTodayStr: function() {
    var d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  },

  goDraw: function() {
    wx.navigateTo({ url: '/pages/create/draw/index' })
  },

  goStall: function() {
    wx.navigateTo({ url: '/pages/create/stall/index' })
  }
})
