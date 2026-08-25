var modulesData = require('../../utils/modules-data.js')

Page({
  data: {
    modules: [
      { id: 'experiments', name: '科学实验', icon: '🔬', desc: '动手实验', count: 0, module: 'science-experiments' },
      { id: 'physics', name: '物理常识', icon: '⚡', desc: '力、热、光、电', count: 0, module: 'science-physics' },
      { id: 'chemistry', name: '化学常识', icon: '🧪', desc: '元素、反应', count: 0, module: 'science-chemistry' },
      { id: 'biology', name: '生物常识', icon: '🌱', desc: '植物、动物', count: 0, module: 'science-biology' }
    ],
    progress: {}
  },

  onLoad: function() {
    // F6：题量从数据层真实取值
    var modules = this.data.modules.map(function(m) {
      m.count = modulesData.loadModuleData(m.module).totalCount
      return m
    })
    this.setData({ modules: modules })
    this.loadProgress()
  },

  onShow: function() {
    this.loadProgress()
  },

  loadProgress: function() {
    // 注意：modulesData.getModuleProgress 的入参是 MODULE_MAP 的连字符键，
    // 与 learnData 版本（按存储键驼峰取值）不同，混用会导致进度恒为 0
    var progress = {
      experiments: modulesData.getModuleProgress('science-experiments'),
      physics: modulesData.getModuleProgress('science-physics'),
      chemistry: modulesData.getModuleProgress('science-chemistry'),
      biology: modulesData.getModuleProgress('science-biology')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/science/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
