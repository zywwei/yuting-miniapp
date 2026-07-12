var util = require('../../utils/util.js')
var dateUtils = require('../../utils/date-utils.js')
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var auth = require('../../utils/auth.js')
var noteManager = require('../../utils/note-manager.js')
var noteTypes = require('../../utils/note-types.js')

var app = getApp()
var PAGE_SIZE = 20
var SEARCH_DEBOUNCE_MS = 300  // 搜索防抖时间

Page({
  data: {
    notes: [],
    noteCount: 0,
    totalCount: 0,
    children: [],
    currentChildId: '',
    searchKeyword: '',
    currentPage: 1,
    hasMore: true,
    showSearch: false,
    showAdvancedSearch: false,
    searchDateStart: '',
    searchDateEnd: '',
    searchType: 'all',
    searchTag: '',
    sortOrder: 'desc',
    showEmpty: false,
    currentCategory: 'all',
    categories: noteTypes.getCategoryTabs(),
    allTags: []
  },

  _allNotes: [],
  _typeIndex: {},  // 按类型索引缓存
  _tagIndex: {},   // 按标签索引缓存
  _searchTimer: null,  // 搜索防抖定时器

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
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId(),
      categories: noteTypes.getCategoryTabs()
    })

    // 总是先加载本地数据（确保新建/编辑的笔记立即显示）
    this.loadNotes()

    // 超过30秒则从云端同步
    var that = this
    var now = Date.now()
    if (!this._lastCloudFetch || now - this._lastCloudFetch > 30000) {
      this._lastCloudFetch = now
      cloud.fetchNotes().then(function() {
        that.loadNotes()
      }).catch(function() {})
    }

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  onUnload: function() {
    // 清理定时器
    if (this._searchTimer) {
      clearTimeout(this._searchTimer)
      this._searchTimer = null
    }
  },

  onChildChanged: function(e) {
    var childId = e.detail.childId
    auth.switchChild(childId)
    app.globalData.currentChildId = childId
    this.setData({ 
      currentChildId: childId, 
      currentPage: 1, 
      searchKeyword: '', 
      showSearch: false,
      showAdvancedSearch: false
    })
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

  // 建立索引缓存
  _buildIndex: function() {
    var typeIndex = {}
    var tagIndex = {}
    
    this._allNotes.forEach(function(note) {
      // 按类型索引
      var type = note.type || 'diary'
      if (!typeIndex[type]) typeIndex[type] = []
      typeIndex[type].push(note)
      
      // 按标签索引
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(function(tag) {
          if (!tagIndex[tag]) tagIndex[tag] = []
          tagIndex[tag].push(note)
        })
      }
    })
    
    this._typeIndex = typeIndex
    this._tagIndex = tagIndex
  },

  // 加载笔记列表
  loadNotes: function() {
    var notes = childStorage.get('notes') || []
    var member = auth.getMember()
    var memberId = member ? member._id : ''
    var isAdmin = member && member.permissions && member.permissions.indexOf('admin') >= 0

    // 本地按 visibility 过滤兜底，防止云端未及时同步时本地缓存残留泄漏
    this._allNotes = notes.filter(function(note) {
      if (note.createdBy === memberId || isAdmin) return true
      var vis = note.visibility || 'family'
      if (vis === 'family') return true
      if (vis === 'designated') return (note.visibleTo || []).indexOf(memberId) >= 0
      return false  // private 仅创建者
    }).map(function(note) {
      note._isCreator = note.createdBy === memberId
      note._canDelete = note._isCreator || isAdmin
      note._formattedTime = dateUtils.formatDate(note.createTime)
      var typeInfo = noteTypes.getTypeInfo(note.type)
      var moodInfo = noteTypes.getMoodInfo(note.mood)
      note._typeLabel = typeInfo.label
      note._typeIcon = typeInfo.icon
      note._typeColor = typeInfo.color
      note._typeTextColor = typeInfo.textColor
      note._moodIcon = moodInfo.icon
      // 生成预览文本（去除HTML标签）
      var stripHtml = function(html) {
        return html ? html.replace(/<[^>]+>/g, '').trim() : ''
      }
      note._titlePreview = stripHtml(note.title) || '无标题'
      note._contentPreview = stripHtml(note.content) || ''
      return note
    }).sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime)
    })

    // 建立索引缓存
    this._buildIndex()

    // 获取所有标签
    var allTags = Object.keys(this._tagIndex)
    
    this.setData({ 
      currentPage: 1,
      allTags: allTags,
      totalCount: this._allNotes.length
    })
    this.applyFilter()
  },

  // 应用搜索过滤并分页（使用索引优化）
  applyFilter: function() {
    var type = this.data.currentCategory
    var tag = this.data.searchTag
    var sortOrder = this.data.sortOrder

    // 使用索引快速获取候选集
    var candidates = this._allNotes
    
    // 如果只按类型筛选，使用类型索引
    if (type !== 'all' && !this.data.searchKeyword && !tag && !this.data.searchDateStart && !this.data.searchDateEnd) {
      candidates = this._typeIndex[type] || []
    }
    // 如果只按标签筛选，使用标签索引
    else if (tag && !this.data.searchKeyword && type === 'all' && !this.data.searchDateStart && !this.data.searchDateEnd) {
      candidates = this._tagIndex[tag] || []
    }

    // 应用完整过滤（关键词、时间等）
    var filtered = noteManager.searchNotes({
      keyword: this.data.searchKeyword,
      startDate: this.data.searchDateStart,
      endDate: this.data.searchDateEnd,
      type: type,
      tag: tag,
      sortOrder: sortOrder
    }, candidates)

    var page = this.data.currentPage
    var displayed = filtered.slice(0, page * PAGE_SIZE)

    this.setData({
      notes: displayed,
      noteCount: filtered.length,
      hasMore: displayed.length < filtered.length,
      showEmpty: filtered.length === 0 && (
        this.data.searchKeyword || 
        this.data.searchDateStart || 
        this.data.searchDateEnd || 
        type !== 'all' || 
        tag
      )
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
      this.setData({ 
        searchKeyword: '',
        showAdvancedSearch: false,
        searchDateStart: '',
        searchDateEnd: '',
        searchTag: ''
      })
      this.applyFilter()
    }
  },

  toggleAdvancedSearch: function() {
    this.setData({ showAdvancedSearch: !this.data.showAdvancedSearch })
  },

  // 搜索输入（带防抖）
  onSearchInput: function(e) {
    var that = this
    var value = e.detail.value
    
    this.setData({ searchKeyword: value })
    
    // 清除之前的定时器
    if (this._searchTimer) {
      clearTimeout(this._searchTimer)
    }
    
    // 设置新的防抖定时器
    this._searchTimer = setTimeout(function() {
      that.setData({ currentPage: 1 })
      that.applyFilter()
      that._searchTimer = null
    }, SEARCH_DEBOUNCE_MS)
  },

  clearSearch: function() {
    this.setData({ 
      searchKeyword: '', 
      currentPage: 1,
      searchDateStart: '',
      searchDateEnd: '',
      searchTag: ''
    })
    this.applyFilter()
  },

  onStartDateChange: function(e) {
    this.setData({ searchDateStart: e.detail.value, currentPage: 1 })
    this.applyFilter()
  },

  onEndDateChange: function(e) {
    this.setData({ searchDateEnd: e.detail.value, currentPage: 1 })
    this.applyFilter()
  },

  onTagChange: function(e) {
    var tag = this.data.allTags[e.detail.value] || ''
    this.setData({ searchTag: tag, currentPage: 1 })
    this.applyFilter()
  },

  switchCategory: function(e) {
    var category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category, currentPage: 1 })
    this.applyFilter()
  },

  toggleSortOrder: function() {
    var newOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc'
    this.setData({ sortOrder: newOrder })
    this.applyFilter()
  },

  // 左滑删除相关
  _startX: 0,
  _startY: 0,
  _swiping: false,

  onTouchStart: function(e) {
    this._startX = e.touches[0].clientX
    this._startY = e.touches[0].clientY
    this._swiping = false
  },

  onTouchMove: function(e) {
    var deltaX = e.touches[0].clientX - this._startX
    var deltaY = e.touches[0].clientY - this._startY
    
    // 判断是否为水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this._swiping = true
    }
  },

  onTouchEnd: function(e) {
    if (!this._swiping) return
    
    var index = e.currentTarget.dataset.index
    var deltaX = e.changedTouches[0].clientX - this._startX
    
    // 向左滑动超过50px，显示删除按钮
    if (deltaX < -50) {
      var notes = this.data.notes
      // 先关闭其他已打开的删除按钮
      notes.forEach(function(note, i) {
        note._swiped = (i === index)
      })
      this.setData({ notes: notes })
    } else if (deltaX > 50) {
      // 向右滑动，关闭删除按钮
      var notes = this.data.notes
      if (notes[index]) {
        notes[index]._swiped = false
        this.setData({ notes: notes })
      }
    }
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

  doDeleteNote: async function(id) {
    wx.showLoading({ title: '删除中...' })
    var result = await noteManager.deleteNote(id)
    wx.hideLoading()
    
    this.loadNotes()
    
    if (result.success) {
      wx.showToast({ title: '已删除', icon: 'success' })
    } else {
      wx.showToast({ title: '本地已删除，云端同步失败', icon: 'none' })
    }
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
