var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    skills: [
      { id: 'ls01', name: '整理房间', desc: '保持房间整洁有序', steps: ['分类整理物品', '用完放回原处', '定期打扫', '保持通风'] },
      { id: 'ls02', name: '时间管理', desc: '合理安排时间', steps: ['制定计划', '分清主次', '专注做事', '劳逸结合'] },
      { id: 'ls03', name: '做家务', desc: '学会基本家务', steps: ['扫地拖地', '洗碗', '叠衣服', '倒垃圾'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('lifeSkills', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/life/skills/detail/index?id=' + id
    })
  }
})
