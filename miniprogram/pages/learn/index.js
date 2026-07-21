var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var auth = require('../../utils/auth.js')

var app = getApp()

Page({
  data: {
    moduleGroups: [
      {
        id: 'language',
        title: '语言学习',
        icon: '📚',
        modules: [
          { type: 'cards', name: '识字卡片', icon: '🔤', desc: '学习基础汉字', count: 3500 },
          { type: 'poems', name: '古诗词', icon: '📜', desc: '经典古诗词', count: 200 },
          { type: 'chinese', name: '语文扩展', icon: '📖', desc: '阅读、写作、修辞', count: 315 },
          { type: 'classics', name: '国学经典', icon: '🎓', desc: '古文、成语、论语', count: 195 }
        ]
      },
      {
        id: 'foreign',
        title: '外语学习',
        icon: '🌍',
        modules: [
          { type: 'english', name: '英语基础', icon: '🔤', desc: '字母和基础单词', count: 4000 },
          { type: 'english-ext', name: '英语扩展', icon: '📝', desc: '语法、句型、阅读', count: 295 },
          { type: 'speaking', name: '英语口语', icon: '🎤', desc: '对话、练习、演讲', count: 135 }
        ]
      },
      {
        id: 'science',
        title: '理科思维',
        icon: '🔬',
        modules: [
          { type: 'numbers', name: '数字启蒙', icon: '🔢', desc: '1-100数字学习', count: 100 },
          { type: 'math', name: '数学学习', icon: '📐', desc: '公式、原理、练习', count: 875 },
          { type: 'science', name: '科学探索', icon: '🧪', desc: '实验、物理、化学', count: 200 },
          { type: 'coding', name: '编程学习', icon: '💻', desc: '思维、逻辑、算法', count: 180 }
        ]
      },
      {
        id: 'comprehensive',
        title: '综合素养',
        icon: '🎨',
        modules: [
          { type: 'art', name: '艺术鉴赏', icon: '🎨', desc: '音乐、美术、书法', count: 160 },
          { type: 'sports', name: '体育健康', icon: '⚽', desc: '知识、健康、技巧', count: 145 },
          { type: 'life', name: '生活技能', icon: '🏠', desc: '安全、心理、技能', count: 135 },
          { type: 'social', name: '社会科学', icon: '🌍', desc: '地理、历史、政治', count: 135 }
        ]
      }
    ],
    categories: [
      { type: 'cards', name: '识字卡片', icon: '🔤', desc: '学习基础汉字', count: 3500 },
      { type: 'poems', name: '古诗词', icon: '📜', desc: '经典古诗词', count: 200 },
      { type: 'numbers', name: '数字启蒙', icon: '🔢', desc: '1-100数字学习', count: 100 },
      { type: 'english', name: '英语基础', icon: '🔤', desc: '字母和基础单词', count: 4000 },
      { type: 'math', name: '数学学习', icon: '📐', desc: '公式、原理、练习', count: 875 },
      { type: 'chinese', name: '语文扩展', icon: '📖', desc: '阅读、写作、修辞', count: 315 },
      { type: 'english-ext', name: '英语扩展', icon: '📝', desc: '语法、句型、阅读', count: 295 },
      { type: 'science', name: '科学探索', icon: '🧪', desc: '实验、物理、化学', count: 200 },
      { type: 'coding', name: '编程学习', icon: '💻', desc: '思维、逻辑、算法', count: 180 },
      { type: 'art', name: '艺术鉴赏', icon: '🎨', desc: '音乐、美术、书法', count: 160 },
      { type: 'sports', name: '体育健康', icon: '⚽', desc: '知识、健康、技巧', count: 145 },
      { type: 'life', name: '生活技能', icon: '🏠', desc: '安全、心理、技能', count: 135 },
      { type: 'social', name: '社会科学', icon: '🌍', desc: '地理、历史、政治', count: 135 },
      { type: 'classics', name: '国学经典', icon: '🎓', desc: '古文、成语、论语', count: 195 },
      { type: 'speaking', name: '英语口语', icon: '🎤', desc: '对话、练习、演讲', count: 135 }
    ],
    progress: {},
    children: [],
    currentChildId: ''
  },

  onLoad: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })
    this.loadProgress()
  },

  onShow: function() {
    this.setData({
      children: app.globalData.children || [],
      currentChildId: app.globalData.currentChildId || auth.getCurrentChildId()
    })

    var that = this
    var now = Date.now()
    if (!this._lastCloudFetch || now - this._lastCloudFetch > 30000) {
      this._lastCloudFetch = now
      cloud.fetchLearnProgress().then(function() {
        that.loadProgress()
      }).catch(function() {
        that.loadProgress()
      })
    }

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  onChildChanged: function(e) {
    var childId = e.detail.childId
    auth.switchChild(childId)
    app.globalData.currentChildId = childId
    this.setData({ currentChildId: childId })
    this.loadProgress()
  },

  // 加载学习进度
  loadProgress: function() {
    var learnProgress = childStorage.get('learnProgress') || {}
    var progress = {
      cards: Object.keys(learnProgress.cards || {}).length,
      poems: Object.keys(learnProgress.poems || {}).length,
      numbers: Object.keys(learnProgress.numbers || {}).length,
      english: Object.keys(learnProgress.english || {}).length,
      // 数学模块
      math: (Object.keys(learnProgress.mathFormulas || {}).length +
        Object.keys(learnProgress.mathConcepts || {}).length +
        Object.keys(learnProgress.mathPractice || {}).length),
      // 语文模块
      chinese: (Object.keys(learnProgress.chineseReading || {}).length +
        Object.keys(learnProgress.chineseWriting || {}).length +
        Object.keys(learnProgress.chineseRhetoric || {}).length +
        Object.keys(learnProgress.chineseClassical || {}).length),
      // 英语扩展模块
      'english-ext': (Object.keys(learnProgress.englishGrammar || {}).length +
        Object.keys(learnProgress.englishSentences || {}).length +
        Object.keys(learnProgress.englishReading || {}).length +
        Object.keys(learnProgress.englishListening || {}).length),
      // 科学模块
      science: (Object.keys(learnProgress.scienceExperiments || {}).length +
        Object.keys(learnProgress.sciencePhysics || {}).length +
        Object.keys(learnProgress.scienceChemistry || {}).length +
        Object.keys(learnProgress.scienceBiology || {}).length),
      // 编程模块
      coding: (Object.keys(learnProgress.codingThinking || {}).length +
        Object.keys(learnProgress.codingLogic || {}).length +
        Object.keys(learnProgress.codingAlgorithm || {}).length +
        Object.keys(learnProgress.codingScratch || {}).length),
      // 艺术模块
      art: (Object.keys(learnProgress.artMusic || {}).length +
        Object.keys(learnProgress.artPainting || {}).length +
        Object.keys(learnProgress.artCalligraphy || {}).length),
      // 国学经典模块
      classics: (Object.keys(learnProgress.classicsGwd || {}).length +
        Object.keys(learnProgress.classicsPoetryRules || {}).length +
        Object.keys(learnProgress.classicsIdioms || {}).length +
        Object.keys(learnProgress.classicsConfucius || {}).length),
      // 英语口语模块
      speaking: (Object.keys(learnProgress.speakingScenarios || {}).length +
        Object.keys(learnProgress.speakingPractice || {}).length +
        Object.keys(learnProgress.speakingSpeech || {}).length),
      // 社会科学模块
      social: (Object.keys(learnProgress.socialGeography || {}).length +
        Object.keys(learnProgress.socialHistory || {}).length +
        Object.keys(learnProgress.socialPolitics || {}).length),
      // 体育健康模块
      sports: (Object.keys(learnProgress.sportsKnowledge || {}).length +
        Object.keys(learnProgress.sportsHealth || {}).length +
        Object.keys(learnProgress.sportsSkills || {}).length),
      // 生活技能模块
      life: (Object.keys(learnProgress.lifeSafety || {}).length +
        Object.keys(learnProgress.lifeMental || {}).length +
        Object.keys(learnProgress.lifeSkills || {}).length)
    }

    this.setData({ progress: progress })
  },

  // 跳转到学习页面
  goLearn: function(e) {
    var type = e.currentTarget.dataset.type
    var urlMap = {
      cards: '/packageLearn/pages/cards/index',
      poems: '/packageLearn/pages/poems/index',
      numbers: '/packageLearn/pages/numbers/index',
      english: '/packageLearn/pages/english/index',
      math: '/packageLearn/pages/math/index',
      chinese: '/packageLearn/pages/chinese/index',
      'english-ext': '/packageLearn/pages/english-ext/index',
      science: '/packageLearn/pages/science/index',
      coding: '/packageLearn/pages/coding/index',
      art: '/packageLearn/pages/art/index',
      sports: '/packageLearn/pages/sports/index',
      life: '/packageLearn/pages/life/index',
      social: '/packageLearn/pages/social/index',
      classics: '/packageLearn/pages/classics/index',
      speaking: '/packageLearn/pages/speaking/index'
    }
    wx.navigateTo({ url: urlMap[type] })
  },

  // 跳转到统计页面
  goStats: function() {
    wx.navigateTo({ url: '/packageLearn/pages/stats/index' })
  },

  // 跳转到历史页面
  goHistory: function() {
    wx.navigateTo({ url: '/packageLearn/pages/history/index' })
  }
})
