var learnData = require('../../utils/learn-data.js')
var achievements = require('../../utils/achievements.js')
var backup = require('../../utils/backup.js')
var auth = require('../../utils/auth.js')

Page({
  data: {
    childName: '宝宝',
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
    backupStatusType: '',
    member: null,
    family: null,
    isAdmin: false,
    // AI画画配额（仅家庭创建者可配置）
    isCreator: false,
    quotaDaily: '',
    quotaPerMinute: '',
    quotaSaving: false
  },

  onLoad: function() {
    this.setData({ childName: auth.getChildNickname() })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var app = getApp()
    var childStorage = require('../../utils/child-storage.js')

    var member = auth.getMember()
    var family = auth.getFamily()

    var records = childStorage.get('habitRecords') || []
    var drawings = childStorage.get('drawings') || []
    var notes = childStorage.get('notes') || []

    var brushingRecords = childStorage.get('brushingRecords') || []
    var brushingStreak = this.calcStreak(brushingRecords)

    var cardsLearned = learnData.getCardsLearnedCount()
    var poemsMemorized = learnData.getPoemsMemorizedCount()
    var numbersLearned = learnData.getNumbersLearnedCount()
    var englishLearned = learnData.getEnglishLearnedCount()

    var achievementStats = achievements.getAchievementStats()

    // A8：三处修正——按 visibility 过滤（不泄露他人私密笔记标题）、标题剥 HTML、时间本地化
    var memberId = member ? member._id : ''
    var stripHtml = function(html) {
      return html ? html.replace(/<[^>]+>/g, '').trim() : ''
    }
    var recentNotes = notes.filter(function(note) {
      // 与服务端 listRecords 口径一致：private 仅创建者本人可见，admin 无特例
      // （详情页数据走服务端接口同样拦截 admin，客户端若放行会造成"看得到标题看不到内容"的割裂）
      if (note.createdBy === memberId) return true
      var vis = note.visibility || 'family'
      if (vis === 'family') return true
      if (vis === 'designated') return (note.visibleTo || []).indexOf(memberId) >= 0
      return false
    }).sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime)
    }).slice(0, 5).map(function(note) {
      var d = new Date(note.createTime)
      return Object.assign({}, note, {
        title: stripHtml(note.title || ''),
        createTime: d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
      })
    })

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
      recentNotes: recentNotes,
      member: member,
      family: family,
      isAdmin: auth.isAdmin()
    })

    // 家庭创建者加载AI画画配额配置
    var isCreator = !!(family && family.creatorOpenid && member && family.creatorOpenid === auth.getOpenid())
    this.setData({ isCreator: isCreator })
    if (isCreator) {
      this.loadQuotaConfig()
    }
  },

  // 加载AI画画配额配置
  loadQuotaConfig: function() {
    var that = this
    var aiManager = getApp().globalData.aiManager
    if (!aiManager || !aiManager.getQuotaConfig) return
    aiManager.getQuotaConfig().then(function(data) {
      that.setData({
        quotaDaily: String(data.generateImageDaily),
        quotaPerMinute: String(data.generateImagePerMinute)
      })
    }).catch(function(err) {
      console.error('加载配额配置失败:', err)
    })
  },

  // 配额输入
  onQuotaDailyInput: function(e) {
    this.setData({ quotaDaily: e.detail.value })
  },

  onQuotaPerMinuteInput: function(e) {
    this.setData({ quotaPerMinute: e.detail.value })
  },

  // 保存AI画画配额（仅创建者）
  saveQuota: function() {
    var that = this
    var daily = parseInt(this.data.quotaDaily)
    var perMinute = parseInt(this.data.quotaPerMinute)
    if (isNaN(daily) || daily < 1 || daily > 1000) {
      wx.showToast({ title: '每日次数需在1-1000之间', icon: 'none' })
      return
    }
    if (isNaN(perMinute) || perMinute < 1 || perMinute > 100) {
      wx.showToast({ title: '每分钟次数需在1-100之间', icon: 'none' })
      return
    }
    if (this.data.quotaSaving) return

    this.setData({ quotaSaving: true })
    var aiManager = getApp().globalData.aiManager
    aiManager.saveQuotaConfig({
      generateImageDaily: daily,
      generateImagePerMinute: perMinute
    }).then(function() {
      that.setData({ quotaSaving: false })
      wx.showToast({ title: '配额已保存', icon: 'success' })
    }).catch(function(err) {
      console.error('保存配额失败:', err)
      that.setData({ quotaSaving: false })
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
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

  // 家庭设置
  goFamilySettings: function() {
    wx.navigateTo({ url: '/packageFamily/pages/family/settings/settings' })
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
