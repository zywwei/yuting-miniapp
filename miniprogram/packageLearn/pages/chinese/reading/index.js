var listAdapter = require('../../../utils/list-adapter.js')

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
    // C3：数据源收口到 modules-data（此前内置 3 条演示数据与详情页不同源）
    this.setData(listAdapter.loadList('chinese-reading'))
  },

  markAsCompleted: function(e) {
    var articleId = e.currentTarget.dataset.id
    var learnData = require('../../../utils/learn-data.js')
    learnData.markAsLearned('chineseReading', articleId)
    wx.showToast({ title: '已完成', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/chinese/reading/detail/index?id=' + id
    })
  }
})
