var childStorage = require('/utils/child-storage.js')

Page({
  data: {
    works: [
      { type: 'free', name: '自由画画', icon: '✏️', desc: '想画什么就画什么', url: '/packageCreate/pages/create/draw/draw?mode=free' },
      { type: 'template', name: '涂色模板', icon: '🖼️', desc: '给图案涂上颜色', url: '/packageCreate/pages/create/draw/templates/templates' },
      { type: 'parent', name: '一起画画', icon: '👨‍👧', desc: '和家人一起创作', url: '/packageCreate/pages/create/draw/draw?mode=parent' },
      { type: 'gallery', name: '我的画廊', icon: '🏠', desc: '看看画过的画', url: '/packageCreate/pages/create/draw/gallery/gallery' }
    ],
    drawingCount: 0
  },

  onLoad: function() {
    this.loadStats()
  },

  onShow: function() {
    this.loadStats()
  },

  loadStats: function() {
    var drawings = childStorage.get('drawings') || []
    this.setData({ drawingCount: drawings.length })
  },

  goCreate: function(e) {
    var url = e.currentTarget.dataset.url
    wx.navigateTo({ url: url })
  }
})
