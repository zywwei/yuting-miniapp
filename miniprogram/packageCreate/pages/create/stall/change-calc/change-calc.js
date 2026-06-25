var stallManager = require('/packageCreate/utils/stall-manager.js')
var stallUtils = require('/packageCreate/utils/stall-utils.js')

Page({
  data: {
    originalTotal: '',
    total: 0,
    discount: 10,
    customDiscount: '',
    discountAmount: 0,
    received: '',
    change: 0,
    shortage: 0
  },

  onLoad: function() {
    stallUtils.setThemeColor()
  },

  onTotalInput: function(e) {
    this.setData({ originalTotal: e.detail.value })
    this.calcTotal()
  },

  onReceivedInput: function(e) {
    this.setData({ received: e.detail.value })
    this.calcChange()
  },

  setReceived: function(e) {
    this.setData({ received: e.currentTarget.dataset.amount })
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

  calcTotal: function() {
    var originalTotal = parseFloat(this.data.originalTotal) || 0
    var discount = this.data.discount
    
    // 转换为分计算，避免浮点数精度问题，结果保留2位小数
    originalTotal = Math.round(originalTotal * 100) / 100
    var total = stallUtils.applyDiscount(originalTotal, discount)
    var discountAmount = Math.round((originalTotal - total) * 100) / 100
    
    this.setData({ 
      total: total,
      discountAmount: discountAmount
    })
    this.calcChange()
  },

  calcChange: function() {
    var total = parseFloat(this.data.total) || 0
    var received = parseFloat(this.data.received) || 0
    if (received > 0) {
      // 转换为分计算，避免浮点数精度问题，结果保留2位小数
      var change = Math.round((received - total) * 100) / 100
      var shortage = change < 0 ? Math.abs(change) : 0
      this.setData({ change: change, shortage: shortage })
    } else {
      this.setData({ change: 0, shortage: 0 })
    }
  },

  clear: function() {
    this.setData({ 
      originalTotal: '', 
      total: 0, 
      discount: 10, 
      customDiscount: '', 
      discountAmount: 0, 
      received: '', 
      change: 0,
      shortage: 0
    })
  }
})
