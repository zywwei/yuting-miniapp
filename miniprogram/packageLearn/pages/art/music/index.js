var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'm01', title: '音符与节拍', content: '音符表示音的长短，节拍表示音的强弱。常见音符：全音符、二分音符、四分音符、八分音符。', examples: ['4/4拍：每小节4拍', '3/4拍：每小节3拍（华尔兹）'] },
      { id: 'm02', title: '乐器介绍', content: '乐器分为弦乐器、管乐器、打击乐器和键盘乐器。', examples: ['弦乐器：小提琴、吉他', '管乐器：长笛、小号', '打击乐器：鼓、钢琴'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('artMusic', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
