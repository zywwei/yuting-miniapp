var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')

Page({
  data: {
    categories: [
      { type: 'cards', name: '识字卡片', icon: '🔤', desc: '学习基础汉字', count: 120 },
      { type: 'poems', name: '古诗背诵', icon: '📜', desc: '经典古诗词', count: 25 },
      { type: 'numbers', name: '数字启蒙', icon: '🔢', desc: '1-100数字学习', count: 100 },
      { type: 'english', name: '英语学习', icon: '🔤', desc: '字母和基础单词', count: 56 }
    ],
    progress: {}
  },

  onLoad: function() {
    this.loadProgress()
  },

  onShow: function() {
    var that = this
    cloud.fetchLearnProgress().then(function() {
      that.loadProgress()
    }).catch(function() {
      that.loadProgress()
    })

    // 更新 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  // 加载学习进度
  loadProgress: function() {
    var learnProgress = childStorage.get('learnProgress') || {}
    var progress = {
      cards: Object.keys(learnProgress.cards || {}).length,
      poems: Object.keys(learnProgress.poems || {}).length,
      numbers: Object.keys(learnProgress.numbers || {}).length,
      english: Object.keys(learnProgress.english || {}).length
    }

    this.setData({ progress: progress })
  },

  // 跳转到学习页面
  goLearn: function(e) {
    var type = e.currentTarget.dataset.type
    var urlMap = {
      cards: '/pages/learn/cards',
      poems: '/pages/learn/poems',
      numbers: '/pages/learn/numbers',
      english: '/pages/learn/english'
    }
    wx.navigateTo({ url: urlMap[type] })
  }
})
