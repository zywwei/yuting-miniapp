var speak = require('../../utils/speak.js')

// 数字启蒙页面
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
    showResult: false
  },

  onLoad: function() {
    this.loadNumbers()
  },

  loadNumbers: function() {
    var self = this
    var learnProgress = wx.getStorageSync('learnProgress') || {}
    var numberProgress = learnProgress.numbers || {}

    var numbers = []
    for (var i = 1; i <= 100; i++) {
      numbers.push({
        number: i,
        chinese: self.numberToChinese(i),
        learned: !!numberProgress[i]
      })
    }

    var learnedCount = numbers.filter(function(n) { return n.learned }).length

    self.setData({
      numbers: numbers,
      learnedCount: learnedCount,
      currentIndex: 0
    })
  },

  numberToChinese: function(num) {
    var chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    if (num <= 10) {
      return num === 10 ? '十' : chineseNumbers[num]
    }
    if (num < 20) {
      return '十' + chineseNumbers[num - 10]
    }
    if (num < 100) {
      var tens = Math.floor(num / 10)
      var ones = num % 10
      return chineseNumbers[tens] + '十' + (ones > 0 ? chineseNumbers[ones] : '')
    }
    return '一百'
  },

  toggleShow: function() {
    this.setData({ showNumber: !this.data.showNumber })
  },

  prevNumber: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      this.setData({ currentIndex: currentIndex - 1 })
    }
  },

  nextNumber: function() {
    var currentIndex = this.data.currentIndex
    var numbers = this.data.numbers
    if (currentIndex < numbers.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 })
    }
  },

  markLearned: function() {
    var self = this
    var numbers = self.data.numbers
    var currentIndex = self.data.currentIndex
    var number = numbers[currentIndex]

    var learnProgress = wx.getStorageSync('learnProgress') || {}
    if (!learnProgress.numbers) learnProgress.numbers = {}

    learnProgress.numbers[number.number] = {
      learnedAt: new Date().toISOString(),
      number: number.number
    }

    wx.setStorageSync('learnProgress', learnProgress)

    numbers[currentIndex].learned = true
    var learnedCount = numbers.filter(function(n) { return n.learned }).length

    self.setData({ numbers: numbers, learnedCount: learnedCount })

    speak.speakSuccess()

    wx.showToast({ title: '已学会！', icon: 'success' })

    if (currentIndex < numbers.length - 1) {
      setTimeout(function() {
        self.setData({ currentIndex: currentIndex + 1 })
      }, 500)
    }
  },

  // 朗读数字
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

    // 随机选择10个已学数字
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

    // 生成4个选项（1个正确 + 3个错误）
    var options = [current.number]
    while (options.length < 4) {
      var randomNum = Math.floor(Math.random() * 100) + 1
      if (options.indexOf(randomNum) === -1) {
        options.push(randomNum)
      }
    }

    // 打乱选项顺序
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
      content: '答对 ' + score + '/' + total + ' 题\n正确率 ' + percentage + '%',
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
