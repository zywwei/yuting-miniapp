var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    currentFilter: 'today',
    filteredTotal: 0,
    filteredCount: 0,
    groupedSales: []
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  setFilter: function(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.filter })
    this.loadData()
  },

  loadData: function() {
    var sales = stallManager.getSales()
    var filter = this.data.currentFilter
    var today = stallManager.getTodayStr()

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
      filtered = sales
    }

    var filteredTotal = filtered.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)

    // Build product lookup map for O(1) access
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
        groups[sale.date] = { date: sale.date, total: 0, sales: [] }
      }
      // Calculate profit for this sale
      var profit = 0
      for (var j = 0; j < sale.items.length; j++) {
        var item = sale.items[j]
        var product = productMap[item.productId]
        if (product) {
          profit += (item.unitPrice - product.costPrice) * item.quantity
        }
      }
      sale.profit = profit
      groups[sale.date].total += sale.total
      groups[sale.date].sales.push(sale)
    }

    var groupedSales = Object.keys(groups).sort().reverse().map(function(date) {
      return groups[date]
    })

    this.setData({
      filteredTotal: filteredTotal,
      filteredCount: filtered.length,
      groupedSales: groupedSales
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
  }
})
