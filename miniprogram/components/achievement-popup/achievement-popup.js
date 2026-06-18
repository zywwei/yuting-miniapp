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

  lifetimes: {
    detached() {
      if (this._showTimer) { clearTimeout(this._showTimer); this._showTimer = null }
      if (this._nextTimer) { clearTimeout(this._nextTimer); this._nextTimer = null }
    }
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

      var next = queue[0]
      var remaining = queue.slice(1)
      var rarityClass = 'rarity-' + (next.rarity || 'common')

      this.setData({
        show: true,
        current: next,
        queue: remaining,
        rarityClass: rarityClass
      })

      var that = this
      if (this._showTimer) clearTimeout(this._showTimer)
      this._showTimer = setTimeout(function() {
        that._closeAndNext()
      }, 2500)
    },

    // 关闭当前并显示下一个
    _closeAndNext: function() {
      var that = this
      this.setData({ show: false })
      if (this._nextTimer) clearTimeout(this._nextTimer)
      this._nextTimer = setTimeout(function() {
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
