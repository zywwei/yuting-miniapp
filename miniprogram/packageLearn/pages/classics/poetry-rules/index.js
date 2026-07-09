var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    rules: [
      { id: 'pr01', title: '五言绝句', structure: '四句，每句五字', example: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', rules: ['第一句可押韵可不押韵', '第二、四句必须押韵', '第三句不押韵'] },
      { id: 'pr02', title: '七言绝句', structure: '四句，每句七字', example: '两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。', rules: ['第一句可押韵可不押韵', '第二、四句必须押韵', '第三句不押韵'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('classicsPoetryRules', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
