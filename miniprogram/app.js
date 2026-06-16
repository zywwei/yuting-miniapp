App({
  onLaunch() {
    // 初始化云开发（失败不影响小程序运行）
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: 'your-env-id',  // TODO: 替换为你的云开发环境 ID
          traceUser: true
        })
        this.globalData.cloudEnabled = true
      }
    } catch (e) {
      console.warn('云开发初始化失败，使用本地存储:', e)
      this.globalData.cloudEnabled = false
    }

    // 初始化本地存储
    this.initStorage()

    // 计算成长天数（从生日算起）
    this.calcGrowthDays()
  },

  // 初始化所有本地存储
  initStorage() {
    const defaults = {
      drawings: [],
      brushingRecords: [],
      habits: [],
      habitRecords: [],
      notes: [],
      achievements: [],
      learnProgress: {
        cards: {},   // 识字进度
        poems: {},   // 古诗进度
        numbers: {}, // 数字进度
        english: {}  // 英语进度
      },
      settings: {
        birthday: '2022-03-23',
        childName: '钰婷'
      }
    }

    Object.keys(defaults).forEach(key => {
      if (!wx.getStorageSync(key)) {
        wx.setStorageSync(key, defaults[key])
      }
    })
  },

  // 计算成长天数
  calcGrowthDays() {
    const birthday = new Date('2022-03-23')
    const today = new Date()
    const diff = today - birthday
    this.globalData.growthDays = Math.floor(diff / (1000 * 60 * 60 * 24))
  },

  globalData: {
    cloudEnabled: false,
    growthDays: 0,

    // 画笔颜色列表
    colors: [
      '#FF4444', '#FF8800', '#FFCC00', '#44CC44',
      '#4488FF', '#8844FF', '#FF44AA', '#000000',
      '#FFFFFF', '#888888', '#FFB6C1', '#87CEEB',
      '#98FB98', '#DDA0DD', '#F0E68C', '#FFA07A'
    ],
    // 画笔粗细选项
    brushSizes: [3, 6, 10, 16, 24],

    // 习惯类型配置
    habitTypes: [
      // 睡眠作息
      { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', group: 'sleep' },
      { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', group: 'sleep' },
      { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', group: 'sleep' },
      // 健康卫生
      { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', group: 'health' },
      { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', group: 'health' },
      { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', group: 'health' },
      // 生活自理
      { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', group: 'life' },
      { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', group: 'life' },
      { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', group: 'life' },
      { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', group: 'life' },
      { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', group: 'life' },
      // 学习成长
      { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', group: 'learn' },
      { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', group: 'learn' },
      { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', group: 'learn' },
      { type: 'custom', name: '自定义', icon: '⭐', color: '#FF6B8A', group: 'other' }
    ],

    // 心情选项
    moods: [
      { value: 'happy', label: '开心', icon: '😊' },
      { value: 'excited', label: '兴奋', icon: '🤩' },
      { value: 'calm', label: '平静', icon: '😌' },
      { value: 'tired', label: '累了', icon: '😴' }
    ]
  }
})
