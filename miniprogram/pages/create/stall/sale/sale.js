var stallManager = require('../../../../utils/stall-manager.js')
var achievements = require('../../../../utils/achievements.js')
var stallUtils = require('../../../../utils/stall-utils.js')

Page({
  data: {
    products: [],
    allProducts: [],
    cart: [],
    originalTotal: 0,
    total: 0,
    discount: 10,
    customDiscount: '',
    discountAmount: 0,
    paymentReceived: '',
    change: 0,
    shortage: 0,
    lastSaleItems: [],
    searchKeyword: '',
    categories: [],
    currentCategory: '',
    sortBy: 'default',
    showSortMenu: false,
    showCelebration: false,
    celebrationTotal: 0,
    confetti: []
  },

  onLoad: function() {
    var settings = stallManager.getSettings()
    if (!settings.isOpen) {
      wx.showModal({
        title: '尚未营业',
        content: '请先开始营业后再开单',
        showCancel: false,
        success: function() {
          wx.navigateBack()
        }
      })
      return
    }
    // 加载默认折扣
    var defaultDiscount = stallManager.getDefaultDiscount()
    this.setData({
      discount: defaultDiscount,
      customDiscount: defaultDiscount < 10 ? String(defaultDiscount) : '',
      categories: stallManager.getCategories()
    })
    this.loadProducts()
    stallUtils.setThemeColor()
  },

  onShow: function() {
    this.loadProducts()
  },

  loadProducts: function() {
    var products = stallManager.getProducts().filter(function(p) { return p.quantity > 0 })
    
    // 标记热销商品（最近7天销量前3），使用缓存避免重复计算
    var sales = stallManager.getSales()
    if (!this._hotCache || this._hotCache.salesLen !== sales.length) {
      var recentSales = sales.filter(function(s) {
        var d = new Date()
        d.setDate(d.getDate() - 7)
        return new Date(s.createdAt) >= d
      })
      
      var productSales = {}
      recentSales.forEach(function(sale) {
        sale.items.forEach(function(item) {
          productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity
        })
      })
      
      var sortedIds = Object.keys(productSales).sort(function(a, b) {
        return productSales[b] - productSales[a]
      }).slice(0, 3)
      
      this._hotCache = { salesLen: sales.length, hotIds: sortedIds }
    }
    
    var hotIds = this._hotCache.hotIds
    products.forEach(function(p) {
      p.isHot = hotIds.indexOf(p.id) >= 0
    })
    
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

  applyFilterAndSort: function() {
    var allProducts = this.data.allProducts || []
    var keyword = this.data.searchKeyword
    var category = this.data.currentCategory
    var sortBy = this.data.sortBy

    // 分类过滤
    var filtered = category ? allProducts.filter(function(p) {
      return p.category === category
    }) : allProducts

    // 关键词过滤
    if (keyword) {
      filtered = filtered.filter(function(p) {
        return p.name.toLowerCase().indexOf(keyword) >= 0
      })
    }

    // 排序
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
    } else if (sortBy === 'price') {
      filtered = filtered.slice().sort(function(a, b) {
        return a.salePrice - b.salePrice
      })
    }

    this.setData({ products: filtered })
  },

  selectProduct: function(e) {
    var id = e.currentTarget.dataset.id
    var products = this.data.products
    var cart = this.data.cart

    var existing = null
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].productId === id) {
        existing = cart[i]
        break
      }
    }

    if (existing) {
      cart = cart.filter(function(item) { return item.productId !== id })
    } else {
      var product = null
      for (var i = 0; i < products.length; i++) {
        if (products[i].id === id) {
          product = products[i]
          break
        }
      }
      if (product) {
        cart.push({
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.salePrice,
          costPrice: product.costPrice || 0,
          subtotal: product.salePrice
        })
      }
    }

    this.setData({ cart: cart })
    this.calcTotal()
    this.updateSelection()
  },

  updateQuantity: function(e) {
    var id = e.currentTarget.dataset.id
    var action = e.currentTarget.dataset.action
    var cart = this.data.cart

    for (var i = 0; i < cart.length; i++) {
      if (cart[i].productId === id) {
        if (action === 'add') {
          cart[i].quantity++
        } else if (action === 'sub') {
          cart[i].quantity--
          if (cart[i].quantity <= 0) {
            cart.splice(i, 1)
          }
        }
        cart[i].subtotal = cart[i].quantity * cart[i].unitPrice
        break
      }
    }

    this.setData({ cart: cart })
    this.calcTotal()
    this.updateSelection()
  },

  calcTotal: function() {
    var cart = this.data.cart
    var originalTotal = 0
    for (var i = 0; i < cart.length; i++) {
      originalTotal += cart[i].subtotal
    }
    // 转换为分计算，避免浮点数精度问题，结果保留2位小数
    originalTotal = Math.round(originalTotal * 100) / 100
    
    // 应用折扣
    var discount = this.data.discount
    var total = stallUtils.applyDiscount(originalTotal, discount)
    var discountAmount = Math.round((originalTotal - total) * 100) / 100
    
    this.setData({ 
      originalTotal: originalTotal,
      total: total,
      discountAmount: discountAmount
    })
    this.calcChange()
  },

  setDiscount: function(e) {
    var discount = parseInt(e.currentTarget.dataset.discount)
    this.setData({ 
      discount: discount,
      customDiscount: String(discount)
    })
    this.calcTotal()
  },

  onDiscountInput: function(e) {
    var value = e.detail.value
    var discount = parseFloat(value) || 10
    if (discount < 0) discount = 0
    if (discount > 10) discount = 10
    this.setData({ 
      customDiscount: value,
      discount: discount
    })
    this.calcTotal()
  },

  onPaymentInput: function(e) {
    this.setData({ paymentReceived: e.detail.value })
    this.calcChange()
  },

  calcChange: function() {
    var payment = parseFloat(this.data.paymentReceived) || 0
    var total = this.data.total
    if (payment > 0) {
      // 转换为分计算，避免浮点数精度问题，结果保留2位小数
      var change = Math.round((payment - total) * 100) / 100
      var shortage = change < 0 ? Math.abs(change) : 0
      this.setData({ change: change, shortage: shortage })
    } else {
      this.setData({ change: 0, shortage: 0 })
    }
  },

  updateSelection: function() {
    var cart = this.data.cart
    var products = this.data.products
    for (var i = 0; i < products.length; i++) {
      products[i].selected = false
      for (var j = 0; j < cart.length; j++) {
        if (cart[j].productId === products[i].id) {
          products[i].selected = true
          break
        }
      }
    }
    this.setData({ products: products })
  },

  confirmSale: function() {
    // 检查营业状态
    if (!stallManager.getSettings().isOpen) {
      wx.showModal({
        title: '已打烊',
        content: '营业已结束，无法开单',
        showCancel: false
      })
      return
    }

    var cart = this.data.cart
    if (cart.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }

    // 校验库存
    var products = stallManager.getProducts()
    for (var i = 0; i < cart.length; i++) {
      for (var j = 0; j < products.length; j++) {
        if (products[j].id === cart[i].productId && cart[i].quantity > products[j].quantity) {
          wx.showToast({ title: cart[i].productName + '库存不足', icon: 'none' })
          return
        }
      }
    }

    var payment = parseFloat(this.data.paymentReceived) || 0
    if (payment < this.data.total) {
      wx.showToast({ title: '付款金额不足', icon: 'none' })
      return
    }

    var sale = {
      items: cart,
      originalTotal: this.data.originalTotal,
      total: this.data.total,
      discount: this.data.discount,
      discountAmount: this.data.discountAmount,
      paymentReceived: payment,
      change: this.data.change
    }

    stallManager.addSale(sale)

    // 保存本次销售商品用于快速再来一单
    this.setData({ lastSaleItems: JSON.parse(JSON.stringify(cart)) })

    // 显示庆祝动画
    this.showCelebration(this.data.total)

    // 检查挑战完成
    var newChallenges = stallManager.checkChallenges()
    if (newChallenges.length > 0) {
      setTimeout(function() {
        wx.showModal({
          title: '🎉 挑战完成！',
          content: '完成挑战：' + newChallenges.map(function(c) { return c.title }).join('、'),
          showCancel: false
        })
      }, 500)
    }

    wx.showToast({ title: '收款成功', icon: 'success' })

    // Check achievements
    achievements.checkAchievementsAsync().then(function(newAchievements) {
      if (newAchievements && newAchievements.length > 0) {
        var popup = this.selectComponent('#achievementPopup')
        if (popup) {
          popup.showAchievements(newAchievements)
        }
      }
    }.bind(this)).catch(function(err) {
      console.warn('成就检查失败:', err)
    })

    // Reset
    this._hotCache = null
    this.setData({
      cart: [],
      total: 0,
      paymentReceived: '',
      change: 0
    })
    this.loadProducts()
    this.updateSelection()
  },

  repeatLastSale: function() {
    if (this.data.lastSaleItems.length === 0) {
      wx.showToast({ title: '暂无历史订单', icon: 'none' })
      return
    }

    var cart = this.data.lastSaleItems.map(function(item) {
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        subtotal: item.subtotal
      }
    })
    
    this.setData({ cart: cart })
    this.calcTotal()
    this.updateSelection()
    wx.showToast({ title: '已填充上次商品', icon: 'success' })
  },

  goAddProduct: function() {
    wx.navigateTo({ url: '/pages/create/stall/add-product/add-product' })
  },

  showCelebration: function(total) {
    var colors = ['#FF6B8A', '#FFD700', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4']
    var confetti = []
    for (var i = 0; i < 20; i++) {
      confetti.push({
        id: 'c_' + i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotate: Math.random() * 360
      })
    }
    this.setData({
      showCelebration: true,
      celebrationTotal: total,
      confetti: confetti
    })
    var that = this
    setTimeout(function() {
      that.setData({ showCelebration: false })
    }, 3000)
  },

  hideCelebration: function() {
    this.setData({ showCelebration: false })
  }
})
