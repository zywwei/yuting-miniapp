var stallManager = require('/packageCreate/utils/stall-manager.js')
var auth = require('/utils/auth.js')
var stallUtils = require('/packageCreate/utils/stall-utils.js')

Page({
  data: {
    stats: {},
    avgOrder: '¥0',
    posterPath: '',
    timeTab: 'today',
    startDate: '',
    endDate: '',
    showCustomPicker: false,
    filteredStats: { revenue: 0, profit: 0, orders: 0, topProducts: [] },
    dailySales: [],
    categoryStats: [],
    profitMargin: 0,
    themeColor: '#FF9AAB',
    themeGradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)',
    businessHours: null,
    businessHoursText: '0分钟',
    compareData: {},
    yearCompareData: {}
  },

  onLoad: function() {
    this.setNavBarColor()
  },

  onShow: function() {
    this.loadData()
    var app = getApp()
    if (app.globalData.themeColor) {
      this.setData({
        themeColor: app.globalData.themeColor,
        themeGradient: app.globalData.themeGradient
      })
    }
    this.setNavBarColor()
  },

  onPullDownRefresh: async function() {
    try {
      await stallManager.syncFromCloud()
      this.loadData()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  setNavBarColor: function() {
    stallUtils.setThemeColor()
  },

  loadData: function() {
    var stats = stallManager.getStats()
    var sales = stallManager.getSales()
    var products = stallManager.getProducts()

    var avgOrder = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0
    var profitMargin = stats.totalRevenue > 0 ? Math.round(stats.totalProfit / stats.totalRevenue * 100) : 0

    // 根据时间维度筛选数据
    var filteredSales = this.getFilteredSales(sales)
    var filteredStats = this.calculateFilteredStats(filteredSales, products)
    var dailySales = this.getDailySales(sales)
    var categoryStats = this.getCategoryStats(filteredSales, products)

    // 计算环比和同比
    var compareData = this.getPeriodCompare(sales)
    var yearCompareData = this.getYearOverYear(sales)

    // 营业时间统计
    var businessHours = stallManager.getTodayBusinessHours()
    var totalMin = businessHours.totalDuration || 0
    var bHours = Math.floor(totalMin / 60)
    var bMins = totalMin % 60
    var businessHoursText = bHours > 0 ? bHours + '小时' + bMins + '分钟' : bMins + '分钟'

    // 计算 Top5 百分比
    var maxRevenue = 0
    for (var i = 0; i < filteredStats.topProducts.length; i++) {
      if (filteredStats.topProducts[i].revenue > maxRevenue) {
        maxRevenue = filteredStats.topProducts[i].revenue
      }
    }
    for (var i = 0; i < filteredStats.topProducts.length; i++) {
      filteredStats.topProducts[i].percent = maxRevenue > 0 ? Math.round(filteredStats.topProducts[i].revenue / maxRevenue * 100) : 0
    }

    this.setData({
      stats: stats,
      avgOrder: '¥' + avgOrder,
      profitMargin: profitMargin,
      filteredStats: filteredStats,
      dailySales: dailySales,
      categoryStats: categoryStats,
      businessHours: businessHours,
      businessHoursText: businessHoursText,
      compareData: compareData,
      yearCompareData: yearCompareData,
      productActiveRate: this.calcProductActiveRate(products, filteredSales),
      highProfitProducts: this.calcHighProfitProducts(filteredSales, products),
      orderDistribution: this.calcOrderDistribution(filteredSales),
      targetData: this.calcTargetData(filteredStats, sales)
    })

    this.drawSalesChart(dailySales)
  },

  switchTimeTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ 
      timeTab: tab,
      showCustomPicker: tab === 'custom'
    })
    this.loadData()
  },

  showCustomDate: function() {
    this.setData({ showCustomPicker: true, timeTab: 'custom' })
  },

  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
    if (this.data.endDate) {
      this.loadData()
    }
  },

  onEndDateChange: function(e) {
    this.setData({ endDate: e.detail.value })
    if (this.data.startDate) {
      this.loadData()
    }
  },

  clearCustomDate: function() {
    this.setData({ 
      startDate: '', 
      endDate: '',
      timeTab: 'today',
      showCustomPicker: false
    })
    this.loadData()
  },

  getFilteredSales: function(sales) {
    var tab = this.data.timeTab
    var today = new Date()
    var todayStr = stallUtils.formatDate(today)
    var filtered = []

    if (tab === 'today') {
      filtered = sales.filter(function(s) { return s.date === todayStr })
    } else if (tab === 'week') {
      var weekStart = stallUtils.getWeekStart()
      var weekStartStr = stallUtils.formatDate(weekStart)
      filtered = sales.filter(function(s) { return s.date >= weekStartStr && s.date <= todayStr })
    } else if (tab === 'month') {
      var monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      var monthStartStr = stallUtils.formatDate(monthStart)
      filtered = sales.filter(function(s) { return s.date >= monthStartStr && s.date <= todayStr })
    } else if (tab === 'year') {
      var yearStart = new Date(today.getFullYear(), 0, 1)
      var yearStartStr = stallUtils.formatDate(yearStart)
      filtered = sales.filter(function(s) { return s.date >= yearStartStr && s.date <= todayStr })
    } else if (tab === 'custom') {
      var startDate = this.data.startDate
      var endDate = this.data.endDate
      if (startDate && endDate) {
        filtered = sales.filter(function(s) { return s.date >= startDate && s.date <= endDate })
      }
    }

    return filtered
  },

  calculateFilteredStats: function(sales, products) {
    var productMap = {}
    products.forEach(function(p) { productMap[p.id] = p })

    var revenue = 0
    var profit = 0
    var orders = sales.length
    var productStats = {}

    sales.forEach(function(sale) {
      var discount = sale.discount || 10
      revenue += sale.total || 0

      sale.items.forEach(function(item) {
        var product = productMap[item.productId]
        var costPrice = item.costPrice || (product ? product.costPrice : 0) || 0
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        profit += (itemRevenue - costPrice * (item.quantity || 0))

        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            id: item.productId,
            name: item.productName || (product ? product.name : '未知'),
            quantity: 0,
            revenue: 0
          }
        }
        productStats[item.productId].quantity += item.quantity || 0
        productStats[item.productId].revenue += itemRevenue
      })
    })

    var topProducts = Object.values(productStats)
      .sort(function(a, b) { return b.revenue - a.revenue })
      .slice(0, 5)

    return {
      revenue: Math.round(revenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      orders: orders,
      topProducts: topProducts
    }
  },

  getDailySales: function(sales) {
    var tab = this.data.timeTab
    var result = []
    var today = new Date()

    if (tab === 'today') {
      // 按小时统计：先分桶再统计，O(n) 替代 O(24n)
      var todayStr = stallUtils.formatDate(today)
      var hourBuckets = {}
      for (var i = 0; i < 24; i++) {
        var h = (i < 10 ? '0' : '') + i
        hourBuckets[h] = { revenue: 0, orders: 0 }
      }
      for (var j = 0; j < sales.length; j++) {
        var s = sales[j]
        if (s.date === todayStr && s.time) {
          var hour = s.time.substring(0, 2)
          if (hourBuckets[hour]) {
            hourBuckets[hour].revenue += (s.total || 0)
            hourBuckets[hour].orders++
          }
        }
      }
      for (var i = 0; i < 24; i++) {
        var hourStr = (i < 10 ? '0' : '') + i
        var bucket = hourBuckets[hourStr]
        result.push({
          date: todayStr,
          label: hourStr + '时',
          revenue: bucket.revenue,
          orders: bucket.orders
        })
      }
    } else if (tab === 'week') {
      for (var i = 6; i >= 0; i--) {
        var d = new Date(today)
        d.setDate(d.getDate() - i)
        var dateStr = stallUtils.formatDate(d)
        var daySales = sales.filter(function(s) { return s.date === dateStr })
        var revenue = daySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
        result.push({
          date: dateStr,
          label: (d.getMonth() + 1) + '/' + d.getDate(),
          revenue: revenue,
          orders: daySales.length
        })
      }
    } else if (tab === 'month') {
      for (var i = 29; i >= 0; i--) {
        var d = new Date(today)
        d.setDate(d.getDate() - i)
        var dateStr = stallUtils.formatDate(d)
        var daySales = sales.filter(function(s) { return s.date === dateStr })
        var revenue = daySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
        result.push({
          date: dateStr,
          label: (d.getMonth() + 1) + '/' + d.getDate(),
          revenue: revenue,
          orders: daySales.length
        })
      }
    } else if (tab === 'year') {
      for (var i = 11; i >= 0; i--) {
        var d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        var monthStart = stallUtils.formatDate(d)
        var monthEnd = stallUtils.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
        var monthSales = sales.filter(function(s) { return s.date >= monthStart && s.date <= monthEnd })
        var revenue = monthSales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
        result.push({
          date: monthStart,
          label: (d.getMonth() + 1) + '月',
          revenue: revenue,
          orders: monthSales.length
        })
      }
    } else if (tab === 'custom') {
      var startDate = this.data.startDate
      var endDate = this.data.endDate
      if (startDate && endDate) {
        var start = new Date(startDate)
        var end = new Date(endDate)
        var daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        for (var i = 0; i <= daysDiff; i++) {
          var d = new Date(start)
          d.setDate(d.getDate() + i)
          var dateStr = stallUtils.formatDate(d)
          var daySales = sales.filter(function(s) { return s.date === dateStr })
          var revenue = daySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
          result.push({
            date: dateStr,
            label: (d.getMonth() + 1) + '/' + d.getDate(),
            revenue: revenue,
            orders: daySales.length
          })
        }
      }
    }

    return result
  },

  getCategoryStats: function(sales, products) {
    var categories = {}
    var productMap = {}
    products.forEach(function(p) { productMap[p.id] = p })

    sales.forEach(function(sale) {
      var discount = sale.discount || 10
      sale.items.forEach(function(item) {
        var product = productMap[item.productId]
        var category = product ? product.category : '其他'
        if (!categories[category]) {
          categories[category] = { name: category, revenue: 0, quantity: 0 }
        }
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        categories[category].revenue += itemRevenue
        categories[category].quantity += item.quantity || 0
      })
    })

    var result = Object.values(categories).sort(function(a, b) { return b.revenue - a.revenue })
    var maxRev = result.length > 0 ? result[0].revenue : 1
    result.forEach(function(c) {
      c.percent = Math.round(c.revenue / maxRev * 100)
    })

    return result
  },

  getPeriodCompare: function(sales) {
    var tab = this.data.timeTab
    var today = new Date()
    var todayStr = stallUtils.formatDate(today)
    var result = {}

    var currentSales = []
    var previousSales = []

    if (tab === 'today') {
      currentSales = sales.filter(function(s) { return s.date === todayStr })
      var yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      var yesterdayStr = stallUtils.formatDate(yesterday)
      previousSales = sales.filter(function(s) { return s.date === yesterdayStr })
    } else if (tab === 'week') {
      var weekStart = stallUtils.getWeekStart()
      var weekStartStr = stallUtils.formatDate(weekStart)
      currentSales = sales.filter(function(s) { return s.date >= weekStartStr && s.date <= todayStr })
      var prevWeekStart = new Date(weekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      var prevWeekEnd = new Date(weekStart)
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
      previousSales = sales.filter(function(s) { 
        return s.date >= stallUtils.formatDate(prevWeekStart) && s.date <= stallUtils.formatDate(prevWeekEnd) 
      }.bind(this))
    } else if (tab === 'month') {
      var monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      var monthStartStr = stallUtils.formatDate(monthStart)
      currentSales = sales.filter(function(s) { return s.date >= monthStartStr && s.date <= todayStr })
      var prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      var prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      previousSales = sales.filter(function(s) { 
        return s.date >= stallUtils.formatDate(prevMonthStart) && s.date <= stallUtils.formatDate(prevMonthEnd) 
      }.bind(this))
    } else if (tab === 'year') {
      var yearStart = new Date(today.getFullYear(), 0, 1)
      var yearStartStr = stallUtils.formatDate(yearStart)
      currentSales = sales.filter(function(s) { return s.date >= yearStartStr && s.date <= todayStr })
      var prevYearStart = new Date(today.getFullYear() - 1, 0, 1)
      var prevYearEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      previousSales = sales.filter(function(s) { 
        return s.date >= stallUtils.formatDate(prevYearStart) && s.date <= stallUtils.formatDate(prevYearEnd) 
      }.bind(this))
    }

    var currentRevenue = currentSales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
    var previousRevenue = previousSales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
    var currentProfit = 0
    var previousProfit = 0

    currentSales.forEach(function(sale) {
      var discount = sale.discount || 10
      sale.items.forEach(function(item) {
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        currentProfit += itemRevenue - (item.costPrice || 0) * (item.quantity || 0)
      })
    })
    previousSales.forEach(function(sale) {
      var discount = sale.discount || 10
      sale.items.forEach(function(item) {
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        previousProfit += itemRevenue - (item.costPrice || 0) * (item.quantity || 0)
      })
    })

    if (previousRevenue > 0) {
      result.revenue = {
        percent: Math.abs(Math.round((currentRevenue - previousRevenue) / previousRevenue * 100)),
        trend: currentRevenue >= previousRevenue ? 'up' : 'down'
      }
    }
    if (previousProfit > 0) {
      result.profit = {
        percent: Math.abs(Math.round((currentProfit - previousProfit) / previousProfit * 100)),
        trend: currentProfit >= previousProfit ? 'up' : 'down'
      }
    }
    if (previousSales.length > 0) {
      result.orders = {
        percent: Math.abs(Math.round((currentSales.length - previousSales.length) / previousSales.length * 100)),
        trend: currentSales.length >= previousSales.length ? 'up' : 'down'
      }
    }

    return result
  },

  getYearOverYear: function(sales) {
    var tab = this.data.timeTab
    var today = new Date()
    var result = {}

    if (tab !== 'month' && tab !== 'year') {
      return result
    }

    var currentSales = []
    var lastYearSales = []

    if (tab === 'month') {
      var monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      var monthStartStr = stallUtils.formatDate(monthStart)
      var todayStr = stallUtils.formatDate(today)
      currentSales = sales.filter(function(s) { return s.date >= monthStartStr && s.date <= todayStr })
      var lastYearMonthStart = new Date(today.getFullYear() - 1, today.getMonth(), 1)
      var lastYearMonthEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      lastYearSales = sales.filter(function(s) { 
        return s.date >= stallUtils.formatDate(lastYearMonthStart) && s.date <= stallUtils.formatDate(lastYearMonthEnd) 
      }.bind(this))
    } else if (tab === 'year') {
      var yearStart = new Date(today.getFullYear(), 0, 1)
      var yearStartStr = stallUtils.formatDate(yearStart)
      var todayStr = stallUtils.formatDate(today)
      currentSales = sales.filter(function(s) { return s.date >= yearStartStr && s.date <= todayStr })
      var lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
      var lastYearEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      lastYearSales = sales.filter(function(s) { 
        return s.date >= stallUtils.formatDate(lastYearStart) && s.date <= stallUtils.formatDate(lastYearEnd) 
      }.bind(this))
    }

    var currentRevenue = currentSales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
    var lastYearRevenue = lastYearSales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
    var currentProfit = 0
    var lastYearProfit = 0

    currentSales.forEach(function(sale) {
      var discount = sale.discount || 10
      sale.items.forEach(function(item) {
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        currentProfit += itemRevenue - (item.costPrice || 0) * (item.quantity || 0)
      })
    })
    lastYearSales.forEach(function(sale) {
      var discount = sale.discount || 10
      sale.items.forEach(function(item) {
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        lastYearProfit += itemRevenue - (item.costPrice || 0) * (item.quantity || 0)
      })
    })

    if (lastYearRevenue > 0) {
      result.revenue = {
        percent: Math.abs(Math.round((currentRevenue - lastYearRevenue) / lastYearRevenue * 100)),
        trend: currentRevenue >= lastYearRevenue ? 'up' : 'down'
      }
    }
    if (lastYearProfit > 0) {
      result.profit = {
        percent: Math.abs(Math.round((currentProfit - lastYearProfit) / lastYearProfit * 100)),
        trend: currentProfit >= lastYearProfit ? 'up' : 'down'
      }
    }
    if (lastYearSales.length > 0) {
      result.orders = {
        percent: Math.abs(Math.round((currentSales.length - lastYearSales.length) / lastYearSales.length * 100)),
        trend: currentSales.length >= lastYearSales.length ? 'up' : 'down'
      }
    }

    return result
  },

  drawSalesChart: function(dailySales) {
    var query = this.createSelectorQuery()
    query.select('#salesChart').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) return

      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      var dpr = wx.getSystemInfoSync().pixelRatio
      var width = res[0].width || 300
      var height = res[0].height || 150

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, width, height)

      if (!dailySales || dailySales.length === 0) return

      var maxVal = 0
      dailySales.forEach(function(d) {
        if (d.revenue > maxVal) maxVal = d.revenue
      })
      if (maxVal <= 0) {
        maxVal = 100
      } else {
        // 向上取整到合适的刻度
        var niceNumbers = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]
        maxVal = niceNumbers.find(function(n) { return n >= maxVal }) || maxVal * 1.2
      }

      var padding = { top: 20, right: 10, bottom: 30, left: 40 }
      var chartW = width - padding.left - padding.right
      var chartH = height - padding.top - padding.bottom
      var barW = chartW / dailySales.length * 0.6
      var gap = chartW / dailySales.length * 0.4

      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 0.5
      for (var i = 0; i <= 4; i++) {
        var gy = padding.top + chartH * (1 - i / 4)
        ctx.beginPath()
        ctx.setLineDash([3, 3])
        ctx.moveTo(padding.left, gy)
        ctx.lineTo(width - padding.right, gy)
        ctx.stroke()
        ctx.setLineDash([])

        var labelVal = maxVal * i / 4
        var labelText = labelVal >= 1000 ? (labelVal / 1000).toFixed(1) + 'k' : Math.round(labelVal)
        ctx.fillStyle = '#bbb'
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('¥' + labelText, padding.left - 5, gy + 3)
      }

      for (var i = 0; i < dailySales.length; i++) {
        var d = dailySales[i]
        var barH = (d.revenue / maxVal) * chartH
        var x = padding.left + (chartW / dailySales.length) * i + gap / 2
        var y = padding.top + chartH - barH

        var gradient = ctx.createLinearGradient(x, y, x, y + barH)
        gradient.addColorStop(0, '#FF6B8A')
        gradient.addColorStop(1, '#FF9AAB')
        ctx.fillStyle = gradient

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + barW, y)
        ctx.lineTo(x + barW, y + barH)
        ctx.lineTo(x, y + barH)
        ctx.fill()

        if (dailySales.length <= 12 || i % 2 === 0) {
          ctx.fillStyle = '#999'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(d.label, x + barW / 2, height - 10)
        }
      }
    })
  },

  generatePoster: function() {
    var that = this
    wx.showLoading({ title: '生成中...' })

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    }

    var app = getApp()
    var themeColor = app.globalData.themeColor || '#FF9AAB'
    var themeGradientStart = themeColor
    var themeGradientEnd = lightenColor(themeColor, 30)

    function lightenColor(hex, percent) {
      var num = parseInt(hex.replace('#', ''), 16)
      var r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
      var g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
      var b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
      return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)
    }

    var query = this.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) {
        wx.hideLoading()
        wx.showToast({ title: '获取画布失败', icon: 'none' })
        return
      }

      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      var dpr = wx.getSystemInfoSync().pixelRatio
      var width = 375
      var height = 667

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      var stats = that.data.stats
      var filteredStats = that.data.filteredStats
      var categoryStats = that.data.categoryStats

      var bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, themeGradientStart)
      bgGradient.addColorStop(0.3, themeColor)
      bgGradient.addColorStop(1, themeGradientEnd)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = '#fff'
      roundRect(ctx, 16, 16, width - 32, height - 32, 20)
      ctx.fill()

      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏪 营业报告', width / 2, 60)

      ctx.fillStyle = '#999'
      ctx.font = '13px sans-serif'
      var today = new Date()
      ctx.fillText(today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日', width / 2, 82)

      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(30, 95)
      ctx.lineTo(width - 30, 95)
      ctx.stroke()

      var cardY = 110
      var cardH = 70
      var cardGap = 10
      var cardW = (width - 52) / 3

      ctx.fillStyle = '#FFF5F7'
      roundRect(ctx, 16, cardY, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + filteredStats.revenue, 16 + cardW / 2, cardY + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('销售额', 16 + cardW / 2, cardY + 52)

      ctx.fillStyle = '#E8F5E9'
      roundRect(ctx, 16 + cardW + cardGap, cardY, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#4CAF50'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + filteredStats.profit, 16 + cardW + cardGap + cardW / 2, cardY + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('利润', 16 + cardW + cardGap + cardW / 2, cardY + 52)

      ctx.fillStyle = '#E3F2FD'
      roundRect(ctx, 16 + (cardW + cardGap) * 2, cardY, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#2196F3'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(filteredStats.orders + '', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('订单数', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY + 52)

      var divY = cardY + cardH + 20
      ctx.strokeStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.moveTo(30, divY)
      ctx.lineTo(width - 30, divY)
      ctx.stroke()

      var topY = divY + 25
      ctx.fillStyle = '#333'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('🏆 热销商品 Top5', 28, topY)

      if (filteredStats.topProducts && filteredStats.topProducts.length > 0) {
        for (var i = 0; i < Math.min(5, filteredStats.topProducts.length); i++) {
          topY += 28
          var p = filteredStats.topProducts[i]

          ctx.fillStyle = i === 0 ? '#FF6B8A' : i === 1 ? '#FF9800' : i === 2 ? '#FFC107' : '#E0E0E0'
          ctx.beginPath()
          ctx.arc(38, topY - 4, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText((i + 1) + '', 38, topY)

          ctx.fillStyle = '#333'
          ctx.font = '13px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(p.name, 55, topY)

          ctx.fillStyle = '#FF6B8A'
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText('¥' + p.revenue, width - 28, topY)

          var barX = 55
          var barY2 = topY + 6
          var barW2 = width - 83 - 60
          var barH2 = 4
          ctx.fillStyle = '#f0f0f0'
          ctx.beginPath()
          ctx.moveTo(barX, barY2)
          ctx.lineTo(barX + barW2, barY2)
          ctx.lineTo(barX + barW2, barY2 + barH2)
          ctx.lineTo(barX, barY2 + barH2)
          ctx.fill()

          var progressW = barW2 * (p.percent / 100)
          ctx.fillStyle = '#FF6B8A'
          ctx.beginPath()
          ctx.moveTo(barX, barY2)
          ctx.lineTo(barX + progressW, barY2)
          ctx.lineTo(barX + progressW, barY2 + barH2)
          ctx.lineTo(barX, barY2 + barH2)
          ctx.fill()
        }
      } else {
        topY += 30
        ctx.fillStyle = '#999'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('暂无销售数据', width / 2, topY)
      }

      ctx.fillStyle = '#ccc'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('— ' + auth.getChildNickname() + '成长小助手 —', width / 2, height - 30)

      setTimeout(function() {
        try {
          wx.canvasToTempFilePath({
            canvas: canvas,
            destWidth: width * 2,
            destHeight: height * 2,
            success: function(res) {
              that.setData({ posterPath: res.tempFilePath })
              wx.hideLoading()
            },
            fail: function(err) {
              console.warn('生成海报失败:', err)
              wx.hideLoading()
              wx.showToast({ title: '生成失败', icon: 'none', duration: 2000 })
            }
          })
        } catch (e) {
          console.warn('canvasToTempFilePath异常:', e)
          wx.hideLoading()
          wx.showToast({ title: '生成异常', icon: 'none' })
        }
      }, 300)
    })
  },

  closePoster: function() {
    this.setData({ posterPath: '' })
  },

  savePoster: function() {
    var that = this
    if (!this.data.posterPath) return

    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: function() {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        that.closePoster()
      },
      fail: function(err) {
        if (err.errMsg.indexOf('auth deny') >= 0 || err.errMsg.indexOf('authorize') >= 0) {
          wx.showModal({
            title: '需要授权',
            content: '请在设置中允许保存图片到相册',
            success: function(res) {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        }
      }
    })
  },

  sharePoster: function() {
    var that = this
    wx.shareAppMessage({
      title: '🏪 我的小铺 - 营业报告',
      path: '/packageCreate/pages/create/stall/stats/stats',
      imageUrl: that.data.posterPath || '',
      success: function() {
        wx.showToast({ title: '分享成功', icon: 'success' })
        that.closePoster()
      },
      fail: function(err) {
        console.warn('分享失败:', err)
      }
    })
  },

  onShareAppMessage: function() {
    return {
      title: '🏪 我的小铺 - 营业报告',
      path: '/packageCreate/pages/create/stall/stats/stats',
      imageUrl: this.data.posterPath || ''
    }
  },

  calcProductActiveRate: function(products, sales) {
    if (products.length === 0) return 0
    var soldProductIds = {}
    sales.forEach(function(sale) {
      sale.items.forEach(function(item) {
        soldProductIds[item.productId] = true
      })
    })
    var activeCount = Object.keys(soldProductIds).length
    return Math.round(activeCount / products.length * 100)
  },

  calcHighProfitProducts: function(sales, products) {
    var productMap = {}
    products.forEach(function(p) { productMap[p.id] = p })

    var productProfits = {}
    sales.forEach(function(sale) {
      var discount = sale.discount || 10
      sale.items.forEach(function(item) {
        var product = productMap[item.productId]
        if (!product) return
        
        if (!productProfits[item.productId]) {
          productProfits[item.productId] = {
            id: item.productId,
            name: product.name,
            revenue: 0,
            cost: 0,
            profit: 0,
            profitRate: 0
          }
        }
        var itemRevenue = stallUtils.applyDiscount((item.subtotal || 0), discount)
        var costPrice = item.costPrice || product.costPrice || 0
        
        productProfits[item.productId].revenue += itemRevenue
        productProfits[item.productId].cost += costPrice * (item.quantity || 0)
      })
    })

    var result = Object.values(productProfits).map(function(p) {
      p.profit = Math.round((p.revenue - p.cost) * 100) / 100
      p.profitRate = p.revenue > 0 ? Math.round(p.profit / p.revenue * 100) : 0
      return p
    })

    result.sort(function(a, b) { return b.profit - a.profit })
    return result.slice(0, 3)
  },

  calcOrderDistribution: function(sales) {
    var ranges = [
      { range: '0-10元', min: 0, max: 10, count: 0 },
      { range: '10-30元', min: 10, max: 30, count: 0 },
      { range: '30-50元', min: 30, max: 50, count: 0 },
      { range: '50-100元', min: 50, max: 100, count: 0 },
      { range: '100元以上', min: 100, max: Infinity, count: 0 }
    ]

    sales.forEach(function(sale) {
      var total = sale.total || 0
      for (var i = 0; i < ranges.length; i++) {
        if (total >= ranges[i].min && total < ranges[i].max) {
          ranges[i].count++
          break
        }
      }
    })

    var maxCount = 0
    ranges.forEach(function(r) {
      if (r.count > maxCount) maxCount = r.count
    })

    return ranges.filter(function(r) { return r.count > 0 }).map(function(r) {
      return {
        range: r.range,
        count: r.count,
        percent: maxCount > 0 ? Math.round(r.count / maxCount * 100) : 0
      }
    })
  },

  calcTargetData: function(filteredStats, allSales) {
    var settings = stallManager.getSettings()
    var dailyGoal = settings.dailyGoal || 50
    var weeklyGoal = settings.weeklyGoal || 300
    var monthlyGoal = settings.monthlyGoal || 1000

    var today = new Date()
    var todayStr = stallUtils.formatDate(today)
    var todaySales = allSales.filter(function(s) { return s.date === todayStr })
    var todayRevenue = todaySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)

    var result = {
      today: {
        target: dailyGoal,
        actual: todayRevenue,
        percent: dailyGoal > 0 ? Math.min(100, Math.round(todayRevenue / dailyGoal * 100)) : 0
      }
    }

    var tab = this.data.timeTab
    if (tab === 'week') {
      result.period = {
        label: '本周目标',
        target: weeklyGoal,
        actual: filteredStats.revenue,
        percent: weeklyGoal > 0 ? Math.min(100, Math.round(filteredStats.revenue / weeklyGoal * 100)) : 0
      }
    } else if (tab === 'month') {
      result.period = {
        label: '本月目标',
        target: monthlyGoal,
        actual: filteredStats.revenue,
        percent: monthlyGoal > 0 ? Math.min(100, Math.round(filteredStats.revenue / monthlyGoal * 100)) : 0
      }
    } else if (tab === 'year') {
      var yearlyGoal = monthlyGoal * 12
      result.period = {
        label: '本年目标',
        target: yearlyGoal,
        actual: filteredStats.revenue,
        percent: yearlyGoal > 0 ? Math.min(100, Math.round(filteredStats.revenue / yearlyGoal * 100)) : 0
      }
    }

    return result
  }
})
