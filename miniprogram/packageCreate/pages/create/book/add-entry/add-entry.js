var bookManager = require('../../../../utils/book-manager.js')
var pageHelpers = require('../../../../../utils/page-helpers.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    bookId: '',
    book: null,
    books: [],
    entryId: '',
    isEdit: false,
    type: 'expense',
    category: '',
    amount: '',
    note: '',
    date: '',
    time: '',
    tags: [],
    images: [],
    repeatRule: '',
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
    var navInfo = pageHelpers.getNavBarInfo()
    var today = bookManager.getTodayStr()
    var now = new Date()
    var time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    var books = bookManager.getBooks().filter(function(b) { return !b.isArchived })
    var bookId = options.bookId
    var book = bookManager.getBook(bookId)
    if (!book) {
      wx.showToast({ title: '账本不存在', icon: 'none' })
      setTimeout(function() {
        wx.navigateBack()
      }, 1500)
      return
    }
    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      bookId: bookId,
      book: book,
      books: books,
      entryId: options.entryId || '',
      isEdit: !!options.entryId,
      date: today,
      time: time
    })
    this.loadCategories()
    if (options.entryId) {
      this.loadEntry(options.entryId)
    } else if (options.templateId) {
      this.loadTemplate(options.templateId)
    } else if (options.copyId) {
      this.loadCopyEntry(options.copyId)
    }
  },

  loadCopyEntry: function(entryId) {
    var entries = bookManager.getEntries(this.data.bookId)
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === entryId) {
        this.setData({
          type: entries[i].type,
          category: entries[i].category,
          amount: String(entries[i].amount),
          note: entries[i].note || '',
          tags: entries[i].tags || [],
          repeatRule: entries[i].repeatRule || ''
        })
        break
      }
    }
  },

  loadTemplate: function(templateId) {
    var templates = bookManager.getTemplates()
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === templateId) {
        this.setData({
          type: templates[i].type,
          category: templates[i].category,
          amount: String(templates[i].amount || ''),
          note: templates[i].note || '',
          tags: templates[i].tags || []
        })
        break
      }
    }
  },

  loadEntry: function(entryId) {
    var entries = bookManager.getEntries(this.data.bookId)
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === entryId) {
        this.setData({
          type: entries[i].type,
          category: entries[i].category,
          amount: String(entries[i].amount),
          note: entries[i].note || '',
          date: entries[i].date,
          time: entries[i].time,
          tags: entries[i].tags || [],
          images: entries[i].images || [],
          repeatRule: entries[i].repeatRule || '',
          nextRepeatDate: entries[i].nextRepeatDate || ''
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

  switchBook: function(e) {
    var bookId = e.currentTarget.dataset.id
    var book = bookManager.getBook(bookId)
    this.setData({ bookId: bookId, book: book })
  },

  goBack: function() {
    wx.navigateBack()
  },

  showBookPicker: function() {
    var books = this.data.books
    var names = books.map(function(b) { return b.icon + ' ' + b.name })
    names.push('取消')
    var self = this
    wx.showActionSheet({
      itemList: names,
      success: function(res) {
        if (res.tapIndex < books.length) {
          var book = books[res.tapIndex]
          self.setData({ bookId: book.id, book: book })
        }
      }
    })
  },

  onAmountInput: function(e) {
    this.setData({ amount: e.detail.value })
  },

  onNoteInput: function(e) {
    this.setData({ note: e.detail.value })
  },

  showQuickPhrases: function() {
    var phrases = this.getQuickPhrases()
    var self = this
    phrases.push('取消')
    wx.showActionSheet({
      itemList: phrases,
      success: function(res) {
        if (res.tapIndex < phrases.length - 1) {
          self.setData({ note: phrases[res.tapIndex] })
        }
      }
    })
  },

  getQuickPhrases: function() {
    var type = this.data.type
    if (type === 'expense') return ['早餐', '午餐', '晚餐', '零食', '交通', '购物', '娱乐', '医疗']
    if (type === 'income') return ['工资', '奖金', '红包', '退款', '兼职', '理财收益']
    return ['存款', '取款', '借出', '借入', '还款', '理财买入', '理财赎回']
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

  chooseImage: function() {
    var self = this
    wx.chooseImage({
      count: Math.max(0, 3 - self.data.images.length),
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var images = self.data.images.concat(res.tempFilePaths)
        self.setData({ images: images })
      }
    })
  },

  removeImage: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.images.filter(function(img, i) { return i !== index })
    this.setData({ images: images })
  },

  previewImage: function(e) {
    var url = e.currentTarget.dataset.url
    wx.previewImage({ urls: this.data.images, current: url })
  },

  selectRepeatRule: function(e) {
    var rule = e.currentTarget.dataset.rule
    var nextDate = ''
    if (rule) {
      var d = new Date()
      if (rule === 'daily') d.setDate(d.getDate() + 1)
      else if (rule === 'weekly') d.setDate(d.getDate() + 7)
      else if (rule === 'monthly') d.setMonth(d.getMonth() + 1)
      else if (rule === 'yearly') d.setFullYear(d.getFullYear() + 1)
      nextDate = d.toISOString().substring(0, 10)
    }
    this.setData({ repeatRule: rule, nextRepeatDate: nextDate })
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
      tags: this.data.tags,
      images: this.data.images,
      repeatRule: this.data.repeatRule,
      nextRepeatDate: this.data.nextRepeatDate || ''
    }
    try {
      if (this.data.isEdit) {
        bookManager.updateEntry(this.data.entryId, entry)
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        bookManager.addEntry(entry)
        wx.showToast({ title: '保存成功', icon: 'success' })
      }
      setTimeout(function() {
        wx.navigateBack()
      }, 800)
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
      console.error('保存记录失败:', err)
    }
  },

  deleteEntry: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          bookManager.removeEntry(self.data.entryId).then(function() {
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            setTimeout(function() {
              wx.navigateBack()
            }, 1500)
          }).catch(function(err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
            console.error('删除记录失败:', err)
          })
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
