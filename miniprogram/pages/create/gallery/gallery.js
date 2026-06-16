var util = require('../../../utils/util.js')
var cloud = require('../../../utils/cloud.js')

Page({
  data: {
    timeline: [],
    totalCount: 0,
    streakDays: 0,
    thisMonthCount: 0
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  // 加载数据
  loadData: function() {
    var self = this
    cloud.fetchDrawings().then(function(drawings) {
      var totalCount = drawings.length

      // 计算本月创作数
      var now = new Date()
      var thisMonth = drawings.filter(function(d) {
        var date = new Date(d.createTime)
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      })
      var thisMonthCount = thisMonth.length

      // 计算连续创作天数
      var streakDays = self.calcStreak(drawings)

      // 按日期分组
      var timeline = self.groupByDate(drawings)

      self.setData({
        timeline: timeline,
        totalCount: totalCount,
        streakDays: streakDays,
        thisMonthCount: thisMonthCount
      })
    })
  },

  // 计算连续创作天数
  calcStreak: function(drawings) {
    if (drawings.length === 0) return 0

    // 获取所有创作日期（去重）
    var dateSet = {}
    drawings.forEach(function(d) {
      var date = new Date(d.createTime)
      var key = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()
      dateSet[key] = true
    })
    var dates = Object.keys(dateSet).sort().reverse()

    // 检查是否今天有创作
    var today = new Date()
    var todayKey = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate()
    var yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    var yesterdayKey = yesterday.getFullYear() + '-' + yesterday.getMonth() + '-' + yesterday.getDate()

    // 如果今天和昨天都没有创作，连续天数为0
    if (dates[0] !== todayKey && dates[0] !== yesterdayKey) {
      return 0
    }

    var streak = 1
    for (var i = 0; i < dates.length - 1; i++) {
      var current = new Date(dates[i])
      var next = new Date(dates[i + 1])
      var diff = (current - next) / (1000 * 60 * 60 * 24)

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  // 按日期分组画作
  groupByDate: function(drawings) {
    var now = new Date()
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    var yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    var weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    var groups = {}

    drawings.forEach(function(drawing) {
      var date = new Date(drawing.createTime)
      var dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      var dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')

      var dateLabel = ''
      if (dateOnly.getTime() === today.getTime()) {
        dateLabel = '今天'
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        dateLabel = '昨天'
      } else if (dateOnly >= weekAgo) {
        var weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        dateLabel = weekdays[date.getDay()]
      } else if (dateOnly >= monthStart) {
        dateLabel = (date.getMonth() + 1) + '月' + date.getDate() + '日'
      } else {
        dateLabel = date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日'
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey: dateKey,
          dateLabel: dateLabel,
          sortOrder: dateOnly.getTime(),
          drawings: []
        }
      }

      groups[dateKey].drawings.push({
        id: drawing.id,
        name: drawing.name,
        mode: drawing.mode,
        createTime: drawing.createTime,
        imagePath: drawing.imagePath,
        timeFormatted: String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
      })
    })

    // 转换为数组并排序
    var timeline = []
    for (var key in groups) {
      timeline.push(groups[key])
    }
    timeline.sort(function(a, b) { return b.sortOrder - a.sortOrder })

    // 每组内的画作也按时间倒序
    timeline.forEach(function(group) {
      group.drawings.sort(function(a, b) { return new Date(b.createTime) - new Date(a.createTime) })
    })

    return timeline
  },

  // 查看画作详情
  viewDrawing: function(e) {
    var id = e.currentTarget.dataset.id
    var allDrawings = []
    this.data.timeline.forEach(function(group) {
      group.drawings.forEach(function(d) { allDrawings.push(d) })
    })
    var drawing = null
    for (var i = 0; i < allDrawings.length; i++) {
      if (allDrawings[i].id === id) {
        drawing = allDrawings[i]
        break
      }
    }
    if (drawing && drawing.imagePath) {
      wx.previewImage({
        current: drawing.imagePath,
        urls: allDrawings.map(function(d) { return d.imagePath })
      })
    }
  },

  // 删除画作
  deleteDrawing: function(e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除画作',
      content: '确定要删除这幅画吗？删除后无法恢复哦~',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: function(res) {
        if (res.confirm) {
          cloud.removeDrawing(id).then(function() {
            self.loadData()
            wx.showToast({ title: '已删除', icon: 'success' })
          })
        }
      }
    })
  },

  // 去画画
  goDraw: function() {
    wx.navigateTo({
      url: '/pages/create/draw/draw?mode=free'
    })
  },

  // 分享给朋友
  onShareAppMessage: function() {
    var timeline = this.data.timeline
    if (timeline.length > 0 && timeline[0].drawings.length > 0) {
      var latest = timeline[0].drawings[0]
      return {
        title: '看看钰婷画的' + latest.name + '！已经画了' + this.data.totalCount + '幅画啦~',
        path: '/pages/index/index',
        imageUrl: latest.imagePath
      }
    }
    return {
      title: '钰婷的小画板 - 一起来看钰婷的画！',
      path: '/pages/index/index'
    }
  }
})
