Page({
  data: {
    works: [
      { type: 'free', name: '自由画画', icon: '✏️', desc: '想画什么就画什么', url: '/pages/create/draw/draw?mode=free' },
      { type: 'template', name: '涂色模板', icon: '🖼️', desc: '给图案涂上颜色', url: '/pages/create/templates/templates' },
      { type: 'parent', name: '亲子画画', icon: '👨‍👧', desc: '和爸爸一起画画', url: '/pages/create/draw/draw?mode=parent' },
      { type: 'gallery', name: '我的画廊', icon: '🏠', desc: '看看画过的画', url: '/pages/create/gallery/gallery' }
    ],
    drawingCount: 0
  },

  onLoad: function() {
    this.loadStats()
  },

  onShow: function() {
    this.loadStats()

    // 更新 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // 加载统计
  loadStats: function() {
    var drawings = wx.getStorageSync('drawings') || []
    this.setData({ drawingCount: drawings.length })
  },

  // 跳转到创作页面
  goCreate: function(e) {
    var url = e.currentTarget.dataset.url
    wx.navigateTo({ url: url })
  }
})
