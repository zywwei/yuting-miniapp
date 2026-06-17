var learnData = require('../../utils/learn-data.js')
var achievements = require('../../utils/achievements.js')
var backup = require('../../utils/backup.js')

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
    recentNotes: [],
    backupStatus: '',
    backupStatusType: ''
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

    // 计算连续刷牙天数（从独立的 brushingRecords 读取）
    var brushingRecords = wx.getStorageSync('brushingRecords') || []
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
    wx.navigateTo({ url: '/pages/achievement/index' })
  },

  // 查看笔记详情
  viewNote: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/notes/detail?id=' + id })
  },

  // 导出备份
  exportData: function() {
    var that = this

    wx.showModal({
      title: '导出备份',
      content: '将导出所有数据（包括图片、记录、画作等），确定继续？',
      confirmText: '开始导出',
      success: function(res) {
        if (res.confirm) {
          that.setData({
            backupStatus: '正在导出...',
            backupStatusType: 'loading'
          })

          wx.showLoading({ title: '正在导出数据...' })

          backup.exportAllData().then(function(backupData) {
            return backup.saveBackupToFile(backupData)
          }).then(function(filePath) {
            wx.hideLoading()
            that.setData({
              backupStatus: '导出成功！文件已保存',
              backupStatusType: 'success'
            })
            wx.showToast({ title: '导出成功', icon: 'success' })

            // 分享备份文件
            wx.showModal({
              title: '导出成功',
              content: '备份文件已保存，是否分享到微信以便保存？',
              confirmText: '分享',
              success: function(res2) {
                if (res2.confirm) {
                  wx.shareFileMessage({
                    filePath: filePath,
                    success: function() {},
                    fail: function() {
                      wx.showToast({ title: '分享取消', icon: 'none' })
                    }
                  })
                }
              }
            })
          }).catch(function(err) {
            wx.hideLoading()
            console.error('导出失败:', err)
            that.setData({
              backupStatus: '导出失败: ' + err.message,
              backupStatusType: 'error'
            })
            wx.showToast({ title: '导出失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 导入恢复
  importData: function() {
    var that = this

    wx.showModal({
      title: '导入恢复',
      content: '将从备份文件恢复数据，当前数据会被覆盖，确定继续？',
      confirmText: '选择文件',
      success: function(res) {
        if (res.confirm) {
          wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['json'],
            success: function(fileRes) {
              var filePath = fileRes.tempFiles[0].path

              that.setData({
                backupStatus: '正在导入...',
                backupStatusType: 'loading'
              })

              wx.showLoading({ title: '正在导入数据...' })

              backup.loadBackupFromFile(filePath).then(function(backupData) {
                return backup.importAllData(backupData)
              }).then(function(result) {
                wx.hideLoading()
                var msg = '导入成功！恢复了 ' + result.importedKeys + ' 项数据'
                if (result.importedImages > 0) {
                  msg += '，' + result.importedImages + ' 张图片'
                }
                if (result.errors.length > 0) {
                  msg += '（' + result.errors.length + ' 项失败）'
                }

                that.setData({
                  backupStatus: msg,
                  backupStatusType: result.errors.length > 0 ? 'warning' : 'success'
                })

                wx.showToast({ title: '导入成功', icon: 'success' })

                // 刷新页面数据
                that.loadData()
              }).catch(function(err) {
                wx.hideLoading()
                console.error('导入失败:', err)
                that.setData({
                  backupStatus: '导入失败: ' + err.message,
                  backupStatusType: 'error'
                })
                wx.showToast({ title: '导入失败', icon: 'none' })
              })
            },
            fail: function() {
              wx.showToast({ title: '已取消', icon: 'none' })
            }
          })
        }
      }
    })
  }
})
