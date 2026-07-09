Page({
  data: {
    exercises: [
      { id: 'l01', type: '单词听写', word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果' },
      { id: 'l02', type: '单词听写', word: 'banana', phonetic: '/bəˈnænə/', meaning: '香蕉' },
      { id: 'l03', type: '单词听写', word: 'cat', phonetic: '/kæt/', meaning: '猫' },
      { id: 'l04', type: '单词听写', word: 'dog', phonetic: '/dɒɡ/', meaning: '狗' },
      { id: 'l05', type: '单词听写', word: 'egg', phonetic: '/eɡ/', meaning: '鸡蛋' },
      { id: 'l06', type: '单词听写', word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼' },
      { id: 'l07', type: '单词听写', word: 'grape', phonetic: '/ɡreɪp/', meaning: '葡萄' },
      { id: 'l08', type: '单词听写', word: 'hat', phonetic: '/hæt/', meaning: '帽子' },
      { id: 'l09', type: '单词听写', word: 'ice', phonetic: '/aɪs/', meaning: '冰' },
      { id: 'l10', type: '单词听写', word: 'juice', phonetic: '/dʒuːs/', meaning: '果汁' }
    ],
    currentExercise: null,
    showAnswer: false,
    userAnswer: ''
  },

  onLoad: function() {},

  startExercise: function(e) {
    var exercise = e.currentTarget.dataset.exercise
    this.setData({ currentExercise: exercise, showAnswer: false, userAnswer: '' })
  },

  playAudio: function() {
    wx.showToast({ title: '播放音频', icon: 'none' })
  },

  showAnswer: function() {
    this.setData({ showAnswer: true })
  },

  nextExercise: function() {
    this.setData({ currentExercise: null })
  }
})
