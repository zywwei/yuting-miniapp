var childStorage = require('../../utils/child-storage.js')
var aiManager = require('../../utils/ai-manager.js')

Page({
  data: {
    drawingCount: 0,
    todaySales: 0,
    aiModelIcon: '🤖',
    aiModelName: '未配置'
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
    var drawings = childStorage.get('drawings') || []
    var sales = childStorage.get('stallSales') || []
    var today = this.getTodayStr()
    var todaySales = sales.filter(function(s) { return s.date === today })

    // 获取AI模型信息
    var modelInfo = aiManager.getCurrentModelInfo()
    var aiModelIcon = '🤖'
    var aiModelName = '未配置'
    
    if (modelInfo && modelInfo.configured) {
      aiModelIcon = modelInfo.info.icon
      aiModelName = modelInfo.info.name
    }

    this.setData({
      drawingCount: drawings.length,
      todaySales: todaySales.length,
      aiModelIcon: aiModelIcon,
      aiModelName: aiModelName
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
  },

  goAiChat: function() {
    wx.navigateTo({ url: '/pages/create/ai-chat/index' })
  }
})
