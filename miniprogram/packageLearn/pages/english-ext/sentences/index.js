var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    sentences: [
      { id: 's01', type: '陈述句', structure: '主语 + 动词 + 宾语', example: 'I like apples.', meaning: '我喜欢苹果。' },
      { id: 's02', type: '一般疑问句', structure: '助动词 + 主语 + 动词?', example: 'Do you like apples?', meaning: '你喜欢苹果吗？' },
      { id: 's03', type: '特殊疑问句', structure: '疑问词 + 助动词 + 主语 + 动词?', example: 'What do you like?', meaning: '你喜欢什么？' },
      { id: 's04', type: '祈使句', structure: '动词原形 + 其他', example: 'Open the door.', meaning: '打开门。' },
      { id: 's05', type: '感叹句', structure: 'What/How + 形容词', example: 'What a beautiful day!', meaning: '多么美好的一天！' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('englishSentences', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
