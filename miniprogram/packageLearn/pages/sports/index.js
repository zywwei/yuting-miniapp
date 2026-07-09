var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'knowledge', name: '体育知识', icon: '⚽', desc: '球类、田径、水上运动', count: 50 },
      { id: 'health', name: '健康常识', icon: '🏥', desc: '饮食、作息、卫生', count: 50 },
      { id: 'skills', name: '运动技能', icon: '🏃', desc: '跑步、跳绳、球类', count: 45 }
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
      knowledge: learnData.getModuleProgress('sportsKnowledge'),
      health: learnData.getModuleProgress('sportsHealth'),
      skills: learnData.getModuleProgress('sportsSkills')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/sports/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
