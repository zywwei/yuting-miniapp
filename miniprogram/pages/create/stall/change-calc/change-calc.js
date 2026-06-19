var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    total: '',
    received: '',
    change: 0
  },

  onLoad: function() {
    this.setThemeColor()
  },

  onTotalInput: function(e) {
    this.setData({ total: e.detail.value })
    this.calcChange()
  },

  onReceivedInput: function(e) {
    this.setData({ received: e.detail.value })
    this.calcChange()
  },

  setReceived: function(e) {
    this.setData({ received: e.currentTarget.dataset.amount })
    this.calcChange()
  },

  calcChange: function() {
    var total = parseFloat(this.data.total) || 0
    var received = parseFloat(this.data.received) || 0
    if (received > 0) {
      this.setData({ change: received - total })
    } else {
      this.setData({ change: 0 })
    }
  },

  clear: function() {
    this.setData({ total: '', received: '', change: 0 })
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
