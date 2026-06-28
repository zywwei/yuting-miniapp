var bookManager = require('../../../../utils/book-manager.js')
var wxCharts = require('../../../../../utils/wx-charts.js')

Page({
  data: {
    bookId: '',
    book: null,
    books: [],
    timeRange: 'month',
    timeRangeOptions: [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' }
    ],
    typeFilter: 'expense',
    typeOptions: [
      { value: 'expense', label: '支出' },
      { value: 'income', label: '收入' },
      { value: 'all', label: '全部' }
    ],
    stats: null,
    categoryStats: null,
    trendData: null,
    comparison: null,
    calendarData: null,
    currentMonth: ''
  },

  onLoad: function(options) {
    var today = bookManager.getTodayStr()
    var books = bookManager.getBooks().filter(function(b) { return !b.isArchived })
    this.setData({
      bookId: options.bookId || '',
      books: books,
      currentMonth: today.substring(0, 7)
    })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  onUnload: function() {
    if (this.trendChart) this.trendChart = null
    if (this.pieChart) this.pieChart = null
  },

  loadData: function() {
    if (this.data.bookId) {
      var book = bookManager.getBook(this.data.bookId)
      if (!book) {
        wx.showToast({ title: '账本不存在', icon: 'none' })
        setTimeout(function() {
          wx.navigateBack()
        }, 1500)
        return
      }
    }
    var book = this.data.bookId ? bookManager.getBook(this.data.bookId) : null
    var stats = this.data.bookId ? bookManager.getBookStats(this.data.bookId, this.getTimeRange()) : bookManager.getOverviewStats()
    var categoryStats = this.data.bookId ? bookManager.getCategoryStats(this.data.bookId, this.getTimeRange()) : null
    var trendData = this.data.bookId ? bookManager.getTrendStats(this.data.bookId, this.data.timeRange) : null
    var comparison = this.data.bookId ? bookManager.getComparisonStats(this.data.bookId, this.data.timeRange) : null
    var calendarData = this.data.bookId ? bookManager.getCalendarData(this.data.bookId, this.data.currentMonth) : null
    var topCategories = this.getTopCategories()
    var comparisonText = this.getComparisonText(comparison)
    this.setData({
      book: book,
      stats: stats,
      categoryStats: categoryStats,
      trendData: trendData,
      comparison: comparison,
      calendarData: calendarData,
      memberStats: this.getMemberStats(),
      topCategories: topCategories,
      comparisonText: comparisonText
    })
    var self = this
    setTimeout(function() {
      self.drawCharts()
    }, 300)
  },

  getMemberStats: function() {
    if (!this.data.bookId) return null
    var entries = bookManager.getEntries(this.data.bookId, this.getTimeRange())
    var stats = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      var memberId = e.createdByMemberId || 'unknown'
      var memberName = e.createdByName || '未知'
      if (!stats[memberId]) {
        stats[memberId] = { name: memberName, income: 0, expense: 0, count: 0 }
      }
      if (e.type === 'income') stats[memberId].income += e.amount
      else if (e.type === 'expense') stats[memberId].expense += e.amount
      stats[memberId].count++
    }
    var list = []
    for (var key in stats) {
      list.push(stats[key])
    }
    list.sort(function(a, b) { return b.expense - a.expense })
    return list
  },

  drawCharts: function() {
    var windowInfo = wx.getWindowInfo()
    this.chartWidth = windowInfo.windowWidth - 48
    this.drawTrendChart()
    this.drawPieChart()
  },

  drawTrendChart: function() {
    if (!this.data.trendData) return
    var trendData = this.data.trendData
    var categories = []
    var incomeData = []
    var expenseData = []
    for (var key in trendData) {
      categories.push(key.substring(5))
      incomeData.push(trendData[key].income || 0)
      expenseData.push(trendData[key].expense || 0)
    }
    if (categories.length === 0) return
    try {
      this.trendChart = new wxCharts({
        canvasId: 'trendChart',
        type: 'line',
        categories: categories,
        series: [{
          name: '收入',
          data: incomeData,
          color: '#52c41a'
        }, {
          name: '支出',
          data: expenseData,
          color: '#ff4d4f'
        }],
        yAxis: {
          title: '金额',
          format: function(val) { return val.toFixed(0) }
        },
        width: this.chartWidth || 320,
        height: 200
      })
    } catch (e) {
      console.warn('绘制趋势图失败:', e)
    }
  },

  drawPieChart: function() {
    var topCategories = this.getTopCategories()
    if (topCategories.length === 0) return
    var series = topCategories.map(function(item) {
      return {
        name: item.name,
        data: item.amount,
        color: null
      }
    })
    try {
      this.pieChart = new wxCharts({
        canvasId: 'pieChart',
        type: 'ring',
        series: series,
        width: this.chartWidth || 320,
        height: 200,
        dataLabel: true
      })
    } catch (e) {
      console.warn('绘制饼图失败:', e)
    }
  },

  getTimeRange: function() {
    var today = bookManager.getTodayStr()
    if (this.data.timeRange === 'week') {
      var d = new Date()
      var day = d.getDay()
      var diff = d.getDate() - day + (day === 0 ? -6 : 1)
      var start = new Date(d.setDate(diff))
      return {
        startDate: start.toISOString().substring(0, 10),
        endDate: today
      }
    } else if (this.data.timeRange === 'month') {
      return {
        startDate: today.substring(0, 7) + '-01',
        endDate: today
      }
    } else {
      return {
        startDate: today.substring(0, 4) + '-01-01',
        endDate: today
      }
    }
  },

  switchTimeRange: function(e) {
    this.setData({ timeRange: e.currentTarget.dataset.value })
    this.loadData()
  },

  switchTypeFilter: function(e) {
    this.setData({ typeFilter: e.currentTarget.dataset.value })
    this.loadData()
  },

  showBookPicker: function() {
    var books = this.data.books
    var names = ['全部账本']
    books.forEach(function(b) { names.push(b.icon + ' ' + b.name) })
    names.push('取消')
    var self = this
    wx.showActionSheet({
      itemList: names,
      success: function(res) {
        if (res.tapIndex === 0) {
          self.setData({ bookId: '', book: null })
        } else if (res.tapIndex <= books.length) {
          var book = books[res.tapIndex - 1]
          self.setData({ bookId: book.id, book: book })
        }
        self.loadData()
      }
    })
  },

  getTopCategories: function() {
    var typeFilter = this.data.typeFilter
    if (!this.data.categoryStats) return []
    if (typeFilter === 'all') {
      var allList = []
      var types = ['expense', 'income', 'transfer']
      for (var t = 0; t < types.length; t++) {
        var stats = this.data.categoryStats[types[t]]
        if (!stats) continue
        for (var key in stats) {
          allList.push({
            id: key,
            type: types[t],
            name: bookManager.getCategoryName(types[t], key),
            icon: bookManager.getCategoryIcon(types[t], key),
            amount: stats[key].amount,
            count: stats[key].count
          })
        }
      }
      allList.sort(function(a, b) { return b.amount - a.amount })
      return allList.slice(0, 5)
    }
    var stats = this.data.categoryStats[typeFilter]
    if (!stats) return []
    var list = []
    for (var key in stats) {
      list.push({
        id: key,
        name: bookManager.getCategoryName(typeFilter, key),
        icon: bookManager.getCategoryIcon(typeFilter, key),
        amount: stats[key].amount,
        count: stats[key].count
      })
    }
    list.sort(function(a, b) { return b.amount - a.amount })
    return list.slice(0, 5)
  },

  getComparisonText: function(comparison) {
    if (!comparison) comparison = this.data.comparison
    if (!comparison) return ''
    var current = comparison.current
    var prev = comparison.prev
    if (prev.expense === 0) return '无上期数据'
    var diff = current.expense - prev.expense
    var percent = Math.abs(diff / prev.expense * 100).toFixed(1)
    if (diff > 0) return '比上期增加 ' + percent + '%'
    if (diff < 0) return '比上期减少 ' + percent + '%'
    return '与上期持平'
  },

  onDayTap: function(e) {
    var day = e.detail.day
    if (day && this.data.bookId) {
      wx.navigateTo({
        url: '/packageCreate/pages/create/book/detail/detail?bookId=' + this.data.bookId + '&date=' + this.data.currentMonth + '-' + String(day).padStart(2, '0')
      })
    }
  }
})
