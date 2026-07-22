var speak = require('../../../utils/speak.js')
var achievements = require('../../../utils/achievements.js')
var englishData = require('../../../utils/english-data.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')

Page({
  data: {
    mode: 'select',
    letters: [],
    currentLetterIndex: 0,
    learnedLetterCount: 0,
    showLetterPhonetic: true,
    words: [],
    currentWordIndex: 0,
    learnedWordCount: 0,
    showWordPhonetic: true,
    showAIPanel: false,
    aiQuickQuestions: []
  },

  onLoad: function(options) {
    this._initMode = options.mode || ''
    this._initId = options.id || ''
    this.loadLetters()
    this.loadWords()
    // 如果有指定模式，直接进入
    if (this._initMode === 'letters') {
      this.setData({ mode: 'letters' })
    } else if (this._initMode === 'words') {
      this.setData({ mode: 'words' })
    }
  },

  enterLetters: function() {
    this.setData({ mode: 'letters' })
  },

  enterWords: function() {
    this.setData({ mode: 'words' })
  },

  backToSelect: function() {
    this.setData({ mode: 'select' })
  },

  // 跳转全部英语列表页
  goAllEnglish: function() {
    wx.navigateTo({ url: '/packageLearn/pages/english/list/index' })
  },

  loadLetters: function() {
    var result = englishData.loadLetters()
    var letters = result.letters
    var index = 0
    if (this._initMode === 'letters' && this._initId) {
      for (var i = 0; i < letters.length; i++) {
        if (letters[i].id === this._initId) { index = i; break }
      }
      this._initId = null
    } else {
      for (var j = 0; j < letters.length; j++) {
        if (!letters[j].learned) { index = j; break }
      }
    }
    this.setData({
      letters: letters,
      learnedLetterCount: result.learnedCount,
      currentLetterIndex: index
    })
  },

  toggleLetterPhonetic: function() {
    this.setData({ showLetterPhonetic: !this.data.showLetterPhonetic })
  },

  prevLetter: function() {
    var currentIndex = this.data.currentLetterIndex
    if (currentIndex > 0) {
      this.setData({ currentLetterIndex: currentIndex - 1 })
      this.updateAIPanelIfOpen()
    }
  },

  nextLetter: function() {
    var currentIndex = this.data.currentLetterIndex
    var letters = this.data.letters
    if (currentIndex < letters.length - 1) {
      this.setData({ currentLetterIndex: currentIndex + 1 })
      this.updateAIPanelIfOpen()
    }
  },

  openAIPanel: function() {
    var item = null
    if (this.data.mode === 'letters') {
      item = this.data.letters[this.data.currentLetterIndex]
    } else if (this.data.mode === 'words') {
      item = this.data.words[this.data.currentWordIndex]
    }
    if (!item) return
    this.setData({
      showAIPanel: true,
      aiQuickQuestions: learnAIHelper.getQuickQuestions('english', item)
    })
  },

  closeAIPanel: function() {
    this.setData({ showAIPanel: false })
  },

  updateAIPanelIfOpen: function() {
    if (this.data.showAIPanel) {
      var item = null
      if (this.data.mode === 'letters') {
        item = this.data.letters[this.data.currentLetterIndex]
      } else if (this.data.mode === 'words') {
        item = this.data.words[this.data.currentWordIndex]
      }
      if (item) {
        this.setData({
          aiQuickQuestions: learnAIHelper.getQuickQuestions('english', item)
        })
      }
    }
  },

  markLetterLearned: function() {
    var self = this
    var letters = self.data.letters
    var currentIndex = self.data.currentLetterIndex
    var letter = letters[currentIndex]
    if (!letter) return

    // 写入数据层（本地 + 云端）
    englishData.markLearned(letter.id, letter.letter)

    letters[currentIndex].learned = true
    var learnedLetterCount = 0
    for (var i = 0; i < letters.length; i++) {
      if (letters[i].learned) learnedLetterCount++
    }
    self.setData({ letters: letters, learnedLetterCount: learnedLetterCount })

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

    if (currentIndex < letters.length - 1) {
      setTimeout(function() {
        self.setData({ currentLetterIndex: currentIndex + 1 })
      }, 500)
    }
  },

  speakLetter: function() {
    var letter = this.data.letters[this.data.currentLetterIndex]
    if (!letter) return
    speak.speak(letter.letter + ' - ' + letter.word)
  },

  loadWords: function() {
    var result = englishData.loadWords()
    var words = result.words
    var index = 0
    if (this._initMode === 'words' && this._initId) {
      for (var i = 0; i < words.length; i++) {
        if (words[i].id === this._initId) { index = i; break }
      }
      this._initId = null
    } else {
      for (var j = 0; j < words.length; j++) {
        if (!words[j].learned) { index = j; break }
      }
    }
    this.setData({
      words: words,
      learnedWordCount: result.learnedCount,
      currentWordIndex: index
    })
  },

  toggleWordPhonetic: function() {
    this.setData({ showWordPhonetic: !this.data.showWordPhonetic })
  },

  prevWord: function() {
    var currentIndex = this.data.currentWordIndex
    if (currentIndex > 0) {
      this.setData({ currentWordIndex: currentIndex - 1 })
      this.updateAIPanelIfOpen()
    }
  },

  nextWord: function() {
    var currentIndex = this.data.currentWordIndex
    var words = this.data.words
    if (currentIndex < words.length - 1) {
      this.setData({ currentWordIndex: currentIndex + 1 })
      this.updateAIPanelIfOpen()
    }
  },

  markWordLearned: function() {
    var self = this
    var words = self.data.words
    var currentIndex = self.data.currentWordIndex
    var word = words[currentIndex]
    if (!word) return

    // 写入数据层（本地 + 云端）
    englishData.markLearned(word.id, word.word)

    words[currentIndex].learned = true
    var learnedWordCount = 0
    for (var i = 0; i < words.length; i++) {
      if (words[i].learned) learnedWordCount++
    }
    self.setData({ words: words, learnedWordCount: learnedWordCount })

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

    if (currentIndex < words.length - 1) {
      setTimeout(function() {
        self.setData({ currentWordIndex: currentIndex + 1 })
      }, 500)
    }
  },

  speakWord: function() {
    var word = this.data.words[this.data.currentWordIndex]
    if (!word) return
    speak.speak(word.word + ' - ' + word.meaning)
  }
})
