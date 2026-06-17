var util = require('../../../utils/util.js')
var { getNavBarInfo, previewImage } = require('../../../utils/page-helpers.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    type: '',
    habitName: '',
    habitIcon: '',
    // 统计数据
    stats: {
      total: 0,
      streak: 0,
      weekRate: 0,
      avgScore: '0.0'
    },
    // 日历
    currentYear: 2026,
    currentMonth: 1,
    calendarDays: [],
    selectedDate: '',
    // 记录
    allRecords: [],
    records: [],
    daySummary: null,
    // 详情弹窗
    showDetail: false,
    detailRecord: null
  },

  onLoad: function(options) {
    var navInfo = getNavBarInfo()
    var now = new Date()
    var type = options.type || 'custom'

    // 获取习惯信息
    var defaultHabits = {
      early_up: { name: '早起', icon: '🌅' },
      early_sleep: { name: '早睡', icon: '🌙' },
      nap: { name: '午睡', icon: '😴' },
      wash_hands: { name: '洗手', icon: '🧼' },
      drink: { name: '喝水', icon: '💧' },
      eat_breakfast: { name: '吃早餐', icon: '🥣' },
      eat_lunch: { name: '吃午餐', icon: '🍱' },
      eat_dinner: { name: '吃晚餐', icon: '🍛' },
      tidy: { name: '整理玩具', icon: '🧸' },
      housework: { name: '做家务', icon: '🧹' },
      reading: { name: '阅读', icon: '📖' },
      exercise: { name: '运动', icon: '🏃' },
      polite: { name: '礼貌用语', icon: '🙏' }
    }

    var habit = defaultHabits[type] || { name: '自定义', icon: '⭐' }

    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      type: type,
      habitName: habit.name,
      habitIcon: habit.icon,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })

    this.loadData()
  },

  onPullDownRefresh: function() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData: function() {
    var records = wx.getStorageSync('habitRecords') || []
    var typeRecords = records.filter(function(r) { return r.type === this.data.type }.bind(this))

    // 格式化时间
    var formattedRecords = typeRecords.map(function(r) {
      return Object.assign({}, r, {
        createTimeFormatted: r.createTime ? util.formatDate(r.createTime) : r.date
      })
    })

    // 按选中日期过滤
    var filteredRecords = this.data.selectedDate
      ? formattedRecords.filter(function(r) { return r.date === this.data.selectedDate }.bind(this))
      : formattedRecords

    // 构建当日摘要
    var daySummary = this.data.selectedDate
      ? this.buildDaySummary(filteredRecords, this.data.selectedDate)
      : null

    // 计算统计
    var total = typeRecords.length
    var streak = this.calcStreak(typeRecords)
    var weekRate = this.calcWeekRate(typeRecords)
    var avgScore = this.calcAvgScore(typeRecords)

    this.setData({
      stats: {
        total: total,
        streak: streak,
        weekRate: weekRate,
        avgScore: avgScore
      },
      allRecords: formattedRecords,
      records: filteredRecords,
      calendarDays: this.buildCalendar(typeRecords)
    })
  },

  // 计算连续天数
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

  // 计算本周完成率
  calcWeekRate: function(records) {
    var now = new Date()
    var startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    var completedDays = 0
    for (var i = 0; i < 7; i++) {
      var d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      var year = d.getFullYear()
      var month = String(d.getMonth() + 1).padStart(2, '0')
      var day = String(d.getDate()).padStart(2, '0')
      var dateStr = year + '-' + month + '-' + day
      if (records.some(function(r) { return r.date === dateStr })) {
        completedDays++
      }
    }

    return Math.round((completedDays / 7) * 100)
  },

  // 计算平均分
  calcAvgScore: function(records) {
    var scoredRecords = records.filter(function(r) { return r.score })
    if (scoredRecords.length === 0) return '0.0'
    var total = scoredRecords.reduce(function(sum, r) { return sum + r.score }, 0)
    return (total / scoredRecords.length).toFixed(1)
  },

  // 构建当日摘要
  buildDaySummary: function(records, date) {
    var weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    // 使用 YYYY-MM-DD 解析避免时区问题
    var parts = date.split('-')
    var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    var weekday = weekdayNames[d.getDay()]

    var totalScore = records.reduce(function(sum, r) { return sum + (r.score || 0) }, 0)
    var avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0

    return {
      date: date,
      weekday: weekday,
      count: records.length,
      avgScore: avgScore
    }
  },

  // 构建日历
  buildCalendar: function(records) {
    var currentYear = this.data.currentYear
    var currentMonth = this.data.currentMonth
    var firstDay = new Date(currentYear, currentMonth - 1, 1)
    var lastDay = new Date(currentYear, currentMonth, 0)
    var daysInMonth = lastDay.getDate()
    var startWeekday = firstDay.getDay()

    var today = util.getTodayStr()
    var days = []

    // 上月补齐
    var prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate()
    for (var i = startWeekday - 1; i >= 0; i--) {
      var day = prevMonthLastDay - i
      days.push({ day: day, date: '', isCurrentMonth: false })
    }

    // 当月
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = currentYear + '-' + String(currentMonth).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      var dayRecords = records.filter(function(r) { return r.date === dateStr })
      days.push({
        day: day,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === today,
        hasRecord: dayRecords.length > 0,
        count: dayRecords.length
      })
    }

    // 下月补齐
    var remaining = 42 - days.length
    for (var day = 1; day <= remaining; day++) {
      days.push({ day: day, date: '', isCurrentMonth: false })
    }

    return days
  },

  // 点击日历日期
  selectDate: function(e) {
    var date = e.currentTarget.dataset.date
    if (!date) return

    var newSelected = this.data.selectedDate === date ? '' : date
    var filteredRecords = newSelected
      ? this.data.allRecords.filter(function(r) { return r.date === newSelected })
      : this.data.allRecords

    var daySummary = newSelected ? this.buildDaySummary(filteredRecords, newSelected) : null

    this.setData({
      selectedDate: newSelected,
      records: filteredRecords,
      daySummary: daySummary
    })
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
    if (currentYear >= now.getFullYear() && currentMonth >= now.getMonth() + 1) return

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ currentYear: currentYear, currentMonth: currentMonth })
    this.loadData()
  },

  // 查看记录详情
  viewDetail: function(e) {
    var id = e.currentTarget.dataset.id
    var record = this.data.allRecords.find(function(r) { return r.id === id })
    if (!record) return

    this.setData({
      showDetail: true,
      detailRecord: record
    })
  },

  // 关闭详情弹窗
  closeDetail: function() {
    this.setData({ showDetail: false, detailRecord: null })
  },

  // 阻止冒泡
  noop: function() {},

  // 预览图片
  previewImage: function(e) {
    var path = e.currentTarget.dataset.path
    var record = this.data.detailRecord
    var images = record && record.images ? record.images : [path]
    previewImage(path, images)
  },

  // 删除记录
  deleteRecord: function(e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: function(res) {
        if (res.confirm) {
          var records = wx.getStorageSync('habitRecords') || []
          records = records.filter(function(r) { return r.id !== id })
          wx.setStorageSync('habitRecords', records)
          that.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 返回
  goBack: function() {
    wx.navigateBack()
  }
})
