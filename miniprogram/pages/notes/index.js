var util = require('../../utils/util.js')
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')

Page({
  data: {
    notes: [],
    noteCount: 0
  },

  onLoad: function() {
    this.loadNotes()
  },

  onShow: function() {
    var that = this
    cloud.fetchNotes().then(function() {
      that.loadNotes()
    }).catch(function() {
      that.loadNotes()
    })

    // 更新 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  onPullDownRefresh: async function() {
    var that = this
    try {
      await cloud.fetchNotes()
      that.loadNotes()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 加载笔记列表
  loadNotes: function() {
    var notes = childStorage.get('notes') || []
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
