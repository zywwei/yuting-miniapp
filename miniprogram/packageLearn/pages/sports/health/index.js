var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'h01', title: '均衡饮食', content: '每天要吃谷物、蔬菜、水果、肉类、奶类等，保证营养均衡。', tips: ['多吃蔬菜水果', '少吃零食', '按时吃饭'] },
      { id: 'h02', title: '充足睡眠', content: '小学生每天需要9-10小时睡眠，早睡早起身体好。', tips: ['晚上9点前睡觉', '睡前不玩手机', '保持规律作息'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('sportsHealth', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
