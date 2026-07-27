var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'c01', title: '水的组成', category: 'substance', content: '水是由氢和氧两种元素组成的。化学式为H₂O。', examples: ['电解水产生氢气和氧气'] },
      { id: 'c02', title: '燃烧', category: 'reaction', content: '燃烧是可燃物与氧气发生的发光、放热的剧烈氧化反应。', examples: ['木材燃烧', '蜡烛燃烧'] },
      { id: 'c03', title: '金属', category: 'element', content: '金属具有导电性、导热性、延展性等特性。常见的金属有铁、铜、铝等。', examples: ['铜导线', '铝锅'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('scienceChemistry', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/science/chemistry/detail/index?id=' + id
    })
  }
})
