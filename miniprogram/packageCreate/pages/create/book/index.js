var bookManager = require('../../../utils/book-manager.js')

Page({
  data: {
    books: [],
    defaultBook: null,
    overview: {},
    recentEntries: [],
    showAddBook: false,
    newBookName: '',
    newBookIcon: '💰',
    iconOptions: ['💰', '📝', '🏠', '✈️', '🎂', '🎄', '💼', '📚', '🎮', '🛒', '🍜', '🚌']
  },

  onLoad: function() {
    this.loadData()
    this._loaded = true
  },

  onShow: function() {
    if (!this._loaded) {
      this.loadData()
    }
    this._loaded = false
    this.setThemeColor()
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

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  loadData: function() {
    var allBooks = bookManager.getBooks()
    var books = allBooks.filter(function(b) { return !b.isArchived })
    var archivedBooks = allBooks.filter(function(b) { return b.isArchived })
    var defaultBook = bookManager.getDefaultBook()
    var overview = bookManager.getOverviewStats()
    var allEntries = bookManager.getEntries()
    var recentEntries = allEntries.slice(0, 5).map(function(e) {
      return {
        id: e.id,
        type: e.type,
        category: e.category,
        amount: e.amount,
        date: e.date,
        time: e.time,
        categoryIcon: bookManager.getCategoryIcon(e.type, e.category),
        categoryName: bookManager.getCategoryName(e.type, e.category)
      }
    })
    var today = bookManager.getTodayStr()
    var thisMonth = today.substring(0, 7)
    for (var i = 0; i < books.length; i++) {
      var bookEntries = bookManager.getEntries(books[i].id)
      var monthExpense = 0
      for (var j = 0; j < bookEntries.length; j++) {
        if (bookEntries[j].type === 'expense' && bookEntries[j].date.indexOf(thisMonth) === 0) {
          monthExpense += bookEntries[j].amount
        }
      }
      books[i].monthExpense = monthExpense
    }
    this.setData({ books: books, archivedBooks: archivedBooks, defaultBook: defaultBook, overview: overview, recentEntries: recentEntries })
  },

  showArchivedBooks: function() {
    this.setData({ showArchived: !this.data.showArchived })
  },

  restoreBook: function(e) {
    var bookId = e.currentTarget.dataset.id
    bookManager.updateBook(bookId, { isArchived: false })
    this.loadData()
    wx.showToast({ title: '已恢复', icon: 'success' })
  },

  goDetail: function(e) {
    var bookId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageCreate/pages/create/book/detail/detail?bookId=' + bookId })
  },

  setDefaultBook: function(e) {
    var bookId = e.currentTarget.dataset.id
    var book = bookManager.getBook(bookId)
    if (!book) return
    var self = this
    wx.showModal({
      title: '设置默认账本',
      content: '将 "' + book.name + '" 设为默认账本？',
      success: function(res) {
        if (res.confirm) {
          bookManager.setDefaultBook(bookId)
          self.loadData()
          wx.showToast({ title: '已设为默认', icon: 'success' })
        }
      }
    })
  },

  goStats: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/stats/stats' })
  },

  showAddBookDialog: function() {
    this.setData({ showAddBook: true, newBookName: '', newBookIcon: '💰' })
  },

  hideAddBookDialog: function() {
    this.setData({ showAddBook: false })
  },

  onBookNameInput: function(e) {
    this.setData({ newBookName: e.detail.value })
  },

  selectIcon: function(e) {
    this.setData({ newBookIcon: e.currentTarget.dataset.icon })
  },

  confirmAddBook: function() {
    var name = this.data.newBookName.trim()
    if (!name) {
      wx.showToast({ title: '请输入账本名称', icon: 'none' })
      return
    }
    bookManager.addBook({ name: name, icon: this.data.newBookIcon })
    this.setData({ showAddBook: false })
    this.loadData()
    wx.showToast({ title: '创建成功', icon: 'success' })
  },

  goAddEntry: function(e) {
    var bookId = e ? e.currentTarget.dataset.bookid : ''
    if (!bookId && this.data.defaultBook) {
      bookId = this.data.defaultBook.id
    }
    if (!bookId && this.data.books.length > 0) {
      bookId = this.data.books[0].id
    }
    if (!bookId) {
      wx.showToast({ title: '请先创建账本', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/packageCreate/pages/create/book/add-entry/add-entry?bookId=' + bookId })
  },

  longPressAddEntry: function() {
    var templates = bookManager.getTemplates()
    if (templates.length === 0) {
      this.goAddEntry()
      return
    }
    var self = this
    var items = templates.map(function(t) { return t.name })
    items.push('取消')
    wx.showActionSheet({
      itemList: items,
      success: function(res) {
        if (res.tapIndex < templates.length) {
          var template = templates[res.tapIndex]
          var bookId = self.data.books.length > 0 ? self.data.books[0].id : ''
          if (!bookId) {
            wx.showToast({ title: '请先创建账本', icon: 'none' })
            return
          }
          wx.navigateTo({
            url: '/packageCreate/pages/create/book/add-entry/add-entry?bookId=' + bookId + '&templateId=' + template.id
          })
        }
      }
    })
  },

  goExport: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/export/export' })
  },

  preventBubble: function() {
    // 阻止事件冒泡到遮罩层
  },

  formatAmount: function(amount) {
    return Number(amount).toFixed(2)
  }
})
