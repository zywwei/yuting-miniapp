var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'p01', title: '国旗国徽', content: '中华人民共和国国旗是五星红旗，国徽中间是五星照耀下的天安门。', meaning: '象征国家主权和尊严' },
      { id: 'p02', title: '公民权利', content: '公民有受教育的权利、言论自由的权利、人身自由的权利等。', meaning: '宪法赋予公民的基本权利' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('socialPolitics', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/social/politics/detail/index?id=' + id
    })
  }
})
