var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'p01', title: '力的概念', category: 'mechanics', content: '力是物体对物体的作用。力可以改变物体的运动状态，也可以改变物体的形状。', examples: ['推门', '拉弹簧', '踢足球'] },
      { id: 'p02', title: '重力', category: 'mechanics', content: '地球对物体的吸引力叫做重力。重力的方向总是竖直向下的。', examples: ['苹果落地', '水往低处流'] },
      { id: 'p03', title: '光的传播', category: 'optics', content: '光在同一种均匀介质中沿直线传播。光在真空中的速度约为3×10⁸米/秒。', examples: ['影子的形成', '日食月食'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('sciencePhysics', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
