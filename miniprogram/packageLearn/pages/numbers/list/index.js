var numbersData = require('../../../../utils/numbers-data.js')

Page({
  data: {
    numbers: [],
    filteredNumbers: [],
    levels: [],
    currentLevel: '全部',
    keyword: '',
    unlearnedOnly: false,
    learnedCount: 0,
    total: 0
  },

  onLoad: function() {
    this.setData({ levels: numbersData.LEVELS })
    this.loadNumbers()
  },

  onShow: function() {
    this.loadNumbers()
  },

  loadNumbers: function() {
    var result = numbersData.loadNumbers()
    this.setData({
      numbers: result.numbers,
      learnedCount: result.learnedCount,
      total: result.numbers.length
    })
    this.applyFilter()
  },

  applyFilter: function() {
    var numbers = this.data.numbers
    var lv = this.data.currentLevel
    var kw = (this.data.keyword || '').trim().toLowerCase()
    var onlyUnlearned = this.data.unlearnedOnly

    var filtered = numbers.filter(function(n) {
      if (lv !== '全部' && n.level !== lv) return false
      if (onlyUnlearned && n.learned) return false
      if (kw) {
        var numStr = String(n.number)
        var chinese = (n.chinese || '').toLowerCase()
        if (numStr.indexOf(kw) < 0 && chinese.indexOf(kw) < 0) return false
      }
      return true
    })

    this.setData({ filteredNumbers: filtered })
  },

  selectLevel: function(e) {
    this.setData({ currentLevel: e.currentTarget.dataset.key })
    this.applyFilter()
  },

  onSearch: function(e) {
    this.setData({ keyword: e.detail.value })
    this.applyFilter()
  },

  clearSearch: function() {
    this.setData({ keyword: '' })
    this.applyFilter()
  },

  toggleUnlearnedOnly: function() {
    this.setData({ unlearnedOnly: !this.data.unlearnedOnly })
    this.applyFilter()
  },

  goLearn: function(e) {
    var number = e.currentTarget.dataset.number
    wx.navigateTo({ url: '/packageLearn/pages/numbers/index?id=' + number })
  }
})
