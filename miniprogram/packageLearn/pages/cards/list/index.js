var cardsData = require('../../../../utils/cards-data.js')

Page({
  data: {
    cards: [],
    filteredCards: [],
    levels: [],
    currentLevel: '全部',
    keyword: '',
    unlearnedOnly: false,
    learnedCount: 0,
    total: 0
  },

  onLoad: function() {
    this.setData({ levels: cardsData.LEVELS })
    this.loadCards()
  },

  // 从主页返回时刷新已学状态
  onShow: function() {
    this.loadCards()
  },

  loadCards: function() {
    var result = cardsData.loadCards()
    this.setData({
      cards: result.cards,
      learnedCount: result.learnedCount,
      total: result.cards.length
    })
    this.applyFilter()
  },

  // 按等级 / 关键词 / 只看未学 三重过滤
  applyFilter: function() {
    var cards = this.data.cards
    var lv = this.data.currentLevel
    var kw = (this.data.keyword || '').trim().toLowerCase()
    var onlyUnlearned = this.data.unlearnedOnly

    var filtered = cards.filter(function(c) {
      if (lv !== '全部' && c.level !== lv) return false
      if (onlyUnlearned && c.learned) return false
      if (kw) {
        var word = (c.word || '').toLowerCase()
        var pinyin = (c.pinyin || '').toLowerCase().replace(/\s/g, '')
        if (word.indexOf(kw) < 0 && pinyin.indexOf(kw) < 0) return false
      }
      return true
    })

    this.setData({ filteredCards: filtered })
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
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageLearn/pages/cards/index?id=' + id })
  }
})
