var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    exercises: [
      { id: 'sp01', type: '跟读练习', text: 'Hello, how are you?', phonetic: '/həˈloʊ, haʊ ɑːr juː/', meaning: '你好，你怎么样？' },
      { id: 'sp02', type: '看图说话', image: 'apple', prompt: '请用英语描述这个水果', example: 'This is an apple. It is red and round.' }
    ]
  },

  onLoad: function() {},

  playAudio: function() {
    wx.showToast({ title: '播放音频', icon: 'none' })
  },

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('speakingPractice', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/speaking/practice/detail/index?id=' + id
    })
  }
})
