var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    currentFilter: 'today',
    filteredTotal: 0,
    filteredCount: 0,
    filteredProfit: 0,
    groupedSales: [],
    searchKeyword: '',
    startDate: '',
    endDate: '',
    todayOverview: null
  },

  onLoad: function() {
    this.loadData()
    this.setThemeColor()
  },

  onShow: function() {
    this.loadData()
  },

  setFilter: function(e) {
    this.setData({
      currentFilter: e.currentTarget.dataset.filter,
      startDate: '',
      endDate: ''
    })
    this.loadData()
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.loadData()
  },

  onStartDateChange: function(e) {
    this.setData({
      startDate: e.detail.value,
      currentFilter: 'custom'
    })
    this.loadData()
  },

  onEndDateChange: function(e) {
    this.setData({
      endDate: e.detail.value,
      currentFilter: 'custom'
    })
    this.loadData()
  },

  clearDateRange: function() {
    this.setData({
      startDate: '',
      endDate: '',
      currentFilter: 'today'
    })
    this.loadData()
  },

  toggleSaleDetail: function(e) {
    var id = e.currentTarget.dataset.id
    var groupedSales = this.data.groupedSales
    for (var i = 0; i < groupedSales.length; i++) {
      for (var j = 0; j < groupedSales[i].sales.length; j++) {
        if (groupedSales[i].sales[j].id === id) {
          groupedSales[i].sales[j].expanded = !groupedSales[i].sales[j].expanded
          break
        }
      }
    }
    this.setData({ groupedSales: groupedSales })
  },

  loadData: function() {
    var sales = stallManager.getSales()
    var filter = this.data.currentFilter
    var today = stallManager.getTodayStr()
    var keyword = this.data.searchKeyword
    var startDate = this.data.startDate
    var endDate = this.data.endDate

    // 1. 快捷筛选
    var filtered = []
    if (filter === 'today') {
      filtered = sales.filter(function(s) { return s.date === today })
    } else if (filter === 'week') {
      var weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      var weekAgoStr = this.formatDate(weekAgo)
      filtered = sales.filter(function(s) { return s.date >= weekAgoStr })
    } else if (filter === 'month') {
      var monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      var monthAgoStr = this.formatDate(monthAgo)
      filtered = sales.filter(function(s) { return s.date >= monthAgoStr })
    } else {
      filtered = sales.slice()
    }

    // 2. 自定义日期范围覆盖
    if (startDate) {
      filtered = filtered.filter(function(s) { return s.date >= startDate })
    }
    if (endDate) {
      filtered = filtered.filter(function(s) { return s.date <= endDate })
    }

    // 3. 关键词搜索叠加
    if (keyword) {
      var lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(function(sale) {
        for (var i = 0; i < sale.items.length; i++) {
          if (sale.items[i].productName.toLowerCase().indexOf(lowerKeyword) >= 0) {
            return true
          }
        }
        return false
      })
    }

    // 计算总金额和总利润
    var filteredTotal = 0
    var filteredProfit = 0

    // Build product lookup map
    var products = stallManager.getProducts()
    var productMap = {}
    for (var p = 0; p < products.length; p++) {
      productMap[products[p].id] = products[p]
    }

    // Group by date
    var groups = {}
    for (var i = 0; i < filtered.length; i++) {
      var sale = filtered[i]
      if (!groups[sale.date]) {
        groups[sale.date] = { date: sale.date, total: 0, profit: 0, count: 0, sales: [], businessHours: null }
      }

      // 向后兼容
      sale.discount = sale.discount || 10
      sale.originalTotal = sale.originalTotal || sale.total
      sale.discountAmount = sale.discountAmount || 0
      sale.expanded = false

      // 计算利润
      var totalCost = 0
      for (var j = 0; j < sale.items.length; j++) {
        var item = sale.items[j]
        var costPrice = item.costPrice || 0
        if (!costPrice && productMap[item.productId]) {
          costPrice = productMap[item.productId].costPrice || 0
        }
        totalCost += costPrice * item.quantity
      }
      sale.profit = Math.round((sale.total - totalCost) * 100) / 100

      groups[sale.date].total += sale.total
      groups[sale.date].profit += sale.profit
      groups[sale.date].count++
      groups[sale.date].sales.push(sale)

      filteredTotal += sale.total
      filteredProfit += sale.profit
    }

    // 获取每天的营业时间
    var dates = Object.keys(groups)
    for (var d = 0; d < dates.length; d++) {
      var date = dates[d]
      var dayHours = stallManager.getBusinessHoursByDate(date)
      var sessions = []
      for (var s = 0; s < dayHours.sessions.length; s++) {
        var session = dayHours.sessions[s]
        var openTime = new Date(session.openTime)
        var closeTime = session.closeTime ? new Date(session.closeTime) : null
        sessions.push({
          openTimeStr: this.padZero(openTime.getHours()) + ':' + this.padZero(openTime.getMinutes()),
          closeTimeStr: closeTime ? this.padZero(closeTime.getHours()) + ':' + this.padZero(closeTime.getMinutes()) : '',
          durationText: this.formatDuration(session.duration || 0)
        })
      }
      groups[date].businessHours = {
        sessions: sessions,
        totalDurationText: this.formatDuration(dayHours.totalDuration || 0)
      }
    }

    var groupedSales = Object.keys(groups).sort().reverse().map(function(date) {
      return groups[date]
    })

    // 今日概况
    var todayOverview = null
    if (filter === 'today' && !startDate && !endDate) {
      var todayHours = stallManager.getTodayBusinessHours()
      var firstSession = todayHours.sessions && todayHours.sessions[0]
      var firstOpenTime = ''
      if (firstSession) {
        var t = new Date(firstSession.openTime)
        firstOpenTime = this.padZero(t.getHours()) + ':' + this.padZero(t.getMinutes())
      }
      var todayProfit = 0
      for (var k = 0; k < filtered.length; k++) {
        todayProfit += filtered[k].profit || 0
      }
      todayOverview = {
        firstOpenTime: firstOpenTime || '未开店',
        durationText: this.formatDuration(todayHours.totalDuration || 0),
        orderCount: filtered.length,
        revenue: Math.round(filteredTotal * 100) / 100,
        profit: Math.round(todayProfit * 100) / 100
      }
    }

    this.setData({
      filteredTotal: Math.round(filteredTotal * 100) / 100,
      filteredCount: filtered.length,
      filteredProfit: Math.round(filteredProfit * 100) / 100,
      groupedSales: groupedSales,
      todayOverview: todayOverview
    })
  },

  deleteSale: function(e) {
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后库存将自动恢复',
      success: function(res) {
        if (res.confirm) {
          stallManager.deleteSale(id)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }.bind(this)
    })
  },

  formatDate: function(date) {
    var y = date.getFullYear()
    var m = String(date.getMonth() + 1).padStart(2, '0')
    var d = String(date.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + d
  },

  padZero: function(num) {
    return num < 10 ? '0' + num : String(num)
  },

  formatDuration: function(minutes) {
    if (!minutes || minutes <= 0) return '0分钟'
    var h = Math.floor(minutes / 60)
    var m = minutes % 60
    return h > 0 ? h + '小时' + m + '分钟' : m + '分钟'
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  }
})
