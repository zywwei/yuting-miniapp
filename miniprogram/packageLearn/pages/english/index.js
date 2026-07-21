var speak = require('../../../utils/speak.js')
var childStorage = require('../../../utils/child-storage.js')
var cloud = require('../../../utils/cloud.js')
var achievements = require('../../../utils/achievements.js')
var learnData = require('../../utils/learn-data.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')

// 内置英语字母数据
var BUILTIN_LETTERS = [
  { id: 'l01', letter: 'A', phonetic: '/eɪ/', word: 'Apple', wordMeaning: '苹果', wordPhonetic: '/ˈæpl/' },
  { id: 'l02', letter: 'B', phonetic: '/biː/', word: 'Ball', wordMeaning: '球', wordPhonetic: '/bɔːl/' },
  { id: 'l03', letter: 'C', phonetic: '/siː/', word: 'Cat', wordMeaning: '猫', wordPhonetic: '/kæt/' },
  { id: 'l04', letter: 'D', phonetic: '/diː/', word: 'Dog', wordMeaning: '狗', wordPhonetic: '/dɒɡ/' },
  { id: 'l05', letter: 'E', phonetic: '/iː/', word: 'Egg', wordMeaning: '鸡蛋', wordPhonetic: '/eɡ/' },
  { id: 'l06', letter: 'F', phonetic: '/ef/', word: 'Fish', wordMeaning: '鱼', wordPhonetic: '/fɪʃ/' },
  { id: 'l07', letter: 'G', phonetic: '/dʒiː/', word: 'Grape', wordMeaning: '葡萄', wordPhonetic: '/ɡreɪp/' },
  { id: 'l08', letter: 'H', phonetic: '/eɪtʃ/', word: 'Hat', wordMeaning: '帽子', wordPhonetic: '/hæt/' },
  { id: 'l09', letter: 'I', phonetic: '/aɪ/', word: 'Ice', wordMeaning: '冰', wordPhonetic: '/aɪs/' },
  { id: 'l10', letter: 'J', phonetic: '/dʒeɪ/', word: 'Juice', wordMeaning: '果汁', wordPhonetic: '/dʒuːs/' },
  { id: 'l11', letter: 'K', phonetic: '/keɪ/', word: 'Kite', wordMeaning: '风筝', wordPhonetic: '/kaɪt/' },
  { id: 'l12', letter: 'L', phonetic: '/el/', word: 'Lion', wordMeaning: '狮子', wordPhonetic: '/ˈlaɪən/' },
  { id: 'l13', letter: 'M', phonetic: '/em/', word: 'Moon', wordMeaning: '月亮', wordPhonetic: '/muːn/' },
  { id: 'l14', letter: 'N', phonetic: '/en/', word: 'Nose', wordMeaning: '鼻子', wordPhonetic: '/noʊz/' },
  { id: 'l15', letter: 'O', phonetic: '/oʊ/', word: 'Orange', wordMeaning: '橙子', wordPhonetic: '/ˈɒrɪndʒ/' },
  { id: 'l16', letter: 'P', phonetic: '/piː/', word: 'Panda', wordMeaning: '熊猫', wordPhonetic: '/ˈpændə/' },
  { id: 'l17', letter: 'Q', phonetic: '/kjuː/', word: 'Queen', wordMeaning: '女王', wordPhonetic: '/kwiːn/' },
  { id: 'l18', letter: 'R', phonetic: '/ɑːr/', word: 'Rabbit', wordMeaning: '兔子', wordPhonetic: '/ˈræbɪt/' },
  { id: 'l19', letter: 'S', phonetic: '/es/', word: 'Star', wordMeaning: '星星', wordPhonetic: '/stɑːr/' },
  { id: 'l20', letter: 'T', phonetic: '/tiː/', word: 'Tree', wordMeaning: '树', wordPhonetic: '/triː/' },
  { id: 'l21', letter: 'U', phonetic: '/juː/', word: 'Umbrella', wordMeaning: '雨伞', wordPhonetic: '/ʌmˈbrelə/' },
  { id: 'l22', letter: 'V', phonetic: '/viː/', word: 'Violin', wordMeaning: '小提琴', wordPhonetic: '/ˌvaɪəˈlɪn/' },
  { id: 'l23', letter: 'W', phonetic: '/ˈdʌbljuː/', word: 'Water', wordMeaning: '水', wordPhonetic: '/ˈwɔːtər/' },
  { id: 'l24', letter: 'X', phonetic: '/eks/', word: 'X-ray', wordMeaning: 'X光', wordPhonetic: '/ˈeks reɪ/' },
  { id: 'l25', letter: 'Y', phonetic: '/waɪ/', word: 'Yellow', wordMeaning: '黄色', wordPhonetic: '/ˈjeloʊ/' },
  { id: 'l26', letter: 'Z', phonetic: '/zed/', word: 'Zoo', wordMeaning: '动物园', wordPhonetic: '/zuː/' }
]

// 内置英语单词数据
var BUILTIN_WORDS = [
  { id: 'e01', word: 'Hello', phonetic: '/həˈloʊ/', meaning: '你好', category: '问候' },
  { id: 'e02', word: 'Hi', phonetic: '/haɪ/', meaning: '嗨', category: '问候' },
  { id: 'e03', word: 'Goodbye', phonetic: '/ɡʊdˈbaɪ/', meaning: '再见', category: '问候' },
  { id: 'e04', word: 'Please', phonetic: '/pliːz/', meaning: '请', category: '问候' },
  { id: 'e05', word: 'Thank you', phonetic: '/θæŋk juː/', meaning: '谢谢', category: '问候' },
  { id: 'e06', word: 'Sorry', phonetic: '/ˈsɒri/', meaning: '对不起', category: '问候' },
  { id: 'e07', word: 'One', phonetic: '/wʌn/', meaning: '一', category: '数字' },
  { id: 'e08', word: 'Two', phonetic: '/tuː/', meaning: '二', category: '数字' },
  { id: 'e09', word: 'Three', phonetic: '/θriː/', meaning: '三', category: '数字' },
  { id: 'e10', word: 'Four', phonetic: '/fɔːr/', meaning: '四', category: '数字' },
  { id: 'e11', word: 'Five', phonetic: '/faɪv/', meaning: '五', category: '数字' },
  { id: 'e12', word: 'Six', phonetic: '/sɪks/', meaning: '六', category: '数字' },
  { id: 'e13', word: 'Seven', phonetic: '/ˈsevn/', meaning: '七', category: '数字' },
  { id: 'e14', word: 'Eight', phonetic: '/eɪt/', meaning: '八', category: '数字' },
  { id: 'e15', word: 'Nine', phonetic: '/naɪn/', meaning: '九', category: '数字' },
  { id: 'e16', word: 'Ten', phonetic: '/ten/', meaning: '十', category: '数字' },
  { id: 'e17', word: 'Red', phonetic: '/red/', meaning: '红色', category: '颜色' },
  { id: 'e18', word: 'Blue', phonetic: '/bluː/', meaning: '蓝色', category: '颜色' },
  { id: 'e19', word: 'Green', phonetic: '/ɡriːn/', meaning: '绿色', category: '颜色' },
  { id: 'e20', word: 'Yellow', phonetic: '/ˈjeloʊ/', meaning: '黄色', category: '颜色' },
  { id: 'e21', word: 'Cat', phonetic: '/kæt/', meaning: '猫', category: '动物' },
  { id: 'e22', word: 'Dog', phonetic: '/dɒɡ/', meaning: '狗', category: '动物' },
  { id: 'e23', word: 'Bird', phonetic: '/bɜːrd/', meaning: '鸟', category: '动物' },
  { id: 'e24', word: 'Fish', phonetic: '/fɪʃ/', meaning: '鱼', category: '动物' },
  { id: 'e25', word: 'Apple', phonetic: '/ˈæpl/', meaning: '苹果', category: '水果' },
  { id: 'e26', word: 'Banana', phonetic: '/bəˈnænə/', meaning: '香蕉', category: '水果' },
  { id: 'e27', word: 'Mother', phonetic: '/ˈmʌðər/', meaning: '妈妈', category: '家人' },
  { id: 'e28', word: 'Father', phonetic: '/ˈfɑːðər/', meaning: '爸爸', category: '家人' },
  { id: 'e29', word: 'Sun', phonetic: '/sʌn/', meaning: '太阳', category: '自然' },
  { id: 'e30', word: 'Moon', phonetic: '/muːn/', meaning: '月亮', category: '自然' }
]

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

  onLoad: function() {
    this.loadLetters()
    this.loadWords()
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

  loadLetters: function() {
    var learnProgress = childStorage.get('learnProgress') || {}
    var englishProgress = learnProgress.english || {}

    var letters = BUILTIN_LETTERS.map(function(item) {
      return {
        id: item.id,
        letter: item.letter,
        phonetic: item.phonetic,
        word: item.word,
        wordMeaning: item.wordMeaning,
        wordPhonetic: item.wordPhonetic,
        learned: !!englishProgress[item.id]
      }
    })

    var learnedLetterCount = letters.filter(function(l) { return l.learned }).length

    this.setData({
      letters: letters,
      learnedLetterCount: learnedLetterCount,
      currentLetterIndex: 0
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

    var learnProgress = childStorage.get('learnProgress') || {}
    if (!learnProgress.english) learnProgress.english = {}

    learnProgress.english[letter.id] = {
      learnedAt: new Date().toISOString(),
      letter: letter.letter
    }

    childStorage.set('learnProgress', learnProgress)
    cloud.uploadLearnProgress(learnProgress).catch(function(err) { console.warn('学习进度同步失败:', err) })

    letters[currentIndex].learned = true
    var learnedLetterCount = letters.filter(function(l) { return l.learned }).length

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
    var learnProgress = childStorage.get('learnProgress') || {}
    var englishProgress = learnProgress.english || {}

    var words = BUILTIN_WORDS.map(function(item) {
      return {
        id: item.id,
        word: item.word,
        phonetic: item.phonetic,
        meaning: item.meaning,
        category: item.category,
        learned: !!englishProgress[item.id]
      }
    })

    var learnedWordCount = words.filter(function(w) { return w.learned }).length

    this.setData({
      words: words,
      learnedWordCount: learnedWordCount,
      currentWordIndex: 0
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

    var learnProgress = childStorage.get('learnProgress') || {}
    if (!learnProgress.english) learnProgress.english = {}

    learnProgress.english[word.id] = {
      learnedAt: new Date().toISOString(),
      word: word.word
    }

    childStorage.set('learnProgress', learnProgress)
    cloud.uploadLearnProgress(learnProgress).catch(function(err) { console.warn('学习进度同步失败:', err) })

    words[currentIndex].learned = true
    var learnedWordCount = words.filter(function(w) { return w.learned }).length

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
