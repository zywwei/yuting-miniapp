var speak = require('../../../utils/speak.js')
var achievements = require('../../../utils/achievements.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')
var cardsData = require('../../../utils/cards-data.js')

Page({
  data: {
    cards: [],
    currentIndex: 0,
    showPinyin: true,
    learnedCount: 0,
    showAIPanel: false,
    aiQuickQuestions: []
  },

  onLoad: function(options) {
    this._initId = options.id || ''
    this.loadCards()
  },

  loadCards: function() {
    var result = cardsData.loadCards()
    var cards = result.cards
    var index = 0
    if (this._initId) {
      // 从全部字列表点进来时，定位到对应字
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].id === this._initId) {
          index = i
          break
        }
      }
      this._initId = null
    } else {
      // 默认定位到最简单的未学字（字表按 L1→L4 简单到复杂排序，取第一个未学）
      for (var j = 0; j < cards.length; j++) {
        if (!cards[j].learned) {
          index = j
          break
        }
      }
    }
    this.setData({
      cards: cards,
      learnedCount: result.learnedCount,
      currentIndex: index
    })
  },

  togglePinyin: function() {
    this.setData({ showPinyin: !this.data.showPinyin })
  },

  prevCard: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      this.setData({ currentIndex: currentIndex - 1 })
      this.updateAIPanelIfOpen()
    }
  },

  nextCard: function() {
    var currentIndex = this.data.currentIndex
    var cards = this.data.cards
    if (currentIndex < cards.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 })
      this.updateAIPanelIfOpen()
    }
  },

  // 跳转全部字列表页
  goAllCards: function() {
    wx.navigateTo({ url: '/packageLearn/pages/cards/list/index' })
  },

  openAIPanel: function() {
    var card = this.data.cards[this.data.currentIndex]
    if (!card) return
    this.setData({
      showAIPanel: true,
      aiQuickQuestions: learnAIHelper.getQuickQuestions('cards', card)
    })
  },

  closeAIPanel: function() {
    this.setData({ showAIPanel: false })
  },

  updateAIPanelIfOpen: function() {
    if (this.data.showAIPanel) {
      var card = this.data.cards[this.data.currentIndex]
      if (card) {
        this.setData({
          aiQuickQuestions: learnAIHelper.getQuickQuestions('cards', card)
        })
      }
    }
  },

  markLearned: function() {
    var self = this
    var cards = self.data.cards
    var currentIndex = self.data.currentIndex
    var card = cards[currentIndex]
    if (!card) return

    // 写入数据层（本地 + 云端）
    cardsData.markLearned(card.id, card.word)

    // 刷新当前卡片状态与计数
    cards[currentIndex].learned = true
    var learnedCount = 0
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].learned) learnedCount++
    }
    self.setData({ cards: cards, learnedCount: learnedCount })

    wx.showToast({ title: '已学会！', icon: 'success' })

    var newAchievements = achievements.checkAchievements()
    if (newAchievements.length > 0) {
      setTimeout(function() {
        wx.showToast({
          title: '🎉 解锁: ' + newAchievements[0].title,
          icon: 'success',
          duration: 2000
        })
      }, 1500)
    }

    if (currentIndex < cards.length - 1) {
      setTimeout(function() {
        self.setData({ currentIndex: currentIndex + 1 })
      }, 500)
    }
  },

  speakWord: function() {
    var card = this.data.cards[this.data.currentIndex]
    if (!card) return
    speak.speak(card.word)
  }
})
