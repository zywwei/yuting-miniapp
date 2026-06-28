var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    bookId: '',
    book: null,
    entries: [],
    groupedEntries: [],
    totalEntryCount: 0,
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
    filterCategoryIndex: 0,
    filterCategoryName: ''
  },

  onLoad: function(options) {
    this.setData({ bookId: options.bookId })
    this.loadData()
    this.loadFilterCategories()
    this._skipNextShow = true
  },

  onShow: function() {
    if (this._skipNextShow) {
      this._skipNextShow = false
      return
    }
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
    if (!book) {
      wx.showToast({ title: '账本不存在', icon: 'none' })
      setTimeout(function() {
        wx.navigateBack()
      }, 1500)
      return
    }
    var entries = bookManager.getEntries(this.data.bookId, this.data.filters).map(function(e) {
      return {
        id: e.id,
        bookId: e.bookId,
        type: e.type,
        category: e.category,
        amount: e.amount,
        note: e.note,
        date: e.date,
        time: e.time,
        tags: e.tags,
        images: e.images,
        createdByName: e.createdByName,
        categoryIcon: bookManager.getCategoryIcon(e.type, e.category),
        categoryName: bookManager.getCategoryName(e.type, e.category)
      }
    })
    var groupedEntries = this.groupByDate(entries)
    var budgetProgress = bookManager.getBudgetProgress(this.data.bookId)
    var totalEntries = bookManager.getEntries(this.data.bookId)
    this.setData({ book: book, entries: entries, groupedEntries: groupedEntries, budgetProgress: budgetProgress, totalEntryCount: totalEntries.length })
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
          wx.showLoading({ title: '删除中...' })
          bookManager.removeEntry(entryId).then(function() {
            wx.hideLoading()
            self.loadData()
            wx.showToast({ title: '删除成功', icon: 'success' })
          }).catch(function(err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
            console.error('删除记录失败:', err)
          })
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
    var index = parseInt(e.detail.value)
    var category = this.data.filterCategories[index]
    this.setData({
      'filters.category': category.id,
      filterCategoryIndex: index,
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
