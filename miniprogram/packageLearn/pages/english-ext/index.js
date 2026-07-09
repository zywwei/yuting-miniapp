var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'grammar', name: '语法学习', icon: '📐', desc: '英语语法规则', count: 80 },
      { id: 'sentences', name: '句型练习', icon: '💬', desc: '常见句型', count: 80 },
      { id: 'reading', name: '阅读理解', icon: '📖', desc: '英语短文', count: 60 },
      { id: 'listening', name: '听力训练', icon: '🎧', desc: '英语听力', count: 75 }
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
      grammar: learnData.getModuleProgress('englishGrammar'),
      sentences: learnData.getModuleProgress('englishSentences'),
      reading: learnData.getModuleProgress('englishReading'),
      listening: learnData.getModuleProgress('englishListening')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/english-ext/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
