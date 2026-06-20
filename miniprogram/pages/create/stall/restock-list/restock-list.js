var stallManager = require('../../../../utils/stall-manager.js')

var RESTOCK_KEY = 'stallRestockList'

Page({
  data: {
    items: [],
    checkedCount: 0,
    products: [],
    filteredProducts: [],
    showAdd: false,
    selectedProduct: null,
    addQuantity: '',
    searchKeyword: ''
  },

  onLoad: function() {
    this.loadItems()
    this.loadProducts()
    this.setThemeColor()
  },

  onShow: function() {
    this.loadProducts()
  },

  loadItems: function() {
    var items = wx.getStorageSync(RESTOCK_KEY) || []
    var checkedCount = items.filter(function(item) { return item.checked }).length
    this.setData({ items: items, checkedCount: checkedCount })
  },

  saveItems: function() {
    wx.setStorageSync(RESTOCK_KEY, this.data.items)
  },

  loadProducts: function() {
    var products = stallManager.getProducts()
    this.setData({ products: products, filteredProducts: products })
  },

  showAddPanel: function() {
    this.setData({
      showAdd: true,
      selectedProduct: null,
      addQuantity: '',
      searchKeyword: '',
      filteredProducts: this.data.products
    })
  },

  hideAddPanel: function() {
    this.setData({ showAdd: false })
  },

  onSearchInput: function(e) {
    var keyword = e.detail.value.toLowerCase()
    var products = this.data.products
    var filtered = keyword ? products.filter(function(p) {
      return p.name.toLowerCase().indexOf(keyword) >= 0
    }) : products
    this.setData({ searchKeyword: keyword, filteredProducts: filtered })
  },

  selectProduct: function(e) {
    var id = e.currentTarget.dataset.id
    var products = this.data.products
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === id) {
        this.setData({ selectedProduct: products[i] })
        break
      }
    }
  },

  onQuantityInput: function(e) {
    this.setData({ addQuantity: e.detail.value })
  },

  addItem: function() {
    var product = this.data.selectedProduct
    var quantity = parseInt(this.data.addQuantity) || 0
    if (!product) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    if (quantity <= 0) {
      wx.showToast({ title: '请输入数量', icon: 'none' })
      return
    }

    var items = this.data.items
    var exists = false
    for (var i = 0; i < items.length; i++) {
      if (items[i].productId === product.id) {
        items[i].quantity = quantity
        exists = true
        break
      }
    }

    if (!exists) {
      items.push({
        id: 'restock_' + Date.now(),
        productId: product.id,
        name: product.name,
        quantity: quantity,
        checked: false
      })
    }

    this.setData({ items: items, showAdd: false, checkedCount: items.filter(function(item) { return item.checked }).length })
    this.saveItems()
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  toggleCheck: function(e) {
    var id = e.currentTarget.dataset.id
    var items = this.data.items
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items[i].checked = !items[i].checked
        break
      }
    }
    this.setData({ items: items, checkedCount: items.filter(function(item) { return item.checked }).length })
    this.saveItems()
  },

  updateQuantity: function(e) {
    var id = e.currentTarget.dataset.id
    var action = e.currentTarget.dataset.action
    var items = this.data.items
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        if (action === 'add') {
          items[i].quantity++
        } else if (action === 'sub') {
          items[i].quantity--
          if (items[i].quantity <= 0) {
            items.splice(i, 1)
          }
        }
        break
      }
    }
    this.setData({ items: items, checkedCount: items.filter(function(item) { return item.checked }).length })
    this.saveItems()
  },

  removeItem: function(e) {
    var id = e.currentTarget.dataset.id
    var items = this.data.items.filter(function(item) {
      return item.id !== id
    })
    this.setData({ items: items, checkedCount: items.filter(function(item) { return item.checked }).length })
    this.saveItems()
  },

  clearChecked: function() {
    var items = this.data.items.filter(function(item) {
      return !item.checked
    })
    this.setData({ items: items, checkedCount: 0 })
    this.saveItems()
    wx.showToast({ title: '已清除', icon: 'success' })
  },

  getFilteredProducts: function() {
    var keyword = this.data.searchKeyword
    var products = this.data.products
    if (!keyword) return products
    return products.filter(function(p) {
      return p.name.toLowerCase().indexOf(keyword.toLowerCase()) >= 0
    })
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  }
})
