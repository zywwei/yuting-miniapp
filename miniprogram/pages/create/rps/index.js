var rpsManager = require('../../../utils/rps-manager.js')
var rpsUtils = require('../../../utils/rps-utils.js')
var childStorage = require('../../../utils/child-storage.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    totalGames: 0,
    winRate: 0,
    bestStreak: 0,
    recentRecords: [],
    soundEnabled: false
  },

  onLoad: function() {
    this.loadData()
    this.loadSoundSettings()
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

  loadSoundSettings: function() {
    var settings = childStorage.get('gameSettings') || { soundEnabled: false }
    audio.enabled = settings.soundEnabled
    this.setData({ soundEnabled: settings.soundEnabled })
  },

  toggleSound: function() {
    var newVal = !this.data.soundEnabled
    audio.enabled = newVal
    var settings = childStorage.get('gameSettings') || {}
    settings.soundEnabled = newVal
    childStorage.set('gameSettings', settings)
    this.setData({ soundEnabled: newVal })

    wx.showToast({
      title: newVal ? '音效已开启' : '音效已关闭',
      icon: 'none'
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
