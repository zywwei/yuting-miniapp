var childStorage = require('../../../../../utils/child-storage.js')
var stallUtils = require('../../../../utils/stall-utils.js')
var DIARY_KEY = 'stallDiary'

Page({
  data: {
    entries: [],
    showEditor: false,
    editingId: '',
    content: '',
    todayDate: ''
  },

  onLoad: function() {
    var today = new Date()
    var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    this.setData({ todayDate: dateStr })
    this.migrateData()
    this.loadEntries()
    stallUtils.setThemeColor()
  },

  // 一次性迁移：旧的裸 key 数据迁移到 childStorage（按孩子隔离）
  migrateData: function() {
    var oldData = wx.getStorageSync(DIARY_KEY)
    if (oldData && Array.isArray(oldData) && oldData.length > 0) {
      var currentData = childStorage.get(DIARY_KEY)
      if (!currentData || currentData.length === 0) {
        childStorage.set(DIARY_KEY, oldData)
      }
      wx.removeStorageSync(DIARY_KEY)
    }
  },

  loadEntries: function() {
    var entries = childStorage.get(DIARY_KEY) || []
    entries.sort(function(a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    this.setData({ entries: entries })
  },

  saveEntries: function() {
    childStorage.set(DIARY_KEY, this.data.entries)
  },

  showEditor: function(e) {
    var id = e.currentTarget.dataset.id || ''
    var content = ''
    if (id) {
      var entries = this.data.entries
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].id === id) {
          content = entries[i].content
          break
        }
      }
    }
    this.setData({
      showEditor: true,
      editingId: id,
      content: content
    })
  },

  hideEditor: function() {
    this.setData({
      showEditor: false,
      editingId: '',
      content: ''
    })
  },

  onContentInput: function(e) {
    this.setData({ content: e.detail.value })
  },

  saveEntry: function() {
    var content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    var entries = this.data.entries
    var editingId = this.data.editingId
    var today = new Date()
    var dateStr = this.data.todayDate

    if (editingId) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].id === editingId) {
          entries[i].content = content
          entries[i].updatedAt = today.toISOString()
          break
        }
      }
    } else {
      entries.unshift({
        id: 'diary_' + Date.now(),
        date: dateStr,
        content: content,
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      })
    }

    this.setData({ entries: entries })
    this.saveEntries()
    this.hideEditor()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  deleteEntry: function(e) {
    var id = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '删除日志',
      content: '确定要删除这条日志吗？',
      confirmColor: '#FF6B8A',
      success: function(res) {
        if (res.confirm) {
          var entries = that.data.entries.filter(function(entry) {
            return entry.id !== id
          })
          that.setData({ entries: entries })
          that.saveEntries()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  formatDate: function(dateStr) {
    var parts = dateStr.split('-')
    return parts[1] + '月' + parts[2] + '日'
  }
})
