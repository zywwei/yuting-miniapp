var classicsData = require('../../../utils/classics-data.js')

Page({
  data: {
    items: [],
    learnedCount: 0,
    totalCount: 0
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var result = classicsData.loadGwdArticles()
    this.setData({
      items: result.items,
      learnedCount: result.learnedCount,
      totalCount: result.totalCount
    })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/classics/gwd/detail/index?id=' + id
    })
  }
})
