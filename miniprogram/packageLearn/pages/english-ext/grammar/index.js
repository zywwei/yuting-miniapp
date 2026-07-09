var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    grammar: [
      { id: 'g01', title: '名词', desc: '表示人、事物、地点等名称', examples: ['book - 书本', 'teacher - 老师', 'school - 学校'], rules: ['可数名词有单复数变化', '不可数名词没有复数形式'] },
      { id: 'g02', title: '动词', desc: '表示动作或状态', examples: ['run - 跑', 'eat - 吃', 'is - 是'], rules: ['动词有时态变化', '第三人称单数加s'] },
      { id: 'g03', title: '形容词', desc: '描述名词的特征', examples: ['big - 大的', 'happy - 快乐的', 'red - 红色的'], rules: ['形容词放在名词前面', '有比较级和最高级'] },
      { id: 'g04', title: '副词', desc: '修饰动词或形容词', examples: ['quickly - 快速地', 'very - 非常', 'always - 总是'], rules: ['副词常以ly结尾', '可以修饰动词和形容词'] },
      { id: 'g05', title: '介词', desc: '表示位置或关系', examples: ['in - 在里面', 'on - 在上面', 'under - 在下面'], rules: ['介词后接名词或代词', '表示时间或空间关系'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('englishGrammar', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
