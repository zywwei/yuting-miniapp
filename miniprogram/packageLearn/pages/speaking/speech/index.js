var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    speeches: [
      { id: 'ss01', title: '自我介绍', content: 'Hello everyone! My name is [Name]. I am [Age] years old. I like reading and playing football. Nice to meet you!', tips: ['说清楚自己的名字', '介绍年龄和爱好', '用简单的句子'] },
      { id: 'ss02', title: '我的家庭', content: 'I have a happy family. There are four people in my family: my father, my mother, my sister and me. My father is a teacher. My mother is a doctor. I love my family very much.', tips: ['介绍家庭成员', '描述他们的职业', '表达对家人的爱'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('speakingSpeech', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
