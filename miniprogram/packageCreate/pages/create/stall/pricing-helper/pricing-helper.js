var stallUtils = require('/packageCreate/utils/stall-utils.js')

Page({
  data: {
    costPrice: '',
    profitRate: 30,
    customRate: '',
    salePrice: 0,
    profit: 0,
    presetRates: [20, 30, 50, 100, 200],
    priceTable: []
  },

  onLoad: function() {
    stallUtils.setThemeColor()
  },

  onCostInput: function(e) {
    this.setData({ costPrice: e.detail.value })
    this.calcPrice()
  },

  setProfitRate: function(e) {
    var rate = parseInt(e.currentTarget.dataset.rate)
    this.setData({
      profitRate: rate,
      customRate: String(rate)
    })
    this.calcPrice()
  },

  onCustomRateInput: function(e) {
    var value = e.detail.value
    var rate = parseFloat(value) || 0
    this.setData({
      customRate: value,
      profitRate: rate
    })
    this.calcPrice()
  },

  calcPrice: function() {
    var cost = parseFloat(this.data.costPrice) || 0
    var rate = this.data.profitRate
    if (cost <= 0) {
      this.setData({ salePrice: 0, profit: 0, priceTable: [] })
      return
    }

    var salePrice = Math.round(cost * (1 + rate / 100) * 100) / 100
    var profit = Math.round((salePrice - cost) * 100) / 100

    var presetRates = this.data.presetRates
    var priceTable = []
    for (var i = 0; i < presetRates.length; i++) {
      var r = presetRates[i]
      var sp = Math.round(cost * (1 + r / 100) * 100) / 100
      priceTable.push({
        rate: r,
        price: sp,
        profit: Math.round((sp - cost) * 100) / 100
      })
    }

    this.setData({
      salePrice: salePrice,
      profit: profit,
      priceTable: priceTable
    })
  },

  clear: function() {
    this.setData({
      costPrice: '',
      profitRate: 30,
      customRate: '',
      salePrice: 0,
      profit: 0,
      priceTable: []
    })
  }
})
