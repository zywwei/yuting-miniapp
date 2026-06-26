var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    bookId: '',
    book: null,
    timeRange: 'month',
    timeRangeOptions: [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' }
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
    this.setData({
      bookId: options.bookId || '',
      currentMonth: today.substring(0, 7)
    })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var book = this.data.bookId ? bookManager.getBook(this.data.bookId) : null
    var stats = this.data.bookId ? bookManager.getBookStats(this.data.bookId, this.getTimeRange()) : bookManager.getOverviewStats()
    var categoryStats = this.data.bookId ? bookManager.getCategoryStats(this.data.bookId, this.getTimeRange()) : null
    var trendData = this.data.bookId ? bookManager.getTrendStats(this.data.bookId, this.data.timeRange) : null
    var comparison = this.data.bookId ? bookManager.getComparisonStats(this.data.bookId, this.data.timeRange) : null
    var calendarData = this.data.bookId ? bookManager.getCalendarData(this.data.bookId, this.data.currentMonth) : null
    this.setData({
      book: book,
      stats: stats,
      categoryStats: categoryStats,
      trendData: trendData,
      comparison: comparison,
      calendarData: calendarData
    })
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

  getTopCategories: function() {
    if (!this.data.categoryStats || !this.data.categoryStats.expense) return []
    var stats = this.data.categoryStats.expense
    var list = []
    for (var key in stats) {
      list.push({
        id: key,
        name: bookManager.getCategoryName('expense', key),
        icon: bookManager.getCategoryIcon('expense', key),
        amount: stats[key].amount,
        count: stats[key].count
      })
    }
    list.sort(function(a, b) { return b.amount - a.amount })
    return list.slice(0, 5)
  },

  getComparisonText: function() {
    if (!this.data.comparison) return ''
    var current = this.data.comparison.current
    var prev = this.data.comparison.prev
    if (prev.expense === 0) return '无上期数据'
    var diff = current.expense - prev.expense
    var percent = Math.abs(diff / prev.expense * 100).toFixed(1)
    if (diff > 0) return '比上期增加 ' + percent + '%'
    if (diff < 0) return '比上期减少 ' + percent + '%'
    return '与上期持平'
  }
})
