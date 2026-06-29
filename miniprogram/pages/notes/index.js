var util = require('../../utils/util.js')
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var auth = require('../../utils/auth.js')

var app = getApp()
var PAGE_SIZE = 20

Page({
  data: {
    notes: [],
    noteCount: 0,
    children: [],
    currentChildId: '',
    searchKeyword: '',
    currentPage: 1,
    hasMore: true,
    showSearch: false
  },

  _allNotes: [],

  onLoad: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })
    this.loadNotes()
  },

  onShow: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })

    var that = this
    var now = Date.now()
    if (!this._lastCloudFetch || now - this._lastCloudFetch > 30000) {
      this._lastCloudFetch = now
      cloud.fetchNotes().then(function() {
        that.loadNotes()
      }).catch(function() {
        that.loadNotes()
      })
    }

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  onChildChanged: function(e) {
    var childId = e.detail.childId
    auth.switchChild(childId)
    app.globalData.currentChildId = childId
    this.setData({ currentChildId: childId, currentPage: 1, searchKeyword: '' })
    this.loadNotes()
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

  onReachBottom: function() {
    if (this.data.hasMore) {
      this.loadMore()
    }
  },

  // 加载笔记列表
  loadNotes: function() {
    var notes = childStorage.get('notes') || []
    this._allNotes = notes.slice().sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime)
    })

    this.setData({ currentPage: 1 })
    this.applyFilter()
  },

  // 应用搜索过滤并分页
  applyFilter: function() {
    var keyword = this.data.searchKeyword.toLowerCase()
    var filtered = this._allNotes

    if (keyword) {
      filtered = filtered.filter(function(n) {
        return (n.title && n.title.toLowerCase().indexOf(keyword) >= 0) ||
               (n.content && n.content.toLowerCase().indexOf(keyword) >= 0)
      })
    }

    var page = this.data.currentPage
    var displayed = filtered.slice(0, page * PAGE_SIZE)

    this.setData({
      notes: displayed,
      noteCount: filtered.length,
      hasMore: displayed.length < filtered.length
    })
  },

  // 加载更多
  loadMore: function() {
    this.setData({ currentPage: this.data.currentPage + 1 })
    this.applyFilter()
  },

  // 搜索相关
  toggleSearch: function() {
    this.setData({ showSearch: !this.data.showSearch })
    if (!this.data.showSearch) {
      this.setData({ searchKeyword: '' })
      this.applyFilter()
    }
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value, currentPage: 1 })
    this.applyFilter()
  },

  clearSearch: function() {
    this.setData({ searchKeyword: '', currentPage: 1 })
    this.applyFilter()
  },

  // 删除笔记
  deleteNote: function(e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var title = e.currentTarget.dataset.title || '这篇笔记'

    wx.showModal({
      title: '确认删除',
      content: '确定要删除"' + title + '"吗？',
      confirmColor: '#FF4444',
      success: function(res) {
        if (res.confirm) {
          that.doDeleteNote(id)
        }
      }
    })
  },

  doDeleteNote: function(id) {
    var notes = childStorage.get('notes') || []
    notes = notes.filter(function(n) { return n.id !== id })
    childStorage.set('notes', notes)

    this.loadNotes()
    wx.showToast({ title: '已删除', icon: 'success' })
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
