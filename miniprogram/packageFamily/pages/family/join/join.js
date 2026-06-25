var auth = getApp().globalData.auth

Page({
  data: {
    role: '',
    roleName: '',
    nickname: '',
    inviteCode: '',
    loading: false
  },

  onLoad(options) {
    this.setData({
      role: options.role || 'other',
      roleName: decodeURIComponent(options.roleName || '家人'),
      nickname: decodeURIComponent(options.nickname || ''),
      avatar: decodeURIComponent(options.avatar || '')
    })
  },

  onCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() })
  },

  async joinFamily() {
    var code = this.data.inviteCode.trim()
    if (code.length !== 8) {
      wx.showToast({ title: '请输入8位邀请码', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      var res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'join',
          inviteCode: code,
          role: this.data.role,
          roleName: this.data.roleName,
          nickname: this.data.nickname,
          avatar: this.data.avatar
        }
      })

      if (res.result.code === 0) {
        auth.setMember({
          _id: '',
          familyId: res.result.data.familyId,
          role: this.data.role,
          roleName: this.data.roleName,
          nickname: this.data.nickname,
          avatar: this.data.avatar,
          permissions: (this.data.role === 'father' || this.data.role === 'mother') ? ['admin'] : ['editor']
        })

        wx.showToast({ title: '加入成功', icon: 'success' })
        setTimeout(function() {
          wx.reLaunch({ url: '/pages/index/index' })
        }, 1500)
      } else {
        wx.showToast({ title: res.result.msg || '加入失败', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加入家庭失败:', err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      this.setData({ loading: false })
    }
  }
})
