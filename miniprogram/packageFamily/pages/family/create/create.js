var auth = getApp().globalData.auth

Page({
  data: {
    role: '',
    roleName: '',
    nickname: '',
    familyName: '',
    childName: '',
    childNickname: '',
    childGender: '',
    childBirthday: '',
    memberAvatar: '',
    childAvatar: '',
    familyAvatar: '',
    selectedTheme: 'pink',
    loading: false,
    inviteCode: '',
    created: false
  },

  onLoad(options) {
    this.setData({
      role: options.role || 'father',
      roleName: decodeURIComponent(options.roleName || '爸爸'),
      nickname: decodeURIComponent(options.nickname || ''),
      memberAvatar: decodeURIComponent(options.avatar || '')
    })
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value })
  },

  onChildNameInput(e) {
    this.setData({ childName: e.detail.value })
  },

  onChildNicknameInput(e) {
    this.setData({ childNickname: e.detail.value })
  },

  selectGender(e) {
    var gender = e.currentTarget.dataset.gender
    this.setData({
      childGender: gender,
      selectedTheme: gender === 'boy' ? 'blue' : 'pink'
    })
    // 动态设置状态栏颜色
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: gender === 'boy' ? '#4A90D9' : '#FF9AAB',
      animation: { duration: 300, timingFunc: 'easeIn' }
    })
  },

  onChildBirthdayChange(e) {
    this.setData({ childBirthday: e.detail.value })
  },

  chooseFamilyAvatar() {
    this.chooseAvatar('familyAvatar')
  },

  chooseChildAvatar() {
    this.chooseAvatar('childAvatar')
  },

  chooseAvatar(field) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ [field]: tempPath })
      }
    })
  },

  async uploadAvatar(tempPath, folder) {
    if (!tempPath || tempPath.startsWith('cloud://')) return tempPath
    const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`
    const res = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
    return res.fileID
  },

  async createFamily() {
    if (!this.data.childName.trim()) {
      wx.showToast({ title: '请输入孩子姓名', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      let childAvatar = this.data.childAvatar
      let familyAvatar = this.data.familyAvatar

      if (familyAvatar && !familyAvatar.startsWith('cloud://')) {
        familyAvatar = await this.uploadAvatar(familyAvatar, 'families')
      }
      if (childAvatar && !childAvatar.startsWith('cloud://')) {
        childAvatar = await this.uploadAvatar(childAvatar, 'avatars')
      }

      var res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'create',
          familyName: this.data.familyName.trim() || (this.data.childName.trim() + '的家'),
          role: this.data.role,
          roleName: this.data.roleName,
          nickname: this.data.nickname,
          childName: this.data.childName.trim(),
          childNickname: this.data.childNickname.trim(),
          childGender: this.data.childGender,
          childBirthday: this.data.childBirthday,
          familyAvatar: familyAvatar,
          avatar: this.data.memberAvatar,
          childTheme: this.data.selectedTheme
        }
      })

      if (res.result.code === 0) {
        var data = res.result.data

        // 如果已存在家庭，获取完整数据后进入首页
        if (data.existing) {
          wx.showToast({ title: '您已加入家庭', icon: 'none' })
          try {
            var familyRes = await wx.cloud.callFunction({
              name: 'family',
              data: { action: 'getMyFamilies' }
            })
            if (familyRes.result.code === 0 && familyRes.result.data.families.length > 0) {
              var f = familyRes.result.data.families[0]
              auth.setFamily(f.family)
              auth.setMember(f.member)
              auth.setChildren(f.children || [])
              if (f.children && f.children.length > 0) {
                auth.switchChild(f.children[0].childId)
              }
            }
          } catch (e) {
            console.warn('获取家庭数据失败:', e)
          }
          setTimeout(function() {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1500)
          return
        }

        auth.setFamily({ _id: data.familyId, name: this.data.familyName || (this.data.childName + '的家'), avatar: familyAvatar })
        auth.setMember({
          _id: '',
          familyId: data.familyId,
          role: this.data.role,
          roleName: this.data.roleName,
          nickname: this.data.nickname,
          avatar: this.data.memberAvatar,
          permissions: ['admin']
        })

        if (childAvatar) {
          await wx.cloud.callFunction({
            name: 'family',
            data: { action: 'updateChildAvatar', childId: data.childId, avatar: childAvatar }
          })
        }

        auth.setChildren([{
          childId: data.childId,
          name: this.data.childName,
          nickname: this.data.childNickname,
          gender: this.data.childGender,
          birthday: this.data.childBirthday,
          avatar: childAvatar,
          theme: this.data.selectedTheme
        }])
        auth.switchChild(data.childId)

        this.setData({
          inviteCode: data.inviteCode,
          created: true,
          loading: false
        })
      } else {
        wx.showToast({ title: res.result.msg || '创建失败', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('创建家庭失败:', err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success() {
        wx.showToast({ title: '已复制邀请码', icon: 'success' })
      }
    })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    return {
      title: '邀请你加入' + (this.data.familyName || '宝宝的家'),
      path: '/packageFamily/pages/family/join/join?inviteCode=' + this.data.inviteCode
    }
  }
})
