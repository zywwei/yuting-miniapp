var bookManager = require('../../../../utils/book-manager.js')
var wxCharts = require('../../../../utils/wx-charts.js')

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
    memberList: [],
    selectedMembers: [],
    showMemberPicker: false,
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
    this.loadMemberList()
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
    var book = null
    if (this.data.bookId) {
      book = bookManager.getBook(this.data.bookId)
      if (!book) {
        wx.showToast({ title: '账本不存在', icon: 'none' })
        setTimeout(function() {
          wx.navigateBack()
        }, 1500)
        return
      }
    }
    var entries = this.getFilteredEntries()
    var allEntries = this.getFilteredEntries(true)
    var stats = this.calcStats(entries)
    var categoryStats = this.calcCategoryStats(entries)
    var trendData = this.data.bookId ? this.calcTrendStats(entries) : null
    var comparison = this.data.bookId ? this.calcComparisonStats(allEntries) : null
    var calendarData = this.data.bookId ? this.calcCalendarData(allEntries) : null
    var topCategories = this.getTopCategories(categoryStats)
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
    wx.nextTick(function() {
      self.drawCharts()
    })
  },

  calcStats: function(entries) {
    var today = bookManager.getTodayStr()
    var thisMonth = today.substring(0, 7)
    var totalIncome = 0, totalExpense = 0
    var todayIncome = 0, todayExpense = 0
    var monthIncome = 0, monthExpense = 0
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      if (e.type === 'income') {
        totalIncome += e.amount
        if (e.date === today) todayIncome += e.amount
        if (e.date.indexOf(thisMonth) === 0) monthIncome += e.amount
      } else if (e.type === 'expense') {
        totalExpense += e.amount
        if (e.date === today) todayExpense += e.amount
        if (e.date.indexOf(thisMonth) === 0) monthExpense += e.amount
      }
    }
    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      entryCount: entries.length,
      todayIncome: todayIncome,
      todayExpense: todayExpense,
      todayBalance: todayIncome - todayExpense,
      monthIncome: monthIncome,
      monthExpense: monthExpense,
      monthBalance: monthIncome - monthExpense
    }
  },

  calcCategoryStats: function(entries) {
    var stats = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      if (!stats[e.type]) stats[e.type] = {}
      if (!stats[e.type][e.category]) {
        stats[e.type][e.category] = { amount: 0, count: 0 }
      }
      stats[e.type][e.category].amount += e.amount
      stats[e.type][e.category].count++
    }
    return stats
  },

  calcTrendStats: function(entries) {
    var trend = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      var key = ''
      if (this.data.timeRange === 'day') key = e.date
      else if (this.data.timeRange === 'week') key = this.getWeekStart(e.date)
      else if (this.data.timeRange === 'month') key = e.date.substring(0, 7)
      else if (this.data.timeRange === 'year') key = e.date.substring(0, 4)
      if (!trend[key]) trend[key] = { income: 0, expense: 0 }
      if (e.type === 'income') trend[key].income += e.amount
      else if (e.type === 'expense') trend[key].expense += e.amount
    }
    return trend
  },

  calcComparisonStats: function(entries) {
    var today = new Date()
    var currentStart, currentEnd, prevStart, prevEnd
    if (this.data.timeRange === 'month') {
      currentStart = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01'
      currentEnd = bookManager.getTodayStr()
      var prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
      var prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
      prevStart = prevYear + '-' + String(prevMonth).padStart(2, '0') + '-01'
      var lastDay = new Date(prevYear, prevMonth, 0).getDate()
      prevEnd = prevYear + '-' + String(prevMonth).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0')
    } else if (this.data.timeRange === 'week') {
      currentStart = this.getWeekStart(bookManager.getTodayStr())
      currentEnd = bookManager.getTodayStr()
      var prevWeekStart = new Date(currentStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      prevStart = bookManager.formatLocalDate(prevWeekStart)
      var prevWeekEnd = new Date(currentStart)
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
      prevEnd = bookManager.formatLocalDate(prevWeekEnd)
    } else if (this.data.timeRange === 'year') {
      currentStart = today.getFullYear() + '-01-01'
      currentEnd = bookManager.getTodayStr()
      prevStart = (today.getFullYear() - 1) + '-01-01'
      prevEnd = (today.getFullYear() - 1) + '-12-31'
    }
    var current = { income: 0, expense: 0 }
    var prev = { income: 0, expense: 0 }
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      if (e.date >= currentStart && e.date <= currentEnd) {
        if (e.type === 'income') current.income += e.amount
        else if (e.type === 'expense') current.expense += e.amount
      } else if (e.date >= prevStart && e.date <= prevEnd) {
        if (e.type === 'income') prev.income += e.amount
        else if (e.type === 'expense') prev.expense += e.amount
      }
    }
    return { current: current, prev: prev }
  },

  calcCalendarData: function(entries) {
    var calendar = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      if (e.date.indexOf(this.data.currentMonth) === 0) {
        if (!calendar[e.date]) calendar[e.date] = { income: 0, expense: 0, count: 0 }
        if (e.type === 'income') calendar[e.date].income += e.amount
        else if (e.type === 'expense') calendar[e.date].expense += e.amount
        calendar[e.date].count++
      }
    }
    return calendar
  },

  getWeekStart: function(dateStr) {
    var d = new Date(dateStr)
    var day = d.getDay()
    var diff = d.getDate() - day + (day === 0 ? -6 : 1)
    var start = new Date(d.setDate(diff))
    return start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0')
  },

  getMemberStats: function() {
    if (!this.data.bookId) return null
    var entries = this.getFilteredEntries()
    var stats = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      var memberId = e.createdByMemberId || 'unknown'
      var memberName = e.createdByName || '未知'
      if (!stats[memberId]) {
        stats[memberId] = { id: memberId, name: memberName, income: 0, expense: 0, count: 0 }
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

  loadMemberList: function() {
    if (!this.data.bookId) return
    var entries = bookManager.getEntries(this.data.bookId)
    var memberMap = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      var memberId = e.createdByMemberId || 'unknown'
      var memberName = e.createdByName || '未知'
      if (!memberMap[memberId]) {
        memberMap[memberId] = { id: memberId, name: memberName }
      }
    }
    var memberList = []
    for (var key in memberMap) {
      memberList.push(memberMap[key])
    }
    memberList.sort(function(a, b) { return a.name.localeCompare(b.name) })
    this.setData({ memberList: memberList })
  },

  getFilteredEntries: function(ignoreTimeRange) {
    var timeRange = ignoreTimeRange ? null : this.getTimeRange()
    var entries = bookManager.getEntries(this.data.bookId, timeRange)
    if (this.data.selectedMembers.length > 0) {
      var selectedSet = {}
      this.data.selectedMembers.forEach(function(id) { selectedSet[id] = true })
      entries = entries.filter(function(e) {
        var memberId = e.createdByMemberId || 'unknown'
        return selectedSet[memberId]
      })
    }
    return entries
  },

  toggleMemberPicker: function() {
    this.setData({ showMemberPicker: !this.data.showMemberPicker })
  },

  toggleMember: function(e) {
    var memberId = e.currentTarget.dataset.id
    var selectedMembers = this.data.selectedMembers.slice()
    var index = selectedMembers.indexOf(memberId)
    if (index >= 0) {
      selectedMembers.splice(index, 1)
    } else {
      selectedMembers.push(memberId)
    }
    this.setData({ selectedMembers: selectedMembers })
  },

  selectAllMembers: function() {
    var allIds = this.data.memberList.map(function(m) { return m.id })
    this.setData({ selectedMembers: allIds })
  },

  clearMemberSelection: function() {
    this.setData({ selectedMembers: [] })
  },

  confirmMemberSelection: function() {
    this.setData({ showMemberPicker: false })
    this.loadData()
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
      var start = new Date(d.getFullYear(), d.getMonth(), diff)
      return {
        startDate: bookManager.formatLocalDate(start),
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
          self.setData({ bookId: '', book: null, selectedMembers: [], showMemberPicker: false })
        } else if (res.tapIndex <= books.length) {
          var book = books[res.tapIndex - 1]
          self.setData({ bookId: book.id, book: book, selectedMembers: [], showMemberPicker: false })
        }
        self.loadMemberList()
        self.loadData()
      }
    })
  },

  getTopCategories: function(categoryStats) {
    var typeFilter = this.data.typeFilter
    var statsData = categoryStats || this.data.categoryStats
    if (!statsData) return []
    if (typeFilter === 'all') {
      var allList = []
      var types = ['expense', 'income', 'transfer']
      for (var t = 0; t < types.length; t++) {
        var typeStats = statsData[types[t]]
        if (!typeStats) continue
        for (var key in typeStats) {
          allList.push({
            id: key,
            type: types[t],
            name: bookManager.getCategoryName(types[t], key),
            icon: bookManager.getCategoryIcon(types[t], key),
            amount: typeStats[key].amount,
            count: typeStats[key].count
          })
        }
      }
      allList.sort(function(a, b) { return b.amount - a.amount })
      return allList.slice(0, 5)
    }
    var filteredStats = statsData[typeFilter]
    if (!filteredStats) return []
    var list = []
    for (var key in filteredStats) {
      list.push({
        id: key,
        name: bookManager.getCategoryName(typeFilter, key),
        icon: bookManager.getCategoryIcon(typeFilter, key),
        amount: filteredStats[key].amount,
        count: filteredStats[key].count
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
