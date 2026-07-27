var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    algorithms: [
      { id: 'a01', name: '冒泡排序', desc: '比较相邻元素，大的往后移', steps: ['从第一个开始', '比较相邻两个', '如果前面大就交换', '重复直到排序完成'], timeComplexity: 'O(n²)' },
      { id: 'a02', name: '二分查找', desc: '在有序数组中快速查找', steps: ['取中间元素', '比较目标值', '目标小则查左半部分', '目标大则查右半部分'], timeComplexity: 'O(log n)' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('codingAlgorithm', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/coding/algorithm/detail/index?id=' + id
    })
  }
})
