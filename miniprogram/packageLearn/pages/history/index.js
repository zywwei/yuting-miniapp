var childStorage = require('../../../utils/child-storage.js')

Page({
  data: {
    logs: [],
    filterType: 'all'
  },

  onLoad: function() {
    this.loadLogs()
  },

  onShow: function() {
    this.loadLogs()
  },

  loadLogs: function() {
    var logs = childStorage.get('learnLogs') || []
    logs.sort(function(a, b) {
      return new Date(b.time) - new Date(a.time)
    })
    this.setData({ logs: logs })
  },

  filterLogs: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ filterType: type })
  },

  getFilteredLogs: function() {
    if (this.data.filterType === 'all') {
      return this.data.logs
    }
    return this.data.logs.filter(function(log) {
      return log.type === this.data.filterType
    }.bind(this))
  },

  clearLogs: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有学习记录吗？',
      success: function(res) {
        if (res.confirm) {
          childStorage.set('learnLogs', [])
          this.setData({ logs: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }.bind(this)
    })
  }
})
