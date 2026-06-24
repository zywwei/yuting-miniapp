var diceManager = require('../../../utils/dice-manager.js')
var diceUtils = require('../../../utils/dice-utils.js')
var childStorage = require('../../../utils/child-storage.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    totalGames: 0,
    winRate: 0,
    leopardCount: 0,
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
