var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    bookId: '',
    books: [],
    selectedBookId: '',
    dateRange: 'all',
    dateRangeOptions: [
      { value: 'all', label: '全部' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' },
      { value: 'custom', label: '自定义' }
    ],
    startDate: '',
    endDate: '',
    exporting: false
  },

  onLoad: function(options) {
    var today = bookManager.getTodayStr()
    this.setData({
      bookId: options.bookId || '',
      selectedBookId: options.bookId || '',
      startDate: today.substring(0, 7) + '-01',
      endDate: today
    })
    this.loadData()
  },

  loadData: function() {
    var books = bookManager.getBooks()
    this.setData({ books: books })
  },

  selectBook: function(e) {
    this.setData({ selectedBookId: e.currentTarget.dataset.id })
  },

  selectDateRange: function(e) {
    this.setData({ dateRange: e.currentTarget.dataset.value })
  },

  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
  },

  onEndDateChange: function(e) {
    this.setData({ endDate: e.detail.value })
  },

  exportCSV: function() {
    var self = this
    this.setData({ exporting: true })
    setTimeout(function() {
      try {
        var entries = bookManager.getEntries(self.data.selectedBookId || null, self.getFilters())
        var role = self.getUserRole()
        var csv = bookManager.generateCSV(entries, {}, role)
        var fileName = '记账导出_' + bookManager.getTodayStr()
        bookManager.shareCSV(csv, fileName)
        wx.showToast({ title: '导出成功', icon: 'success' })
      } catch (err) {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
      self.setData({ exporting: false })
    }, 500)
  },

  getUserRole: function() {
    if (!this.data.selectedBookId) return 'admin'
    var book = bookManager.getBook(this.data.selectedBookId)
    if (!book) return 'admin'
    if (book.sharedMode === 'private') return 'admin'
    var app = getApp()
    var memberId = app.globalData.memberId || ''
    for (var i = 0; i < book.members.length; i++) {
      if (book.members[i].memberId === memberId) {
        return book.members[i].role
      }
    }
    return 'viewer'
  },

  getFilters: function() {
    if (this.data.dateRange === 'all') return {}
    if (this.data.dateRange === 'month') {
      var today = bookManager.getTodayStr()
      return { startDate: today.substring(0, 7) + '-01', endDate: today }
    }
    if (this.data.dateRange === 'year') {
      var today = bookManager.getTodayStr()
      return { startDate: today.substring(0, 4) + '-01-01', endDate: today }
    }
    return { startDate: this.data.startDate, endDate: this.data.endDate }
  },

  getBookName: function(bookId) {
    if (!bookId) return '全部账本'
    var book = bookManager.getBook(bookId)
    return book ? book.name : '未知'
  },

  getEntryCount: function() {
    var entries = bookManager.getEntries(this.data.selectedBookId || null, this.getFilters())
    return entries.length
  }
})
