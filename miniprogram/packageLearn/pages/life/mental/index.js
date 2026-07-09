var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'm01', title: '情绪管理', content: '学会识别和表达自己的情绪，用正确的方式处理负面情绪。', tips: ['说出自己的感受', '深呼吸放松', '找人倾诉'] },
      { id: 'm02', title: '人际交往', content: '学会与人友好相处，尊重他人，乐于助人。', tips: ['主动打招呼', '学会分享', '帮助他人'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('lifeMental', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
