var util = require('../../utils/util.js')
var learnData = require('../../utils/learn-data.js')
var achievements = require('../../utils/achievements.js')
var auth = require('../../utils/auth.js')
var childStorage = require('../../utils/child-storage.js')
var habitConfig = require('../../utils/habit-config.js')
var cloud = require('../../utils/cloud.js')

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
    var windowInfo = wx.getWindowInfo()
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight || 20
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

    // 节流：30秒内不重复请求云端数据
    var that = this
    var now = Date.now()
    if (!this._lastCloudFetch || now - this._lastCloudFetch > 30000) {
      this._lastCloudFetch = now
      app.refreshFamilyInfo().then(function() {
        that.updateFromApp()
      }).catch(function() {})
    }

    // 先用本地缓存立即渲染，云端同步作为后台静默刷新
    this.setGreeting()
    this.loadTodayHabits()
    this.loadAchievements()
    this.loadRecommendations()
    this.syncCloudData().then(function() {
      // 同步完成后刷新为最新数据
      that.loadTodayHabits()
      that.loadAchievements()
      that.loadRecommendations()
    }).catch(function() {
      // 同步失败保持本地数据展示
    })

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  onUnload: function() {
    if (this.waitForDataTimer) {
      clearInterval(this.waitForDataTimer)
      this.waitForDataTimer = null
    }
  },

  waitForAppData: function() {
    var that = this
    var checkCount = 0
    var rendered = false
    this.waitForDataTimer = setInterval(function() {
      checkCount++
      var ready = app.globalData.children.length > 0
      // children 就绪或 3 秒超时：先渲染（就绪前用本地缓存，避免白屏等待）
      if (ready || checkCount > 10) {
        if (!rendered) {
          rendered = true
          that.updateFromApp()
          that.setGreeting()
          that.loadTodayHabits()
          that.loadAchievements()
          that.loadRecommendations()
        }
        // children 就绪后：后台同步云端并刷新，然后停止轮询
        if (ready) {
          clearInterval(that.waitForDataTimer)
          that.waitForDataTimer = null
          that.syncCloudData(true).then(function() {
            that.updateFromApp()
            that.loadTodayHabits()
            that.loadAchievements()
            that.loadRecommendations()
          }).catch(function() {
            // 同步失败保持本地数据展示
          })
          return
        }
      }
      // 兜底：15 秒后停止轮询，避免永久空转
      if (checkCount > 50) {
        clearInterval(that.waitForDataTimer)
        that.waitForDataTimer = null
      }
    }, 300)
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
      data: { familyId: auth.getCurrentFamilyId(), action: 'saveCurrentChild', childId: childId }
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

  // 同步云端业务数据（习惯、打卡、刷牙等）
  async syncCloudData(force) {
    // 节流：30秒内不重复同步（force 同样计入节流，避免首次进入时 onShow 与 waitForAppData 重复拉取）
    var now = Date.now()
    if (this._lastSyncCloudData && now - this._lastSyncCloudData < 30000) {
      return
    }
    this._lastSyncCloudData = now
    
    try {
      // 并行拉取数据，首页只拉取今日的刷牙记录
      var today = util.getTodayStr()
      await Promise.all([
        cloud.fetchHabits(),
        cloud.fetchHabitRecords(),
        cloud.fetchBrushingRecords(today),  // 只拉取今日的刷牙记录
        achievements.syncAchievementsFromCloud()
      ])
      
      // 不在这里调用 loadTodayHabits，由调用方决定何时加载
    } catch (err) {
      console.warn('首页云端数据同步失败:', err)
    }
  },

  // 加载今日习惯
  loadTodayHabits: function() {
    var today = util.getTodayStr()
    var habits = childStorage.get('habits') || []
    var records = childStorage.get('habitRecords') || []
    var brushingRecords = childStorage.get('brushingRecords') || []

    // 默认习惯（只显示常用的习惯在首页）
    var defaultHabits = habitConfig.getDefaultHabits('home')

    // 合并自定义习惯
    var customHabits = habits.filter(function(h) { return h.type === 'custom' })
    var allHabits = defaultHabits.concat(customHabits)

    var todayHabits = allHabits.map(function(habit) {
      var done
      if (habit.type === 'brushing') {
        // 刷牙从独立的 brushingRecords 读取，区分早上和晚上
        var todayRecords = brushingRecords.filter(function(r) {
          return r.date === today
        })
        var hasMorning = todayRecords.some(function(r) { return r.timeOfDay === 'morning' })
        var hasEvening = todayRecords.some(function(r) { return r.timeOfDay === 'evening' })
        done = (hasMorning ? 1 : 0) + (hasEvening ? 1 : 0)
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
      book: '/packageCreate/pages/create/book/index',
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
  }
})
