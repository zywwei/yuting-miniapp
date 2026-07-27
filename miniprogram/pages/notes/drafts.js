var noteTypes = require('../../utils/note-types.js')

Page({
  data: {
    draftCount: 0,
    draftList: [],
    filteredDrafts: [],
    currentFilter: 'all'
  },

  onLoad: function() {
    this.loadDrafts()
  },

  onShow: function() {
    this.loadDrafts()
  },

  // 加载草稿列表
  loadDrafts: function() {
    var draftList = []
    var storageInfo = wx.getStorageInfoSync()
    
    for (var i = 0; i < storageInfo.keys.length; i++) {
      var key = storageInfo.keys[i]
      if (key.startsWith('note_draft_')) {
        var draftData = wx.getStorageSync(key)
        if (draftData && draftData.timestamp) {
          // 获取类型信息
          var typeInfo = noteTypes.getTypeInfo(draftData.type)
          
          // 内容预览
          var content = draftData.content || ''
          var contentPreview = content.replace(/<[^>]+>/g, '').trim()
          if (contentPreview.length > 50) {
            contentPreview = contentPreview.substring(0, 50) + '...'
          }
          
          // 时间格式化
          var date = new Date(draftData.timestamp)
          var timeStr = this.formatTime(date)
          
          draftList.push({
            key: key,
            draftId: key.replace('note_draft_', ''),
            title: draftData.title || '',
            content: draftData.content || '',
            contentPreview: contentPreview || '暂无内容',
            type: draftData.type || 'diary',
            typeName: typeInfo.label,
            typeIcon: typeInfo.icon,
            typeColor: typeInfo.color,
            typeTextColor: typeInfo.textColor,
            mood: draftData.mood || '',
            tags: draftData.tags || [],
            images: draftData.images || [],
            imageCount: (draftData.images || []).length,
            timestamp: draftData.timestamp,
            timeStr: timeStr,
            date: date
          })
        }
      }
    }
    
    // 按时间倒序排列
    draftList.sort(function(a, b) {
      return b.timestamp - a.timestamp
    })
    
    this.setData({
      draftCount: draftList.length,
      draftList: draftList
    })
    
    this.applyFilter()
  },

  // 格式化时间
  formatTime: function(date) {
    var now = new Date()
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    var yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    var draftDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    var hours = date.getHours().toString().padStart(2, '0')
    var minutes = date.getMinutes().toString().padStart(2, '0')
    var time = hours + ':' + minutes
    
    if (draftDate.getTime() === today.getTime()) {
      return '今天 ' + time
    } else if (draftDate.getTime() === yesterday.getTime()) {
      return '昨天 ' + time
    } else {
      var month = (date.getMonth() + 1).toString().padStart(2, '0')
      var day = date.getDate().toString().padStart(2, '0')
      return month + '/' + day + ' ' + time
    }
  },

  // 设置筛选条件
  setFilter: function(e) {
    var filter = e.currentTarget.dataset.filter
    this.setData({ currentFilter: filter })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter: function() {
    var filter = this.data.currentFilter
    var draftList = this.data.draftList
    var now = new Date()
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    var weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    var filteredDrafts = draftList.filter(function(draft) {
      if (filter === 'all') {
        return true
      } else if (filter === 'today') {
        return draft.date.getTime() >= today.getTime()
      } else if (filter === 'week') {
        return draft.date.getTime() >= weekAgo.getTime()
      }
      return true
    })
    
    this.setData({ filteredDrafts: filteredDrafts })
  },

  // 编辑草稿
  editDraft: function(e) {
    var key = e.currentTarget.dataset.key
    
    // 传递草稿key给编辑页面
    wx.navigateTo({ url: '/pages/notes/add?draftKey=' + encodeURIComponent(key) })
  },

  // 删除草稿
  deleteDraft: function(e) {
    var that = this
    var key = e.currentTarget.dataset.key
    
    wx.showModal({
      title: '删除草稿',
      content: '确定要删除这篇草稿吗？',
      confirmColor: '#FF5A5A',
      success: function(res) {
        if (res.confirm) {
          wx.removeStorageSync(key)
          that.loadDrafts()
          wx.showToast({ title: '草稿已删除', icon: 'success' })
        }
      }
    })
  },

  // 清空所有草稿
  clearAllDrafts: function() {
    var that = this
    
    wx.showModal({
      title: '清空草稿箱',
      content: '确定要删除所有草稿吗？此操作不可恢复。',
      confirmColor: '#FF5A5A',
      success: function(res) {
        if (res.confirm) {
          var draftList = that.data.draftList
          draftList.forEach(function(draft) {
            wx.removeStorageSync(draft.key)
          })
          that.loadDrafts()
          wx.showToast({ title: '草稿箱已清空', icon: 'success' })
        }
      }
    })
  },

  // 去写笔记
  goWrite: function() {
    wx.navigateTo({ url: '/pages/notes/add' })
  }
})
