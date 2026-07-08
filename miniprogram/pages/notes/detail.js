var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var auth = require('../../utils/auth.js')
var dateUtils = require('../../utils/date-utils.js')

Page({
  data: {
    note: null,
    canEdit: false,
    formattedCreateTime: '',
    formattedUpdateTime: ''
  },

  onLoad: function(options) {
    var id = options.id
    this.loadNote(id)
  },

  onShow: function() {
    var self = this
    if (this.data.note) {
      // 从编辑页面返回时刷新数据
      // 同时尝试从云端同步最新笔记（防止其他设备修改 visibility 后本地缓存未更新）
      cloud.fetchNotes().then(function() {
        self.loadNote(self.data.note.id)
      }).catch(function() {
        // 同步失败时仍从本地加载
        self.loadNote(self.data.note.id)
      })
    }
  },

  // 加载笔记
  loadNote: function(id) {
    var self = this
    var notes = childStorage.get('notes') || []
    var note = notes.find(function(n) { return n.id === id })
    if (!note) {
      wx.showToast({ title: '笔记不存在', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }

    var member = auth.getMember()
    var memberId = member ? member._id : ''
    var isAdmin = member && member.permissions && member.permissions.indexOf('admin') >= 0
    var isCreator = note.createdBy === memberId

    // 可见性权限校验：非创建者/管理员需按 visibility 判断
    var canView = isCreator || isAdmin
    if (!canView) {
      var vis = note.visibility || 'family'
      if (vis === 'family') {
        canView = true
      } else if (vis === 'designated') {
        canView = (note.visibleTo || []).indexOf(memberId) >= 0
      } else {
        canView = false  // private 仅创建者可见
      }
    }

    if (!canView) {
      wx.showToast({ title: '无权查看此笔记', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }

    self.setData({
      note: note,
      canEdit: isCreator || isAdmin,
      formattedCreateTime: dateUtils.formatDate(note.createTime),
      formattedUpdateTime: note.updateTime ? dateUtils.formatDate(note.updateTime) : ''
    })
  },

  // 图片预览
  previewImage: function(e) {
    var index = e.currentTarget.dataset.index
    var urls = this.data.note.images || []
    
    if (urls.length === 0) return
    
    // 检查是否需要转换cloud:// URL
    var needConvert = urls.some(function(url) { 
      return typeof url === 'string' && url.startsWith('cloud://') 
    })
    
    if (needConvert) {
      wx.cloud.getTempFileURL({
        fileList: urls,
        success: function(res) {
          var tempUrls = res.fileList.map(function(f) { 
            return f.tempFileURL || f.fileID 
          })
          wx.previewImage({ urls: tempUrls, current: tempUrls[index] })
        },
        fail: function() {
          // 转换失败，直接使用原始URL
          wx.previewImage({ urls: urls, current: urls[index] })
        }
      })
    } else {
      wx.previewImage({ urls: urls, current: urls[index] })
    }
  },

  // 编辑笔记
  editNote: function() {
    wx.navigateTo({
      url: '/pages/notes/add?id=' + this.data.note.id
    })
  },

  // 删除笔记
  deleteNote: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇笔记吗？删除后无法恢复。',
      confirmColor: '#FF4444',
      success: async function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          var noteManager = require('../../utils/note-manager.js')
          var result = await noteManager.deleteNote(self.data.note.id)
          wx.hideLoading()
          
          if (result.success) {
            wx.showToast({ title: '已删除', icon: 'success' })
          } else {
            wx.showToast({ title: '本地已删除，云端同步失败', icon: 'none' })
          }
          setTimeout(function() { wx.navigateBack() }, 1500)
        }
      }
    })
  }
})
