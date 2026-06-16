var util = require('../../utils/util.js')

// 每种习惯的打卡样式配置
var HABIT_STYLES = {
  // 睡眠作息
  early_up: {
    theme: 'sunrise',
    bgGradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    icon: '🌅',
    checkinText: '起床啦！',
    successText: '早安！新的一天开始啦~',
    tipText: '早起的鸟儿有虫吃'
  },
  early_sleep: {
    theme: 'night',
    bgGradient: 'linear-gradient(135deg, #7C4DFF, #B388FF)',
    icon: '🌙',
    checkinText: '晚安！',
    successText: '晚安！做个好梦~',
    tipText: '早睡早起身体好'
  },
  nap: {
    theme: 'afternoon',
    bgGradient: 'linear-gradient(135deg, #00BCD4, #4DD0E1)',
    icon: '😴',
    checkinText: '午安！',
    successText: '午睡打卡！休息一下~',
    tipText: '午睡精神好'
  },
  // 健康卫生
  brushing: {
    theme: 'health',
    bgGradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    icon: '🦷',
    checkinText: '刷牙啦！',
    successText: '牙齿刷得真干净！',
    tipText: '早晚刷牙，牙齿白白'
  },
  wash_hands: {
    theme: 'water',
    bgGradient: 'linear-gradient(135deg, #03A9F4, #4FC3F7)',
    icon: '🧼',
    checkinText: '洗手啦！',
    successText: '小手洗得真干净！',
    tipText: '搓搓搓，细菌跑光光'
  },
  drink: {
    theme: 'water',
    bgGradient: 'linear-gradient(135deg, #00BCD4, #4DD0E1)',
    icon: '💧',
    checkinText: '喝水啦！',
    successText: '咕噜咕噜喝饱啦！',
    tipText: '多喝水，身体棒'
  },
  // 生活自理
  eat_breakfast: {
    theme: 'food',
    bgGradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    icon: '🥣',
    checkinText: '吃早餐啦！',
    successText: '早餐吃饱饱，上午精神好！',
    tipText: '早餐要吃好'
  },
  eat_lunch: {
    theme: 'food',
    bgGradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    icon: '🍱',
    checkinText: '吃午餐啦！',
    successText: '午餐吃得好，下午不饿！',
    tipText: '午餐要吃饱'
  },
  eat_dinner: {
    theme: 'food',
    bgGradient: 'linear-gradient(135deg, #FF5722, #FF8A65)',
    icon: '🍛',
    checkinText: '吃晚餐啦！',
    successText: '晚餐吃得好，晚上睡得香！',
    tipText: '晚餐要吃少'
  },
  tidy: {
    theme: 'home',
    bgGradient: 'linear-gradient(135deg, #9C27B0, #CE93D8)',
    icon: '🧸',
    checkinText: '整理玩具啦！',
    successText: '玩具收拾得整整齐齐！',
    tipText: '自己的事情自己做'
  },
  housework: {
    theme: 'home',
    bgGradient: 'linear-gradient(135deg, #795548, #A1887F)',
    icon: '🧹',
    checkinText: '做家务啦！',
    successText: '家务做得真棒！',
    tipText: '我是家务小能手'
  },
  // 学习成长
  reading: {
    theme: 'learn',
    bgGradient: 'linear-gradient(135deg, #2196F3, #64B5F6)',
    icon: '📖',
    checkinText: '看书啦！',
    successText: '今天又学到新知识啦！',
    tipText: '书中自有黄金屋'
  },
  exercise: {
    theme: 'sport',
    bgGradient: 'linear-gradient(135deg, #FF5722, #FF8A65)',
    icon: '🏃',
    checkinText: '运动啦！',
    successText: '运动完真舒服！',
    tipText: '生命在于运动'
  },
  polite: {
    theme: 'love',
    bgGradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    icon: '🙏',
    checkinText: '说礼貌用语！',
    successText: '真是个有礼貌的好孩子！',
    tipText: '请、谢谢、对不起'
  }
}

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
    sleepStats: null,
    style: null,
    // 打卡动画
    showCheckinAnimation: false
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
      early_up: { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', target: 1, group: 'sleep' },
      early_sleep: { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', target: 1, group: 'sleep' },
      nap: { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', target: 1, group: 'sleep' },
      brushing: { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', target: 2, group: 'health' },
      wash_hands: { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', target: 3, group: 'health' },
      drink: { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', target: 8, group: 'health' },
      eat_breakfast: { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', target: 1, group: 'life' },
      eat_lunch: { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', target: 1, group: 'life' },
      eat_dinner: { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', target: 1, group: 'life' },
      tidy: { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', target: 1, group: 'life' },
      housework: { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', target: 1, group: 'life' },
      reading: { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', target: 1, group: 'learn' },
      exercise: { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', target: 1, group: 'learn' },
      polite: { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', target: 3, group: 'learn' }
    }

    var habit = defaultHabits[type]
    if (!habit) {
      var found = habits.find(function(h) { return h.type === type })
      habit = found || { type: type, name: '自定义', icon: '⭐', color: '#FF6B8A', target: 1 }
    }

    // 获取打卡样式
    var style = HABIT_STYLES[type] || {
      theme: 'default',
      bgGradient: 'linear-gradient(135deg, #FF6B8A, #FF9AAB)',
      icon: habit.icon,
      checkinText: '打卡啦！',
      successText: '打卡成功！',
      tipText: '坚持就是胜利'
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

    // 今日是否已打卡
    var today = util.getTodayStr()
    var todayRecords = habitRecords.filter(function(r) { return r.date === today })
    var done = todayRecords.length
    var completed = done >= habit.target

    this.setData({
      habit: habit,
      records: habitRecords.slice(0, 30),
      stats: { total: total, streak: streak, weekRate: weekRate },
      sleepStats: sleepStats,
      style: style,
      todayDone: done,
      completed: completed
    })
  },

  // 计算作息统计
  calcSleepStats: function(records, type) {
    var recent7 = records.slice(0, 7)
    var times = recent7.map(function(r) { return r.time }).filter(function(t) { return t })

    if (times.length === 0) return null

    var totalMinutes = 0
    times.forEach(function(t) {
      var parts = t.split(':')
      totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1])
    })
    var avgMinutes = Math.round(totalMinutes / times.length)
    var avgHour = Math.floor(avgMinutes / 60)
    var avgMin = avgMinutes % 60
    var avgTime = String(avgHour).padStart(2, '0') + ':' + String(avgMin).padStart(2, '0')

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
    var habit = this.data.habit
    var style = this.data.style
    var today = util.getTodayStr()
    var records = wx.getStorageSync('habitRecords') || []
    var now = new Date()
    var currentTime = now.toTimeString().slice(0, 5)

    // 今日已完成次数
    var todayRecords = records.filter(function(r) { return r.date === today && r.type === type })
    if (todayRecords.length >= habit.target) {
      wx.showToast({ title: '今日已完成啦！', icon: 'none' })
      return
    }

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

    // 显示打卡动画
    this.setData({ showCheckinAnimation: true })
    var self = this
    setTimeout(function() {
      self.setData({ showCheckinAnimation: false })
    }, 1500)

    // 显示成功提示
    wx.showToast({ title: style.successText, icon: 'success' })
    this.loadHabitDetail(type)
  },
})
