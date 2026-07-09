var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'h01', title: '四大发明', dynasty: '古代', content: '中国古代四大发明：造纸术、印刷术、火药、指南针。这些发明对世界文明产生了深远影响。', significance: '推动了世界文明的发展' },
      { id: 'h02', title: '丝绸之路', dynasty: '汉朝', content: '丝绸之路是古代连接中国与西方的贸易路线，促进了东西方文化和经济交流。', significance: '促进了东西方文明交流' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('socialHistory', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
