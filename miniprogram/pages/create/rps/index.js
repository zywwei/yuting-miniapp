var rpsManager = require('../../../utils/rps-manager.js')
var rpsUtils = require('../../../utils/rps-utils.js')
var childStorage = require('../../../utils/child-storage.js')

Page({
  data: {
    totalGames: 0,
    winRate: 0,
    bestStreak: 0,
    recentRecords: []
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var stats = childStorage.get('rpsStats') || {
      totalGames: 0,
      wins: 0,
      bestStreak: 0
    }

    var recentRecords = rpsUtils.getRecentRecords(3)
    var winRate = rpsUtils.calculateWinRate(stats.wins, stats.totalGames)

    this.setData({
      totalGames: stats.totalGames,
      winRate: winRate,
      bestStreak: stats.bestStreak,
      recentRecords: recentRecords
    })
  },

  goClassic: function() {
    wx.navigateTo({ url: '/pages/create/rps/classic/index' })
  },

  goChallenge: function() {
    wx.navigateTo({ url: '/pages/create/rps/challenge/index' })
  },

  goStory: function() {
    wx.navigateTo({ url: '/pages/create/rps/story/index' })
  },

  goTournament: function() {
    wx.navigateTo({ url: '/pages/create/rps/tournament/index' })
  }
})
