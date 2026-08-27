var listAdapter = require('../../../utils/list-adapter.js')

Page({
  data: {
    // 交互式练习
    practiceTypes: [
      { id: 'addition', name: '加法练习', icon: '➕', difficulty: 1 },
      { id: 'subtraction', name: '减法练习', icon: '➖', difficulty: 1 },
      { id: 'multiplication', name: '乘法练习', icon: '✖️', difficulty: 2 },
      { id: 'division', name: '除法练习', icon: '➗', difficulty: 2 },
      { id: 'mixed', name: '混合运算', icon: '🔢', difficulty: 3 },
      { id: 'fraction', name: '分数运算', icon: '🔣', difficulty: 4 },
      { id: 'decimal', name: '小数运算', icon: '📍', difficulty: 4 }
    ],
    currentType: null,
    showPractice: false,
    currentQuestion: null,
    userAnswer: '',
    showResult: false,
    isCorrect: false,
    score: 0,
    totalQuestions: 0,
    currentQuestionIndex: 0,
    // 题目列表
    items: [],
    learnedCount: 0,
    totalCount: 0
  },

  onLoad: function() {
    this.loadList()
  },

  onShow: function() {
    this.loadList()
  },

  loadList: function() {
    // C3：数据源统一收口到 modules-data（题目列表 + 详情跳转）
    this.setData(listAdapter.loadList('math-practice'))
  },

  // ===== 交互式练习 =====
  selectType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({
      currentType: type,
      showPractice: true,
      score: 0,
      totalQuestions: 0,
      currentQuestionIndex: 0
    })
    this.generateQuestion()
  },

  generateQuestion: function() {
    var type = this.data.currentType
    var question = this.createQuestion(type.id, type.difficulty)
    this.setData({
      currentQuestion: question,
      userAnswer: '',
      showResult: false,
      isCorrect: false
    })
  },

  createQuestion: function(type, difficulty) {
    var num1, num2, answer, question

    switch (type) {
      case 'addition':
        num1 = this.getRandomNumber(difficulty)
        num2 = this.getRandomNumber(difficulty)
        question = num1 + ' + ' + num2 + ' = ?'
        answer = num1 + num2
        break
      case 'subtraction':
        num1 = this.getRandomNumber(difficulty)
        num2 = this.getRandomNumber(difficulty)
        if (num1 < num2) { var temp = num1; num1 = num2; num2 = temp }
        question = num1 + ' - ' + num2 + ' = ?'
        answer = num1 - num2
        break
      case 'multiplication':
        num1 = this.getRandomNumber(difficulty - 1)
        num2 = this.getRandomNumber(difficulty - 1)
        question = num1 + ' × ' + num2 + ' = ?'
        answer = num1 * num2
        break
      case 'division':
        num2 = this.getRandomNumber(difficulty - 1)
        answer = this.getRandomNumber(difficulty - 1)
        num1 = num2 * answer
        question = num1 + ' ÷ ' + num2 + ' = ?'
        break
      default:
        num1 = this.getRandomNumber(difficulty)
        num2 = this.getRandomNumber(difficulty)
        question = num1 + ' + ' + num2 + ' = ?'
        answer = num1 + num2
    }

    return { question: question, answer: answer }
  },

  getRandomNumber: function(difficulty) {
    var max = Math.pow(10, difficulty)
    return Math.floor(Math.random() * max) + 1
  },

  onAnswerInput: function(e) {
    this.setData({ userAnswer: e.detail.value })
  },

  submitAnswer: function() {
    // F5：空答案拦截（parseInt('') 为 NaN 直接判错且计入总数）
    if (this.data.userAnswer === '' || this.data.userAnswer === null) {
      wx.showToast({ title: '请输入答案', icon: 'none' })
      return
    }
    var userAnswer = parseInt(this.data.userAnswer)
    var correctAnswer = this.data.currentQuestion.answer
    var isCorrect = userAnswer === correctAnswer

    this.setData({
      showResult: true,
      isCorrect: isCorrect,
      score: isCorrect ? this.data.score + 1 : this.data.score,
      totalQuestions: this.data.totalQuestions + 1
    })
  },

  nextQuestion: function() {
    this.setData({ currentQuestionIndex: this.data.currentQuestionIndex + 1 })
    this.generateQuestion()
  },

  exitPractice: function() {
    this.setData({
      showPractice: false,
      currentType: null
    })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/practice/detail/index?id=' + id
    })
  }
})