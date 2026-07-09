var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'safety', name: '安全教育', icon: '🛡️', desc: '交通、消防、防溺水', count: 50 },
      { id: 'mental', name: '心理健康', icon: '🧠', desc: '情绪管理、人际交往', count: 40 },
      { id: 'skills', name: '生活技能', icon: '🏠', desc: '家务、整理、时间管理', count: 45 }
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
      safety: learnData.getModuleProgress('lifeSafety'),
      mental: learnData.getModuleProgress('lifeMental'),
      skills: learnData.getModuleProgress('lifeSkills')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/life/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
