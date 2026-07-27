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
    allTags: [],
    // 撤销条状态
    showUndoBar: false,
    undoNoteId: '',
    undoNoteTitle: '',
    undoNoteData: null,
    // 搜索历史
    searchHistory: [],
    showSearchHistory: false,
    // 统计数据
    monthCount: 0,
    streakDays: 0,
    topMood: '😊',
    // 日历视图
    viewMode: 'list',
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    selectedDate: '',
    selectedDateFormatted: '',
    selectedDateNotes: [],
    // 草稿箱
    draftCount: 0
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
    this.loadSearchHistory()
    this.loadDraftCount()
  },

  onShow: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId(),
      categories: noteTypes.getCategoryTabs()
    })

    // 总是先加载本地数据（确保新建/编辑的笔记立即显示）
    this.loadNotes()
    this.loadDraftCount()

    // 如果是日历模式，重新生成日历（保留当前月份）
    if (this.data.viewMode === 'calendar') {
      this.generateCalendar()
    }

    // 超过30秒则从云端同步
    var that = this
    var now = Date.now()
    if (!this._lastCloudFetch || now - this._lastCloudFetch > 30000) {
      this._lastCloudFetch = now
      cloud.fetchNotes().then(function() {
        that.loadNotes()
        // 如果是日历模式，重新生成日历
        if (that.data.viewMode === 'calendar') {
          that.generateCalendar()
        }
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
    
    // 如果有待删除的笔记，立即执行云端删除
    if (this._undoTimer && this.data.undoNoteId) {
      clearTimeout(this._undoTimer)
      this._undoTimer = null
      this.executeCloudDelete(this.data.undoNoteId)
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
    
    // 计算统计数据
    this._calculateStats()
  },

  // 高亮文本处理
  _highlightText: function(text, keyword) {
    if (!keyword || !text) return [{ text: text, highlight: false }]
    
    var parts = []
    var lowerText = text.toLowerCase()
    var lowerKeyword = keyword.toLowerCase()
    var lastIndex = 0
    
    var index = lowerText.indexOf(lowerKeyword)
    while (index > -1) {
      if (index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, index), highlight: false })
      }
      parts.push({ text: text.substring(index, index + keyword.length), highlight: true })
      lastIndex = index + keyword.length
      index = lowerText.indexOf(lowerKeyword, lastIndex)
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), highlight: false })
    }
    
    return parts.length > 0 ? parts : [{ text: text, highlight: false }]
  },

  // 计算统计数据
  _calculateStats: function() {
    var now = new Date()
    var currentMonth = now.getMonth()
    var currentYear = now.getFullYear()
    
    // 本月笔记数
    var monthCount = this._allNotes.filter(function(note) {
      var noteDate = new Date(note.createTime)
      return noteDate.getMonth() === currentMonth && noteDate.getFullYear() === currentYear
    }).length
    
    // 连续记录天数
    var streakDays = 0
    var dateSet = {}
    this._allNotes.forEach(function(note) {
      var dateStr = new Date(note.createTime).toDateString()
      dateSet[dateStr] = true
    })
    
    var checkDate = new Date()
    while (true) {
      var dateStr = checkDate.toDateString()
      if (dateSet[dateStr]) {
        streakDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    
    // 最多心情
    var moodCount = {}
    this._allNotes.forEach(function(note) {
      if (note.mood) {
        moodCount[note.mood] = (moodCount[note.mood] || 0) + 1
      }
    })
    
    var topMood = '😊'
    var maxCount = 0
    Object.keys(moodCount).forEach(function(mood) {
      if (moodCount[mood] > maxCount) {
        maxCount = moodCount[mood]
        topMood = mood
      }
    })
    
    // 获取心情图标
    var moodInfo = noteTypes.getMoodInfo(topMood)
    topMood = moodInfo.icon || '😊'
    
    this.setData({
      monthCount: monthCount,
      streakDays: streakDays,
      topMood: topMood
    })
  },

  // 加载笔记列表
  loadNotes: function() {
    var that = this
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
      
      // 生成高亮文本
      note._titleHighlight = that._highlightText(note._titlePreview, that.data.searchKeyword)
      note._contentHighlight = that._highlightText(note._contentPreview.substring(0, 100), that.data.searchKeyword)
      
      // 处理图片URL（按需获取临时URL）
      if (note.images && note.images.length > 0) {
        note._thumbnailUrl = note.images[0]
        // 如果是cloud:// URL，标记需要转换
        if (note._thumbnailUrl.startsWith('cloud://')) {
          note._needConvertUrl = true
        }
      }
      
      return note
    }).sort(function(a, b) {
      // 置顶优先，然后按时间排序
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
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
    
    // 设置按月分组标题
    var lastMonth = ''
    displayed.forEach(function(note) {
      var noteDate = new Date(note.createTime)
      var monthKey = noteDate.getFullYear() + '-' + (noteDate.getMonth() + 1)
      
      if (monthKey !== lastMonth) {
        note._showMonthHeader = true
        note._monthLabel = noteDate.getFullYear() + '年' + (noteDate.getMonth() + 1) + '月'
        lastMonth = monthKey
      } else {
        note._showMonthHeader = false
        note._monthLabel = ''
      }
    })

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
    
    // 批量转换cloud:// URL
    this._convertCloudUrls(displayed)
  },

  // 加载更多
  loadMore: function() {
    this.setData({ currentPage: this.data.currentPage + 1 })
    this.applyFilter()
  },

  // 批量获取图片临时URL
  _convertCloudUrls: function(notes) {
    var needConvertUrls = []
    var noteIndexMap = {}
    
    notes.forEach(function(note, index) {
      if (note._needConvertUrl && note._thumbnailUrl) {
        needConvertUrls.push(note._thumbnailUrl)
        noteIndexMap[note._thumbnailUrl] = index
      }
    })
    
    if (needConvertUrls.length === 0) return
    
    var that = this
    wx.cloud.getTempFileURL({
      fileList: needConvertUrls,
      success: function(res) {
        if (res.fileList) {
          // 使用路径更新，避免竞态条件
          res.fileList.forEach(function(file) {
            var index = noteIndexMap[file.fileID]
            if (index !== undefined && file.tempFileURL) {
              that.setData({
                [`notes[${index}]._thumbnailUrl`]: file.tempFileURL,
                [`notes[${index}]._needConvertUrl`]: false
              })
            }
          })
        }
      }
    })
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
      
      // 保存搜索历史
      if (value && value.trim()) {
        that.saveSearchHistory(value)
      }
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

  // 切换视图模式
  switchViewMode: function(e) {
    var mode = e.currentTarget.dataset.mode
    this.setData({ viewMode: mode })
    
    if (mode === 'calendar') {
      this.generateCalendar()
    }
  },

  // 生成日历数据
  generateCalendar: function() {
    var year = this.data.currentYear
    var month = this.data.currentMonth
    
    // 获取当月第一天是星期几
    var firstDay = new Date(year, month - 1, 1).getDay()
    // 获取当月天数
    var daysInMonth = new Date(year, month, 0).getDate()
    // 获取上月天数
    var daysInPrevMonth = new Date(year, month - 1, 0).getDate()
    
    var calendarDays = []
    var today = new Date()
    var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    
    // 按日期索引笔记
    var notesByDate = {}
    this._allNotes.forEach(function(note) {
      var noteDate = new Date(note.createTime)
      var dateStr = noteDate.getFullYear() + '-' + (noteDate.getMonth() + 1) + '-' + noteDate.getDate()
      if (!notesByDate[dateStr]) {
        notesByDate[dateStr] = []
      }
      notesByDate[dateStr].push(note)
    })
    
    // 填充上月日期
    for (var i = firstDay - 1; i >= 0; i--) {
      var day = daysInPrevMonth - i
      var dateStr = year + '-' + (month - 1) + '-' + day
      calendarDays.push({
        day: day,
        date: dateStr,
        isCurrentMonth: false,
        isToday: false,
        hasNote: false,
        noteCount: 0,
        noteTypes: []
      })
    }
    
    // 填充当月日期
    for (var i = 1; i <= daysInMonth; i++) {
      var dateStr = year + '-' + month + '-' + i
      var notes = notesByDate[dateStr] || []
      var noteTypeColors = []
      
      // 获取笔记类型颜色
      notes.slice(0, 3).forEach(function(note) {
        var typeInfo = noteTypes.getTypeInfo(note.type)
        if (noteTypeColors.indexOf(typeInfo.color) === -1) {
          noteTypeColors.push(typeInfo.color)
        }
      })
      
      calendarDays.push({
        day: i,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasNote: notes.length > 0,
        noteCount: notes.length,
        noteTypes: noteTypeColors
      })
    }
    
    // 填充下月日期（补齐6行）
    var remaining = 42 - calendarDays.length
    for (var i = 1; i <= remaining; i++) {
      var dateStr = year + '-' + (month + 1) + '-' + i
      calendarDays.push({
        day: i,
        date: dateStr,
        isCurrentMonth: false,
        isToday: false,
        hasNote: false,
        noteCount: 0,
        noteTypes: []
      })
    }
    
    // 保留当前选中的日期状态
    var selectedDate = this.data.selectedDate
    if (selectedDate) {
      var parts = selectedDate.replace('月', '-').replace('日', '').split('-')
      var selectedMonth = parseInt(parts[0])
      var selectedDay = parseInt(parts[1])
      
      calendarDays.forEach(function(item) {
        var itemParts = item.date.split('-')
        var itemMonth = parseInt(itemParts[1])
        var itemDay = parseInt(itemParts[2])
        item.selected = (itemMonth === selectedMonth && itemDay === selectedDay && item.isCurrentMonth)
      })
    }
    
    this.setData({ calendarDays: calendarDays })
  },

  // 上一月
  prevMonth: function() {
    var year = this.data.currentYear
    var month = this.data.currentMonth - 1
    
    if (month < 1) {
      month = 12
      year--
    }
    
    this.setData({ currentYear: year, currentMonth: month })
    this.generateCalendar()
  },

  // 下一月
  nextMonth: function() {
    var year = this.data.currentYear
    var month = this.data.currentMonth + 1
    
    if (month > 12) {
      month = 1
      year++
    }
    
    this.setData({ currentYear: year, currentMonth: month })
    this.generateCalendar()
  },

  // 选择日历日期
  selectCalendarDay: function(e) {
    var date = e.currentTarget.dataset.date
    var parts = date.split('-')
    var year = parseInt(parts[0])
    var month = parseInt(parts[1])
    var day = parseInt(parts[2])
    
    // 获取该日期的笔记
    var notes = this._allNotes.filter(function(note) {
      var noteDate = new Date(note.createTime)
      return noteDate.getFullYear() === year && 
             noteDate.getMonth() + 1 === month && 
             noteDate.getDate() === day
    })
    
    // 格式化显示日期
    var selectedDateFormatted = month + '月' + day + '日'
    
    // 直接更新选中日期，不重新生成日历
    this.setData({
      selectedDate: date,
      selectedDateFormatted: selectedDateFormatted,
      selectedDateNotes: notes
    })
    
    // 更新日历格子的选中状态（使用setData路径更新）
    var calendarDays = this.data.calendarDays
    for (var i = 0; i < calendarDays.length; i++) {
      var item = calendarDays[i]
      if (item.date === date) {
        this.setData({ [`calendarDays[${i}].selected`]: true })
      } else if (item.selected) {
        this.setData({ [`calendarDays[${i}].selected`]: false })
      }
    }
  },

  // 搜索历史功能
  loadSearchHistory: function() {
    var history = wx.getStorageSync('note_search_history') || []
    this.setData({ searchHistory: history })
  },

  saveSearchHistory: function(keyword) {
    if (!keyword || !keyword.trim()) return
    
    var history = this.data.searchHistory.slice()
    var index = history.indexOf(keyword.trim())
    
    // 如果已存在，先删除
    if (index > -1) {
      history.splice(index, 1)
    }
    
    // 添加到开头
    history.unshift(keyword.trim())
    
    // 只保留最近10条
    if (history.length > 10) {
      history = history.slice(0, 10)
    }
    
    this.setData({ searchHistory: history })
    wx.setStorageSync('note_search_history', history)
  },

  clearSearchHistory: function() {
    this.setData({ searchHistory: [] })
    wx.removeStorageSync('note_search_history')
  },

  selectSearchHistory: function(e) {
    var keyword = e.currentTarget.dataset.keyword
    this.setData({ 
      searchKeyword: keyword,
      showSearchHistory: false,
      currentPage: 1
    })
    this.saveSearchHistory(keyword)
    this.applyFilter()
  },

  onSearchFocus: function() {
    this.setData({ showSearchHistory: true })
  },

  onSearchBlur: function() {
    // 延迟隐藏，避免点击历史记录时立即隐藏
    var that = this
    setTimeout(function() {
      that.setData({ showSearchHistory: false })
    }, 200)
  },

  // 草稿箱功能
  loadDraftCount: function() {
    var count = 0
    
    // 检查所有可能的草稿key
    var storageInfo = wx.getStorageInfoSync()
    for (var i = 0; i < storageInfo.keys.length; i++) {
      var key = storageInfo.keys[i]
      if (key.startsWith('note_draft_')) {
        var draftData = wx.getStorageSync(key)
        if (draftData && draftData.timestamp) {
          var hoursDiff = (Date.now() - draftData.timestamp) / (1000 * 60 * 60)
          if (hoursDiff < 72) { // 草稿保留72小时
            count++
          } else {
            // 超过72小时，清除草稿
            wx.removeStorageSync(key)
          }
        }
      }
    }
    
    this.setData({ draftCount: count })
  },

  showDraftBox: function() {
    wx.navigateTo({ url: '/pages/notes/drafts' })
  },

  // 左滑删除相关（跟手优化）
  _startX: 0,
  _startY: 0,
  _swiping: false,
  _currentSwipingIndex: -1,
  _translateX: 0,

  onTouchStart: function(e) {
    this._startX = e.touches[0].clientX
    this._startY = e.touches[0].clientY
    this._swiping = false
    this._currentSwipingIndex = -1
    this._translateX = 0
  },

  onTouchMove: function(e) {
    var deltaX = e.touches[0].clientX - this._startX
    var deltaY = e.touches[0].clientY - this._startY
    var index = e.currentTarget.dataset.index
    
    // 判断是否为水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this._swiping = true
      this._currentSwipingIndex = index
      
      // 限制滑动范围：向左最多滑动140rpx（删除按钮宽度），向右最多滑动0
      var translateX = Math.max(-140, Math.min(0, deltaX))
      this._translateX = translateX
      
      // 实时更新当前卡片的位移（只更新单卡，不全量刷新）
      var notes = this.data.notes
      if (notes[index]) {
        notes[index]._translateX = translateX
        notes[index]._swiped = translateX < -70 // 超过一半自动吸附
        this.setData({ 
          [`notes[${index}]._translateX`]: translateX,
          [`notes[${index}]._swiped`]: translateX < -70
        })
      }
    }
  },

  onTouchEnd: function(e) {
    if (!this._swiping) return
    
    var index = this._currentSwipingIndex
    var deltaX = this._translateX
    
    // 松手时：超过阈值吸附展开，否则回弹
    var notes = this.data.notes
    if (notes[index]) {
      if (deltaX < -70) {
        // 吸附展开
        notes[index]._translateX = -140
        notes[index]._swiped = true
      } else {
        // 回弹
        notes[index]._translateX = 0
        notes[index]._swiped = false
      }
      this.setData({ 
        [`notes[${index}]._translateX`]: notes[index]._translateX,
        [`notes[${index}]._swiped`]: notes[index]._swiped
      })
    }
    
    // 关闭其他已打开的删除按钮
    notes.forEach(function(note, i) {
      if (i !== index && note._swiped) {
        note._swiped = false
        note._translateX = 0
      }
    })
    this.setData({ notes: notes })
    
    this._currentSwipingIndex = -1
    this._translateX = 0
  },

  // 删除笔记（带撤销功能）
  deleteNote: function(e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var title = e.currentTarget.dataset.title || '这篇笔记'

    // 先本地删除，显示撤销条
    var notes = childStorage.get('notes') || []
    var deletedNote = notes.find(function(n) { return n.id === id })
    if (!deletedNote) return

    // 本地删除
    var newNotes = notes.filter(function(n) { return n.id !== id })
    childStorage.set('notes', newNotes)
    
    // 刷新列表
    this.loadNotes()
    
    // 显示撤销条
    this.setData({
      showUndoBar: true,
      undoNoteId: id,
      undoNoteTitle: title,
      undoNoteData: deletedNote
    })
    
    // 5秒后自动清除撤销数据，执行云端删除
    this._undoTimer = setTimeout(function() {
      that.executeCloudDelete(id)
      that.setData({ showUndoBar: false, undoNoteId: '', undoNoteData: null })
    }, 5000)
  },

  // 置顶/取消置顶
  togglePin: function(e) {
    var id = e.currentTarget.dataset.id
    var notes = childStorage.get('notes') || []
    var index = notes.findIndex(function(n) { return n.id === id })
    
    if (index > -1) {
      var newPinned = !notes[index].pinned
      notes[index].pinned = newPinned
      childStorage.set('notes', notes)
      this.loadNotes()
      
      // 同步到云端
      noteManager.updateNote(id, { pinned: newPinned }).catch(function(err) {
        console.warn('置顶同步失败:', err)
      })
      
      wx.showToast({ 
        title: newPinned ? '已置顶' : '已取消置顶', 
        icon: 'success' 
      })
    }
  },

  // 长按显示操作菜单
  onNoteLongPress: function(e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var isPinned = e.currentTarget.dataset.pinned
    
    wx.showActionSheet({
      itemList: [isPinned ? '取消置顶' : '置顶', '删除'],
      success: function(res) {
        if (res.tapIndex === 0) {
          that.togglePin(e)
        } else if (res.tapIndex === 1) {
          that.deleteNote(e)
        }
      }
    })
  },

  // 撤销删除
  undoDelete: function() {
    if (!this.data.undoNoteData) return
    
    // 清除定时器
    if (this._undoTimer) {
      clearTimeout(this._undoTimer)
      this._undoTimer = null
    }
    
    // 恢复笔记
    var notes = childStorage.get('notes') || []
    notes.push(this.data.undoNoteData)
    childStorage.set('notes', notes)
    
    // 刷新列表
    this.loadNotes()
    
    this.setData({ 
      showUndoBar: false, 
      undoNoteId: '', 
      undoNoteData: null 
    })
    
    wx.showToast({ title: '已撤销删除', icon: 'success' })
  },

  // 执行云端删除
  executeCloudDelete: async function(id) {
    try {
      await noteManager.deleteNote(id)
    } catch (err) {
      console.warn('云端删除失败:', err)
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
