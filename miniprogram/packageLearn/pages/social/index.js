var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'geography', name: '地理知识', icon: '🌍', desc: '中国地理、世界地理', count: 50 },
      { id: 'history', name: '历史常识', icon: '📖', desc: '中国古代史、近现代史', count: 50 },
      { id: 'politics', name: '政治常识', icon: '🏛️', desc: '国家制度、公民权利', count: 35 }
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
      geography: learnData.getModuleProgress('socialGeography'),
      history: learnData.getModuleProgress('socialHistory'),
      politics: learnData.getModuleProgress('socialPolitics')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/social/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
