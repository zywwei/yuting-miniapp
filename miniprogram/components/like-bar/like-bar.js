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
      // A9：防抖锁，进行中忽略再次点击
      if (this._toggling) return
      this._toggling = true

      var member = auth.getMember()
      if (!member) { this._toggling = false; return }

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
      // Minor：try 外包 try/catch——triggerEvent 监听器若抛错会跳过末尾解锁导致永久锁死
      try {
        this.triggerEvent('likeChanged', { liked: willLike, likes: newLikes })
      } catch (evtErr) {
        this._toggling = false
        throw evtErr
      }

      try {
        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: { familyId: auth.getCurrentFamilyId(),
            action: 'toggleLike',
            targetType: this.data.targetType,
            targetId: this.data.targetId
          }
        })

        if (res.result && res.result.code === 0) {
          // I-5：在线成功后出队陈旧的 setLike 重试项，避免后续 flush 重放把云端状态覆盖回旧值
          syncQueue.dequeue('like_' + this.data.targetType + '_' + this.data.targetId, 'setLike')
          // 以云端返回为准校正
          this.triggerEvent('likeChanged', res.result.data)
        }
      } catch (err) {
        console.warn('点赞失败，已入队等待重试:', err)
        // A9：入队改为携带目标终态的幂等 action（setLike），
        // 避免请求已达服务端但超时时，重试把用户的点赞翻转回去
        syncQueue.enqueue({
          id: 'like_' + this.data.targetType + '_' + this.data.targetId,
          action: 'setLike',
          collection: 'likes',
          funcName: 'interaction',
          extra: {
            targetType: this.data.targetType,
            targetId: this.data.targetId,
            liked: willLike
          }
        })
        // 立即尝试 flush 一次（若已联网会马上重试）
        syncQueue.flush()
      }
      this._toggling = false
    }
  }
})
