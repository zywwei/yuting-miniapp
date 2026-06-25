var util = require('/utils/util.js')
var cloud = require('/utils/cloud.js')
var auth = require('/utils/auth.js')

Page({
  data: {
    childName: '宝宝',
    totalCount: 0,
    streakDays: 0,
    thisMonthCount: 0,
    // 日历
    currentYear: 2026,
    currentMonth: 6,
    calendarDays: [],
    // 时间线分区
    recentDays: [],
    historyMonths: [],
    // UI状态
    showBackToToday: false
  },

  onLoad: function() {
    var now = new Date()
    this.setData({
      childName: auth.getChildNickname(),
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  onPullDownRefresh: async function() {
    var self = this
    try {
      await cloud.fetchDrawings()
      self.loadData()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
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

      // 构建日历
      var calendarDays = self.buildCalendar(drawings)

      // 构建时间线
      var timeline = self.buildTimeline(drawings)

      self.setData({
        totalCount: totalCount,
        streakDays: streakDays,
        thisMonthCount: thisMonthCount,
        calendarDays: calendarDays,
        recentDays: timeline.recentDays,
        historyMonths: timeline.historyMonths
      })
    })
  },

  // 构建日历
  buildCalendar: function(drawings) {
    var currentYear = this.data.currentYear
    var currentMonth = this.data.currentMonth
    var firstDay = new Date(currentYear, currentMonth - 1, 1)
    var lastDay = new Date(currentYear, currentMonth, 0)
    var daysInMonth = lastDay.getDate()
    var startWeekday = firstDay.getDay()

    var today = util.getTodayStr()
    var days = []

    // 统计有画作的日期
    var drawingDates = {}
    drawings.forEach(function(d) {
      var date = new Date(d.createTime)
      var dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
      drawingDates[dateStr] = true
    })

    // 上月补齐
    var prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate()
    for (var i = startWeekday - 1; i >= 0; i--) {
      var day = prevMonthLastDay - i
      days.push({ day: day, date: '', isCurrentMonth: false })
    }

    // 当月
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = currentYear + '-' + String(currentMonth).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      days.push({
        day: day,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === today,
        hasDrawing: !!drawingDates[dateStr]
      })
    }

    // 下月补齐，凑满6行42个
    var remaining = 42 - days.length
    for (var day = 1; day <= remaining; day++) {
      days.push({ day: day, date: '', isCurrentMonth: false })
    }

    return days
  },

  // 构建时间线（最近7天 + 历史月份）
  buildTimeline: function(drawings) {
    var now = new Date()
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    var yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    var weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // 按日期分组
    var groups = {}
    drawings.forEach(function(drawing) {
      var date = new Date(drawing.createTime)
      var dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      var dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey: dateKey,
          dateOnly: dateOnly,
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
    var allDays = []
    for (var key in groups) {
      var group = groups[key]
      var dateOnly = group.dateOnly

      // 生成日期标签
      var dateLabel = ''
      if (dateOnly.getTime() === today.getTime()) {
        dateLabel = '今天'
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        dateLabel = '昨天'
      } else if (dateOnly >= weekAgo) {
        var weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        dateLabel = weekdays[dateOnly.getDay()]
      } else {
        dateLabel = (dateOnly.getMonth() + 1) + '月' + dateOnly.getDate() + '日'
      }

      allDays.push({
        dateKey: group.dateKey,
        dateLabel: dateLabel,
        isToday: dateOnly.getTime() === today.getTime(),
        sortOrder: dateOnly.getTime(),
        count: group.drawings.length,
        drawings: group.drawings.sort(function(a, b) { return new Date(b.createTime) - new Date(a.createTime) })
      })
    }

    // 按日期倒序
    allDays.sort(function(a, b) { return b.sortOrder - a.sortOrder })

    // 分离最近7天和历史
    var recentDays = []
    var historyDays = []
    var recentCount = 0

    allDays.forEach(function(day) {
      if (recentCount < 7 && day.sortOrder >= weekAgo.getTime()) {
        recentDays.push(day)
        recentCount++
      } else {
        historyDays.push(day)
      }
    })

    // 历史按月分组
    var historyMonths = []
    var monthGroups = {}

    historyDays.forEach(function(day) {
      var date = new Date(day.sortOrder)
      var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {
          monthKey: monthKey,
          monthLabel: date.getFullYear() + '年' + (date.getMonth() + 1) + '月',
          expanded: false,
          days: [],
          count: 0
        }
      }

      monthGroups[monthKey].days.push(day)
      monthGroups[monthKey].count += day.count
    })

    for (var key in monthGroups) {
      historyMonths.push(monthGroups[key])
    }

    // 按月份倒序
    historyMonths.sort(function(a, b) { return b.monthKey.localeCompare(a.monthKey) })

    return {
      recentDays: recentDays,
      historyMonths: historyMonths
    }
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

  // 上个月
  prevMonth: function() {
    var currentYear = this.data.currentYear
    var currentMonth = this.data.currentMonth
    currentMonth--
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }
    this.setData({ currentYear: currentYear, currentMonth: currentMonth })
    this.loadData()
  },

  // 下个月
  nextMonth: function() {
    var currentYear = this.data.currentYear
    var currentMonth = this.data.currentMonth
    var now = new Date()
    // 不允许超过当月
    if (currentYear >= now.getFullYear() && currentMonth >= now.getMonth() + 1) return

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ currentYear: currentYear, currentMonth: currentMonth })
    this.loadData()
  },

  // 点击日历日期
  selectDate: function(e) {
    var date = e.currentTarget.dataset.date
    if (!date) return
    this.scrollToDate(date)
  },

  // 滚动到指定日期
  scrollToDate: function(dateStr) {
    // 先检查是否在历史月份中，需要展开
    var historyMonths = this.data.historyMonths
    var monthKey = dateStr.substring(0, 7) // '2026-06'

    for (var i = 0; i < historyMonths.length; i++) {
      if (historyMonths[i].monthKey === monthKey && !historyMonths[i].expanded) {
        historyMonths[i].expanded = true
        this.setData({ historyMonths: historyMonths })
        break
      }
    }

    // 滚动到锚点
    setTimeout(function() {
      var query = wx.createSelectorQuery()
      query.select('#date-' + dateStr).boundingClientRect(function(rect) {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.top - 100,
            duration: 300
          })
        }
      })
      query.exec()
    }, 100)
  },

  // 展开/收起历史月份
  expandHistoryMonth: function(e) {
    var index = e.currentTarget.dataset.index
    var historyMonths = this.data.historyMonths
    historyMonths[index].expanded = !historyMonths[index].expanded
    this.setData({ historyMonths: historyMonths })
  },

  // 回到今天
  backToToday: function() {
    var today = util.getTodayStr()
    this.scrollToDate(today)
  },

  // 监听滚动
  onPageScroll: function(e) {
    var showBackToToday = e.scrollTop > 500
    if (showBackToToday !== this.data.showBackToToday) {
      this.setData({ showBackToToday: showBackToToday })
    }
  },

  // 预览画作
  previewDrawing: function(e) {
    var path = e.currentTarget.dataset.path
    if (path) {
      wx.previewImage({
        current: path,
        urls: [path]
      })
    }
  },

  // 编辑画作名称
  editDrawingName: function(e) {
    var self = this
    var id = e.currentTarget.dataset.id
    var currentName = ''

    // 查找当前名称
    this.data.recentDays.forEach(function(day) {
      day.drawings.forEach(function(d) {
        if (d.id === id) currentName = d.name
      })
    })
    this.data.historyMonths.forEach(function(month) {
      month.days.forEach(function(day) {
        day.drawings.forEach(function(d) {
          if (d.id === id) currentName = d.name
        })
      })
    })

    wx.showModal({
      title: '修改画作名称',
      editable: true,
      placeholderText: '请输入名称',
      content: currentName,
      success: function(res) {
        if (res.confirm && res.content) {
          var newName = res.content.trim()
          if (newName && newName !== currentName) {
            cloud.updateDrawingName(id, newName).then(function() {
              self.loadData()
              wx.showToast({ title: '修改成功', icon: 'success' })
            })
          }
        }
      }
    })
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
      url: '/packageCreate/pages/create/draw/draw?mode=free'
    })
  },

  // 分享给朋友
  onShareAppMessage: function() {
    var childName = this.data.childName
    var recentDays = this.data.recentDays
    if (recentDays.length > 0 && recentDays[0].drawings.length > 0) {
      var latest = recentDays[0].drawings[0]
      return {
        title: '看看' + childName + '画的' + latest.name + '！已经画了' + this.data.totalCount + '幅画啦~',
        path: '/pages/index/index',
        imageUrl: latest.imagePath
      }
    }
    return {
      title: childName + '的小画板 - 一起来看' + childName + '的画！',
      path: '/pages/index/index'
    }
  }
})
