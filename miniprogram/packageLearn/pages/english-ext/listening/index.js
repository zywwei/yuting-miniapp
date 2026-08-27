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
    // C3：数据源收口到 modules-data（此前内置 10 条演示数据与详情页不同源，原页内答题交互一并收口为详情跳转）
    this.setData(listAdapter.loadList('english-listening'))
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/english-ext/listening/detail/index?id=' + id
    })
  }
})
