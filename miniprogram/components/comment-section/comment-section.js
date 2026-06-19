var auth = require('../../utils/auth.js')

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
          this.setData({ comments: res.result.data || [] })
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
          this.setData({ inputText: '' })
          this.loadComments()
          this.triggerEvent('commentAdded')
        }
      } catch (err) {
        wx.showToast({ title: '评论失败', icon: 'none' })
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
        var cloudPath = 'comments/' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg'

        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempPath
        })

        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: {
            action: 'addComment',
            targetType: this.data.targetType,
            targetId: this.data.targetId,
            childId: this.data.childId,
            content: '',
            type: 'image',
            imageFileId: uploadRes.fileID
          }
        })

        if (res.result.code === 0) {
          this.loadComments()
          this.triggerEvent('commentAdded')
        }
      } catch (err) {
        console.warn('图片评论失败:', err)
      }
    },

    async deleteComment(e) {
      var commentId = e.currentTarget.dataset.id

      wx.showModal({
        title: '提示',
        content: '确定删除这条评论吗？',
        success: async (res) => {
          if (res.confirm) {
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
              }
            } catch (err) {
              wx.showToast({ title: '删除失败', icon: 'none' })
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
      wx.previewImage({ urls: [url] })
    }
  }
})
