var poemsData = require('../../../../utils/poems-data.js')

Page({
  data: {
    poems: [],
    filteredPoems: [],
    levels: [],
    currentLevel: '全部',
    keyword: '',
    unmemorizedOnly: false,
    memorizedCount: 0,
    total: 0
  },

  onLoad: function() {
    this.setData({ levels: poemsData.LEVELS })
    this.loadPoems()
  },

  onShow: function() {
    this.loadPoems()
  },

  loadPoems: function() {
    var result = poemsData.loadPoems()
    this.setData({
      poems: result.poems,
      memorizedCount: result.memorizedCount,
      total: result.poems.length
    })
    this.applyFilter()
  },

  applyFilter: function() {
    var poems = this.data.poems
    var lv = this.data.currentLevel
    var kw = (this.data.keyword || '').trim().toLowerCase()
    var onlyUnmemorized = this.data.unmemorizedOnly

    var filtered = poems.filter(function(p) {
      if (lv !== '全部' && p.level !== lv) return false
      if (onlyUnmemorized && p.memorized) return false
      if (kw) {
        var title = (p.title || '').toLowerCase()
        var author = (p.author || '').toLowerCase()
        var content = (p.content || '').toLowerCase().replace(/\n/g, '')
        if (title.indexOf(kw) < 0 && author.indexOf(kw) < 0 && content.indexOf(kw) < 0) return false
      }
      return true
    })

    this.setData({ filteredPoems: filtered })
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

  toggleUnmemorizedOnly: function() {
    this.setData({ unmemorizedOnly: !this.data.unmemorizedOnly })
    this.applyFilter()
  },

  goLearn: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageLearn/pages/poems/index?id=' + id })
  }
})
