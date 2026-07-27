var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    projects: [
      { id: 's01', title: '移动的小猫', desc: '让小猫角色左右移动', difficulty: 1, blocks: ['当绿旗被点击', '移动10步', '如果碰到边缘就反弹'] },
      { id: 's02', title: '跳舞的小猫', desc: '让小猫跟着音乐跳舞', difficulty: 2, blocks: ['当绿旗被点击', '重复执行', '下一个造型', '等待0.5秒'] },
      { id: 's03', title: '接球游戏', desc: '用挡板接住下落的球', difficulty: 3, blocks: ['当绿旗被点击', '重复执行', '如果按下左箭头', '移到x:-100'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('codingScratch', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/coding/scratch/detail/index?id=' + id
    })
  }
})
