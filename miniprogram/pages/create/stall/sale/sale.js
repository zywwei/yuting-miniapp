var stallManager = require('../../../utils/stall-manager.js')
var achievements = require('../../../utils/achievements.js')

Page({
  data: {
    products: [],
    cart: [],
    total: 0,
    paymentReceived: '',
    change: 0
  },

  onLoad: function() {
    this.loadProducts()
  },

  onShow: function() {
    this.loadProducts()
  },

  loadProducts: function() {
    var products = stallManager.getProducts().filter(function(p) { return p.quantity > 0 })
    this.setData({ products: products })
  },

  selectProduct: function(e) {
    var id = e.currentTarget.dataset.id
    var products = this.data.products
    var cart = this.data.cart

    // Check if already in cart
    var existing = null
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].productId === id) {
        existing = cart[i]
        break
      }
    }

    if (existing) {
      // Already in cart, remove
      cart = cart.filter(function(item) { return item.productId !== id })
    } else {
      // Add to cart
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
          subtotal: product.salePrice,
          maxQty: product.quantity
        })
      }
    }

    this.setData({ cart: cart })
    this.calcTotal()
    this.updateSelection()
  },

  minusQty: function(e) {
    var index = e.currentTarget.dataset.index
    var cart = this.data.cart
    if (cart[index].quantity > 1) {
      cart[index].quantity--
      cart[index].subtotal = cart[index].quantity * cart[index].unitPrice
      this.setData({ cart: cart })
      this.calcTotal()
    }
  },

  plusQty: function(e) {
    var index = e.currentTarget.dataset.index
    var cart = this.data.cart
    if (cart[index].quantity < cart[index].maxQty) {
      cart[index].quantity++
      cart[index].subtotal = cart[index].quantity * cart[index].unitPrice
      this.setData({ cart: cart })
      this.calcTotal()
    } else {
      wx.showToast({ title: '库存不足', icon: 'none' })
    }
  },

  calcTotal: function() {
    var cart = this.data.cart
    var total = 0
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].subtotal
    }
    this.setData({ total: total })
    this.calcChange()
  },

  onPaymentInput: function(e) {
    this.setData({ paymentReceived: e.detail.value })
    this.calcChange()
  },

  calcChange: function() {
    var payment = parseFloat(this.data.paymentReceived) || 0
    var total = this.data.total
    if (payment > 0) {
      this.setData({ change: payment - total })
    } else {
      this.setData({ change: 0 })
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
    var cart = this.data.cart
    if (cart.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }

    var payment = parseFloat(this.data.paymentReceived) || 0
    if (payment < this.data.total) {
      wx.showToast({ title: '付款金额不足', icon: 'none' })
      return
    }

    var sale = {
      items: cart,
      total: this.data.total,
      paymentReceived: payment,
      change: this.data.change
    }

    stallManager.addSale(sale)

    wx.showToast({ title: '收款成功', icon: 'success' })

    // Check achievements (non-blocking)
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
    this.setData({
      cart: [],
      total: 0,
      paymentReceived: '',
      change: 0
    })
    this.loadProducts()
    this.updateSelection()
  },

  goAddProduct: function() {
    wx.navigateTo({ url: '/pages/create/stall/add-product/add-product' })
  }
})
