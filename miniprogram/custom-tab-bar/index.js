Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
      { pagePath: '/pages/habits/index', text: '习惯', icon: '🎯' },
      { pagePath: '/pages/learn/index', text: '学习', icon: '📚' },
      { pagePath: '/pages/notes/index', text: '笔记', icon: '📝' },
      { pagePath: '/pages/create/index', text: '奇趣屋', icon: '🎪' }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url = this.data.list[index].pagePath
      wx.switchTab({ url })
    }
  }
})
