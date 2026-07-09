var quizEngine = require('../../utils/quiz-engine.js')

Component({
  properties: {
    module: {
      type: String,
      value: ''
    },
    quizType: {
      type: String,
      value: ''
    },
    count: {
      type: Number,
      value: 10
    }
  },

  data: {
    quiz: null,
    currentQuestion: null,
    selectedOption: -1,
    showResult: false,
    isCorrect: false,
    showExplanation: false,
    isFinished: false,
    result: null
  },

  lifetimes: {
    attached: function() {
      this.startQuiz()
    }
  },

  methods: {
    startQuiz: function() {
      var quiz = quizEngine.createQuiz(this.data.module, this.data.quizType, this.data.count)
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
      var index = e.currentTarget.dataset.index
      this.setData({ selectedOption: index })
    },

    submitAnswer: function() {
      if (this.data.selectedOption === -1) {
        wx.showToast({ title: '请选择答案', icon: 'none' })
        return
      }

      var result = quizEngine.submitAnswer(this.data.quiz, this.data.selectedOption)
      this.setData({
        showResult: true,
        isCorrect: result.isCorrect,
        showExplanation: true
      })
    },

    nextQuestion: function() {
      var hasNext = quizEngine.nextQuestion(this.data.quiz)
      if (hasNext) {
        this.setData({
          currentQuestion: this.data.quiz.questions[this.data.quiz.currentIndex],
          selectedOption: -1,
          showResult: false,
          showExplanation: false
        })
      } else {
        var result = quizEngine.getQuizResult(this.data.quiz)
        this.setData({
          isFinished: true,
          result: result
        })
        this.triggerEvent('complete', result)
      }
    },

    retry: function() {
      this.startQuiz()
    },

    back: function() {
      this.triggerEvent('back')
    }
  }
})
