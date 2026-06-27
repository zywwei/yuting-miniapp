var bookManager = require('../../../utils/book-manager.js')

Page({
  data: {
    books: [],
    overview: {},
    recentEntries: [],
    showAddBook: false,
    newBookName: '',
    newBookIcon: '💰',
    iconOptions: ['💰', '📝', '🏠', '✈️', '🎂', '🎄', '💼', '📚', '🎮', '🛒', '🍜', '🚌']
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
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
    var overview = bookManager.getOverviewStats()
    var allEntries = bookManager.getEntries()
    var recentEntries = allEntries.slice(0, 5).map(function(e) {
      e.categoryIcon = bookManager.getCategoryIcon(e.type, e.category)
      e.categoryName = bookManager.getCategoryName(e.type, e.category)
      return e
    })
    this.setData({ books: books, archivedBooks: archivedBooks, overview: overview, recentEntries: recentEntries })
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
