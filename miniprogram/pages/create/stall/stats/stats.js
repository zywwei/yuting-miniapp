var stallManager = require('../../../utils/stall-manager.js')

Page({
  data: {
    stats: {},
    avgOrder: '¥0'
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var stats = stallManager.getStats()

    // Calculate average order value
    var avgOrder = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0

    // Calculate percentages for top products
    var maxRevenue = 0
    for (var i = 0; i < stats.topProducts.length; i++) {
      if (stats.topProducts[i].revenue > maxRevenue) {
        maxRevenue = stats.topProducts[i].revenue
      }
    }
    for (var i = 0; i < stats.topProducts.length; i++) {
      stats.topProducts[i].percent = maxRevenue > 0 ? Math.round(stats.topProducts[i].revenue / maxRevenue * 100) : 0
    }

    this.setData({
      stats: stats,
      avgOrder: '¥' + avgOrder
    })
  }
})
