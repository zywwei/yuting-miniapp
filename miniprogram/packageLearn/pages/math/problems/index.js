var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    problems: [
      { id: 'p01', title: '一步应用题', grade: '1-2年级', question: '小明有5个苹果，吃了2个，还剩几个？', answer: 3, steps: ['小明有5个苹果', '吃了2个', '5 - 2 = 3', '还剩3个苹果'] },
      { id: 'p02', title: '两步应用题', grade: '3-4年级', question: '买3支笔，每支2元，付10元找回多少？', answer: 4, steps: ['买3支笔，每支2元', '3 × 2 = 6元', '付10元', '10 - 6 = 4元', '找回4元'] },
      { id: 'p03', title: '分数应用题', grade: '5-6年级', question: '一根绳子长3米，用去1/3，还剩多少米？', answer: 2, steps: ['绳子长3米', '用去1/3', '3 × 1/3 = 1米', '3 - 1 = 2米', '还剩2米'] }
    ],
    currentProblem: null,
    showAnswer: false
  },

  onLoad: function() {},

  showProblem: function(e) {
    var problem = e.currentTarget.dataset.problem
    this.setData({ currentProblem: problem, showAnswer: false })
  },

  showAnswer: function() {
    this.setData({ showAnswer: true })
  },

  hideProblem: function() {
    this.setData({ currentProblem: null })
  },

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('mathProblems', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
