var diceManager = require('../../../utils/dice-manager.js')
var diceUtils = require('../../../utils/dice-utils.js')
var childStorage = require('../../../utils/child-storage.js')

Page({
  data: {
    totalGames: 0,
    winRate: 0,
    leopardCount: 0,
    recentRecords: []
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var stats = diceManager.getStats()
    var recentRecords = diceUtils.getRecentRecords(3)
    var winRate = diceUtils.calculateWinRate(stats.wins, stats.totalGames)

    this.setData({
      totalGames: stats.totalGames,
      winRate: winRate,
      leopardCount: stats.leopardCount || 0,
      recentRecords: recentRecords
    })
  },

  goCompare: function() {
    wx.navigateTo({ url: '/pages/create/dice/compare/index' })
  },

  goCollection: function() {
    wx.navigateTo({ url: '/pages/create/dice/collection/index' })
  },

  goMission: function() {
    wx.navigateTo({ url: '/pages/create/dice/mission/index' })
  },

  goSlots: function() {
    wx.navigateTo({ url: '/pages/create/dice/slots/index' })
  }
})
