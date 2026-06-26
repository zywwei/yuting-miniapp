var tetrisManager = require('../../../utils/tetris-manager.js')
var tetrisUtils = require('../../../utils/tetris-utils.js')
var childStorage = getApp().globalData.childStorage

Page({
  data: {
    totalGames: 0,
    bestScore: 0,
    bestLines: 0,
    recentRecords: []
  },

  onLoad: function () {
    this.loadData()
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var stats = tetrisManager.getStats()
    var recent = tetrisUtils.getRecentRecords(5)
    this.setData({
      totalGames: stats.totalGames,
      bestScore: stats.bestScore,
      bestLines: stats.bestLines,
      recentRecords: recent
    })
  },

  goClassic: function () {
    wx.navigateTo({ url: '/packageCreate/pages/create/tetris/classic/index' })
  },

  goAdventure: function () {
    wx.navigateTo({ url: '/packageCreate/pages/create/tetris/adventure/index' })
  },

  goPuzzle: function () {
    wx.navigateTo({ url: '/packageCreate/pages/create/tetris/puzzle/index' })
  }
})
