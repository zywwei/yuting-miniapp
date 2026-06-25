var util = require('../../utils/util.js')
var learnData = require('../../utils/learn-data.js')
var achievements = require('../../utils/achievements.js')
var auth = require('../../utils/auth.js')
var childStorage = require('../../utils/child-storage.js')

var app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    greeting: '',
    dateStr: '',
    weekdayStr: '',
    growthDays: 0,
    growthYears: 0,
    growthMonths: 0,
    growthDaysRemain: 0,
    todayHabits: [],
    achievements: [],
    recommendations: [],
    children: [],
    currentChildId: '',
    currentChild: null,
    showChildList: false,
    themeColor: '#FF9AAB',
    themeBg: '#FFF5F7',
    themeGradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)'
  },

  onLoad: function() {
    var sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20
    })

    // 等待 app 数据加载完成
    this.waitForAppData()

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  onShow: function() {
    // 每次显示时刷新数据
    this.updateFromApp()

    // 刷新家庭信息（包括小孩头像等），完成后更新UI
    var that = this
    app.refreshFamilyInfo().then(function() {
      that.updateFromApp()
    }).catch(function() {})

    this.setGreeting()
    this.loadTodayHabits()
    this.loadAchievements()
    this.loadRecommendations()

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  waitForAppData: function() {
    var that = this
    var checkCount = 0
    var timer = setInterval(function() {
      checkCount++
      if (app.globalData.children.length > 0 || checkCount > 30) {
        clearInterval(timer)
        that.updateFromApp()
        that.setGreeting()
        that.loadTodayHabits()
        that.loadAchievements()
        that.loadRecommendations()
      }
    }, 100)
  },

  updateFromApp: function() {
    var children = app.globalData.children || []
    var currentChildId = app.globalData.currentChildId || auth.getCurrentChildId()
    var currentChild = null

    for (var i = 0; i < children.length; i++) {
      if (children[i].childId === currentChildId) {
        currentChild = children[i]
        break
      }
    }
    if (!currentChild && children.length > 0) {
      currentChild = children[0]
      currentChildId = children[0].childId
    }

    this.setData({
      growthDays: app.globalData.growthDays || 0,
      children: children,
      currentChildId: currentChildId,
      currentChild: currentChild,
      themeColor: app.globalData.themeColor,
      themeBg: app.globalData.themeBg,
      themeGradient: app.globalData.themeGradient
    })

    this.calcGrowthDetail()

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  onChildChanged: function(e) {
    var childId = e.detail.childId
    this.switchToChild(childId)
  },

  onSwitchChild: function(e) {
    var childId = e.currentTarget.dataset.id
    if (childId === this.data.currentChildId) return
    this.switchToChild(childId)
  },

  switchToChild: function(childId) {
    var app = getApp()
    app.globalData.currentChildId = childId
    auth.switchChild(childId)

    wx.cloud.callFunction({
      name: 'family',
      data: { action: 'saveCurrentChild', childId: childId }
    }).catch(function(err) {
      console.warn('保存当前孩子失败:', err)
    })

    app.calcGrowthDays()
    this.setData({
      showChildList: false
    })
    this.updateFromApp()
    this.loadTodayHabits()
    this.loadAchievements()
    this.loadRecommendations()
  },

  toggleChildList: function() {
    this.setData({ showChildList: !this.data.showChildList })
  },

  calcGrowthDetail: function() {
    var child = auth.getCurrentChild()
    if (!child || !child.birthday) {
      this.setData({ growthYears: 0, growthMonths: 0, growthDaysRemain: 0 })
      return
    }

    var birthday = new Date(child.birthday)
    var today = new Date()

    var years = today.getFullYear() - birthday.getFullYear()
    var months = today.getMonth() - birthday.getMonth()
    var days = today.getDate() - birthday.getDate()

    if (days < 0) {
      months--
      var lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      days += lastMonth.getDate()
    }

    if (months < 0) {
      years--
      months += 12
    }

    this.setData({
      growthYears: years,
      growthMonths: months,
      growthDaysRemain: days
    })
  },

  // 设置问候语和日期
  setGreeting: function() {
    var now = new Date()
    var hour = now.getHours()
    var greeting = '早上好'
    if (hour >= 12 && hour < 18) greeting = '下午好'
    else if (hour >= 18) greeting = '晚上好'

    // 日期格式：2026年6月17日
    var month = now.getMonth() + 1
    var day = now.getDate()
    var dateStr = now.getFullYear() + '年' + month + '月' + day + '日'

    // 星期
    var weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    var weekdayStr = weekdays[now.getDay()]

    this.setData({ greeting: greeting, dateStr: dateStr, weekdayStr: weekdayStr })
  },

  // 加载今日习惯
  loadTodayHabits: function() {
    var today = util.getTodayStr()
    var habits = childStorage.get('habits') || []
    var records = childStorage.get('habitRecords') || []
    var brushingRecords = childStorage.get('brushingRecords') || []

    // 默认习惯（只显示常用的习惯在首页）
    var defaultHabits = [
      { type: 'brushing', name: '刷牙', icon: '🦷', target: 2 },
      { type: 'early_up', name: '早起', icon: '🌅', target: 1 },
      { type: 'early_sleep', name: '早睡', icon: '🌙', target: 1 },
      { type: 'drink', name: '喝水', icon: '💧', target: 8 },
      { type: 'wash_hands', name: '洗手', icon: '🧼', target: 3 },
      { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', target: 1 },
      { type: 'eat_lunch', name: '吃午餐', icon: '🍱', target: 1 },
      { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', target: 1 }
    ]

    // 合并自定义习惯
    var customHabits = habits.filter(function(h) { return h.type === 'custom' })
    var allHabits = defaultHabits.concat(customHabits)

    var todayHabits = allHabits.map(function(habit) {
      var done
      if (habit.type === 'brushing') {
        // 刷牙从独立的 brushingRecords 读取
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
        target: target,
        done: done,
        completed: done >= target
      }
    })

    this.setData({ todayHabits: todayHabits })
  },

  // 加载成就
  async loadAchievements() {
    // 先从云端合并成就（解决多设备不同步：A 解锁的成就 B 也能看到）
    try {
      await achievements.syncAchievementsFromCloud()
    } catch (e) {
      console.warn('成就云端同步失败:', e)
    }

    // 检查并解锁新成就（使用云端合并数据）
    var newAchievements = await achievements.checkAchievementsAsync()

    // 使用弹窗组件显示新成就
    if (newAchievements.length > 0) {
      var popup = this.selectComponent('#achievementPopup')
      if (popup) {
        popup.showAchievements(newAchievements)
      }
    }

    // 获取最近解锁的成就用于展示
    var recent = achievements.getRecentUnlocked(4)
    var displayAchievements = recent.map(function(a) {
      return { icon: a.icon, text: a.title }
    })

    // 默认成就
    if (displayAchievements.length === 0) {
      displayAchievements.push({ icon: '⭐', text: '开始成长之旅' })
    }

    this.setData({ achievements: displayAchievements })
  },

  // 跳转到成就详情页
  goAchievements: function() {
    wx.navigateTo({ url: '/pages/achievement/index' })
  },

  // 加载今日推荐（动态推荐）
  loadRecommendations: function() {
    var recommendations = learnData.getRecommendations()

    // 如果推荐不足3条，添加习惯推荐
    if (recommendations.length < 3) {
      var records = childStorage.get('habitRecords') || []
      var today = util.getTodayStr()
      var todayRecords = records.filter(function(r) { return r.date === today })

      if (todayRecords.length === 0) {
        recommendations.push({
          type: 'habits',
          icon: '🎯',
          text: '完成今天的习惯打卡',
          target: '/pages/habits/index'
        })
      }
    }

    this.setData({ recommendations: recommendations.slice(0, 3) })
  },

  // 跳转到习惯打卡
  goHabit: function(e) {
    var type = e.currentTarget.dataset.type
    if (type === 'brushing') {
      wx.navigateTo({ url: '/packageHabits/pages/habits/brushing/brushing' })
    } else {
      wx.navigateTo({ url: '/packageHabits/pages/habits/detail?type=' + type })
    }
  },

  // 跳转到模块页面
  goModule: function(e) {
    var module = e.currentTarget.dataset.module
    // TabBar页面需要使用switchTab跳转
    var tabPages = ['habits', 'learn', 'create', 'notes']
    var urlMap = {
      habits: '/pages/habits/index',
      learn: '/pages/learn/index',
      create: '/pages/create/index',
      notes: '/pages/notes/index',
      aiChat: '/packageCreate/pages/create/ai-chat/index',
      draw: '/packageCreate/pages/create/draw/index',
      stall: '/packageCreate/pages/create/stall/index',
      changeCalc: '/packageCreate/pages/create/stall/change-calc/change-calc',
      rps: '/packageCreate/pages/create/rps/index'
    }
    var url = urlMap[module]
    if (url) {
      if (tabPages.indexOf(module) !== -1) {
        wx.switchTab({ url: url })
      } else {
        wx.navigateTo({ url: url })
      }
    }
  },

  // 跳转到推荐
  goRecommendation: function(e) {
    var target = e.currentTarget.dataset.target
    if (target) {
      // 判断是 switchTab 还是 navigateTo
      var tabPages = ['/pages/habits/index', '/pages/learn/index', '/pages/create/index', '/pages/notes/index']
      var isTab = false
      for (var i = 0; i < tabPages.length; i++) {
        if (target.indexOf(tabPages[i]) === 0) {
          isTab = true
          break
        }
      }
      if (isTab) {
        wx.switchTab({ url: target.split('?')[0] })
      } else {
        wx.navigateTo({ url: target })
      }
    }
  },

  // 跳转到家长中心
  goParent: function() {
    wx.navigateTo({ url: '/pages/parent/index' })
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
  }
})
