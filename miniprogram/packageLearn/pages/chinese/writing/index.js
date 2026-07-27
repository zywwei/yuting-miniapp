var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'w01', title: '我的妈妈', desc: '描写妈妈的外貌、性格和爱', grade: '3', type: 'narrative' },
      { id: 'w02', title: '快乐的一天', desc: '记录一天中最快乐的事', grade: '3', type: 'narrative' },
      { id: 'w03', title: '我的好朋友', desc: '介绍好朋友的特点和你们的故事', grade: '3', type: 'narrative' },
      { id: 'w04', title: '美丽的春天', desc: '描写春天的景色和感受', grade: '4', type: 'descriptive' },
      { id: 'w05', title: '我的梦想', desc: '描述你的梦想和为什么有这样的梦想', grade: '4', type: 'narrative' }
    ],
    tips: [
      { id: 't01', title: '如何写好开头', content: '开头要吸引读者，可以用提问、描写场景或引用名言的方式。' },
      { id: 't02', title: '如何写好结尾', content: '结尾要总结全文，可以呼应开头、表达感悟或留下思考。' },
      { id: 't03', title: '如何描写人物', content: '从外貌、语言、动作、心理四个方面来描写人物。' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('chineseWriting', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/chinese/writing/detail/index?id=' + id
    })
  }
})
