var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    experiments: [
      { id: 'e01', title: '浮力实验', category: 'physics', materials: ['盐', '杯子', '鸡蛋', '水'], steps: ['将水倒入杯子', '放入鸡蛋，观察下沉', '逐渐加入盐，搅拌', '观察鸡蛋浮起来'], principle: '盐水密度大于鸡蛋密度时，鸡蛋上浮' },
      { id: 'e02', title: '火山爆发', category: 'chemistry', materials: ['小苏打', '醋', '洗洁精', '食用色素'], steps: ['在瓶中加入小苏打', '加入几滴洗洁精和色素', '倒入醋', '观察"岩浆"喷出'], principle: '小苏打和醋反应产生二氧化碳气体' },
      { id: 'e03', title: '种子发芽', category: 'biology', materials: ['绿豆', '纸巾', '塑料盒', '水'], steps: ['将纸巾打湿', '放上绿豆', '放入塑料盒', '每天观察并喷水'], principle: '种子在适宜的温度、水分和空气条件下发芽' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('scienceExperiments', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
