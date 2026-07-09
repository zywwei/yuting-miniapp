var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    sports: [
      { id: 'sk01', name: '足球', rules: '两队各11人，用脚踢球射门，得分多者胜。', skills: ['传球', '射门', '盘带', '头球'] },
      { id: 'sk02', name: '篮球', rules: '两队各5人，投篮得分，三分线内2分，三分线外3分。', skills: ['运球', '传球', '投篮', '防守'] },
      { id: 'sk03', name: '乒乓球', rules: '两人对打，球落在对方台面得分，先得11分者胜。', skills: ['发球', '正手', '反手', '步法'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('sportsKnowledge', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
