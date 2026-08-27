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
    // C3：数据源收口到 modules-data（此前内置 4 条演示数据与详情页不同源）
    this.setData(listAdapter.loadList('math-geometry'))
  },

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    var learnData = require('../../../utils/learn-data.js')
    learnData.markAsLearned('mathGeometry', id)
    // M 修复：重载列表刷新「✓ 已学」标记，否则需退出页面才能看到
    this.setData(listAdapter.loadList('math-geometry'))
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/geometry/detail/index?id=' + id
    })
  }
})
