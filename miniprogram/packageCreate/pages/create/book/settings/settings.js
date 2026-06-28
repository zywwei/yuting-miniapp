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
    if (!book) {
      wx.showToast({ title: '账本不存在', icon: 'none' })
      setTimeout(function() {
        wx.navigateBack()
      }, 1500)
      return
    }
    var days = book.reminderDays || [1, 2, 3, 4, 5, 6, 0]
    var reminderDaysMap = {}
    for (var i = 0; i < days.length; i++) reminderDaysMap[days[i]] = true
    this.setData({ book: book, reminderDaysMap: reminderDaysMap })
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

  toggleReminder: function() {
    var enabled = !this.data.book.reminderEnabled
    bookManager.updateBook(this.data.bookId, { reminderEnabled: enabled })
    if (enabled) {
      bookManager.requestReminderPermission()
    }
    this.loadData()
    wx.showToast({ title: enabled ? '已开启提醒' : '已关闭提醒', icon: 'success' })
  },

  onReminderTimeChange: function(e) {
    bookManager.updateBook(this.data.bookId, { reminderTime: e.detail.value })
    this.loadData()
  },

  toggleReminderDay: function(e) {
    var day = parseInt(e.currentTarget.dataset.day)
    var days = (this.data.book.reminderDays || [1, 2, 3, 4, 5, 6, 0]).slice()
    var index = days.indexOf(day)
    if (index >= 0) days.splice(index, 1)
    else days.push(day)
    days.sort()
    bookManager.updateBook(this.data.bookId, { reminderDays: days })
    this.loadData()
  },

  deleteBook: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个账本吗？',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          bookManager.removeBook(self.data.bookId).then(function() {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(function() {
              wx.reLaunch({ url: '/packageCreate/pages/create/book/index' })
            }, 800)
          }).catch(function(err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
            console.error('删除账本失败:', err)
          })
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

  exportBackup: function() {
    try {
      var backup = bookManager.exportBackup(this.data.bookId)
      var json = JSON.stringify(backup)
      var fs = wx.getFileSystemManager()
      var filePath = wx.env.USER_DATA_PATH + '/记账备份_' + bookManager.getTodayStr() + '.json'
      fs.writeFileSync(filePath, json, 'utf-8')
      wx.shareFileMessage({
        filePath: filePath,
        fileName: '记账备份_' + bookManager.getTodayStr() + '.json'
      })
    } catch (e) {
      wx.showToast({ title: '备份失败', icon: 'none' })
    }
  },

  importBackup: function() {
    var self = this
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: function(res) {
        var filePath = res.tempFiles[0].path
        var fs = wx.getFileSystemManager()
        try {
          var content = fs.readFileSync(filePath, 'utf-8')
          var data = JSON.parse(content)
          if (!data.books || !data.entries) {
            wx.showToast({ title: '无效的备份文件', icon: 'none' })
            return
          }
          wx.showActionSheet({
            itemList: ['合并（保留本地数据）', '覆盖（清空本地数据）'],
            success: function(action) {
              var mode = action.tapIndex === 0 ? 'merge' : 'overwrite'
              bookManager.importBackup(data, mode)
              wx.showToast({ title: '恢复成功', icon: 'success' })
              self.loadData()
            }
          })
        } catch (e) {
          wx.showToast({ title: '恢复失败', icon: 'none' })
        }
      }
    })
  },

  clearData: function() {
    var self = this
    wx.showModal({
      title: '确认清空',
      content: '清空后将删除该账本下的所有记录，确定要清空吗？',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '清空中...' })
          bookManager.clearBookEntries(self.data.bookId).then(function() {
            wx.hideLoading()
            self.loadData()
            wx.showToast({ title: '已清空', icon: 'success' })
          }).catch(function(err) {
            wx.hideLoading()
            wx.showToast({ title: '清空失败', icon: 'none' })
            console.error('清空账本数据失败:', err)
          })
        }
      }
    })
  },

  restoreArchive: function() {
    var self = this
    bookManager.updateBook(this.data.bookId, { isArchived: false })
    wx.showToast({ title: '已恢复', icon: 'success' })
    self.loadData()
  },

  preventBubble: function() {
    // 阻止事件冒泡到遮罩层
  }
})
