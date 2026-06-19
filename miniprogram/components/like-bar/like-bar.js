var auth = require('../../utils/auth.js')

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

      try {
        var res = await wx.cloud.callFunction({
          name: 'interaction',
          data: {
            action: 'toggleLike',
            targetType: this.data.targetType,
            targetId: this.data.targetId
          }
        })

        if (res.result.code === 0) {
          this.triggerEvent('likeChanged', res.result.data)
        }
      } catch (err) {
        console.warn('点赞失败:', err)
      }
    }
  }
})
