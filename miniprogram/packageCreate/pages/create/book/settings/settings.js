var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    bookId: '',
    book: null,
    showIconPicker: false,
    iconOptions: ['💰', '📝', '🏠', '✈️', '🎂', '🎄', '💼', '📚', '🎮', '🛒', '🍜', '🚌'],
    showBudgetInput: false,
    budgetInput: ''
  },

  onLoad: function(options) {
    this.setData({ bookId: options.bookId })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var book = bookManager.getBook(this.data.bookId)
    this.setData({ book: book })
  },

  onNameInput: function(e) {
    bookManager.updateBook(this.data.bookId, { name: e.detail.value })
  },

  onDescriptionInput: function(e) {
    bookManager.updateBook(this.data.bookId, { description: e.detail.value })
  },

  showIconPicker: function() {
    this.setData({ showIconPicker: true })
  },

  hideIconPicker: function() {
    this.setData({ showIconPicker: false })
  },

  selectIcon: function(e) {
    bookManager.updateBook(this.data.bookId, { icon: e.currentTarget.dataset.icon })
    this.setData({ showIconPicker: false })
    this.loadData()
  },

  setDefault: function() {
    bookManager.setDefaultBook(this.data.bookId)
    wx.showToast({ title: '已设为默认', icon: 'success' })
    this.loadData()
  },

  archiveBook: function() {
    var self = this
    wx.showModal({
      title: '确认归档',
      content: '归档后账本将隐藏，可在设置中恢复',
      success: function(res) {
        if (res.confirm) {
          bookManager.archiveBook(self.data.bookId)
          wx.showToast({ title: '已归档', icon: 'success' })
          setTimeout(function() {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  },

  showBudgetDialog: function() {
    this.setData({
      showBudgetInput: true,
      budgetInput: this.data.book.monthlyBudget ? String(this.data.book.monthlyBudget) : ''
    })
  },

  hideBudgetDialog: function() {
    this.setData({ showBudgetInput: false })
  },

  onBudgetInput: function(e) {
    this.setData({ budgetInput: e.detail.value })
  },

  confirmBudget: function() {
    var budget = parseFloat(this.data.budgetInput)
    if (isNaN(budget)) budget = 0
    bookManager.updateBook(this.data.bookId, { monthlyBudget: budget })
    this.setData({ showBudgetInput: false })
    this.loadData()
    wx.showToast({ title: '已设置预算', icon: 'success' })
  },

  deleteBook: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个账本吗？',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          bookManager.removeBook(self.data.bookId)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(function() {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  },

  goCategories: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/categories/categories' })
  },

  goExport: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/book/export/export?bookId=' + this.data.bookId })
  },

  preventBubble: function() {
    // 阻止事件冒泡到遮罩层
  }
})
