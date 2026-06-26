var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    bookId: '',
    entryId: '',
    isEdit: false,
    type: 'expense',
    category: '',
    amount: '',
    note: '',
    date: '',
    time: '',
    tags: [],
    tagInput: '',
    typeOptions: [
      { value: 'expense', label: '支出' },
      { value: 'income', label: '收入' },
      { value: 'transfer', label: '不计入' }
    ],
    categories: [],
    showKeyboard: true,
    keyboardValue: ''
  },

  onLoad: function(options) {
    var today = bookManager.getTodayStr()
    var now = new Date()
    var time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    this.setData({
      bookId: options.bookId,
      entryId: options.entryId || '',
      isEdit: !!options.entryId,
      date: today,
      time: time
    })
    this.loadCategories()
    if (options.entryId) {
      this.loadEntry(options.entryId)
    }
  },

  loadEntry: function(entryId) {
    var entries = bookManager.getEntries()
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === entryId) {
        this.setData({
          type: entries[i].type,
          category: entries[i].category,
          amount: String(entries[i].amount),
          note: entries[i].note || '',
          date: entries[i].date,
          time: entries[i].time,
          tags: entries[i].tags || []
        })
        break
      }
    }
  },

  loadCategories: function() {
    var categories = bookManager.getCategories(this.data.type)
    this.setData({ categories: categories })
  },

  switchType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ type: type, category: '' })
    this.loadCategories()
  },

  selectCategory: function(e) {
    this.setData({ category: e.currentTarget.dataset.id })
  },

  onAmountInput: function(e) {
    this.setData({ amount: e.detail.value })
  },

  onNoteInput: function(e) {
    this.setData({ note: e.detail.value })
  },

  onDateChange: function(e) {
    this.setData({ date: e.detail.value })
  },

  onTimeChange: function(e) {
    this.setData({ time: e.detail.value })
  },

  onTagInput: function(e) {
    this.setData({ tagInput: e.detail.value })
  },

  addTag: function() {
    var tag = this.data.tagInput.trim()
    if (tag && this.data.tags.indexOf(tag) < 0) {
      var tags = this.data.tags.concat([tag])
      this.setData({ tags: tags, tagInput: '' })
    }
  },

  removeTag: function(e) {
    var index = e.currentTarget.dataset.index
    var tags = this.data.tags.filter(function(t, i) { return i !== index })
    this.setData({ tags: tags })
  },

  save: function() {
    if (!this.data.category) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    var amount = parseFloat(this.data.amount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    var entry = {
      bookId: this.data.bookId,
      type: this.data.type,
      category: this.data.category,
      amount: amount,
      note: this.data.note,
      date: this.data.date,
      time: this.data.time,
      tags: this.data.tags
    }
    if (this.data.isEdit) {
      bookManager.updateEntry(this.data.entryId, entry)
      wx.showToast({ title: '更新成功', icon: 'success' })
    } else {
      bookManager.addEntry(entry)
      wx.showToast({ title: '保存成功', icon: 'success' })
    }
    setTimeout(function() {
      wx.navigateBack()
    }, 1500)
  },

  deleteEntry: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          bookManager.removeEntry(self.data.entryId)
          wx.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(function() {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  },

  saveAsTemplate: function() {
    var entry = {
      type: this.data.type,
      category: this.data.category,
      amount: parseFloat(this.data.amount),
      note: this.data.note,
      tags: this.data.tags
    }
    bookManager.saveAsTemplate(entry)
    wx.showToast({ title: '已保存为模板', icon: 'success' })
  }
})
