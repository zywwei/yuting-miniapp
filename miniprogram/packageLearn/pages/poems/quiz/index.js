var quizEngine = require('../../../utils/quiz-engine.js')

Page({
  data: {
    quizTypes: [
      { id: 'title_to_author', name: '诗名选作者', desc: '根据诗名选择作者' },
      { id: 'author_to_dynasty', name: '作者选朝代', desc: '根据作者选择朝代' }
    ],
    selectedType: null,
    quiz: null,
    currentQuestion: null,
    selectedOption: -1,
    showResult: false,
    isCorrect: false,
    isFinished: false,
    result: null
  },

  onLoad: function() {},

  selectType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ selectedType: type })
    this.startQuiz(type.id)
  },

  startQuiz: function(quizType) {
    var quiz = quizEngine.createQuiz('poems', quizType, 10)
    this.setData({
      quiz: quiz,
      currentQuestion: quiz.questions[0],
      selectedOption: -1,
      showResult: false,
      isFinished: false,
      result: null
    })
  },

  selectOption: function(e) {
    if (this.data.showResult) return
    this.setData({ selectedOption: e.currentTarget.dataset.index })
  },

  submitAnswer: function() {
    if (this.data.selectedOption === -1) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }
    var result = quizEngine.submitAnswer(this.data.quiz, this.data.selectedOption)
    this.setData({ showResult: true, isCorrect: result.isCorrect })
  },

  nextQuestion: function() {
    var hasNext = quizEngine.nextQuestion(this.data.quiz)
    if (hasNext) {
      this.setData({
        currentQuestion: this.data.quiz.questions[this.data.quiz.currentIndex],
        selectedOption: -1,
        showResult: false
      })
    } else {
      var result = quizEngine.getQuizResult(this.data.quiz)
      this.setData({ isFinished: true, result: result })
    }
  },

  retry: function() { this.startQuiz(this.data.selectedType.id) },
  back: function() { wx.navigateBack() }
})
