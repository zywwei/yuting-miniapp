var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 's01', title: '交通安全', content: '过马路要走斑马线，红灯停绿灯行，不在马路上玩耍。', tips: ['走人行道', '看红绿灯', '不在路上跑'] },
      { id: 's02', title: '消防安全', content: '不玩火，发现火灾要拨打119，学会使用灭火器。', tips: ['不玩火柴', '记住119', '学会逃生'] },
      { id: 's03', title: '防溺水', content: '不在没有大人陪同下游泳，不去危险水域。', tips: ['不去野泳', '要有大人陪伴', '学会自救'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('lifeSafety', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/life/safety/detail/index?id=' + id
    })
  }
})
