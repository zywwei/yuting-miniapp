var auth = require('./utils/auth.js')
var syncQueue = require('./utils/sync-queue.js')

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-d8gyw6k3f5ac78f76',
        traceUser: true
      })
      this.globalData.cloudEnabled = true
    } else {
      this.globalData.cloudEnabled = false
    }

    this.checkAuth()
    syncQueue.startAutoSync()
  },

  async checkAuth() {
    // 获取用户所有家庭
    if (this.globalData.cloudEnabled) {
      try {
        var res = await wx.cloud.callFunction({
          name: 'family',
          data: { action: 'getMyFamilies' }
        })

        if (res.result.code === 0) {
          var families = res.result.data.families || []
          auth.setMyFamilies(families)

          if (families.length === 0) {
            // 没有家庭，跳转角色选择
            auth.clear()
            wx.reLaunch({ url: '/pages/family/role-select/role-select' })
            return
          }

          // 选择要进入的家庭
          var targetFamilyId = auth.getDefaultFamilyId()
          var targetFamily = null

          // 查找默认家庭
          for (var i = 0; i < families.length; i++) {
            if (families[i].familyId === targetFamilyId && families[i].status === 'active') {
              targetFamily = families[i]
              break
            }
          }

          // 如果没有默认家庭或默认家庭不可用，使用第一个可用家庭
          if (!targetFamily) {
            for (var j = 0; j < families.length; j++) {
              if (families[j].status === 'active') {
                targetFamily = families[j]
                break
              }
            }
          }

          if (!targetFamily) {
            // 所有家庭都被禁用
            wx.showModal({
              title: '账号已被禁用',
              content: '您在所有家庭中都被禁用，请联系管理员',
              showCancel: false
            })
            return
          }

          // 进入目标家庭
          var familyObj = targetFamily.family || {
            _id: targetFamily.familyId,
            name: targetFamily.familyName,
            avatar: targetFamily.familyAvatar
          }
          auth.setFamily(familyObj)
          auth.setMember(targetFamily.member)
          auth.setChildren(targetFamily.children || [])
          if (targetFamily.children && targetFamily.children.length > 0 && !auth.getCurrentChildId()) {
            auth.switchChild(targetFamily.children[0].childId)
          }

          this.globalData.member = targetFamily.member
          this.globalData.family = familyObj
          this.globalData.children = targetFamily.children || []
          this.globalData.currentChildId = auth.getCurrentChildId()
          this.globalData.myFamilies = families
          this.calcGrowthDays()
          return
        }
      } catch (err) {
        console.warn('获取家庭列表失败:', err)
      }
    }

    // 降级：尝试从本地缓存加载
    if (auth.isLoggedIn()) {
      this.loadFromLocalCache()
    } else {
      wx.reLaunch({ url: '/pages/family/role-select/role-select' })
    }
  },

  async refreshFamilyInfo() {
    if (!this.globalData.cloudEnabled) {
      this.loadFromLocalCache()
      return
    }

    var currentFamilyId = auth.getCurrentFamilyId()
    if (!currentFamilyId) {
      return
    }

    try {
      var res = await wx.cloud.callFunction({
        name: 'family',
        data: { action: 'getFamilyDetail', familyId: currentFamilyId }
      })

      if (res.result.code === 0) {
        var data = res.result.data
        auth.setFamily(data.family)
        auth.setMember(data.member)
        auth.setChildren(data.children)

        // 如果没有选中孩子，默认选中第一个
        var currentChildId = data.member.currentChildId || auth.getCurrentChildId()
        if (!currentChildId && data.children.length > 0) {
          currentChildId = data.children[0].childId
        }
        if (currentChildId) {
          auth.switchChild(currentChildId)
        }

        this.globalData.member = data.member
        this.globalData.family = data.family
        this.globalData.children = data.children
        this.globalData.currentChildId = currentChildId
        this.calcGrowthDays()

        // 更新家庭列表中的当前家庭数据
        this.updateFamilyInList(currentFamilyId, data)
      } else if (res.result.code === -3) {
        wx.showModal({
          title: '账号已被禁用',
          content: res.result.msg,
          showCancel: false,
          success: function() {
            // 切换到其他可用家庭或退出
            this.switchToNextAvailableFamily()
          }.bind(this)
        })
      } else if (res.result.code === -1 || res.result.code === -2) {
        // 家庭不存在或已解散
        wx.showToast({ title: '家庭已不存在', icon: 'none' })
        this.switchToNextAvailableFamily()
      }
    } catch (err) {
      console.warn('刷新家庭信息失败，使用本地缓存:', err)
      this.loadFromLocalCache()
    }
  },

  // 更新家庭列表中的数据
  updateFamilyInList: function(familyId, data) {
    var families = auth.getMyFamilies()
    for (var i = 0; i < families.length; i++) {
      if (families[i].familyId === familyId) {
        families[i].family = data.family
        families[i].member = data.member
        families[i].children = data.children
        break
      }
    }
    auth.setMyFamilies(families)
    this.globalData.myFamilies = families
  },

  // 切换到下一个可用家庭
  switchToNextAvailableFamily: function() {
    var families = auth.getMyFamilies()
    var currentFamilyId = auth.getCurrentFamilyId()

    for (var i = 0; i < families.length; i++) {
      if (families[i].familyId !== currentFamilyId && families[i].status === 'active') {
        this.switchFamily(families[i].familyId)
        return
      }
    }

    // 没有可用家庭
    auth.clear()
    wx.reLaunch({ url: '/pages/family/role-select/role-select' })
  },

  // 切换家庭
  switchFamily: function(familyId) {
    var success = auth.switchFamily(familyId)
    if (success) {
      this.globalData.family = auth.getFamily()
      this.globalData.member = auth.getMember()
      this.globalData.children = auth.getChildren()
      this.globalData.currentChildId = auth.getCurrentChildId()
      this.calcGrowthDays()

      // 刷新页面
      var pages = getCurrentPages()
      if (pages.length > 0) {
        var currentPage = pages[pages.length - 1]
        if (currentPage.onShow) {
          currentPage.onShow()
        }
      }
    }
    return success
  },

  loadFromLocalCache() {
    this.globalData.member = auth.getMember()
    this.globalData.family = auth.getFamily()
    this.globalData.children = auth.getChildren()
    this.globalData.currentChildId = auth.getCurrentChildId()
    this.initStorage()
    this.calcGrowthDays()
  },

  initStorage() {
    var defaults = {
      drawings: [],
      brushingRecords: [],
      habits: [],
      habitRecords: [],
      notes: [],
      achievements: [],
      learnProgress: {
        cards: {},
        poems: {},
        numbers: {},
        english: {}
      }
    }

    Object.keys(defaults).forEach(function(key) {
      if (!wx.getStorageSync(key)) {
        wx.setStorageSync(key, defaults[key])
      }
    })
  },

  calcGrowthDays() {
    var child = auth.getCurrentChild()
    if (child && child.birthday) {
      var birthday = new Date(child.birthday)
      var today = new Date()
      var diff = today - birthday
      this.globalData.growthDays = Math.floor(diff / (1000 * 60 * 60 * 24))
    }
    // 根据孩子主题设置颜色
    var themes = {
      pink: { color: '#FF9AAB', bg: '#FFF5F7', gradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)' },
      blue: { color: '#4A90D9', bg: '#E8F0FE', gradient: 'linear-gradient(135deg, #4A90D9 0%, #6BB3F0 100%)' },
      purple: { color: '#9B59B6', bg: '#F3E5F5', gradient: 'linear-gradient(135deg, #9B59B6 0%, #BB6BD9 100%)' },
      green: { color: '#27AE60', bg: '#E8F5E9', gradient: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)' },
      orange: { color: '#F39C12', bg: '#FFF3E0', gradient: 'linear-gradient(135deg, #F39C12 0%, #F1C40F 100%)' },
      mint: { color: '#1ABC9C', bg: '#E0F2F1', gradient: 'linear-gradient(135deg, #1ABC9C 0%, #2ECC71 100%)' }
    }
    var themeId = (child && child.theme) || (child && child.gender === 'boy' ? 'blue' : 'pink')
    var theme = themes[themeId] || themes.pink
    this.globalData.themeColor = theme.color
    this.globalData.themeBg = theme.bg
    this.globalData.themeGradient = theme.gradient
  },

  globalData: {
    cloudEnabled: false,
    growthDays: 0,
    member: null,
    family: null,
    children: [],
    currentChildId: '',
    themeColor: '#FF9AAB',
    themeBg: '#FFF5F7',
    themeGradient: 'linear-gradient(135deg, #FF9AAB 0%, #FFB6C1 100%)',

    colors: [
      '#FF4444', '#FF8800', '#FFCC00', '#44CC44',
      '#4488FF', '#8844FF', '#FF44AA', '#000000',
      '#FFFFFF', '#888888', '#FFB6C1', '#87CEEB',
      '#98FB98', '#DDA0DD', '#F0E68C', '#FFA07A'
    ],
    brushSizes: [3, 6, 10, 16, 24],

    habitTypes: [
      { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', group: 'sleep' },
      { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', group: 'sleep' },
      { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', group: 'sleep' },
      { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', group: 'health' },
      { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', group: 'health' },
      { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', group: 'health' },
      { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', group: 'life' },
      { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', group: 'life' },
      { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', group: 'life' },
      { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', group: 'life' },
      { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', group: 'life' },
      { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', group: 'learn' },
      { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', group: 'learn' },
      { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', group: 'learn' },
      { type: 'custom', name: '自定义', icon: '⭐', color: '#FF6B8A', group: 'other' }
    ],

    moods: [
      { value: 'happy', label: '开心', icon: '😊' },
      { value: 'excited', label: '兴奋', icon: '🤩' },
      { value: 'calm', label: '平静', icon: '😌' },
      { value: 'tired', label: '累了', icon: '😴' }
    ]
  }
})
