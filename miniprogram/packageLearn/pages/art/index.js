var learnData = require('../../utils/learn-data.js')

Page({
  data: {
    modules: [
      { id: 'music', name: '音乐知识', icon: '🎵', desc: '音符、节拍、乐理', count: 50 },
      { id: 'painting', name: '美术鉴赏', icon: '🎨', desc: '色彩、构图、名画', count: 50 },
      { id: 'calligraphy', name: '书法练习', icon: '✒️', desc: '笔画、结构、字帖', count: 60 }
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
      music: learnData.getModuleProgress('artMusic'),
      painting: learnData.getModuleProgress('artPainting'),
      calligraphy: learnData.getModuleProgress('artCalligraphy')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/art/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
