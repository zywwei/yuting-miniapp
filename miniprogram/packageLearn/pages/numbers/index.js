var speak = require('../../../utils/speak.js')
var achievements = require('../../../utils/achievements.js')
var numbersData = require('../../../utils/numbers-data.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')

Page({
  data: {
    numbers: [],
    currentIndex: 0,
    learnedCount: 0,
    showNumber: true,
    mode: 'learn',
    quizNumbers: [],
    quizIndex: 0,
    score: 0,
    options: [],
    selectedOption: -1,
    showResult: false,
    showAIPanel: false,
    aiQuickQuestions: []
  },

  onLoad: function(options) {
    this._initId = options.id || ''
    this.loadNumbers()
  },

  loadNumbers: function() {
    var self = this
    var result = numbersData.loadNumbers()
    var numbers = result.numbers
    var index = 0
    if (self._initId) {
      var targetNum = parseInt(self._initId, 10)
      for (var i = 0; i < numbers.length; i++) {
        if (numbers[i].number === targetNum) { index = i; break }
      }
      self._initId = null
    } else {
      for (var j = 0; j < numbers.length; j++) {
        if (!numbers[j].learned) { index = j; break }
      }
    }
    self.setData({
      numbers: numbers,
      learnedCount: result.learnedCount,
      currentIndex: index
    })
  },

  // 跳转全部数字列表页
  goAllNumbers: function() {
    wx.navigateTo({ url: '/packageLearn/pages/numbers/list/index' })
  },

  toggleShow: function() {
    this.setData({ showNumber: !this.data.showNumber })
  },

  prevNumber: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      this.setData({ currentIndex: currentIndex - 1 })
      this.updateAIPanelIfOpen()
    }
  },

  nextNumber: function() {
    var currentIndex = this.data.currentIndex
    var numbers = this.data.numbers
    if (currentIndex < numbers.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 })
      this.updateAIPanelIfOpen()
    }
  },

  openAIPanel: function() {
    var number = this.data.numbers[this.data.currentIndex]
    if (!number) return
    this.setData({
      showAIPanel: true,
      aiQuickQuestions: learnAIHelper.getQuickQuestions('math', {
        title: number.chinese,
        content: '数字' + number.number + '，中文读作' + number.chinese,
        type: '数字'
      })
    })
  },

  closeAIPanel: function() {
    this.setData({ showAIPanel: false })
  },

  updateAIPanelIfOpen: function() {
    if (this.data.showAIPanel) {
      var number = this.data.numbers[this.data.currentIndex]
      if (number) {
        this.setData({
          aiQuickQuestions: learnAIHelper.getQuickQuestions('math', {
            title: number.chinese,
            content: '数字' + number.number + '，中文读作' + number.chinese,
            type: '数字'
          })
        })
      }
    }
  },

  markLearned: function() {
    var self = this
    var numbers = self.data.numbers
    var currentIndex = self.data.currentIndex
    var number = numbers[currentIndex]
    if (!number) return

    // 写入数据层（本地 + 云端）
    numbersData.markLearned(number.number)

    numbers[currentIndex].learned = true
    var learnedCount = 0
    for (var i = 0; i < numbers.length; i++) {
      if (numbers[i].learned) learnedCount++
    }

    self.setData({ numbers: numbers, learnedCount: learnedCount })

    speak.speakSuccess()

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

    if (currentIndex < numbers.length - 1) {
      setTimeout(function() {
        self.setData({ currentIndex: currentIndex + 1 })
      }, 500)
    }
  },

  speakNumber: function() {
    var number = this.data.numbers[this.data.currentIndex]
    if (!number) return
    speak.speak(number.chinese)
  },

  startQuiz: function() {
    var self = this
    var numbers = self.data.numbers
    var learned = numbers.filter(function(n) { return n.learned })

    if (learned.length < 4) {
      wx.showToast({ title: '至少学会4个数字才能测验', icon: 'none' })
      return
    }

    var shuffled = learned.sort(function() { return Math.random() - 0.5 })
    var quizNumbers = shuffled.slice(0, Math.min(10, shuffled.length))

    self.setData({
      mode: 'quiz',
      quizNumbers: quizNumbers,
      quizIndex: 0,
      score: 0,
      selectedOption: -1,
      showResult: false
    })

    self.generateOptions()
  },

  generateOptions: function() {
    var quizNumbers = this.data.quizNumbers
    var quizIndex = this.data.quizIndex
    var current = quizNumbers[quizIndex]

    var options = [current.number]
    while (options.length < 4) {
      var randomNum = Math.floor(Math.random() * 100) + 1
      if (options.indexOf(randomNum) === -1) {
        options.push(randomNum)
      }
    }

    var shuffledOptions = options.sort(function() { return Math.random() - 0.5 })

    this.setData({
      options: shuffledOptions,
      selectedOption: -1,
      showResult: false
    })
  },

  selectOption: function(e) {
    if (this.data.showResult) return

    var index = e.currentTarget.dataset.index
    var quizNumbers = this.data.quizNumbers
    var quizIndex = this.data.quizIndex
    var options = this.data.options
    var score = this.data.score
    var current = quizNumbers[quizIndex]
    var isCorrect = options[index] === current.number

    this.setData({
      selectedOption: index,
      showResult: true,
      score: isCorrect ? score + 1 : score
    })
  },

  nextQuiz: function() {
    var quizIndex = this.data.quizIndex
    var quizNumbers = this.data.quizNumbers
    if (quizIndex < quizNumbers.length - 1) {
      this.setData({ quizIndex: quizIndex + 1 })
      this.generateOptions()
    } else {
      this.finishQuiz()
    }
  },

  finishQuiz: function() {
    var self = this
    var score = self.data.score
    var total = self.data.quizNumbers.length
    var percentage = Math.round((score / total) * 100)

    wx.showModal({
      title: '测验完成',
      content: '答对 ' + score + '/' + total + ' 题\n正确率: ' + percentage + '%',
      showCancel: false,
      success: function() {
        self.setData({ mode: 'learn' })
      }
    })
  },

  backToLearn: function() {
    this.setData({ mode: 'learn' })
  }
})
