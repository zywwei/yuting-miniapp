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
    exporting: false,
    fields: [
      { key: 'date', label: '日期', checked: true },
      { key: 'time', label: '时间', checked: true },
      { key: 'type', label: '类型', checked: true },
      { key: 'category', label: '分类', checked: true },
      { key: 'amount', label: '金额', checked: true },
      { key: 'note', label: '备注', checked: true },
      { key: 'tags', label: '标签', checked: true },
      { key: 'createdByName', label: '记账人', checked: true }
    ]
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

  onShow: function() {
    this.updatePreview()
  },

  loadData: function() {
    var books = bookManager.getBooks().filter(function(b) { return !b.isArchived })
    this.setData({ books: books })
    this.updatePreview()
  },

  updatePreview: function() {
    var bookName = this.getBookName(this.data.selectedBookId)
    var entryCount = this.getEntryCount()
    var fieldCount = this.data.fields.filter(function(f) { return f.checked }).length
    this.setData({
      previewBookName: bookName,
      previewEntryCount: entryCount,
      previewFieldCount: fieldCount
    })
  },

  selectBook: function(e) {
    this.setData({ selectedBookId: e.currentTarget.dataset.id })
    this.updatePreview()
  },

  selectDateRange: function(e) {
    this.setData({ dateRange: e.currentTarget.dataset.value })
    this.updatePreview()
  },

  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
    this.updatePreview()
  },

  onEndDateChange: function(e) {
    this.setData({ endDate: e.detail.value })
    this.updatePreview()
  },

  toggleField: function(e) {
    var index = e.currentTarget.dataset.index
    var fields = this.data.fields.map(function(f, i) {
      if (i === index) return { key: f.key, label: f.label, checked: !f.checked }
      return f
    })
    this.setData({ fields: fields })
    this.updatePreview()
  },

  exportCSV: function() {
    var self = this
    this.setData({ exporting: true })
    setTimeout(function() {
      try {
        var entries = bookManager.getEntries(self.data.selectedBookId || null, self.getFilters())
        var role = self.getUserRole()
        var selectedFields = self.data.fields.filter(function(f) { return f.checked })
        var options = { fields: selectedFields }
        var csv = bookManager.generateCSV(entries, options, role)
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
    var memberId = app.globalData.member ? app.globalData.member._id : ''
    var members = book.members || []
    for (var i = 0; i < members.length; i++) {
      if (members[i].memberId === memberId) {
        return members[i].role
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
