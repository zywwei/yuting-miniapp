var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    problems: [
      { id: 'o01', title: '鸡兔同笼', question: '笼子里有鸡和兔共10只，数脚共有28只，问鸡和兔各有几只？', answer: '鸡6只，兔4只', solution: '假设全是鸡：10×2=20只脚，差28-20=8只脚，每只兔比鸡多2只脚，所以兔有8÷2=4只，鸡有10-4=6只。' },
      { id: 'o02', title: '年龄问题', question: '小明今年8岁，爸爸今年36岁，几年后爸爸的年龄是小明的3倍？', answer: '6年后', solution: '设x年后：36+x=3(8+x)，解得x=6。' },
      { id: 'o03', title: '植树问题', question: '一条路长100米，每隔5米种一棵树，两端都要种，一共要种多少棵？', answer: '21棵', solution: '100÷5=20个间隔，两端都种所以加1，共21棵。' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('mathOlympiad', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/olympiad/detail/index?id=' + id
    })
  }
})
