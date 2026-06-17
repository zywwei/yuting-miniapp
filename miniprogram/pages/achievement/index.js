var achievements = require('../../utils/achievements.js')

Page({
  data: {
    stats: { total: 0, unlocked: 0, percentage: 0 },
    categories: [
      { key: 'all', name: '全部' },
      { key: 'habit', name: '习惯' },
      { key: 'learn', name: '学习' },
      { key: 'story', name: '故事' },
      { key: 'special', name: '特殊' }
    ],
    currentCategory: 'all',
    achievementList: [],
    filteredList: []
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var stats = achievements.getAchievementStats()

    this.setData({
      stats: stats
    })

    this.filterByCategory(this.data.currentCategory)
  },

  // 切换分类
  onTabTap: function(e) {
    var category = e.currentTarget.dataset.key
    this.setData({ currentCategory: category })
    this.filterByCategory(category)
  },

  // 按分类筛选
  filterByCategory: function(category) {
    var list = achievements.getAchievementsByCategory(category)
    this.setData({ filteredList: list })
  },

  // 点击成就查看详情
  onAchievementTap: function(e) {
    var item = e.currentTarget.dataset.item
    wx.showModal({
      title: item.icon + ' ' + item.title,
      content: item.desc + (item.unlocked ? '\n\n✅ 已于 ' + this.formatTime(item.unlockedAt) + ' 解锁' : '\n\n📊 当前进度: ' + item.progress + '/' + item.maxProgress),
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 格式化时间
  formatTime: function(isoStr) {
    if (!isoStr) return ''
    var d = new Date(isoStr)
    var month = d.getMonth() + 1
    var day = d.getDate()
    var hour = d.getHours()
    var minute = d.getMinutes()
    return month + '月' + day + '日 ' + (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute
  }
})
