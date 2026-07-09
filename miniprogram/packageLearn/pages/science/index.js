var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'experiments', name: '科学实验', icon: '🔬', desc: '动手实验', count: 50 },
      { id: 'physics', name: '物理常识', icon: '⚡', desc: '力、热、光、电', count: 50 },
      { id: 'chemistry', name: '化学常识', icon: '🧪', desc: '元素、反应', count: 50 },
      { id: 'biology', name: '生物常识', icon: '🌱', desc: '植物、动物', count: 50 }
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
      experiments: learnData.getModuleProgress('scienceExperiments'),
      physics: learnData.getModuleProgress('sciencePhysics'),
      chemistry: learnData.getModuleProgress('scienceChemistry'),
      biology: learnData.getModuleProgress('scienceBiology')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/science/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
