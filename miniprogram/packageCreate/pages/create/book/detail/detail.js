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
    filterCategories: [],
    filterCategoryName: ''
  },

  onLoad: function(options) {
    this.setData({ bookId: options.bookId })
    this.loadData()
    this.loadFilterCategories()
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

  loadFilterCategories: function() {
    var categories = [{ id: '', name: '全部分类' }]
    var expense = bookManager.getCategories('expense')
    var income = bookManager.getCategories('income')
    var transfer = bookManager.getCategories('transfer')
    categories = categories.concat(expense, income, transfer)
    this.setData({ filterCategories: categories })
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

  copyEntry: function(e) {
    var entryId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageCreate/pages/create/book/add-entry/add-entry?bookId=' + this.data.bookId + '&copyId=' + entryId })
  },

  onEntryLongPress: function(e) {
    var entryId = e.currentTarget.dataset.id
    var self = this
    wx.showActionSheet({
      itemList: ['编辑', '复制', '删除'],
      success: function(res) {
        if (res.tapIndex === 0) {
          self.goEditEntry(e)
        } else if (res.tapIndex === 1) {
          self.copyEntry(e)
        } else if (res.tapIndex === 2) {
          self.deleteEntry(e)
        }
      }
    })
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
    this.setData({ 'filters.type': e.currentTarget.dataset.type })
    this.loadData()
  },

  onFilterCategory: function(e) {
    var index = e.detail.value
    var category = this.data.filterCategories[index]
    this.setData({
      'filters.category': category.id,
      filterCategoryName: category.name
    })
    this.loadData()
  },

  onFilterStartDate: function(e) {
    this.setData({ 'filters.startDate': e.detail.value })
    this.loadData()
  },

  onFilterEndDate: function(e) {
    this.setData({ 'filters.endDate': e.detail.value })
    this.loadData()
  },

  onFilterKeyword: function(e) {
    this.setData({ 'filters.keyword': e.detail.value })
    if (this._keywordTimer) clearTimeout(this._keywordTimer)
    var self = this
    this._keywordTimer = setTimeout(function() {
      self.loadData()
    }, 300)
  },

  clearFilters: function() {
    this.setData({
      filters: { type: '', category: '', startDate: '', endDate: '', keyword: '' },
      filterCategoryName: ''
    })
    this.loadData()
  },

  getTypeName: function(type) {
    return bookManager.getTypeName(type)
  }
})
