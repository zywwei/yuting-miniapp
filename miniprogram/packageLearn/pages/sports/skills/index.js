var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    skills: [
      { id: 'ss01', name: '跑步技巧', desc: '正确的跑步姿势和呼吸方法', steps: ['身体稍微前倾', '手臂自然摆动', '脚掌先着地', '保持均匀呼吸'] },
      { id: 'ss02', name: '跳绳技巧', desc: '跳绳的基本方法和花样', steps: ['手腕发力', '双脚并拢跳', '保持节奏', '逐渐加速'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('sportsSkills', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/sports/skills/detail/index?id=' + id
    })
  }
})
