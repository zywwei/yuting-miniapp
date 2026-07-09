var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    scenarios: [
      { id: 'sc01', title: '在餐厅', dialogues: [
        { speaker: 'Waiter', english: 'What would you like to order?', chinese: '您想点什么？' },
        { speaker: 'Customer', english: 'I would like a hamburger and a glass of juice, please.', chinese: '我想要一个汉堡和一杯果汁。' },
        { speaker: 'Waiter', english: 'Anything else?', chinese: '还需要其他的吗？' },
        { speaker: 'Customer', english: 'No, thank you.', chinese: '不用了，谢谢。' }
      ]},
      { id: 'sc02', title: '问路', dialogues: [
        { speaker: 'Tourist', english: 'Excuse me, where is the nearest subway station?', chinese: '请问最近的地铁站在哪里？' },
        { speaker: 'Local', english: 'Go straight and turn left at the traffic light.', chinese: '直走，在红绿灯处左转。' },
        { speaker: 'Tourist', english: 'Thank you very much!', chinese: '非常感谢！' }
      ]}
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('speakingScenarios', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
