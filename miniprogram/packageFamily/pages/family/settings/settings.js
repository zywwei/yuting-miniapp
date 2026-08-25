var auth = getApp().globalData.auth
var cloud = getApp().globalData.cloud

var THEMES = [
  { id: 'pink', name: '粉色', color: '#FF9AAB', bg: '#FFF5F7', gradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)' },
  { id: 'blue', name: '蓝色', color: '#4A90D9', bg: '#E8F0FE', gradient: 'linear-gradient(135deg, #4A90D9 0%, #6BB3F0 100%)' },
  { id: 'purple', name: '紫色', color: '#9B59B6', bg: '#F3E5F5', gradient: 'linear-gradient(135deg, #9B59B6 0%, #BB6BD9 100%)' },
  { id: 'green', name: '绿色', color: '#27AE60', bg: '#E8F5E9', gradient: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)' },
  { id: 'orange', name: '橙色', color: '#F39C12', bg: '#FFF3E0', gradient: 'linear-gradient(135deg, #F39C12 0%, #F1C40F 100%)' },
  { id: 'mint', name: '薄荷', color: '#1ABC9C', bg: '#E0F2F1', gradient: 'linear-gradient(135deg, #1ABC9C 0%, #2ECC71 100%)' }
]

Page({
  data: {
    member: null,
    family: null,
    children: [],
    members: [],
    inviteCode: '',
    inviteCodeExpireAt: '',
    loading: false,
    showAddChild: false,
    showMembers: false,
    newChildName: '',
    newChildNickname: '',
    newChildGender: '',
    newChildBirthday: '',
    newChildAvatar: '',
    isAdmin: false,
    themes: THEMES,
    currentTheme: 'pink',
    currentChildId: '',
    themeBg: '#FFF5F7',
    themeGradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)',
    showThemePanel: false,
    showEditChild: false,
    editChildId: '',
    editChildName: '',
    editChildNickname: '',
    editChildGender: '',
    editChildBirthday: '',
    editChildAvatar: '',
    editChildTheme: 'pink'
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    var member = auth.getMember()
    var family = auth.getFamily()
    var children = auth.getChildren()
    var currentChildId = auth.getCurrentChildId()

    var currentTheme = 'pink'
    var themeBg = '#FFF5F7'
    var themeGradient = 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)'

    for (var i = 0; i < children.length; i++) {
      if (children[i].childId === currentChildId && children[i].theme) {
        currentTheme = children[i].theme
        break
      }
    }

    // 根据主题设置背景色
    for (var j = 0; j < THEMES.length; j++) {
      if (THEMES[j].id === currentTheme) {
        themeBg = THEMES[j].bg
        themeGradient = THEMES[j].gradient
        break
      }
    }

    this.setData({
      member: member,
      family: family,
      children: children,
      isAdmin: auth.isAdmin(),
      currentChildId: currentChildId,
      currentTheme: currentTheme,
      themeBg: themeBg,
      themeGradient: themeGradient
    })

    // 设置状态栏颜色
    var themeColor = '#FF9AAB'
    for (var k = 0; k < THEMES.length; k++) {
      if (THEMES[k].id === currentTheme) {
        themeColor = THEMES[k].color
        break
      }
    }
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor
    })

    if (family) {
      this.setData({
        inviteCode: family.inviteCode || '',
        inviteCodeExpireAt: family.inviteCodeExpireAt || ''
      })
    }

    await this.loadMembers()
  },

  async loadMembers() {
    if (!this.data.family) return

    try {
      var res = await wx.cloud.callFunction({
        name: 'family',
        data: { familyId: auth.getCurrentFamilyId(), action: 'getInfo' }
      })

      if (res.result.code === 0) {
        var family = res.result.data.family
        family.members = res.result.data.members || []
        this.setData({
          family: family,
          children: res.result.data.children
        })
        // 同步到 app.globalData
        var app = getApp()
        app.globalData.children = res.result.data.children
        auth.setChildren(res.result.data.children)

        // P1-15 配套：用云端权威数据回写本地 member（真实 _id/openid/permissions），
        // 修复成员列表"自我排除失效"与本地权限过期问题
        var members = res.result.data.members || []
        var myOpenid = app.globalData.member && app.globalData.member.openid
        var mine = null
        for (var i = 0; i < members.length; i++) {
          if ((myOpenid && members[i].openid === myOpenid) || (!myOpenid && members[i]._id === auth.getMember()._id)) {
            mine = members[i]
            break
          }
        }
        if (mine) {
          auth.setMember(mine)
          app.globalData.member = mine
        }
      }
    } catch (err) {
      console.warn('加载成员失败:', err)
    }
  },

  selectTheme(e) {
    var themeId = e.currentTarget.dataset.id
    this.setData({ currentTheme: themeId })
    this.saveChildTheme(themeId)
  },

  async saveChildTheme(themeId) {
    var childId = this.data.currentChildId
    if (!childId) return

    var theme = null
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === themeId) {
        theme = THEMES[i]
        break
      }
    }

    if (!theme) return

    try {
      await wx.cloud.callFunction({
        name: 'family',
        data: { familyId: auth.getCurrentFamilyId(),
          action: 'updateChild',
          childId: childId,
          theme: themeId
        }
      })

      var children = this.data.children
      for (var j = 0; j < children.length; j++) {
        if (children[j].childId === childId) {
          children[j].theme = themeId
          break
        }
      }
      auth.setChildren(children)

      // 同步到 app.globalData
      var app = getApp()
      app.globalData.children = children
      app.globalData.themeColor = theme.color
      app.globalData.themeBg = theme.bg
      app.globalData.themeGradient = theme.gradient

      this.setData({
        children: children,
        themeBg: theme.bg,
        themeGradient: theme.gradient
      })

      // 更新状态栏颜色
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.color
      })

      wx.showToast({ title: '已切换主题', icon: 'success' })
    } catch (err) {
      console.warn('保存主题失败:', err)
    }
  },

  async refreshInviteCode() {
    if (!this.data.isAdmin) return

    this.setData({ loading: true })

    try {
      var res = await wx.cloud.callFunction({
        name: 'family',
        data: { familyId: auth.getCurrentFamilyId(), action: 'refreshInviteCode' }
      })

      if (res.result.code === 0) {
        this.setData({
          inviteCode: res.result.data.inviteCode,
          inviteCodeExpireAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
        })
        wx.showToast({ title: '邀请码已刷新', icon: 'success' })
      }
    } catch (err) {
      wx.showToast({ title: '刷新失败', icon: 'none' })
    }

    this.setData({ loading: false })
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  showMembersPanel() {
    this.setData({ showMembers: true })
  },

  hideMembersPanel() {
    this.setData({ showMembers: false })
  },

  showAddChildPanel() {
    this.setData({ showAddChild: true })
  },

  hideAddChildPanel() {
    this.setData({ showAddChild: false, newChildName: '', newChildNickname: '', newChildGender: '', newChildBirthday: '', newChildAvatar: '' })
  },

  onNewChildNameInput(e) {
    this.setData({ newChildName: e.detail.value })
  },

  onNewChildNicknameInput(e) {
    this.setData({ newChildNickname: e.detail.value })
  },

  selectNewChildGender(e) {
    this.setData({ newChildGender: e.currentTarget.dataset.gender })
  },

  onNewChildBirthdayChange(e) {
    this.setData({ newChildBirthday: e.detail.value })
  },

  chooseNewChildAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ newChildAvatar: res.tempFiles[0].tempFilePath })
      }
    })
  },

  async addChild() {
    if (!this.data.newChildName.trim()) {
      wx.showToast({ title: '请输入孩子姓名', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      let avatar = this.data.newChildAvatar
      if (avatar && !avatar.startsWith('cloud://')) {
        avatar = await cloud.uploadImageCompressed(avatar, 'avatars')
      }

      var res = await wx.cloud.callFunction({
        name: 'family',
        data: { familyId: auth.getCurrentFamilyId(),
          action: 'addChild',
          name: this.data.newChildName.trim(),
          nickname: this.data.newChildNickname.trim(),
          gender: this.data.newChildGender,
          birthday: this.data.newChildBirthday,
          avatar: avatar,
          theme: this.data.newChildGender === 'boy' ? 'blue' : 'pink'
        }
      })

      if (res.result.code === 0) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.hideAddChildPanel()

        // 重新加载数据
        await this.loadData()

        // 同步到 app.globalData
        var app = getApp()
        app.globalData.children = this.data.children
        auth.setChildren(this.data.children)
      } else {
        wx.showToast({ title: res.result.msg || '添加失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }

    this.setData({ loading: false })
  },

  showEditChildPanel(e) {
    var childId = e.currentTarget.dataset.id
    var child = null
    for (var i = 0; i < this.data.children.length; i++) {
      if (this.data.children[i].childId === childId) {
        child = this.data.children[i]
        break
      }
    }
    if (!child) return

    this.setData({
      showEditChild: true,
      editChildId: childId,
      editChildName: child.name || '',
      editChildNickname: child.nickname || '',
      editChildGender: child.gender || '',
      editChildBirthday: child.birthday || '',
      editChildAvatar: child.avatar || '',
      editChildTheme: child.theme || (child.gender === 'boy' ? 'blue' : 'pink')
    })
  },

  hideEditChildPanel() {
    this.setData({
      showEditChild: false,
      editChildId: '',
      editChildName: '',
      editChildNickname: '',
      editChildGender: '',
      editChildBirthday: '',
      editChildAvatar: '',
      editChildTheme: 'pink'
    })
  },

  onEditChildNameInput(e) {
    this.setData({ editChildName: e.detail.value })
  },

  onEditChildNicknameInput(e) {
    this.setData({ editChildNickname: e.detail.value })
  },

  selectEditChildGender(e) {
    this.setData({ editChildGender: e.currentTarget.dataset.gender })
  },

  onEditChildBirthdayChange(e) {
    this.setData({ editChildBirthday: e.detail.value })
  },

  selectEditChildTheme(e) {
    this.setData({ editChildTheme: e.currentTarget.dataset.theme })
  },

  chooseEditChildAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ editChildAvatar: res.tempFiles[0].tempFilePath })
      }
    })
  },

  async saveEditChild() {
    if (!this.data.editChildName.trim()) {
      wx.showToast({ title: '请输入孩子姓名', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      let avatar = this.data.editChildAvatar
      if (avatar && !avatar.startsWith('cloud://')) {
        avatar = await cloud.uploadImageCompressed(avatar, 'avatars')
      }

      var res = await wx.cloud.callFunction({
        name: 'family',
        data: { familyId: auth.getCurrentFamilyId(),
          action: 'updateChild',
          childId: this.data.editChildId,
          name: this.data.editChildName.trim(),
          nickname: this.data.editChildNickname.trim(),
          gender: this.data.editChildGender,
          birthday: this.data.editChildBirthday,
          avatar: avatar,
          theme: this.data.editChildTheme
        }
      })

      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.hideEditChildPanel()

        // 更新本地 children 数据
        var children = this.data.children
        for (var i = 0; i < children.length; i++) {
          if (children[i].childId === this.data.editChildId) {
            children[i].name = this.data.editChildName.trim()
            children[i].nickname = this.data.editChildNickname.trim()
            children[i].gender = this.data.editChildGender
            children[i].birthday = this.data.editChildBirthday
            children[i].avatar = avatar || children[i].avatar
            children[i].theme = this.data.editChildTheme
            break
          }
        }

        // 同步到 auth 和 app.globalData
        auth.setChildren(children)
        var app = getApp()
        app.globalData.children = children

        // 如果修改的是当前选中的孩子，更新主题
        if (this.data.editChildId === this.data.currentChildId) {
          var theme = this.data.editChildTheme
          var themes = {
            pink: { color: '#FF9AAB', bg: '#FFF5F7', gradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)' },
            blue: { color: '#4A90D9', bg: '#E8F0FE', gradient: 'linear-gradient(135deg, #4A90D9 0%, #6BB3F0 100%)' },
            purple: { color: '#9B59B6', bg: '#F3E5F5', gradient: 'linear-gradient(135deg, #9B59B6 0%, #BB6BD9 100%)' },
            green: { color: '#27AE60', bg: '#E8F5E9', gradient: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)' },
            orange: { color: '#F39C12', bg: '#FFF3E0', gradient: 'linear-gradient(135deg, #F39C12 0%, #F1C40F 100%)' },
            mint: { color: '#1ABC9C', bg: '#E0F2F1', gradient: 'linear-gradient(135deg, #1ABC9C 0%, #2ECC71 100%)' }
          }
          if (themes[theme]) {
            app.globalData.themeColor = themes[theme].color
            app.globalData.themeBg = themes[theme].bg
            app.globalData.themeGradient = themes[theme].gradient
          }
        }

        this.setData({ children: children })
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }

    this.setData({ loading: false })
  },

  async removeChild(e) {
    var childId = e.currentTarget.dataset.id
    var childName = e.currentTarget.dataset.name

    wx.showModal({
      title: '确认删除',
      content: '确定要删除孩子"' + childName + '"吗？相关数据将被保留但不再显示。',
      success: async (res) => {
        if (res.confirm) {
          try {
            var result = await wx.cloud.callFunction({
              name: 'family',
              data: { familyId: auth.getCurrentFamilyId(), action: 'removeChild', childId: childId }
            })

            if (result.result.code === 0) {
              wx.showToast({ title: '已删除', icon: 'success' })
              await this.loadData()
            }
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  async removeMember(e) {
    var memberId = e.currentTarget.dataset.id
    var memberName = e.currentTarget.dataset.name

    wx.showModal({
      title: '确认移除',
      content: '确定要移除成员"' + memberName + '"吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            var result = await wx.cloud.callFunction({
              name: 'family',
              data: { familyId: auth.getCurrentFamilyId(), action: 'removeMember', memberId: memberId }
            })

            if (result.result.code === 0) {
              wx.showToast({ title: '已移除', icon: 'success' })
              await this.loadData()
            }
          } catch (err) {
            wx.showToast({ title: '移除失败', icon: 'none' })
          }
        }
      }
    })
  },

  async disableMember(e) {
    var memberId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认禁用',
      content: '禁用后该成员将无法访问家庭数据，确定禁用吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            var result = await wx.cloud.callFunction({
              name: 'family',
              data: { familyId: auth.getCurrentFamilyId(), action: 'disableMember', memberId: memberId }
            })

            if (result.result.code === 0) {
              wx.showToast({ title: '已禁用', icon: 'success' })
              await this.loadData()
            }
          } catch (err) {
            wx.showToast({ title: '禁用失败', icon: 'none' })
          }
        }
      }
    })
  },

  async enableMember(e) {
    var memberId = e.currentTarget.dataset.id

    try {
      var result = await wx.cloud.callFunction({
        name: 'family',
        data: { familyId: auth.getCurrentFamilyId(), action: 'enableMember', memberId: memberId }
      })

      if (result.result.code === 0) {
        wx.showToast({ title: '已启用', icon: 'success' })
        await this.loadData()
      }
    } catch (err) {
      wx.showToast({ title: '启用失败', icon: 'none' })
    }
  },

  leaveFamily() {
    wx.showModal({
      title: '退出家庭',
      content: '退出后将无法查看家庭数据，确定退出吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            var result = await wx.cloud.callFunction({
              name: 'family',
              data: { familyId: auth.getCurrentFamilyId(), action: 'leaveFamily' }
            })

            if (result.result.code === 0) {
              // C-2 修正：auth.clear() 会删除 currentChildId/family 等身份 key，
              // 必须先捕获两个 id 再清理，否则业务缓存一条都清不到
              var familyIdBeforeClear = auth.getCurrentFamilyId()
              var childIdBeforeClear = auth.getCurrentChildId()

              auth.clear()

              // H6：清理按孩子隔离的业务数据缓存，防止存储膨胀与换家庭后残留
              try {
                var childStorage = getApp().globalData.childStorage
                var keysToDelete = []
                if (childIdBeforeClear) keysToDelete = childStorage.getChildKeys(childIdBeforeClear)
                keysToDelete.forEach(function(key) {
                  try { wx.removeStorageSync(key) } catch (e) {}
                })
                // 家庭级兜底缓存一并清理
                ;['cachedFamilyMembers_' + (familyIdBeforeClear || ''), 'brushingProgress'].forEach(function(k) {
                  try { wx.removeStorageSync(k) } catch (e2) {}
                })
              } catch (cleanErr) {
                console.warn('清理业务缓存失败:', cleanErr)
              }
              wx.reLaunch({ url: '/packageFamily/pages/family/role-select/role-select' })
            } else {
              wx.showToast({ title: result.result.msg || '退出失败', icon: 'none' })
            }
          } catch (err) {
            wx.showToast({ title: '退出失败', icon: 'none' })
          }
        }
      }
    })
  },

  updateNickname() {
    var that = this
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            var result = await wx.cloud.callFunction({
              name: 'family',
              data: { familyId: auth.getCurrentFamilyId(), action: 'updateProfile', nickname: res.content.trim() }
            })

            if (result.result.code === 0) {
              var member = auth.getMember()
              member.nickname = res.content.trim()
              auth.setMember(member)
              that.setData({ member: member })
              wx.showToast({ title: '修改成功', icon: 'success' })
            }
          } catch (err) {
            wx.showToast({ title: '修改失败', icon: 'none' })
          }
        }
      }
    })
  }
})
