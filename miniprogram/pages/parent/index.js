var learnData = require('../../utils/learn-data.js')
var achievements = require('../../utils/achievements.js')

Page({
  data: {
    stats: {
      growthDays: 0,
      brushingStreak: 0,
      cardsLearned: 0,
      poemsMemorized: 0,
      drawingsCount: 0,
      notesCount: 0
    },
    achievementStats: {
      total: 0,
      unlocked: 0,
      percentage: 0
    },
    recentNotes: []
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var app = getApp()
    var records = wx.getStorageSync('habitRecords') || []
    var drawings = wx.getStorageSync('drawings') || []
    var notes = wx.getStorageSync('notes') || []

    // 计算连续刷牙天数
    var brushingRecords = records.filter(function(r) { return r.type === 'brushing' })
    var brushingStreak = this.calcStreak(brushingRecords)

    // 学习进度
    var cardsLearned = learnData.getCardsLearnedCount()
    var poemsMemorized = learnData.getPoemsMemorizedCount()
    var numbersLearned = learnData.getNumbersLearnedCount()
    var englishLearned = learnData.getEnglishLearnedCount()

    // 成就统计
    var achievementStats = achievements.getAchievementStats()

    // 最近笔记
    var recentNotes = notes.sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime)
    }).slice(0, 5)

    this.setData({
      stats: {
        growthDays: app.globalData.growthDays || 0,
        brushingStreak: brushingStreak,
        cardsLearned: cardsLearned,
        poemsMemorized: poemsMemorized,
        numbersLearned: numbersLearned,
        englishLearned: englishLearned,
        drawingsCount: drawings.length,
        notesCount: notes.length
      },
      achievementStats: achievementStats,
      recentNotes: recentNotes
    })
  },

  calcStreak: function(records) {
    if (records.length === 0) return 0

    var dateSet = {}
    records.forEach(function(r) { dateSet[r.date] = true })
    var dates = Object.keys(dateSet).sort().reverse()
    var streak = 0

    for (var i = 0; i < dates.length; i++) {
      var expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() - i)
      var year = expectedDate.getFullYear()
      var month = String(expectedDate.getMonth() + 1).padStart(2, '0')
      var day = String(expectedDate.getDate()).padStart(2, '0')
      var expectedStr = year + '-' + month + '-' + day

      if (dates[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  // 查看成就详情
  viewAchievements: function() {
    wx.showToast({ title: '成就系统开发中', icon: 'none' })
  },

  // 查看笔记详情
  viewNote: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/notes/detail?id=' + id })
  }
})
