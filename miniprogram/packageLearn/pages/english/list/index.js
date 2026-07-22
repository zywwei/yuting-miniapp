var englishData = require('../../../../utils/english-data.js')

Page({
  data: {
    mode: 'select', // select / letters / words
    letters: [],
    filteredLetters: [],
    words: [],
    filteredWords: [],
    letterLevels: [],
    wordLevels: [],
    currentLevel: '全部',
    keyword: '',
    unlearnedOnly: false,
    learnedLetterCount: 0,
    totalLetters: 0,
    learnedWordCount: 0,
    totalWords: 0
  },

  onLoad: function() {
    this.setData({
      letterLevels: englishData.LETTER_LEVELS,
      wordLevels: englishData.WORD_LEVELS
    })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var letterResult = englishData.loadLetters()
    var wordResult = englishData.loadWords()
    this.setData({
      letters: letterResult.letters,
      learnedLetterCount: letterResult.learnedCount,
      totalLetters: letterResult.letters.length,
      words: wordResult.words,
      learnedWordCount: wordResult.learnedCount,
      totalWords: wordResult.words.length
    })
    this.applyFilter()
  },

  enterLetters: function() {
    this.setData({ mode: 'letters', currentLevel: '全部', keyword: '', unlearnedOnly: false })
    this.applyFilter()
  },

  enterWords: function() {
    this.setData({ mode: 'words', currentLevel: '全部', keyword: '', unlearnedOnly: false })
    this.applyFilter()
  },

  backToSelect: function() {
    this.setData({ mode: 'select', currentLevel: '全部', keyword: '', unlearnedOnly: false })
  },

  applyFilter: function() {
    var mode = this.data.mode
    var lv = this.data.currentLevel
    var kw = (this.data.keyword || '').trim().toLowerCase()
    var onlyUnlearned = this.data.unlearnedOnly

    if (mode === 'letters') {
      var filtered = this.data.letters.filter(function(l) {
        if (lv !== '全部' && l.level !== lv) return false
        if (onlyUnlearned && l.learned) return false
        if (kw) {
          var letter = (l.letter || '').toLowerCase()
          var word = (l.word || '').toLowerCase()
          if (letter.indexOf(kw) < 0 && word.indexOf(kw) < 0) return false
        }
        return true
      })
      this.setData({ filteredLetters: filtered })
    } else if (mode === 'words') {
      var filtered = this.data.words.filter(function(w) {
        if (lv !== '全部' && w.level !== lv) return false
        if (onlyUnlearned && w.learned) return false
        if (kw) {
          var word = (w.word || '').toLowerCase()
          var meaning = (w.meaning || '').toLowerCase()
          if (word.indexOf(kw) < 0 && meaning.indexOf(kw) < 0) return false
        }
        return true
      })
      this.setData({ filteredWords: filtered })
    }
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

  goLearnLetter: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageLearn/pages/english/index?mode=letters&id=' + id })
  },

  goLearnWord: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageLearn/pages/english/index?mode=words&id=' + id })
  }
})
