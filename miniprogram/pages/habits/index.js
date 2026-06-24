var util = require('../../utils/util.js')
var auth = require('../../utils/auth.js')
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')

var app = getApp()

Page({
  data: {
    sleepHabits: [],
    healthHabits: [],
    lifeHabits: [],
    learnHabits: [],
    otherHabits: [],
    streak: 0,
    todayDone: 0,
    todayTotal: 14,
    collapsed: {
      sleep: false,
      health: false,
      life: false,
      learn: false,
      other: false
    },
    children: [],
    currentChildId: ''
  },

  onLoad: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })
    this.loadHabits()
  },

  onShow: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })

    var that = this
    // 刷新家庭信息（包括小孩头像等）
    app.refreshFamilyInfo().then(function() {
      that.setData({
        children: app.globalData.children || [],
        currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
      })
    }).catch(function() {})

    cloud.fetchHabitRecords().then(function() {
      return cloud.fetchHabits()
    }).then(function() {
      that.loadHabits()
    }).catch(function() {
      that.loadHabits()
    })

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  onPullDownRefresh: async function() {
    var that = this
    try {
      await cloud.fetchHabitRecords()
      await cloud.fetchHabits()
      that.loadHabits()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onChildChanged: function(e) {
    var childId = e.detail.childId
    app.globalData.currentChildId = childId
    this.setData({ currentChildId: childId })
    this.loadHabits()
  },

  // 加载习惯列表
  loadHabits: function() {
    var today = util.getTodayStr()
    var habits = childStorage.get('habits') || []
    var records = childStorage.get('habitRecords') || []
    var brushingRecords = childStorage.get('brushingRecords') || []

    // 默认习惯
    var defaultHabits = [
      // 睡眠作息
      { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', target: 1, group: 'sleep' },
      { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', target: 1, group: 'sleep' },
      { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', target: 1, group: 'sleep' },
      // 健康卫生
      { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', target: 2, group: 'health' },
      { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', target: 3, group: 'health' },
      { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', target: 8, group: 'health' },
      // 生活自理
      { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', target: 1, group: 'life' },
      { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', target: 1, group: 'life' },
      { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', target: 1, group: 'life' },
      { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', target: 1, group: 'life' },
      { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', target: 1, group: 'life' },
      // 学习成长
      { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', target: 1, group: 'learn' },
      { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', target: 1, group: 'learn' },
      { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', target: 3, group: 'learn' }
    ]

    // 合并自定义习惯
    var customHabits = habits.filter(function(h) { return h.type === 'custom' })
    var allHabits = defaultHabits.concat(customHabits)

    // 计算今日完成情况
    var habitsWithStatus = allHabits.map(function(habit) {
      var done
      if (habit.type === 'brushing') {
        done = brushingRecords.filter(function(r) {
          return r.date === today
        }).length
      } else {
        var todayRecords = records.filter(function(r) {
          return r.date === today && r.type === habit.type
        })
        done = todayRecords.length
      }
      var target = habit.target || 1
      return {
        type: habit.type,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        done: done,
        target: target,
        completed: done >= target,
        progress: Math.min(done / target, 1),
        group: habit.group || 'other'
      }
    })

    // 按组分类
    var sleepHabits = habitsWithStatus.filter(function(h) { return h.group === 'sleep' })
    var healthHabits = habitsWithStatus.filter(function(h) { return h.group === 'health' })
    var lifeHabits = habitsWithStatus.filter(function(h) { return h.group === 'life' })
    var learnHabits = habitsWithStatus.filter(function(h) { return h.group === 'learn' })
    var otherHabits = habitsWithStatus.filter(function(h) { return h.group === 'other' })

    // 计算连续打卡天数
    var streak = this.calcStreak(records)

    // 计算今日完成数
    var todayDone = habitsWithStatus.filter(function(h) { return h.completed }).length
    var todayTotal = habitsWithStatus.length

    this.setData({
      sleepHabits: sleepHabits,
      healthHabits: healthHabits,
      lifeHabits: lifeHabits,
      learnHabits: learnHabits,
      otherHabits: otherHabits,
      streak: streak,
      todayDone: todayDone,
      todayTotal: todayTotal
    })
  },

  // 计算连续打卡天数
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

  // 跳转到习惯详情
  goDetail: function(e) {
    var type = e.currentTarget.dataset.type

    if (type === 'brushing') {
      wx.navigateTo({ url: '/pages/habits/brushing/brushing' })
    } else {
      wx.navigateTo({
        url: '/pages/habits/detail?type=' + type
      })
    }
  },

  // 添加自定义习惯
  addHabit: function() {
    wx.navigateTo({ url: '/pages/habits/add' })
  },

  // 切换折叠状态
  toggleCollapse: function(e) {
    var group = e.currentTarget.dataset.group
    var collapsed = this.data.collapsed
    collapsed[group] = !collapsed[group]
    this.setData({ collapsed: collapsed })
  }
})
