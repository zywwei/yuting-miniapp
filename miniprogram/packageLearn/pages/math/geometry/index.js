var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'g01', title: '三角形内角和', content: '三角形三个内角的和等于180°', example: '已知三角形两个角分别是60°和80°，求第三个角。答案：180° - 60° - 80° = 40°' },
      { id: 'g02', title: '长方形面积', content: '长方形的面积 = 长 × 宽', example: '长5厘米，宽3厘米的长方形，面积 = 5 × 3 = 15平方厘米' },
      { id: 'g03', title: '圆的周长', content: '圆的周长 = 2 × π × 半径', example: '半径5厘米的圆，周长 = 2 × 3.14 × 5 = 31.4厘米' },
      { id: 'g04', title: '圆的面积', content: '圆的面积 = π × 半径 × 半径', example: '半径5厘米的圆，面积 = 3.14 × 5 × 5 = 78.5平方厘米' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('mathGeometry', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/geometry/detail/index?id=' + id
    })
  }
})
