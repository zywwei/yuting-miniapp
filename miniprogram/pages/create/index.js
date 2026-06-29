var childStorage = require('../../utils/child-storage.js')
var aiManager = require('../../utils/ai-manager.js')
var auth = require('../../utils/auth.js')

var app = getApp()

Page({
  data: {
    drawingCount: 0,
    todaySales: 0,
    aiModelIcon: '🤖',
    aiModelName: '未配置',
    rpsGames: 0,
    diceGames: 0,
    tetrisGames: 0,
    bookEntries: 0,
    children: [],
    currentChildId: ''
  },

  onLoad: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })
    this.loadStats()
    this.setThemeColor()
  },

  onShow: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })
    this.loadStats()
    this.setThemeColor()

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
  },

  onChildChanged: function(e) {
    var childId = e.detail.childId
    auth.switchChild(childId)
    app.globalData.currentChildId = childId
    this.setData({ currentChildId: childId })
    this.loadStats()
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
    var todaySalesRecords = sales.filter(function(s) { return s.date === today })
    var todaySalesAmount = todaySalesRecords.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)

    // 获取AI模型信息
    var modelInfo = aiManager.getCurrentModelInfo()
    var aiModelIcon = '🤖'
    var aiModelName = '未配置'
    
    if (modelInfo && modelInfo.configured) {
      aiModelIcon = modelInfo.info.icon
      aiModelName = modelInfo.info.name
    }

    // 获取游戏统计
    var rpsRecords = childStorage.get('rpsRecords') || []
    var diceRecords = childStorage.get('diceRecords') || []
    var tetrisRecords = childStorage.get('tetrisRecords') || []
    var allBooks = childStorage.get('accountBooks') || []
    var bookIds = {}
    allBooks.forEach(function(b) { bookIds[b.id] = true })
    var bookEntries = (childStorage.get('accountEntries') || []).filter(function(e) { return bookIds[e.bookId] })

    this.setData({
      drawingCount: drawings.length,
      todaySales: todaySalesAmount,
      aiModelIcon: aiModelIcon,
      aiModelName: aiModelName,
      rpsGames: rpsRecords.length,
      diceGames: diceRecords.length,
      tetrisGames: tetrisRecords.length,
      bookEntries: bookEntries.length
    })
  },

  getTodayStr: function() {
    var d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  },

  goDraw: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/draw/index' })
  },

  goStall: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/stall/index' })
  },

  goAiChat: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/ai-chat/index' })
  },

  goRps: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/rps/index' })
  },

  goDice: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/dice/index' })
  },

  goTetris: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/tetris/index' })
  },

  goBook: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/index' })
  }
})
