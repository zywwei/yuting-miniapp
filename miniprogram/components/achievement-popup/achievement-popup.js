/**
 * 成就解锁弹窗组件
 * 支持连续解锁排队显示
 */
Component({
  properties: {},

  data: {
    show: false,
    current: null,
    queue: [],
    rarityClass: ''
  },

  methods: {
    // 显示成就解锁弹窗（外部调用）
    showAchievement: function(achievement) {
      var queue = this.data.queue.concat([achievement])
      if (!this.data.show) {
        this.setData({ queue: queue })
        this._showNext()
      } else {
        this.setData({ queue: queue })
      }
    },

    // 批量显示成就
    showAchievements: function(achievements) {
      if (!achievements || achievements.length === 0) return
      var queue = this.data.queue.concat(achievements)
      this.setData({ queue: queue })
      if (!this.data.show) {
        this._showNext()
      }
    },

    // 显示队列中的下一个
    _showNext: function() {
      var queue = this.data.queue
      if (queue.length === 0) {
        this.setData({ show: false, current: null })
        return
      }

      var next = queue.shift()
      var rarityClass = 'rarity-' + (next.rarity || 'common')

      this.setData({
        show: true,
        current: next,
        queue: queue,
        rarityClass: rarityClass
      })

      var that = this
      setTimeout(function() {
        that._closeAndNext()
      }, 2500)
    },

    // 关闭当前并显示下一个
    _closeAndNext: function() {
      var that = this
      this.setData({ show: false })
      setTimeout(function() {
        that._showNext()
      }, 300)
    },

    // 点击关闭
    onTapClose: function() {
      this._closeAndNext()
    },

    // 点击弹窗查看详情
    onTapPopup: function() {
      var current = this.data.current
      this._closeAndNext()
      if (current) {
        wx.navigateTo({ url: '/pages/achievement/index' })
      }
    }
  }
})
