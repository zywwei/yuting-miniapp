var util = require('../../utils/util.js')
var auth = require('../../utils/auth.js')
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var habitConfig = require('../../utils/habit-config.js')

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

    // 节流：30秒内不重复请求云端数据
    var now = Date.now()
    if (!this._lastCloudFetch || now - this._lastCloudFetch > 30000) {
      this._lastCloudFetch = now
      cloud.fetchHabitRecords().then(function() {
        return cloud.fetchHabits()
      }).then(function() {
        that.loadHabits()
      }).catch(function() {
        that.loadHabits()
      })
    }

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
    auth.switchChild(childId)
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
    var defaultHabits = habitConfig.getDefaultHabits('all')

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
    var streak = util.calcBrushingStreak(records)

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

  // 跳转到习惯详情
  goDetail: function(e) {
    var type = e.currentTarget.dataset.type

    if (type === 'brushing') {
      wx.navigateTo({ url: '/packageHabits/pages/habits/brushing/brushing' })
    } else {
      wx.navigateTo({
        url: '/packageHabits/pages/habits/detail?type=' + type
      })
    }
  },

  // 添加自定义习惯
  addHabit: function() {
    wx.navigateTo({ url: '/packageHabits/pages/habits/add' })
  },

  // 切换折叠状态
  toggleCollapse: function(e) {
    var group = e.currentTarget.dataset.group
    var collapsed = this.data.collapsed
    collapsed[group] = !collapsed[group]
    this.setData({ collapsed: collapsed })
  }
})
