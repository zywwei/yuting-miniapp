var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    formulas: [],
    categories: [
      { id: 'basic', name: '基础运算', icon: '➕' },
      { id: 'algebra', name: '数与代数', icon: '🔢' },
      { id: 'geometry', name: '几何图形', icon: '📐' },
      { id: 'units', name: '单位换算', icon: '📏' },
      { id: 'sequence', name: '数列规律', icon: '📊' },
      { id: 'statistics', name: '统计概率', icon: '📈' }
    ],
    currentCategory: 'all',
    showDetail: false,
    currentFormula: null
  },

  onLoad: function() {
    this.loadFormulas()
  },

  loadFormulas: function() {
    var formulas = learnData.loadMathFormulas()
    this.setData({ formulas: formulas })
  },

  switchCategory: function(e) {
    var category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    if (category === 'all') {
      this.setData({ formulas: learnData.loadMathFormulas() })
    } else {
      this.setData({ formulas: learnData.loadMathFormulas(category) })
    }
  },

  showFormulaDetail: function(e) {
    var formula = e.currentTarget.dataset.formula
    this.setData({
      showDetail: true,
      currentFormula: formula
    })
  },

  hideDetail: function() {
    this.setData({ showDetail: false, currentFormula: null })
  },

  markAsLearned: function(e) {
    var formulaId = e.currentTarget.dataset.id
    learnData.markAsLearned('mathFormulas', formulaId)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/formulas/detail/index?id=' + id
    })
  }
})
