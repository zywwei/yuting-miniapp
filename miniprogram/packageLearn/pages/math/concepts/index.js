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
    // P1-12：分类从同源数据动态提取（真实数据为中文分类，原静态英文 key 已失配）
    var seen = {}
    var dynamicCategories = []
    concepts.forEach(function(c) {
      if (c.category && !seen[c.category]) {
        seen[c.category] = true
        dynamicCategories.push({ id: c.category, name: c.category })
      }
    })
    this.setData({ concepts: concepts, categories: dynamicCategories })
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
