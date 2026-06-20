var stallManager = require('../../../utils/stall-manager.js')

Page({
  data: {
    settings: {},
    levelInfo: {},
    todayRevenue: 0,
    todayOrders: 0,
    goalPercent: 0,
    lowStockProducts: [],
    todayChallenges: [],
    todayBusinessHours: null,
    currentDuration: 0,
    showSettings: false,
    tempGoal: 50,
    tempDiscount: 10
  },

  onLoad: function() {
    stallManager.syncFromCloud()
    this.loadData()
    this.setThemeColor()
    this.startDurationTimer()
  },

  onShow: function() {
    this.loadData()
    this.setThemeColor()
  },

  onUnload: function() {
    this.stopDurationTimer()
  },

  startDurationTimer: function() {
    var that = this
    this._durationTimer = setInterval(function() {
      if (that.data.settings.isOpen) {
        that.refreshDuration()
      }
    }, 60000)
  },

  stopDurationTimer: function() {
    if (this._durationTimer) {
      clearInterval(this._durationTimer)
      this._durationTimer = null
    }
  },

  refreshDuration: function() {
    var settings = this.data.settings
    var todayBusinessHours = this.data.todayBusinessHours
    if (!settings.isOpen || !todayBusinessHours || todayBusinessHours.sessions.length === 0) return

    var lastSession = todayBusinessHours.sessions[todayBusinessHours.sessions.length - 1]
    if (!lastSession || lastSession.closeTime) return

    var currentDuration = Math.round((new Date() - new Date(lastSession.openTime)) / 60000)
    var hours = Math.floor(currentDuration / 60)
    var mins = currentDuration % 60
    var currentDurationText = hours > 0 ? hours + '小时' + mins + '分钟' : mins + '分钟'

    var totalDuration = (todayBusinessHours.totalDuration || 0) + currentDuration
    var totalHours = Math.floor(totalDuration / 60)
    var totalMins = totalDuration % 60
    var totalDurationText = totalHours > 0 ? totalHours + '小时' + totalMins + '分钟' : totalMins + '分钟'

    this.setData({
      currentDuration: currentDuration,
      currentDurationText: currentDurationText,
      totalDurationText: totalDurationText
    })
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  loadData: function() {
    var settings = stallManager.getSettings()
    var levelInfo = stallManager.getLevelInfo()
    var products = stallManager.getProducts()
    var sales = stallManager.getSales()
    var today = stallManager.getTodayStr()

    var todaySales = sales.filter(function(s) { return s.date === today })
    var todayRevenue = todaySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
    var goalPercent = settings.dailyGoal > 0 ? Math.min(100, Math.round(todayRevenue / settings.dailyGoal * 100)) : 0

    var lowStockProducts = stallManager.getLowStockProducts()

    // 加载挑战数据
    var todayChallenges = stallManager.getTodayChallenges()
    var allChallenges = stallManager.DAILY_CHALLENGES.map(function(c) {
      return {
        id: c.id,
        title: c.title,
        desc: c.desc,
        icon: c.icon,
        reward: c.reward,
        completed: todayChallenges.completed.indexOf(c.id) >= 0,
        claimed: todayChallenges.claimed.indexOf(c.id) >= 0
      }
    })

    // 营业时间
    var todayBusinessHours = stallManager.getTodayBusinessHours()
    var currentDuration = 0
    var currentDurationText = ''
    if (settings.isOpen && todayBusinessHours.sessions.length > 0) {
      var lastSession = todayBusinessHours.sessions[todayBusinessHours.sessions.length - 1]
      if (lastSession && !lastSession.closeTime) {
        currentDuration = Math.round((new Date() - new Date(lastSession.openTime)) / 60000)
      }
    }
    if (currentDuration > 0) {
      var hours = Math.floor(currentDuration / 60)
      var mins = currentDuration % 60
      currentDurationText = hours > 0 ? hours + '小时' + mins + '分钟' : mins + '分钟'
    } else if (settings.isOpen) {
      currentDurationText = '不到1分钟'
    }
    var totalDuration = todayBusinessHours.totalDuration || 0
    if (settings.isOpen && currentDuration > 0) {
      totalDuration = totalDuration + currentDuration
    }
    var totalDurationText = ''
    if (totalDuration > 0) {
      var totalHours = Math.floor(totalDuration / 60)
      var totalMins = totalDuration % 60
      totalDurationText = totalHours > 0 ? totalHours + '小时' + totalMins + '分钟' : totalMins + '分钟'
    } else {
      totalDurationText = '不到1分钟'
    }

    this.setData({
      settings: settings,
      levelInfo: levelInfo,
      todayRevenue: todayRevenue,
      todayOrders: todaySales.length,
      goalPercent: goalPercent,
      lowStockProducts: lowStockProducts,
      todayChallenges: allChallenges,
      todayBusinessHours: todayBusinessHours,
      tempGoal: settings.dailyGoal || 50,
      tempDiscount: settings.defaultDiscount || 10,
      currentDuration: currentDuration,
      currentDurationText: currentDurationText,
      totalDurationText: totalDurationText
    })
  },

  toggleStall: function() {
    var that = this
    var settings = this.data.settings
    if (settings.isOpen) {
      var todayHours = stallManager.getTodayBusinessHours()
      var durationText = this.data.currentDuration > 0 ? '本次营业 ' + this.data.currentDuration + ' 分钟' : ''
      
      wx.showModal({
        title: '确认打烊',
        content: durationText + '\n今日已营业 ' + todayHours.openCount + ' 次',
        success: function(res) {
          if (res.confirm) {
            stallManager.closeStall()
            wx.showToast({ title: '已打烊', icon: 'success' })
            that.loadData()
          }
        }
      })
    } else {
      stallManager.openStall()
      wx.showToast({ title: '开始营业', icon: 'success' })
      this.loadData()
    }
  },

  claimChallenge: function(e) {
    var challengeId = e.currentTarget.dataset.id
    var result = stallManager.claimChallenge(challengeId)
    if (result) {
      wx.showToast({ title: '领取成功！+积分', icon: 'success' })
      this.loadData()
    }
  },

  goSale: function() {
    if (!this.data.settings.isOpen) {
      wx.showModal({
        title: '尚未营业',
        content: '请先开始营业后再开单',
        showCancel: false
      })
      return
    }
    wx.navigateTo({ url: '/pages/create/stall/sale/sale' })
  },

  goProducts: function() {
    wx.navigateTo({ url: '/pages/create/stall/price-board/price-board' })
  },

  goHistory: function() {
    wx.navigateTo({ url: '/pages/create/stall/history/history' })
  },

  goStats: function() {
    wx.navigateTo({ url: '/pages/create/stall/stats/stats' })
  },

  goPriceBoard: function() {
    wx.navigateTo({ url: '/pages/create/stall/price-board/price-board' })
  },

  goChangeCalc: function() {
    wx.navigateTo({ url: '/pages/create/stall/change-calc/change-calc' })
  },

  goPricingHelper: function() {
    wx.navigateTo({ url: '/pages/create/stall/pricing-helper/pricing-helper' })
  },

  goRestockList: function() {
    wx.navigateTo({ url: '/pages/create/stall/restock-list/restock-list' })
  },

  goBusinessDiary: function() {
    wx.navigateTo({ url: '/pages/create/stall/business-diary/business-diary' })
  },

  openSettings: function() {
    this.setData({ showSettings: true })
  },

  closeSettings: function() {
    this.setData({ showSettings: false })
  },

  onGoalInput: function(e) {
    this.setData({ tempGoal: e.detail.value })
  },

  setDiscountQuick: function(e) {
    var discount = parseInt(e.currentTarget.dataset.discount)
    this.setData({ tempDiscount: discount })
  },

  onDiscountInput: function(e) {
    this.setData({ tempDiscount: parseFloat(e.detail.value) || 10 })
  },

  saveSettings: function() {
    var goal = parseInt(this.data.tempGoal)
    var discount = parseFloat(this.data.tempDiscount)
    
    if (isNaN(goal) || goal < 0) {
      wx.showToast({ title: '请输入有效目标金额', icon: 'none' })
      return
    }
    if (isNaN(discount) || discount < 0 || discount > 10) {
      wx.showToast({ title: '请输入0-10的折扣', icon: 'none' })
      return
    }

    var settings = stallManager.getSettings()
    settings.dailyGoal = goal
    settings.defaultDiscount = discount
    stallManager.saveSettings(settings)
    
    this.setData({ showSettings: false })
    this.loadData()
    wx.showToast({ title: '设置已保存', icon: 'success' })
  }
})
