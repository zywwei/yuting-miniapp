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
    // C3：数据源收口到 modules-data（此前内置演示数据与详情页不同源）
    this.setData(listAdapter.loadList('social-geography'))
  },

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    var learnData = require('../../../utils/learn-data.js')
    learnData.markAsLearned('socialGeography', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/social/geography/detail/index?id=' + id
    })
  }
})
