var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    concepts: [],
    categories: [
      { id: 'numbers', name: '数的认识', icon: '🔢' },
      { id: 'operations', name: '运算原理', icon: '➗' },
      { id: 'geometry', name: '几何概念', icon: '📐' },
      { id: 'measurement', name: '量与计量', icon: '📏' },
      { id: 'thinking', name: '数学思想', icon: '💡' }
    ],
    currentCategory: 'all'
  },

  onLoad: function() {
    this.loadConcepts()
  },

  loadConcepts: function() {
    var concepts = learnData.loadMathConcepts()
    this.setData({ concepts: concepts })
  },

  switchCategory: function(e) {
    var category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    if (category === 'all') {
      this.setData({ concepts: learnData.loadMathConcepts() })
    } else {
      this.setData({ concepts: learnData.loadMathConcepts(category) })
    }
  },

  markAsLearned: function(e) {
    var conceptId = e.currentTarget.dataset.id
    learnData.markAsLearned('mathConcepts', conceptId)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/concepts/detail/index?id=' + id
    })
  }
})
