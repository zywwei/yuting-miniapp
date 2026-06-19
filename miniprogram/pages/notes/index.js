var util = require('../../utils/util.js')

Page({
  data: {
    notes: [],
    noteCount: 0
  },

  onLoad: function() {
    this.loadNotes()
  },

  onShow: function() {
    this.loadNotes()

    // 更新 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // 加载笔记列表
  loadNotes: function() {
    var notes = wx.getStorageSync('notes') || []
    // 按创建时间倒序
    var sortedNotes = notes.slice().sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime)
    })
    this.setData({
      notes: sortedNotes.slice(0, 20),
      noteCount: notes.length
    })
  },

  // 跳转到添加笔记
  addNote: function() {
    wx.navigateTo({ url: '/pages/notes/add' })
  },

  // 跳转到笔记详情
  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/notes/detail?id=' + id })
  }
})
