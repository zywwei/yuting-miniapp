var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'ct01', title: '分解问题', desc: '把大问题拆成小问题', example: '做早餐 = 煮鸡蛋 + 烤面包 + 倒牛奶', steps: ['识别大问题', '拆分成小任务', '逐个解决小任务', '合并结果'] },
      { id: 'ct02', title: '模式识别', desc: '发现规律和重复', example: '1,2,3,4,5... 每次加1', steps: ['观察数据', '寻找重复', '总结规律', '预测下一个'] },
      { id: 'ct03', title: '抽象思维', desc: '提取关键信息', example: '苹果、香蕉、橙子 → 水果', steps: ['列出所有信息', '找出共同点', '忽略不重要的', '形成概念'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('codingThinking', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
