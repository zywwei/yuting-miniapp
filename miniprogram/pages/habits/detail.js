var util = require('../../utils/util.js')

Page({
  data: {
    type: '',
    habit: null,
    records: [],
    stats: {
      total: 0,
      streak: 0,
      weekRate: 0
    },
    sleepStats: null
  },

  onLoad: function(options) {
    var type = options.type || 'brushing'
    this.setData({ type: type })
    this.loadHabitDetail(type)
  },

  onShow: function() {
    this.loadHabitDetail(this.data.type)
  },

  // 加载习惯详情
  loadHabitDetail: function(type) {
    var habits = wx.getStorageSync('habits') || []
    var records = wx.getStorageSync('habitRecords') || []

    // 默认习惯配置
    var defaultHabits = {
      // 睡眠作息
      early_up: { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', target: 1, group: 'sleep' },
      early_sleep: { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', target: 1, group: 'sleep' },
      nap: { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', target: 1, group: 'sleep' },
      // 健康卫生
      brushing: { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', target: 2, group: 'health' },
      wash_hands: { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', target: 3, group: 'health' },
      drink: { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', target: 8, group: 'health' },
      // 生活自理
      eat_breakfast: { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', target: 1, group: 'life' },
      eat_lunch: { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', target: 1, group: 'life' },
      eat_dinner: { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', target: 1, group: 'life' },
      tidy: { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', target: 1, group: 'life' },
      housework: { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', target: 1, group: 'life' },
      // 学习成长
      reading: { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', target: 1, group: 'learn' },
      exercise: { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', target: 1, group: 'learn' },
      polite: { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', target: 3, group: 'learn' }
    }

    var habit = defaultHabits[type]
    if (!habit) {
      var found = habits.find(function(h) { return h.type === type })
      habit = found || { type: type, name: '自定义', icon: '⭐', color: '#FF6B8A', target: 1 }
    }

    // 是否是作息类习惯
    var sleepTypes = ['early_up', 'early_sleep', 'nap']
    var isSleepHabit = sleepTypes.indexOf(type) !== -1
    habit.isSleepHabit = isSleepHabit

    // 获取该习惯的记录
    var habitRecords = records.filter(function(r) { return r.type === type })
    habitRecords.sort(function(a, b) { return new Date(b.date) - new Date(a.date) })

    // 计算统计
    var total = habitRecords.length
    var streak = this.calcStreak(habitRecords)
    var weekRate = this.calcWeekRate(habitRecords)

    // 作息类习惯的额外统计
    var sleepStats = null
    if (isSleepHabit && habitRecords.length > 0) {
      sleepStats = this.calcSleepStats(habitRecords, type)
    }

    this.setData({
      habit: habit,
      records: habitRecords.slice(0, 30),
      stats: { total: total, streak: streak, weekRate: weekRate },
      sleepStats: sleepStats
    })
  },

  // 计算作息统计
  calcSleepStats: function(records, type) {
    // 最近7天的记录
    var recent7 = records.slice(0, 7)
    var times = recent7.map(function(r) { return r.time }).filter(function(t) { return t })

    if (times.length === 0) return null

    // 计算平均时间
    var totalMinutes = 0
    times.forEach(function(t) {
      var parts = t.split(':')
      totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1])
    })
    var avgMinutes = Math.round(totalMinutes / times.length)
    var avgHour = Math.floor(avgMinutes / 60)
    var avgMin = avgMinutes % 60
    var avgTime = String(avgHour).padStart(2, '0') + ':' + String(avgMin).padStart(2, '0')

    // 最早/最晚时间
    var sortedTimes = times.slice().sort()
    var earliest = sortedTimes[0]
    var latest = sortedTimes[sortedTimes.length - 1]

    return {
      avgTime: avgTime,
      earliest: earliest,
      latest: latest,
      recentCount: recent7.length
    }
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

  // 打卡
  checkIn: function() {
    var type = this.data.type
    var today = util.getTodayStr()
    var records = wx.getStorageSync('habitRecords') || []
    var now = new Date()
    var currentTime = now.toTimeString().slice(0, 5)

    // 作息类习惯的时间验证
    if (type === 'early_up') {
      var hour = now.getHours()
      if (hour >= 12) {
        wx.showModal({
          title: '提示',
          content: '现在是下午了，早起打卡只能在上午12点前哦~',
          showCancel: false
        })
        return
      }
    }

    if (type === 'nap') {
      var hour = now.getHours()
      if (hour < 11 || hour >= 16) {
        wx.showModal({
          title: '提示',
          content: '午睡打卡时间是11:00-16:00哦~',
          showCancel: false
        })
        return
      }
    }

    var newRecord = {
      id: util.generateId(),
      type: type,
      date: today,
      time: currentTime,
      createTime: now.toISOString()
    }

    records.unshift(newRecord)
    wx.setStorageSync('habitRecords', records)

    // 作息类习惯显示具体时间
    var tipText = '打卡成功！'
    if (type === 'early_up') {
      tipText = '早起打卡成功！' + currentTime
    } else if (type === 'early_sleep') {
      tipText = '早睡打卡成功！' + currentTime
    } else if (type === 'nap') {
      tipText = '午睡打卡成功！' + currentTime
    }

    wx.showToast({ title: tipText, icon: 'success' })
    this.loadHabitDetail(type)
  },
})
