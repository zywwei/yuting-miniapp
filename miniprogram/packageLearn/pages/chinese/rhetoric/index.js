var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    rhetoric: [
      { id: 'rh01', name: '比喻', icon: '🔗', desc: '用相似的事物来描写', example: '月亮像弯弯的小船', meaning: '把月亮比作小船，形象地写出月亮的形状' },
      { id: 'rh02', name: '拟人', icon: '🧑', desc: '把事物当作人来写', example: '春风轻轻地抚摸着大地', meaning: '把春风当作人，赋予它抚摸的动作' },
      { id: 'rh03', name: '排比', icon: '📋', desc: '用相同句式重复', example: '心灵是一方广袤的天空，心灵是一片宁静的湖水，心灵是一块皑皑的雪原', meaning: '用三个相同句式强调心灵的宽广' },
      { id: 'rh04', name: '夸张', icon: '📏', desc: '故意夸大或缩小', example: '飞流直下三千尺', meaning: '用三千尺夸张地描写瀑布的高度' },
      { id: 'rh05', name: '反问', icon: '❓', desc: '用疑问表达确定意思', example: '难道我们能浪费时间吗？', meaning: '意思是不能浪费时间' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('chineseRhetoric', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/chinese/rhetoric/detail/index?id=' + id
    })
  }
})
