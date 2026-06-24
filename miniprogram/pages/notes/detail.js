var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')

Page({
  data: {
    note: null
  },

  onLoad: function(options) {
    var id = options.id
    this.loadNote(id)
  },

  // 加载笔记
  loadNote: function(id) {
    var self = this
    var notes = childStorage.get('notes') || []
    var note = notes.find(function(n) { return n.id === id })
    if (note) {
      self.setData({ note: note })
    } else {
      wx.showToast({ title: '笔记不存在', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
    }
  },

  // 删除笔记
  deleteNote: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇笔记吗？',
      success: function(res) {
        if (res.confirm) {
          var notes = childStorage.get('notes') || []
          var filtered = notes.filter(function(n) {
            return n.id !== self.data.note.id
          })
          childStorage.set('notes', filtered)
          cloud.removeNote(self.data.note.id).catch(function() {})
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(function() { wx.navigateBack() }, 1500)
        }
      }
    })
  }
})
