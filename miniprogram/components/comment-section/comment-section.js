var auth = require('../../utils/auth.js')
var syncQueue = require('../../utils/sync-queue.js')
var cloud = require('../../utils/cloud.js')
var { previewImage: previewImageHelper } = getApp().globalData.pageHelpers

var EMOJI_LIST = ['😊', '😂', '🥰', '😍', '🤩', '😘', '😋', '🤗', '👏', '👍', '❤️', '🎉', '✨', '🌟', '💪', '🥳']

Component({
  properties: {
    targetType: { type: String, value: '' },
    targetId: { type: String, value: '' },
    childId: { type: String, value: '' }
  },

  data: {
    comments: [],
    inputText: '',
    showEmoji: false,
    emojiList: EMOJI_LIST,
    loading: false
  },

  lifetimes: {
    attached() {
      this.loadComments()
    }
  },

  methods: {
    async loadComments() {
      if (!this.data.targetType || !this.data.targetId) return

      this.setData({ loading: true })

      try {
        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: { familyId: auth.getCurrentFamilyId(),
            action: 'getComments',
            targetType: this.data.targetType,
            targetId: this.data.targetId
          }
        })

        if (res.result.code === 0) {
          var cloudComments = res.result.data || []
          // 保留本地待同步的评论（_pending），避免联网拉取后 pending 评论闪现消失
          var pendingLocal = (this.data.comments || []).filter(function(c) {
            return c._pending
          })
          // P1-11：计算 _canDelete 供 WXML 绑定（WXML 无法调用组件方法）
          var withPerm = cloudComments.concat(pendingLocal).map(function(c) {
            var member = auth.getMember()
            c._canDelete = !!(member && (auth.isAdmin() || c.authorId === member._id))
            return c
          })
          this.setData({ comments: withPerm })
        }
      } catch (err) {
        console.warn('加载评论失败:', err)
      }

      this.setData({ loading: false })
    },

    onInput(e) {
      this.setData({ inputText: e.detail.value })
    },

    toggleEmoji() {
      this.setData({ showEmoji: !this.data.showEmoji })
    },

    selectEmoji(e) {
      var emoji = e.currentTarget.dataset.emoji
      this.setData({
        inputText: this.data.inputText + emoji,
        showEmoji: false
      })
    },

    async submitComment() {
      var content = this.data.inputText.trim()
      if (!content) return

      var member = auth.getMember()
      // 乐观显示：先把评论加到本地列表，UI 即时反馈
      var tempId = 'local_' + Date.now()
      var optimisticComment = {
        _id: tempId,
        targetType: this.data.targetType,
        targetId: this.data.targetId,
        childId: this.data.childId,
        authorId: member ? member._id : '',
        authorName: member ? member.roleName : '',
        authorRole: member ? member.role : '',
        content: content,
        type: 'text',
        imageFileId: '',
        emoji: '',
        isDeleted: false,
        createTime: new Date().toISOString(),
        _pending: true,  // 标记为待同步
        _canDelete: true // 自己发的乐观评论可删（P1-11）
      }
      this.setData({
        comments: this.data.comments.concat([optimisticComment]),
        inputText: ''
      })

      try {
        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: { familyId: auth.getCurrentFamilyId(),
            action: 'addComment',
            targetType: this.data.targetType,
            targetId: this.data.targetId,
            childId: this.data.childId,
            content: content,
            type: 'text'
          }
        })

        if (res.result.code === 0) {
          this.loadComments()
          this.triggerEvent('commentAdded')
        } else {
          // A10：业务失败（如内容审核拒绝）时移除乐观评论并提示，否则幽灵评论常驻
          this.setData({
            comments: this.data.comments.filter(function(c) { return c._id !== tempId })
          })
          wx.showToast({ title: res.result.msg || '评论发送失败', icon: 'none' })
        }
      } catch (err) {
        console.warn('评论失败，已入队等待重试:', err)
        // 断网/失败：入队，联网后由 syncQueue 自动重试
        syncQueue.enqueue({
          id: 'comment_' + tempId,
          action: 'addComment',
          collection: 'comments',
          funcName: 'interaction',
          extra: {
            targetType: this.data.targetType,
            targetId: this.data.targetId,
            childId: this.data.childId,
            content: content,
            type: 'text'
          }
        })
        syncQueue.flush()
        wx.showToast({ title: '评论将在联网后发送', icon: 'none' })
      }
    },

    async addImageComment() {
      try {
        var chooseRes = await wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sizeType: ['compressed']
        })

        var tempPath = chooseRes.tempFiles[0].tempFilePath

        // 压缩并上传图片
        var fileID = await cloud.uploadImageCompressed(tempPath, 'comments')

        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: { familyId: auth.getCurrentFamilyId(),
            action: 'addComment',
            targetType: this.data.targetType,
            targetId: this.data.targetId,
            childId: this.data.childId,
            content: '',
            type: 'image',
            imageFileId: fileID
          }
        })

        if (res.result.code === 0) {
          this.loadComments()
          this.triggerEvent('commentAdded')
        } else {
          // 业务失败：与文本评论 A10 同样处理，避免幽灵评论常驻
          wx.showToast({ title: res.result.msg || '评论发送失败', icon: 'none' })
        }
      } catch (err) {
        // P1 修复补充：catch 覆盖了选图/上传/调云三段，必须区分处理——
        // ① 用户取消选图（errMsg 含 cancel）：静默返回，不提示不入队
        var errMsg = (err && err.errMsg) || ''
        if (errMsg.indexOf('cancel') >= 0) return
        console.warn('图片评论失败:', err)
        // ② 图片未上传成功（无合法 fileID）：入队会产生空图脏数据，提示重试
        if (typeof fileID !== 'string' || fileID.indexOf('cloud://') !== 0) {
          wx.showToast({ title: '图片上传失败，请重试', icon: 'none' })
          return
        }
        // ③ 图片已上传成功但评论接口失败：入队等待联网重试
        // （flush 的业务码校验/重试机制已覆盖 addComment）
        syncQueue.enqueue({
          id: 'imgcomment_' + Date.now(),
          action: 'addComment',
          collection: 'comments',
          funcName: 'interaction',
          extra: {
            targetType: this.data.targetType,
            targetId: this.data.targetId,
            childId: this.data.childId,
            content: '',
            type: 'image',
            imageFileId: typeof fileID === 'string' ? fileID : ''
          }
        })
        syncQueue.flush()
        wx.showToast({ title: '图片评论将在联网后发送', icon: 'none' })
      }
    },

    async deleteComment(e) {
      var commentId = e.currentTarget.dataset.id
      // 本地待发送的评论直接移除即可
      if (typeof commentId === 'string' && commentId.indexOf('local_') === 0) {
        this.setData({
          comments: this.data.comments.filter(function(c) { return c._id !== commentId })
        })
        return
      }

      wx.showModal({
        title: '提示',
        content: '确定删除这条评论吗？',
        success: async (res) => {
          if (res.confirm) {
            // 乐观隐藏
            this.setData({
              comments: this.data.comments.filter(function(c) { return c._id !== commentId })
            })
            try {
              var result = await wx.cloud.callFunction({
                name: 'interaction',
                data: { familyId: auth.getCurrentFamilyId(),
                  action: 'deleteComment',
                  commentId: commentId
                }
              })

              if (result.result.code === 0) {
                this.loadComments()
              } else {
                wx.showToast({ title: result.result.msg || '删除失败', icon: 'none' })
                this.loadComments()  // 恢复显示
              }
            } catch (err) {
              console.warn('删除评论失败，已入队等待重试:', err)
              // 入队重试
              syncQueue.enqueue({
                id: 'delcomment_' + commentId,
                action: 'deleteComment',
                collection: 'comments',
                funcName: 'interaction',
                extra: { commentId: commentId }
              })
              syncQueue.flush()
            }
          }
        }
      })
    },

    canDelete(comment) {
      var member = auth.getMember()
      if (!member) return false
      if (auth.isAdmin()) return true
      return comment.authorId === member._id
    },

    previewImage(e) {
      var url = e.currentTarget.dataset.url
      previewImageHelper(url)
    }
  }
})
