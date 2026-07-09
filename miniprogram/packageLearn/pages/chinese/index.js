var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'reading', name: '阅读理解', icon: '📖', desc: '文章阅读与答题', count: 80 },
      { id: 'writing', name: '写作指导', icon: '✍️', desc: '写作技巧与练习', count: 75 },
      { id: 'rhetoric', name: '修辞手法', icon: '🎭', desc: '常见修辞学习', count: 60 },
      { id: 'classical', name: '文言文', icon: '📜', desc: '古文阅读与理解', count: 100 }
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
      reading: learnData.getModuleProgress('chineseReading'),
      writing: learnData.getModuleProgress('chineseWriting'),
      rhetoric: learnData.getModuleProgress('chineseRhetoric'),
      classical: learnData.getModuleProgress('chineseClassical')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/chinese/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
