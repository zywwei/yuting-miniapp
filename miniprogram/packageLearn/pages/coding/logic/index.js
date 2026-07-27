var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    exercises: [
      { id: 'l01', title: '条件判断', question: '如果今天下雨，我们应该带什么？', options: ['雨伞', '太阳镜', '帽子', '扇子'], answer: 0, explanation: '下雨需要带雨伞防雨' },
      { id: 'l02', title: '循环推理', question: '小明每次往前走3步，往后退1步。从起点开始，第几次前进后能到达第10步？', options: ['3次', '4次', '5次', '6次'], answer: 1, explanation: '每次净前进2步，4次后前进8步，第5次前进3步到达第11步。' },
      { id: 'l03', title: '逻辑谜题', question: 'A比B高，B比C高，谁最矮？', options: ['A', 'B', 'C', '无法确定'], answer: 2, explanation: 'A>B>C，所以C最矮。' }
    ],
    currentExercise: null,
    selectedOption: -1,
    showResult: false
  },

  onLoad: function() {},

  startExercise: function(e) {
    var exercise = e.currentTarget.dataset.exercise
    this.setData({ currentExercise: exercise, selectedOption: -1, showResult: false })
  },

  selectOption: function(e) {
    this.setData({ selectedOption: e.currentTarget.dataset.index })
  },

  submitAnswer: function() {
    this.setData({ showResult: true })
  },

  nextExercise: function() {
    this.setData({ currentExercise: null })
  },

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('codingLogic', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/coding/logic/detail/index?id=' + id
    })
  }
})
