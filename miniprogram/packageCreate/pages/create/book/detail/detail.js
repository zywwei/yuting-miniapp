var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    bookId: '',
    book: null,
    entries: [],
    groupedEntries: [],
    budgetProgress: null,
    showFilter: false,
    filters: {
      type: '',
      category: '',
      startDate: '',
      endDate: '',
      keyword: ''
    },
    typeOptions: [
      { value: '', label: '全部' },
      { value: 'expense', label: '支出' },
      { value: 'income', label: '收入' },
      { value: 'transfer', label: '不计入' }
    ]
  },

  onLoad: function(options) {
    this.setData({ bookId: options.bookId })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  onPullDownRefresh: function() {
    var self = this
    bookManager.syncFromCloud().then(function() {
      self.loadData()
      wx.stopPullDownRefresh()
    }).catch(function() {
      wx.stopPullDownRefresh()
    })
  },

  loadData: function() {
    var book = bookManager.getBook(this.data.bookId)
    var entries = bookManager.getEntries(this.data.bookId, this.data.filters).map(function(e) {
      e.categoryIcon = bookManager.getCategoryIcon(e.type, e.category)
      e.categoryName = bookManager.getCategoryName(e.type, e.category)
      return e
    })
    var groupedEntries = this.groupByDate(entries)
    var budgetProgress = bookManager.getBudgetProgress(this.data.bookId)
    this.setData({ book: book, entries: entries, groupedEntries: groupedEntries, budgetProgress: budgetProgress })
  },

  groupByDate: function(entries) {
    var groups = {}
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i]
      if (!groups[e.date]) groups[e.date] = { date: e.date, entries: [], totalIncome: 0, totalExpense: 0 }
      groups[e.date].entries.push(e)
      if (e.type === 'income') groups[e.date].totalIncome += e.amount
      else if (e.type === 'expense') groups[e.date].totalExpense += e.amount
    }
    var result = []
    for (var key in groups) result.push(groups[key])
    result.sort(function(a, b) { return b.date.localeCompare(a.date) })
    return result
  },

  goAddEntry: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/add-entry/add-entry?bookId=' + this.data.bookId })
  },

  goEditEntry: function(e) {
    var entryId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageCreate/pages/create/book/add-entry/add-entry?bookId=' + this.data.bookId + '&entryId=' + entryId })
  },

  deleteEntry: function(e) {
    var entryId = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          bookManager.removeEntry(entryId)
          self.loadData()
          wx.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  },

  goStats: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/stats/stats?bookId=' + this.data.bookId })
  },

  goShare: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/share/share?bookId=' + this.data.bookId })
  },

  goSettings: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/settings/settings?bookId=' + this.data.bookId })
  },

  toggleFilter: function() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  onFilterType: function(e) {
    this.setData({ 'filters.type': e.detail.value })
    this.loadData()
  },

  onFilterKeyword: function(e) {
    this.setData({ 'filters.keyword': e.detail.value })
    this.loadData()
  },

  clearFilters: function() {
    this.setData({ filters: { type: '', category: '', startDate: '', endDate: '', keyword: '' } })
    this.loadData()
  },

  getTypeName: function(type) {
    return bookManager.getTypeName(type)
  }
})
