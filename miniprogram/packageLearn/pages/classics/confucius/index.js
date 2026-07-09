var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    quotes: [
      { id: 'cf01', source: '论语', quote: '学而时习之，不亦说乎？', meaning: '学习了知识然后按时温习，不是很愉快吗？', lesson: '强调复习的重要性' },
      { id: 'cf02', source: '论语', quote: '三人行，必有我师焉。', meaning: '几个人一起走路，其中必定有可以做我老师的人。', lesson: '要善于向他人学习' },
      { id: 'cf03', source: '孟子', quote: '老吾老以及人之老，幼吾幼以及人之幼。', meaning: '尊敬自己家的老人，也要尊敬别人家的老人；爱护自己家的孩子，也要爱护别人家的孩子。', lesson: '要有博爱精神' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('classicsConfucius', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
