var learnData = require('../../utils/learn-data.js')
var modulesData = require('../../utils/modules-data.js')
var childStorage = require('../../../utils/child-storage.js')

Page({
  data: {
    modules: [
      { id: 'formulas', name: '公式学习', icon: '📐', desc: '常见数学公式', count: 0, module: 'math-formulas' },
      { id: 'concepts', name: '原理讲解', icon: '💡', desc: '数学概念与原理', count: 0, module: 'math-concepts' },
      { id: 'practice', name: '计算练习', icon: '✏️', desc: '数学计算题', count: 0, module: 'math-practice' },
      { id: 'problems', name: '应用题', icon: '📝', desc: '解决实际问题', count: 0, module: 'math-problems' },
      { id: 'geometry', name: '几何证明', icon: '📏', desc: '几何图形证明', count: 0, module: 'math-geometry' },
      { id: 'olympiad', name: '奥数竞赛', icon: '🏆', desc: '奥数题目训练', count: 0, module: 'math-olympiad' }
    ],
    progress: {}
  },

  onLoad: function() {
    // F6：题量从数据层真实取值（原为写死假数量，如「奥数竞赛 0 题」实有内容）
    var modules = this.data.modules.map(function(m) {
      m.count = modulesData.loadModuleData(m.module).totalCount
      return m
    })
    this.setData({ modules: modules })
    this.loadProgress()
  },

  onShow: function() {
    this.loadProgress()
  },

  loadProgress: function() {
    var progress = {
      formulas: learnData.getModuleProgress('mathFormulas'),
      concepts: learnData.getModuleProgress('mathConcepts'),
      practice: learnData.getModuleProgress('mathPractice')
    }
    this.setData({ progress: progress })
  },

  goModule: function(e) {
    var moduleId = e.currentTarget.dataset.id
    var url = '/packageLearn/pages/math/' + moduleId + '/index'
    wx.navigateTo({ url: url })
  }
})
