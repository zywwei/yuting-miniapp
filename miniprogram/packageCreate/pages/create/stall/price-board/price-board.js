var stallManager = require('/packageCreate/utils/stall-manager.js')
var stallUtils = require('/packageCreate/utils/stall-utils.js')

Page({
  data: {
    products: [],
    allProducts: [],
    searchKeyword: '',
    categories: [],
    currentCategory: '',
    sortBy: 'default',
    showSortMenu: false,
    viewMode: 'list'
  },

  onLoad: function() {
    this.setData({ categories: stallManager.getCategories() })
    this.loadData()
    stallUtils.setThemeColor()
  },

  onShow: function() {
    this.loadData()
  },

  onPullDownRefresh: async function() {
    try {
      await stallManager.syncFromCloud()
      this.loadData()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  loadData: function() {
    var products = stallManager.getProducts()

    this.setData({
      allProducts: products
    })
    this.applyFilterAndSort()
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value.toLowerCase() })
    this.applyFilterAndSort()
  },

  filterCategory: function(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.category })
    this.applyFilterAndSort()
  },

  setSortBy: function(e) {
    this.setData({
      sortBy: e.currentTarget.dataset.sort,
      showSortMenu: false
    })
    this.applyFilterAndSort()
  },

  toggleSortMenu: function() {
    this.setData({ showSortMenu: !this.data.showSortMenu })
  },

  closeSortMenu: function() {
    this.setData({ showSortMenu: false })
  },

  toggleViewMode: function() {
    this.setData({ viewMode: this.data.viewMode === 'list' ? 'grid' : 'list' })
  },

  applyFilterAndSort: function() {
    var allProducts = this.data.allProducts || []
    var keyword = this.data.searchKeyword
    var category = this.data.currentCategory
    var sortBy = this.data.sortBy

    var filtered = category ? allProducts.filter(function(p) {
      return p.category === category
    }) : allProducts

    if (keyword) {
      filtered = filtered.filter(function(p) {
        return p.name.toLowerCase().indexOf(keyword) >= 0
      })
    }

    if (sortBy === 'time') {
      filtered = filtered.slice().sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    } else if (sortBy === 'salesCount') {
      filtered = filtered.slice().sort(function(a, b) {
        return (b.totalSold || 0) - (a.totalSold || 0)
      })
    } else if (sortBy === 'salesAmount') {
      filtered = filtered.slice().sort(function(a, b) {
        return (b.totalRevenue || 0) - (a.totalRevenue || 0)
      })
    } else if (sortBy === 'priceAsc') {
      filtered = filtered.slice().sort(function(a, b) {
        return a.salePrice - b.salePrice
      })
    } else if (sortBy === 'priceDesc') {
      filtered = filtered.slice().sort(function(a, b) {
        return b.salePrice - a.salePrice
      })
    }

    this.setData({ products: filtered })
  },

  editProduct: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageCreate/pages/create/stall/add-product/add-product?id=' + id })
  },

  deleteProduct: function(e) {
    var id = e.currentTarget.dataset.id
    var name = e.currentTarget.dataset.name
    var that = this
    wx.showModal({
      title: '删除商品',
      content: '确定要删除「' + name + '」吗？',
      confirmColor: '#FF6B8A',
      success: function(res) {
        if (res.confirm) {
          stallManager.removeProduct(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          that.loadData()
        }
      }
    })
  },

  onProductLongPress: function(e) {
    var id = e.currentTarget.dataset.id
    var name = e.currentTarget.dataset.name
    var that = this
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: function(res) {
        if (res.tapIndex === 0) {
          that.editProduct({ currentTarget: { dataset: { id: id } } })
        } else if (res.tapIndex === 1) {
          that.deleteProduct({ currentTarget: { dataset: { id: id, name: name } } })
        }
      }
    })
  },

  goAddProduct: function() {
    wx.navigateTo({ url: '/packageCreate/pages/create/stall/add-product/add-product' })
  }
})
