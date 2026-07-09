var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'p01', title: '三原色', content: '红、黄、蓝是三原色，通过混合可以得到其他颜色。', examples: ['红+黄=橙', '黄+蓝=绿', '红+蓝=紫'] },
      { id: 'p02', title: '构图技巧', content: '构图是安排画面元素的方式。常见构图：对称构图、三分法、引导线构图。', examples: ['对称构图：左右对称', '三分法：将画面分成9格'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('artPainting', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
