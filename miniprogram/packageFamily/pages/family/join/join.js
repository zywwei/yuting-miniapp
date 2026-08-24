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
        data: { familyId: auth.getCurrentFamilyId(),
          action: 'join',
          inviteCode: code,
          role: this.data.role,
          roleName: this.data.roleName,
          nickname: this.data.nickname,
          avatar: this.data.avatar
        }
      })

      if (res.result.code === 0) {
        // P1-15：本地不再自授权限——服务端 joinFamily 已按角色写入权威 permissions，
        // 本地仅以最小权限占位，随后从云端拉取权威成员数据覆盖
        auth.setMember({
          _id: '',
          familyId: res.result.data.familyId,
          role: this.data.role,
          roleName: this.data.roleName,
          nickname: this.data.nickname,
          avatar: this.data.avatar,
          permissions: []
        })
        auth.setFamily({ _id: res.result.data.familyId })

        wx.showToast({ title: '加入成功', icon: 'success' })
        // 从云端拉取权威 member（含真实 _id/openid/permissions）后再进入首页；
        // 失败也放行（下次启动 checkAuth 会再校正），本地保持最小权限
        var app = getApp()
        app.refreshFamilyInfo().then(function() {
          setTimeout(function() { wx.reLaunch({ url: '/pages/index/index' }) }, 600)
        }).catch(function() {
          setTimeout(function() { wx.reLaunch({ url: '/pages/index/index' }) }, 600)
        })
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
