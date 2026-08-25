var speak = require('../../../utils/speak.js')
var achievements = require('../../../utils/achievements.js')
var poemsData = require('../../../utils/poems-data.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')

Page({
  
  onUnload: function() {
    if (this._flipTimer) { clearTimeout(this._flipTimer); this._flipTimer = null }
  },

  data: {
    poems: [],
    currentIndex: 0,
    memorizedCount: 0,
    showAIPanel: false,
    aiQuickQuestions: []
  },

  onLoad: function(options) {
    this._initId = options.id || ''
    this.loadPoems()
  },

  loadPoems: function() {
    var result = poemsData.loadPoems()
    var poems = result.poems
    var index = 0
    if (this._initId) {
      for (var i = 0; i < poems.length; i++) {
        if (poems[i].id === this._initId) { index = i; break }
      }
      this._initId = null
    } else {
      for (var j = 0; j < poems.length; j++) {
        if (!poems[j].memorized) { index = j; break }
      }
    }
    this.setData({
      poems: poems,
      memorizedCount: result.memorizedCount,
      currentIndex: index
    })
  },

  // 跳转全部古诗列表页
  goAllPoems: function() {
    wx.navigateTo({ url: '/packageLearn/pages/poems/list/index' })
  },

  prevPoem: function() {
    if (this._flipTimer) { clearTimeout(this._flipTimer); this._flipTimer = null } // F4
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      this.setData({ currentIndex: currentIndex - 1 })
      this.updateAIPanelIfOpen()
    }
  },

  nextPoem: function() {
    if (this._flipTimer) { clearTimeout(this._flipTimer); this._flipTimer = null } // F4
    var currentIndex = this.data.currentIndex
    var poems = this.data.poems
    if (currentIndex < poems.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 })
      this.updateAIPanelIfOpen()
    }
  },

  openAIPanel: function() {
    var poem = this.data.poems[this.data.currentIndex]
    if (!poem) return
    this.setData({
      showAIPanel: true,
      aiQuickQuestions: learnAIHelper.getQuickQuestions('poems', poem)
    })
  },

  closeAIPanel: function() {
    this.setData({ showAIPanel: false })
  },

  updateAIPanelIfOpen: function() {
    if (this.data.showAIPanel) {
      var poem = this.data.poems[this.data.currentIndex]
      if (poem) {
        this.setData({
          aiQuickQuestions: learnAIHelper.getQuickQuestions('poems', poem)
        })
      }
    }
  },

  markMemorized: function() {
    var self = this
    var poems = self.data.poems
    var currentIndex = self.data.currentIndex
    var poem = poems[currentIndex]
    if (!poem) return

    // 写入数据层（本地 + 云端）
    poemsData.markMemorized(poem.id, poem.title)

    poems[currentIndex].memorized = true
    var memorizedCount = 0
    for (var i = 0; i < poems.length; i++) {
      if (poems[i].memorized) memorizedCount++
    }

    self.setData({ poems: poems, memorizedCount: memorizedCount })

    speak.speakSuccess()

    wx.showToast({ title: '已背诵！', icon: 'success' })

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

    if (currentIndex < poems.length - 1) {
      this._flipTimer = setTimeout(function() {
        self.setData({ currentIndex: currentIndex + 1 })
      }, 500)
    }
  },

  speakTitle: function() {
    var poem = this.data.poems[this.data.currentIndex]
    if (!poem) return
    var text = poem.title + '，' + poem.dynasty + '代，' + poem.author + '，' + poem.content.replace(/\n/g, '，')
    speak.speak(text)
  }
})
