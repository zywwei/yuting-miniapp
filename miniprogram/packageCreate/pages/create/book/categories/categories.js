var bookManager = require('../../../../utils/book-manager.js')

Page({
  data: {
    currentType: 'expense',
    typeOptions: [
      { value: 'expense', label: '支出' },
      { value: 'income', label: '收入' },
      { value: 'transfer', label: '不计入' }
    ],
    categories: [],
    customCategories: [],
    showAddCategory: false,
    editingCategoryId: '',
    newCategoryName: '',
    newCategoryIcon: '',
    iconOptions: ['🍜', '🛒', '🚌', '🎮', '💊', '📚', '🏠', '💡', '👔', '📱', '🎁', '🍪', '🧸', '🐱', '📦', '💼', '🎉', '📈', '💪', '↩️', '🧧', '💵', '🏆', '💰', '🏦', '🏧', '🤝', '📝', '📊', '💳', '📥', '📤']
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var categories = bookManager.getCategories(this.data.currentType)
    var customCategories = bookManager.getCustomCategories()[this.data.currentType] || []
    this.setData({ categories: categories, customCategories: customCategories })
  },

  switchType: function(e) {
    this.setData({ currentType: e.currentTarget.dataset.type })
    this.loadData()
  },

  showAddCategoryDialog: function() {
    this.setData({ showAddCategory: true, newCategoryName: '', newCategoryIcon: this.data.iconOptions[0] })
  },

  hideAddCategoryDialog: function() {
    this.setData({ showAddCategory: false, editingCategoryId: '' })
  },

  onCategoryNameInput: function(e) {
    this.setData({ newCategoryName: e.detail.value })
  },

  selectIcon: function(e) {
    this.setData({ newCategoryIcon: e.currentTarget.dataset.icon })
  },

  confirmAddCategory: function() {
    var name = this.data.newCategoryName.trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    bookManager.addCustomCategory(this.data.currentType, {
      name: name,
      icon: this.data.newCategoryIcon || '📦'
    })
    this.setData({ showAddCategory: false })
    this.loadData()
    wx.showToast({ title: '添加成功', icon: 'success' })
  },

  removeCategory: function(e) {
    var id = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个分类吗？',
      success: function(res) {
        if (res.confirm) {
          bookManager.removeCustomCategory(self.data.currentType, id)
          self.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  editCategory: function(e) {
    var id = e.currentTarget.dataset.id
    var name = e.currentTarget.dataset.name
    var icon = e.currentTarget.dataset.icon
    this.setData({
      showAddCategory: true,
      editingCategoryId: id,
      newCategoryName: name,
      newCategoryIcon: icon
    })
  },

  confirmEditCategory: function() {
    var name = this.data.newCategoryName.trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    bookManager.updateCustomCategory(this.data.currentType, this.data.editingCategoryId, {
      name: name,
      icon: this.data.newCategoryIcon
    })
    this.setData({ showAddCategory: false, editingCategoryId: '' })
    this.loadData()
    wx.showToast({ title: '修改成功', icon: 'success' })
  },

  moveCategoryUp: function(e) {
    var index = e.currentTarget.dataset.index
    if (index <= 0) return
    var categories = this.data.customCategories.slice()
    var temp = categories[index]
    categories[index] = categories[index - 1]
    categories[index - 1] = temp
    this.saveCustomCategories(categories)
  },

  moveCategoryDown: function(e) {
    var index = e.currentTarget.dataset.index
    var categories = this.data.customCategories.slice()
    if (index >= categories.length - 1) return
    var temp = categories[index]
    categories[index] = categories[index + 1]
    categories[index + 1] = temp
    this.saveCustomCategories(categories)
  },

  saveCustomCategories: function(categories) {
    var settings = bookManager.getSettings()
    if (!settings.customCategories) settings.customCategories = {}
    settings.customCategories[this.data.currentType] = categories
    bookManager.saveSettings(settings)
    this.setData({ customCategories: categories })
  },

  preventBubble: function() {
    // 阻止事件冒泡到遮罩层
  }
})
