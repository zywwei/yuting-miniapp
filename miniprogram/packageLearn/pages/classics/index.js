var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'gwd', name: '古文观止', icon: '📜', desc: '经典古文选段', count: 45 },
      { id: 'poetry-rules', name: '诗词格律', icon: '🎭', desc: '诗词创作规则', count: 40 },
      { id: 'idioms', name: '成语故事', icon: '📖', desc: '经典成语典故', count: 50 },
      { id: 'confucius', name: '论语孟子', icon: '🎓', desc: '儒家经典', count: 60 }
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
      gwd: learnData.getModuleProgress('classicsGwd'),
      'poetry-rules': learnData.getModuleProgress('classicsPoetryRules'),
      idioms: learnData.getModuleProgress('classicsIdioms'),
      confucius: learnData.getModuleProgress('classicsConfucius')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/classics/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
