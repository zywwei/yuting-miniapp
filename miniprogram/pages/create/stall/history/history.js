var stallManager = require('../../../../utils/stall-manager.js')
var stallUtils = require('../../../../utils/stall-utils.js')

Page({
  data: {
    activeTab: 'orders',
    // 订单相关
    currentFilter: 'today',
    filteredTotal: 0,
    filteredCount: 0,
    filteredProfit: 0,
    groupedSales: [],
    searchKeyword: '',
    startDate: '',
    endDate: '',
    // 订单分页
    ordersPage: 1,
    ordersPageSize: 20,
    ordersHasMore: true,
    ordersLoading: false,
    // 营业时长相关
    hoursFilter: 'today',
    hoursStartDate: '',
    hoursEndDate: '',
    groupedHours: [],
    hoursTotalDuration: '0分钟',
    hoursTotalCount: 0,
    hoursAvgDuration: '0分钟',
    // 营业时长分页
    hoursPage: 1,
    hoursPageSize: 20,
    hoursHasMore: true,
    hoursLoading: false
  },

  onLoad: function() {
    stallUtils.setThemeColor()
  },

  onShow: function() {
    this.loadData()
  },

  onUnload: function() {
    if (this._searchTimer) {
      clearTimeout(this._searchTimer)
      this._searchTimer = null
    }
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.loadData()
  },

  // 订单相关函数
  setFilter: function(e) {
    this.setData({
      currentFilter: e.currentTarget.dataset.filter,
      startDate: '',
      endDate: '',
      ordersPage: 1,
      ordersHasMore: true
    })
    this.loadData()
  },

  onSearchInput: function(e) {
    var that = this
    this.setData({ searchKeyword: e.detail.value })
    // 防抖处理
    if (this._searchTimer) {
      clearTimeout(this._searchTimer)
    }
    this._searchTimer = setTimeout(function() {
      that.setData({ ordersPage: 1, ordersHasMore: true })
      that.loadData()
    }, 300)
  },

  onStartDateChange: function(e) {
    this.setData({
      startDate: e.detail.value,
      currentFilter: 'custom',
      ordersPage: 1,
      ordersHasMore: true
    })
    this.loadData()
  },

  onEndDateChange: function(e) {
    this.setData({
      endDate: e.detail.value,
      currentFilter: 'custom',
      ordersPage: 1,
      ordersHasMore: true
    })
    this.loadData()
  },

  clearDateRange: function() {
    this.setData({
      startDate: '',
      endDate: '',
      currentFilter: 'today',
      ordersPage: 1,
      ordersHasMore: true
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
    if (this.data.activeTab === 'orders') {
      this.loadOrdersData()
    } else {
      this.loadHoursData()
    }
  },

  loadOrdersData: function() {
    var that = this
    this.setData({ ordersLoading: true })

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
      var weekStart = stallUtils.getWeekStart()
      var weekStartStr = stallUtils.formatDate(weekStart)
      filtered = sales.filter(function(s) { return s.date >= weekStartStr })
    } else if (filter === 'month') {
      var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      var monthStartStr = stallUtils.formatDate(monthStart)
      filtered = sales.filter(function(s) { return s.date >= monthStartStr })
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

    // 按时间倒序排列
    filtered.sort(function(a, b) {
      var timeA = a.date + ' ' + (a.time || '00:00')
      var timeB = b.date + ' ' + (b.time || '00:00')
      return timeB.localeCompare(timeA)
    })

    // 计算总金额和利润
    for (var i = 0; i < filtered.length; i++) {
      var sale = filtered[i]
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
      filteredTotal += sale.total
      filteredProfit += sale.profit
    }

    // 分页处理
    var page = this.data.ordersPage
    var pageSize = this.data.ordersPageSize
    var startIndex = (page - 1) * pageSize
    var endIndex = page * pageSize
    var pagedSales = filtered.slice(startIndex, endIndex)
    var hasMore = endIndex < filtered.length

    // 缓存全量 filtered 数据供 loadMoreOrders 增量使用
    this._cachedFilteredSales = filtered

    // Group by date
    var groups = {}
    for (var i = 0; i < pagedSales.length; i++) {
      var sale = pagedSales[i]
      if (!groups[sale.date]) {
        groups[sale.date] = { date: sale.date, total: 0, profit: 0, count: 0, sales: [] }
      }
      groups[sale.date].total += sale.total
      groups[sale.date].profit += sale.profit
      groups[sale.date].count++
      groups[sale.date].sales.push(sale)
    }

    var groupedSales = Object.keys(groups).sort().reverse().map(function(date) {
      return groups[date]
    })

    this.setData({
      filteredTotal: Math.round(filteredTotal * 100) / 100,
      filteredCount: filtered.length,
      filteredProfit: Math.round(filteredProfit * 100) / 100,
      groupedSales: groupedSales,
      ordersHasMore: hasMore,
      ordersLoading: false
    })
  },

  loadMoreOrders: function() {
    if (this.data.ordersLoading || !this.data.ordersHasMore) return
    var nextPage = this.data.ordersPage + 1
    this.setData({ ordersPage: nextPage })

    // 增量计算：只计算新增页的数据，与现有 groupedSales 合并
    var cachedFiltered = this._cachedFilteredSales
    if (!cachedFiltered) {
      // 无缓存时 fallback 到全量重算
      this.loadOrdersData()
      return
    }

    var pageSize = this.data.ordersPageSize
    var startIndex = (nextPage - 1) * pageSize
    var endIndex = nextPage * pageSize
    var pagedSales = cachedFiltered.slice(startIndex, endIndex)
    var hasMore = endIndex < cachedFiltered.length

    // 构建 product lookup
    var products = stallManager.getProducts()
    var productMap = {}
    for (var p = 0; p < products.length; p++) {
      productMap[products[p].id] = products[p]
    }

    // 计算新增页的利润并分组
    var newGroups = {}
    for (var i = 0; i < pagedSales.length; i++) {
      var sale = pagedSales[i]
      sale.discount = sale.discount || 10
      sale.originalTotal = sale.originalTotal || sale.total
      sale.discountAmount = sale.discountAmount || 0
      sale.expanded = false

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

      if (!newGroups[sale.date]) {
        newGroups[sale.date] = { date: sale.date, total: 0, profit: 0, count: 0, sales: [] }
      }
      newGroups[sale.date].total += sale.total
      newGroups[sale.date].profit += sale.profit
      newGroups[sale.date].count++
      newGroups[sale.date].sales.push(sale)
    }

    // 与现有 groupedSales 合并（同日期的追加到已有 group）
    var existingGroups = this.data.groupedSales || []
    var mergedMap = {}
    for (var i = 0; i < existingGroups.length; i++) {
      mergedMap[existingGroups[i].date] = {
        date: existingGroups[i].date,
        total: existingGroups[i].total,
        profit: existingGroups[i].profit,
        count: existingGroups[i].count,
        sales: existingGroups[i].sales.slice()
      }
    }
    for (var date in newGroups) {
      if (mergedMap[date]) {
        mergedMap[date].total += newGroups[date].total
        mergedMap[date].profit += newGroups[date].profit
        mergedMap[date].count += newGroups[date].count
        mergedMap[date].sales = mergedMap[date].sales.concat(newGroups[date].sales)
      } else {
        mergedMap[date] = newGroups[date]
      }
    }

    var groupedSales = Object.keys(mergedMap).sort().reverse().map(function(date) {
      return mergedMap[date]
    })

    this.setData({
      groupedSales: groupedSales,
      ordersHasMore: hasMore,
      ordersLoading: false
    })
  },

  // 营业时长相关函数
  setHoursFilter: function(e) {
    this.setData({
      hoursFilter: e.currentTarget.dataset.filter,
      hoursStartDate: '',
      hoursEndDate: '',
      hoursPage: 1,
      hoursHasMore: true
    })
    this.loadHoursData()
  },

  onHoursStartDateChange: function(e) {
    this.setData({
      hoursStartDate: e.detail.value,
      hoursFilter: 'custom',
      hoursPage: 1,
      hoursHasMore: true
    })
    this.loadHoursData()
  },

  onHoursEndDateChange: function(e) {
    this.setData({
      hoursEndDate: e.detail.value,
      hoursFilter: 'custom',
      hoursPage: 1,
      hoursHasMore: true
    })
    this.loadHoursData()
  },

  clearHoursDateRange: function() {
    this.setData({
      hoursStartDate: '',
      hoursEndDate: '',
      hoursFilter: 'today',
      hoursPage: 1,
      hoursHasMore: true
    })
    this.loadHoursData()
  },

  loadHoursData: function() {
    var that = this
    this.setData({ hoursLoading: true })

    var businessHours = stallManager.getBusinessHours()
    var filter = this.data.hoursFilter
    var today = stallManager.getTodayStr()
    var startDate = this.data.hoursStartDate
    var endDate = this.data.hoursEndDate

    // 筛选
    var filtered = []
    if (filter === 'today') {
      filtered = businessHours.filter(function(h) { return h.date === today })
    } else if (filter === 'week') {
      var weekStart = stallUtils.getWeekStart()
      var weekStartStr = stallUtils.formatDate(weekStart)
      filtered = businessHours.filter(function(h) { return h.date >= weekStartStr })
    } else if (filter === 'month') {
      var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      var monthStartStr = stallUtils.formatDate(monthStart)
      filtered = businessHours.filter(function(h) { return h.date >= monthStartStr })
    } else {
      filtered = businessHours.slice()
    }

    // 自定义日期范围覆盖
    if (startDate) {
      filtered = filtered.filter(function(h) { return h.date >= startDate })
    }
    if (endDate) {
      filtered = filtered.filter(function(h) { return h.date <= endDate })
    }

    // 按时间倒序排列
    filtered.sort(function(a, b) {
      return b.date.localeCompare(a.date)
    })

    // 展开为单次营业记录
    var allSessions = []
    for (var i = 0; i < filtered.length; i++) {
      var day = filtered[i]
      for (var j = 0; j < day.sessions.length; j++) {
        var session = day.sessions[j]
        allSessions.push({
          date: day.date,
          openTime: session.openTime,
          closeTime: session.closeTime,
          duration: session.duration || 0,
          openTimeStr: stallUtils.formatTime(new Date(session.openTime)),
          closeTimeStr: session.closeTime ? stallUtils.formatTime(new Date(session.closeTime)) : '',
          durationText: stallUtils.formatDuration(session.duration || 0)
        })
      }
    }

    // 计算汇总
    var totalDuration = 0
    for (var i = 0; i < allSessions.length; i++) {
      totalDuration += allSessions[i].duration
    }
    var totalCount = allSessions.length
    var avgDuration = totalCount > 0 ? Math.round(totalDuration / totalCount) : 0

    // 分页处理
    var page = this.data.hoursPage
    var pageSize = this.data.hoursPageSize
    var startIndex = (page - 1) * pageSize
    var endIndex = page * pageSize
    var pagedSessions = allSessions.slice(startIndex, endIndex)
    var hasMore = endIndex < allSessions.length

    // Group by date
    var groups = {}
    for (var i = 0; i < pagedSessions.length; i++) {
      var session = pagedSessions[i]
      if (!groups[session.date]) {
        groups[session.date] = { date: session.date, count: 0, totalDuration: 0, sessions: [] }
      }
      groups[session.date].count++
      groups[session.date].totalDuration += session.duration
      groups[session.date].sessions.push(session)
    }

    var groupedHours = Object.keys(groups).sort().reverse().map(function(date) {
      var group = groups[date]
      group.totalDurationText = that.formatDuration(group.totalDuration)
      return group
    })

    this.setData({
      groupedHours: groupedHours,
      hoursTotalDuration: that.formatDuration(totalDuration),
      hoursTotalCount: totalCount,
      hoursAvgDuration: that.formatDuration(avgDuration),
      hoursHasMore: hasMore,
      hoursLoading: false
    })
  },

  loadMoreHours: function() {
    if (this.data.hoursLoading || !this.data.hoursHasMore) return
    this.setData({ hoursPage: this.data.hoursPage + 1 })
    this.loadHoursData()
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
  }
})
