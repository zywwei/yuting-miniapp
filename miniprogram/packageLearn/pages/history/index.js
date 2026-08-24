var childStorage = require('../../../utils/child-storage.js')

// P1-13：type → 图标/名称映射（与日志写入的 module 参数对应）
var TYPE_META = {
  cards: { icon: '📚', name: '识字' },
  poems: { icon: '📜', name: '古诗' },
  english: { icon: '🔤', name: '英语' },
  numbers: { icon: '🔢', name: '数字' },
  mathFormulas: { icon: '📐', name: '数学公式' },
  mathConcepts: { icon: '🧠', name: '数学概念' },
  chineseReading: { icon: '📖', name: '阅读理解' },
  chineseWriting: { icon: '✍️', name: '写作' },
  chineseRhetoric: { icon: '💬', name: '修辞' },
  chineseClassical: { icon: '🀄', name: '文言文' }
}

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
    var enriched = logs.map(function(log) {
      var meta = TYPE_META[log.type] || {}
      return Object.assign({}, log, {
        icon: meta.icon || '📚',
        title: log.title || (meta.name ? meta.name + ' · ' + log.itemId : log.itemId)
      })
    })
    this._allLogs = enriched
    this.setData({ logs: this.applyFilter(enriched, this.data.filterType) })
  },

  filterLogs: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({
      filterType: type,
      logs: this.applyFilter(this._allLogs || [], type)
    })
  },

  // P1-13：筛选真正生效（此前 getFilteredLogs 无调用方，点击只改高亮）
  applyFilter: function(logs, type) {
    if (!type || type === 'all') return logs
    return logs.filter(function(log) { return log.type === type })
  },

  clearLogs: function() {
    var that = this
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有学习记录吗？',
      success: function(res) {
        if (res.confirm) {
          childStorage.set('learnLogs', [])
          that._allLogs = []
          that.setData({ logs: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  }
})
