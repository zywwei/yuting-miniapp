var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'c01', title: '基本笔画', content: '汉字基本笔画：横、竖、撇、捺、点、折。每个笔画都有起笔、行笔、收笔三个过程。', examples: ['横：从左到右', '竖：从上到下', '撇：从右上到左下'] },
      { id: 'c02', title: '间架结构', content: '字的结构分为独体字和合体字。合体字包括左右结构、上下结构、包围结构等。', examples: ['左右结构：明、林', '上下结构：花、草', '包围结构：国、回'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('artCalligraphy', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/art/calligraphy/detail/index?id=' + id
    })
  }
})
