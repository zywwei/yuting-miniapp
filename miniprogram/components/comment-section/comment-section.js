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
          data: {
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
          this.setData({ comments: cloudComments.concat(pendingLocal) })
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
        _pending: true  // 标记为待同步
      }
      this.setData({
        comments: this.data.comments.concat([optimisticComment]),
        inputText: ''
      })

      try {
        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: {
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
          data: {
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
        }
      } catch (err) {
        console.warn('图片评论失败，已入队等待重试:', err)
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
                data: {
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
