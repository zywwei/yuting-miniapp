var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'g01', title: '中国省份', content: '中国有34个省级行政区，包括23个省、5个自治区、4个直辖市、2个特别行政区。', examples: ['北京 - 直辖市', '广东 - 省', '西藏 - 自治区', '香港 - 特别行政区'] },
      { id: 'g02', title: '世界大洲', content: '地球上有七大洲：亚洲、非洲、北美洲、南美洲、南极洲、欧洲、大洋洲。', examples: ['亚洲面积最大', '大洋洲面积最小'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('socialGeography', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
