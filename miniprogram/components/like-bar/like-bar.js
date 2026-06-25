var auth = require('../../utils/auth.js')
var syncQueue = require('../../utils/sync-queue.js')

Component({
  properties: {
    likes: { type: Array, value: [] },
    targetType: { type: String, value: '' },
    targetId: { type: String, value: '' }
  },

  data: {
    liked: false,
    likeNames: ''
  },

  observers: {
    'likes': function(likes) {
      var member = auth.getMember()
      var liked = false
      var names = []

      if (likes && likes.length > 0) {
        for (var i = 0; i < likes.length; i++) {
          if (member && likes[i].memberId === member._id) {
            liked = true
          }
          names.push(likes[i].memberName)
        }
      }

      this.setData({
        liked: liked,
        likeNames: names.join('、')
      })
    }
  },

  methods: {
    async toggleLike() {
      if (!this.data.targetType || !this.data.targetId) return

      var member = auth.getMember()
      if (!member) return

      // 乐观更新本地显示：立即切换点赞状态，避免网络延迟造成的卡顿
      var currentLikes = this.properties.likes || []
      var existingIndex = -1
      for (var i = 0; i < currentLikes.length; i++) {
        if (currentLikes[i].memberId === member._id) {
          existingIndex = i
          break
        }
      }

      var newLikes
      var willLike
      if (existingIndex >= 0) {
        // 已点赞 → 取消
        newLikes = currentLikes.slice()
        newLikes.splice(existingIndex, 1)
        willLike = false
      } else {
        // 未点赞 → 点赞
        newLikes = currentLikes.concat([{
          memberId: member._id,
          memberName: member.roleName,
          time: new Date().toISOString()
        }])
        willLike = true
      }

      // 立即触发上层更新本地 likes，UI 即时反馈
      this.triggerEvent('likeChanged', { liked: willLike, likes: newLikes })

      try {
        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: {
            action: 'toggleLike',
            targetType: this.data.targetType,
            targetId: this.data.targetId
          }
        })

        if (res.result && res.result.code === 0) {
          // 以云端返回为准校正
          this.triggerEvent('likeChanged', res.result.data)
        }
      } catch (err) {
        console.warn('点赞失败，已入队等待重试:', err)
        // 断网/失败：入队，联网后由 syncQueue 自动重试
        syncQueue.enqueue({
          id: 'like_' + this.data.targetType + '_' + this.data.targetId,
          action: 'toggleLike',
          collection: 'likes',
          funcName: 'interaction',
          extra: {
            targetType: this.data.targetType,
            targetId: this.data.targetId
          }
        })
        // 立即尝试 flush 一次（若已联网会马上重试）
        syncQueue.flush()
      }
    }
  }
})
