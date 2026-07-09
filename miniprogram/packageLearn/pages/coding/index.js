var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'thinking', name: '编程思维', icon: '🧠', desc: '计算思维基础', count: 40 },
      { id: 'logic', name: '逻辑训练', icon: '🔗', desc: '逻辑推理', count: 60 },
      { id: 'algorithm', name: '算法基础', icon: '📊', desc: '常见算法', count: 30 },
      { id: 'scratch', name: 'Scratch入门', icon: '🎮', desc: '图形化编程', count: 50 }
    ],
    progress: {}
  },

  onLoad: function() {
    this.loadProgress()
  },

  onShow: function() {
    this.loadProgress()
  },

  loadProgress: function() {
    var progress = {
      thinking: learnData.getModuleProgress('codingThinking'),
      logic: learnData.getModuleProgress('codingLogic'),
      algorithm: learnData.getModuleProgress('codingAlgorithm'),
      scratch: learnData.getModuleProgress('codingScratch')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/coding/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
