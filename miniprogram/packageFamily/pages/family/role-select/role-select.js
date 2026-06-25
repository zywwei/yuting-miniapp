var auth = getApp().globalData.auth

var ROLES = [
  { role: 'father', name: '爸爸', icon: '👨' },
  { role: 'mother', name: '妈妈', icon: '👩' },
  { role: 'grandpa', name: '爷爷', icon: '👴' },
  { role: 'grandma', name: '奶奶', icon: '👵' },
  { role: 'uncle', name: '叔叔', icon: '👨' },
  { role: 'aunt', name: '阿姨', icon: '👩' },
  { role: 'child', name: '本人', icon: '🧒' },
  { role: 'other', name: '其他', icon: '👤' }
]

Page({
  data: {
    roles: ROLES,
    selectedRole: '',
    selectedRoleName: '',
    nickname: '',
    avatar: '',
    step: 1
  },

  selectRole(e) {
    var role = e.currentTarget.dataset.role
    var roleName = e.currentTarget.dataset.name
    this.setData({
      selectedRole: role,
      selectedRoleName: roleName
    })
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ avatar: tempPath })
      }
    })
  },

  async uploadAvatar(tempPath) {
    if (!tempPath || tempPath.startsWith('cloud://')) return tempPath
    const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`
    const res = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
    return res.fileID
  },

  nextStep() {
    if (!this.data.selectedRole) {
      wx.showToast({ title: '请选择角色', icon: 'none' })
      return
    }
    this.setData({ step: 2 })
  },

  async goCreate() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    let avatar = ''
    if (this.data.avatar) {
      wx.showLoading({ title: '上传头像中...' })
      try {
        avatar = await this.uploadAvatar(this.data.avatar)
      } catch (err) {
        console.warn('头像上传失败:', err)
      }
      wx.hideLoading()
    }

    wx.navigateTo({
      url: '/packageFamily/pages/family/create/create?role=' + this.data.selectedRole +
           '&roleName=' + encodeURIComponent(this.data.selectedRoleName) +
           '&nickname=' + encodeURIComponent(this.data.nickname.trim()) +
           '&avatar=' + encodeURIComponent(avatar)
    })
  },

  async goJoin() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    let avatar = ''
    if (this.data.avatar) {
      wx.showLoading({ title: '上传头像中...' })
      try {
        avatar = await this.uploadAvatar(this.data.avatar)
      } catch (err) {
        console.warn('头像上传失败:', err)
      }
      wx.hideLoading()
    }

    wx.navigateTo({
      url: '/packageFamily/pages/family/join/join?role=' + this.data.selectedRole +
           '&roleName=' + encodeURIComponent(this.data.selectedRoleName) +
           '&nickname=' + encodeURIComponent(this.data.nickname.trim()) +
           '&avatar=' + encodeURIComponent(avatar)
    })
  },

  goBack() {
    this.setData({ step: 1 })
  }
})
