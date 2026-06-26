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
    this.setData({ showAddCategory: false })
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

  preventBubble: function() {
    // 阻止事件冒泡到遮罩层
  }
})
