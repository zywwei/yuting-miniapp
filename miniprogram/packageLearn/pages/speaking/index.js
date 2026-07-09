var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'scenarios', name: '情景对话', icon: '💬', desc: '日常对话场景', count: 60 },
      { id: 'practice', name: '口语练习', icon: '🎤', desc: '跟读、描述、讨论', count: 50 },
      { id: 'speech', name: '英语演讲', icon: '📢', desc: '自我介绍、主题演讲', count: 25 }
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
      scenarios: learnData.getModuleProgress('speakingScenarios'),
      practice: learnData.getModuleProgress('speakingPractice'),
      speech: learnData.getModuleProgress('speakingSpeech')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/speaking/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
