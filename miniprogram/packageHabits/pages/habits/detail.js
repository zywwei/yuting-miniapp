const util = getApp().globalData.util
const cloud = getApp().globalData.cloud
const childStorage = getApp().globalData.childStorage
const { getNavBarInfo, previewImage } = getApp().globalData.pageHelpers
const { getHabitConfig } = require('./checkin/habit-config.js')

// 每种习惯的打卡样式配置
const HABIT_STYLES = {
  // 睡眠作息
  early_up: {
    theme: 'sunrise',
    bgGradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    icon: '🌅',
    checkinText: '起床啦！',
    successText: '早安！新的一天开始啦~',
    tipText: '早起的鸟儿有虫吃'
  },
  early_sleep: {
    theme: 'night',
    bgGradient: 'linear-gradient(135deg, #7C4DFF, #B388FF)',
    icon: '🌙',
    checkinText: '晚安！',
    successText: '晚安！做个好梦~',
    tipText: '早睡早起身体好'
  },
  nap: {
    theme: 'afternoon',
    bgGradient: 'linear-gradient(135deg, #00BCD4, #4DD0E1)',
    icon: '😴',
    checkinText: '午安！',
    successText: '午睡打卡！休息一下~',
    tipText: '午睡精神好'
  },
  // 健康卫生
  brushing: {
    theme: 'health',
    bgGradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    icon: '🦷',
    checkinText: '刷牙啦！',
    successText: '牙齿刷得真干净！',
    tipText: '早晚刷牙，牙齿白白'
  },
  wash_hands: {
    theme: 'water',
    bgGradient: 'linear-gradient(135deg, #03A9F4, #4FC3F7)',
    icon: '🧼',
    checkinText: '洗手啦！',
    successText: '小手洗得真干净！',
    tipText: '搓搓搓，细菌跑光光'
  },
  drink: {
    theme: 'water',
    bgGradient: 'linear-gradient(135deg, #00BCD4, #4DD0E1)',
    icon: '💧',
    checkinText: '喝水啦！',
    successText: '咕噜咕噜喝饱啦！',
    tipText: '多喝水，身体棒'
  },
  // 生活自理
  eat_breakfast: {
    theme: 'food',
    bgGradient: 'linear-gradient(135deg, #FF9800, #FFB74D)',
    icon: '🥣',
    checkinText: '吃早餐啦！',
    successText: '早餐吃饱饱，上午精神好！',
    tipText: '早餐要吃好'
  },
  eat_lunch: {
    theme: 'food',
    bgGradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    icon: '🍱',
    checkinText: '吃午餐啦！',
    successText: '午餐吃得好，下午不饿！',
    tipText: '午餐要吃饱'
  },
  eat_dinner: {
    theme: 'food',
    bgGradient: 'linear-gradient(135deg, #FF5722, #FF8A65)',
    icon: '🍛',
    checkinText: '吃晚餐啦！',
    successText: '晚餐吃得好，晚上睡得香！',
    tipText: '晚餐要吃少'
  },
  tidy: {
    theme: 'home',
    bgGradient: 'linear-gradient(135deg, #9C27B0, #CE93D8)',
    icon: '🧸',
    checkinText: '整理玩具啦！',
    successText: '玩具收拾得整整齐齐！',
    tipText: '自己的事情自己做'
  },
  housework: {
    theme: 'home',
    bgGradient: 'linear-gradient(135deg, #795548, #A1887F)',
    icon: '🧹',
    checkinText: '做家务啦！',
    successText: '家务做得真棒！',
    tipText: '我是家务小能手'
  },
  // 学习成长
  reading: {
    theme: 'learn',
    bgGradient: 'linear-gradient(135deg, #2196F3, #64B5F6)',
    icon: '📖',
    checkinText: '看书啦！',
    successText: '今天又学到新知识啦！',
    tipText: '书中自有黄金屋'
  },
  exercise: {
    theme: 'sport',
    bgGradient: 'linear-gradient(135deg, #FF5722, #FF8A65)',
    icon: '🏃',
    checkinText: '运动啦！',
    successText: '运动完真舒服！',
    tipText: '生命在于运动'
  },
  polite: {
    theme: 'love',
    bgGradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    icon: '🙏',
    checkinText: '说礼貌用语！',
    successText: '真是个有礼貌的好孩子！',
    tipText: '请、谢谢、对不起'
  }
}

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    type: '',
    habit: null,
    records: [],
    stats: {
      total: 0,
      streak: 0,
      weekRate: 0
    },
    sleepStats: null,
    style: null,
    // 打卡动画
    showCheckinAnimation: false,
    // 特色表单
    habitConfig: null,
    habitFields: [],
    formData: {},
    // 照片
    images: [],
    // 留言
    note: '',
    // 评分
    score: 5,
    scoreLabels: ['加油哦', '还不错', '很好', '非常好', '超级棒！'],
    scoreLabel: '超级棒！',
    // 成功提示
    showSuccess: false,
    successText: '打卡成功！',
    // 详情弹窗
    showDetail: false,
    detailRecord: null
  },

  onLoad: function(options) {
    var navInfo = getNavBarInfo()
    var type = options.type || 'brushing'
    var config = getHabitConfig(type)

    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      type: type,
      habitConfig: config,
      habitFields: config.fields || [],
      formData: this.initFormData(config)
    })

    this.loadHabitDetail(type)
    this.restoreDraft(type)
  },

  onShow: function() {
    // 从云端拉取习惯定义和记录
    var that = this
    Promise.all([
      cloud.fetchHabits().catch(function() {}),
      cloud.fetchHabitRecords().catch(function() {})
    ]).then(function() {
      that.loadRecordsAndStats()
    }).catch(function() {
      that.loadRecordsAndStats()
    })
    this.applyEditedPhoto()
  },

  onPullDownRefresh: async function() {
    var that = this
    try {
      await Promise.all([
        cloud.fetchHabits(),
        cloud.fetchHabitRecords()
      ])
      that.loadRecordsAndStats()
      wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
    } catch (err) {
      console.warn('刷新失败:', err)
      wx.showToast({ title: '刷新失败', icon: 'none', duration: 1000 })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onUnload: function() {
    if (this._persistTimeout) { clearTimeout(this._persistTimeout); this._persistTimeout = null }
  },

  // 只加载记录和统计（不重置表单）
  loadRecordsAndStats: function() {
    var type = this.data.type
    var records = childStorage.get('habitRecords') || []
    var habitRecords = records.filter(function(r) { return r.type === type })
    habitRecords.sort(function(a, b) { return new Date(b.date) - new Date(a.date) })

    var total = habitRecords.length
    var streak = this.calcStreak(habitRecords)
    var weekRate = this.calcWeekRate(habitRecords)

    var today = util.getTodayStr()
    var todayRecords = habitRecords.filter(function(r) { return r.date === today })
    var done = todayRecords.length
    var completed = done >= (this.data.habit ? this.data.habit.target : 1)

    this.setData({
      records: habitRecords.slice(0, 30),
      stats: { total: total, streak: streak, weekRate: weekRate },
      todayDone: done,
      completed: completed
    })
  },

  // 初始化表单数据
  initFormData: function(config) {
    var formData = {}
    if (config && config.fields) {
      var now = new Date()
      var currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')

      config.fields.forEach(function(field) {
        if (field.type === 'counter') {
          formData[field.key] = field.default || 0
        } else if (field.type === 'mood' || field.type === 'select') {
          formData[field.key] = field.multiple ? [] : ''
        } else if (field.type === 'time' && field.defaultToNow) {
          formData[field.key] = currentTime
        } else {
          formData[field.key] = ''
        }
      })
    }
    return formData
  },

  // 从画画编辑器返回时，应用编辑后的照片
  applyEditedPhoto: function() {
    var editedPath = wx.getStorageSync('habitEditedPhoto')
    if (!editedPath) return
    wx.removeStorageSync('habitEditedPhoto')

    var originalPath = wx.getStorageSync('habitEditPhoto')
    wx.removeStorageSync('habitEditPhoto')

    var images = this.data.images.slice()
    if (originalPath) {
      var index = images.indexOf(originalPath)
      if (index !== -1) {
        images[index] = editedPath
      } else {
        images.push(editedPath)
      }
    } else {
      images.push(editedPath)
    }
    this.setData({ images: images })
    wx.showToast({ title: '编辑已保存！', icon: 'success' })
  },

  // 加载习惯详情
  loadHabitDetail: function(type) {
    var habits = childStorage.get('habits') || []
    var records = childStorage.get('habitRecords') || []

    // 默认习惯配置
    var defaultHabits = {
      early_up: { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', target: 1, group: 'sleep' },
      early_sleep: { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', target: 1, group: 'sleep' },
      nap: { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', target: 1, group: 'sleep' },
      brushing: { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', target: 2, group: 'health' },
      wash_hands: { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', target: 3, group: 'health' },
      drink: { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', target: 8, group: 'health' },
      eat_breakfast: { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', target: 1, group: 'life' },
      eat_lunch: { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', target: 1, group: 'life' },
      eat_dinner: { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', target: 1, group: 'life' },
      tidy: { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', target: 1, group: 'life' },
      housework: { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', target: 1, group: 'life' },
      reading: { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', target: 1, group: 'learn' },
      exercise: { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', target: 1, group: 'learn' },
      polite: { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', target: 3, group: 'learn' }
    }

    var habit = defaultHabits[type]
    if (!habit) {
      var found = habits.find(function(h) { return h.type === type })
      habit = found || { type: type, name: '自定义', icon: '⭐', color: '#FF6B8A', target: 1 }
    }

    // 获取打卡样式
    var style = HABIT_STYLES[type] || {
      theme: 'default',
      bgGradient: 'linear-gradient(135deg, #FF6B8A, #FF9AAB)',
      icon: habit.icon,
      checkinText: '打卡啦！',
      successText: '打卡成功！',
      tipText: '坚持就是胜利'
    }

    // 是否是作息类习惯
    var sleepTypes = ['early_up', 'early_sleep', 'nap']
    var isSleepHabit = sleepTypes.indexOf(type) !== -1
    habit.isSleepHabit = isSleepHabit

    // 获取该习惯的记录
    var habitRecords = records.filter(function(r) { return r.type === type })
    habitRecords.sort(function(a, b) { return new Date(b.date) - new Date(a.date) })

    // 计算统计
    var total = habitRecords.length
    var streak = this.calcStreak(habitRecords)
    var weekRate = this.calcWeekRate(habitRecords)

    // 作息类习惯的额外统计
    var sleepStats = null
    if (isSleepHabit && habitRecords.length > 0) {
      sleepStats = this.calcSleepStats(habitRecords, type)
    }

    // 今日是否已打卡
    var today = util.getTodayStr()
    var todayRecords = habitRecords.filter(function(r) { return r.date === today })
    var done = todayRecords.length
    var completed = done >= habit.target

    this.setData({
      habit: habit,
      records: habitRecords.slice(0, 30),
      stats: { total: total, streak: streak, weekRate: weekRate },
      sleepStats: sleepStats,
      style: style,
      todayDone: done,
      completed: completed
    })
  },

  // 计算作息统计
  calcSleepStats: function(records, type) {
    var recent7 = records.slice(0, 7)
    var times = recent7.map(function(r) { return r.time }).filter(function(t) { return t })

    if (times.length === 0) return null

    var totalMinutes = 0
    times.forEach(function(t) {
      var parts = t.split(':')
      totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1])
    })
    var avgMinutes = Math.round(totalMinutes / times.length)
    var avgHour = Math.floor(avgMinutes / 60)
    var avgMin = avgMinutes % 60
    var avgTime = String(avgHour).padStart(2, '0') + ':' + String(avgMin).padStart(2, '0')

    var sortedTimes = times.slice().sort()
    var earliest = sortedTimes[0]
    var latest = sortedTimes[sortedTimes.length - 1]

    return {
      avgTime: avgTime,
      earliest: earliest,
      latest: latest,
      recentCount: recent7.length
    }
  },

  // 计算连续天数
  calcStreak: function(records) {
    if (records.length === 0) return 0

    var dateSet = {}
    records.forEach(function(r) { dateSet[r.date] = true })
    var dates = Object.keys(dateSet).sort().reverse()
    var streak = 0

    for (var i = 0; i < dates.length; i++) {
      var expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() - i)
      var year = expectedDate.getFullYear()
      var month = String(expectedDate.getMonth() + 1).padStart(2, '0')
      var day = String(expectedDate.getDate()).padStart(2, '0')
      var expectedStr = year + '-' + month + '-' + day

      if (dates[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  // 计算本周完成率
  calcWeekRate: function(records) {
    var now = new Date()
    var startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    var completedDays = 0
    for (var i = 0; i < 7; i++) {
      var d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      var year = d.getFullYear()
      var month = String(d.getMonth() + 1).padStart(2, '0')
      var day = String(d.getDate()).padStart(2, '0')
      var dateStr = year + '-' + month + '-' + day
      if (records.some(function(r) { return r.date === dateStr })) {
        completedDays++
      }
    }

    return Math.round((completedDays / 7) * 100)
  },

  // ===== 特色表单处理 =====

  // 文本输入
  onFieldInput: function(e) {
    var key = e.currentTarget.dataset.key
    var formData = this.data.formData
    formData[key] = e.detail.value
    this.setData({ formData: formData })
  },

  // 时间选择
  onFieldTimeChange: function(e) {
    var key = e.currentTarget.dataset.key
    var formData = this.data.formData
    formData[key] = e.detail.value
    this.setData({ formData: formData })
  },

  // 计数器增减
  onFieldCounter: function(e) {
    var key = e.currentTarget.dataset.key
    var action = e.currentTarget.dataset.action
    var field = this.data.habitFields.find(function(f) { return f.key === key })
    var formData = this.data.formData
    var value = formData[key] || 0

    if (action === 'add') {
      value = Math.min(value + 1, field.max || 99)
    } else {
      value = Math.max(value - 1, field.min || 0)
    }

    formData[key] = value
    this.setData({ formData: formData })
  },

  // 单选/多选
  onFieldSelect: function(e) {
    var key = e.currentTarget.dataset.key
    var value = e.currentTarget.dataset.value
    var field = this.data.habitFields.find(function(f) { return f.key === key })
    var formData = this.data.formData
    var habitFields = this.data.habitFields

    if (field.multiple) {
      // 创建新数组，确保 setData 能检测到变化
      var arr = (formData[key] || []).slice()
      var index = arr.indexOf(value)
      if (index > -1) {
        arr.splice(index, 1)
      } else {
        arr.push(value)
      }
      formData[key] = arr
    } else {
      formData[key] = value
    }

    // 更新 habitFields 中的选项选中状态
    habitFields = habitFields.map(function(f) {
      if (f.key === key && f.options) {
        var selectedValues = formData[key]
        var updatedOptions = f.options.map(function(opt) {
          var isSelected = false
          if (Array.isArray(selectedValues)) {
            isSelected = selectedValues.indexOf(opt.value) > -1
          } else {
            isSelected = selectedValues === opt.value
          }
          return Object.assign({}, opt, { selected: isSelected })
        })
        return Object.assign({}, f, { options: updatedOptions })
      }
      return f
    })

    this.setData({
      formData: formData,
      habitFields: habitFields
    })
  },

  // 心情选择
  onFieldMood: function(e) {
    var key = e.currentTarget.dataset.key
    var value = e.currentTarget.dataset.value
    var formData = this.data.formData
    formData[key] = value
    this.setData({ formData: formData })
  },

  // 输入备注
  onNoteInput: function(e) {
    this.setData({ note: e.detail.value })
  },

  // 选择评分
  selectScore: function(e) {
    var score = e.currentTarget.dataset.score
    this.setData({
      score: score,
      scoreLabel: this.data.scoreLabels[score - 1]
    })
  },

  // ===== 照片处理 =====

  // 拍照（支持多张）
  takePhoto: function() {
    var remainCount = 9 - this.data.images.length
    if (remainCount <= 0) {
      wx.showToast({ title: '最多9张照片', icon: 'none' })
      return
    }

    var that = this
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function(res) {
        var tempFiles = res.tempFiles
        wx.showLoading({ title: '上传中...' })

        var uploadCount = 0
        var newImages = []

        tempFiles.forEach(function(f, index) {
          var tempPath = f.tempFilePath
          if (wx.cloud) {
            var cloudPath = 'habits/' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg'
            wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: tempPath,
              success: function(res) {
                newImages[index] = res.fileID
              },
              fail: function() {
                newImages[index] = tempPath
              },
              complete: function() {
                uploadCount++
                if (uploadCount === tempFiles.length) {
                  var images = that.data.images.concat(newImages)
                  that.setData({ images: images })
                  wx.hideLoading()
                }
              }
            })
          } else {
            newImages[index] = tempPath
            uploadCount++
            if (uploadCount === tempFiles.length) {
              var images = that.data.images.concat(newImages)
              that.setData({ images: images })
              wx.hideLoading()
            }
          }
        })
      }
    })
  },

  // 删除照片
  deletePhoto: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images: images })
  },

  // 编辑照片（跳转画画页）
  editPhoto: function(e) {
    var path = e.currentTarget.dataset.path
    wx.setStorageSync('habitEditPhoto', path)
    wx.navigateTo({
      url: '/packageCreate/pages/create/draw/draw?mode=habit&photo=' + encodeURIComponent(path)
    })
  },

  // 预览图片
  previewImage: function(e) {
    var path = e.currentTarget.dataset.path
    previewImage(path, this.data.images)
  },

  // 打卡
  checkIn: function() {
    var that = this
    var type = this.data.type
    var habit = this.data.habit
    var style = this.data.style
    var today = util.getTodayStr()
    var records = childStorage.get('habitRecords') || []
    var now = new Date()
    var currentTime = now.toTimeString().slice(0, 5)
    var currentHour = now.getHours()
    var images = this.data.images
    var note = this.data.note.trim()
    var score = this.data.score
    var formData = this.data.formData
    var config = this.data.habitConfig

    // 今日已完成次数
    var todayRecords = records.filter(function(r) { return r.date === today && r.type === type })
    if (todayRecords.length >= habit.target) {
      wx.showToast({ title: '今日已完成啦！', icon: 'none' })
      return
    }

    // 作息类习惯的时间验证
    if (type === 'early_up' && currentHour >= 12) {
      wx.showModal({
        title: '提示',
        content: '现在是下午了，早起打卡只能在上午12点前哦~',
        showCancel: false
      })
      return
    }

    if (type === 'nap' && (currentHour < 11 || currentHour >= 16)) {
      wx.showModal({
        title: '提示',
        content: '午睡打卡时间是11:00-16:00哦~',
        showCancel: false
      })
      return
    }

    // 生成特色摘要
    var summary = ''
    if (config && config.summary) {
      summary = config.summary(formData)
    }

    wx.showLoading({ title: '保存中...' })

    // 持久化图片（带超时保护）
    var that = this
    var saveImages = function(callback) {
      if (images.length === 0) {
        callback([])
        return
      }

      var savedCount = 0
      var savedImages = []
      var timeoutCalled = false

      // 超时保护：10秒后强制回调
      that._persistTimeout = setTimeout(function() {
        if (!timeoutCalled && savedCount < images.length) {
          timeoutCalled = true
          console.warn('图片持久化超时，使用原始路径')
          // 用原始路径填充未完成的位置
          images.forEach(function(img, i) {
            if (!savedImages[i]) savedImages[i] = img
          })
          callback(savedImages)
        }
      }, 10000)

      images.forEach(function(img, index) {
        if (timeoutCalled) return

        if (img.startsWith(wx.env.USER_DATA_PATH) || img.startsWith('cloud://')) {
          savedImages[index] = img
          savedCount++
          if (savedCount === images.length) {
            clearTimeout(that._persistTimeout)
            callback(savedImages)
          }
        } else {
          util.saveImageToPersistent(img).then(function(savedPath) {
            if (timeoutCalled) return
            savedImages[index] = savedPath
            savedCount++
            if (savedCount === images.length) {
              clearTimeout(that._persistTimeout)
              callback(savedImages)
            }
          }).catch(function() {
            if (timeoutCalled) return
            savedImages[index] = img
            savedCount++
            if (savedCount === images.length) {
              clearTimeout(that._persistTimeout)
              callback(savedImages)
            }
          })
        }
      })
    }

    saveImages(function(savedImages) {
      var newRecord = {
        id: util.generateId(),
        type: type,
        date: today,
        time: currentTime,
        images: savedImages,
        imagePath: savedImages[0] || '',
        note: note,
        score: score,
        formData: formData,
        summary: summary,
        createTime: now.toISOString()
      }

      records.unshift(newRecord)
      childStorage.set('habitRecords', records)

      // 尝试同步云端
      if (cloud.isCloudReady && cloud.isCloudReady()) {
        cloud.uploadHabitRecord(newRecord).catch(function(err) {
          console.warn('云端同步失败，已保留本地:', err)
        })
      }

      wx.hideLoading()

      // 显示打卡动画
      that.setData({ showCheckinAnimation: true })
      setTimeout(function() {
        that.setData({ showCheckinAnimation: false })
      }, 1500)

      // 重置表单
      that.setData({
        images: [],
        note: '',
        score: 5,
        scoreLabel: '超级棒！',
        formData: that.initFormData(that.data.habitConfig)
      })

      // 显示成功提示
      that.setData({
        showSuccess: true,
        successText: style.successText
      })
      setTimeout(function() {
        that.setData({ showSuccess: false })
      }, 2000)

      that.loadHabitDetail(type)
    })
  },

  // ===== 详情弹窗 =====

  // 查看记录详情
  viewDetail: function(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.records.find(r => r.id === id)
    if (!record) return

    this.setData({
      showDetail: true,
      detailRecord: record
    })
  },

  // 关闭详情弹窗
  closeDetail: function() {
    this.setData({ showDetail: false, detailRecord: null })
  },

  // 阻止冒泡
  noop: function() {},

  // 预览详情中的图片
  previewDetailImage: function(e) {
    const index = e.currentTarget.dataset.index
    const record = this.data.detailRecord
    if (!record || !record.images) return
    previewImage(record.images[index], record.images)
  },

  // 删除记录
  deleteRecord: function(e) {
    const that = this
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条打卡记录吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: function(res) {
        if (res.confirm) {
          const records = childStorage.get('habitRecords') || []
          const updated = records.filter(r => r.id !== id)
          childStorage.set('habitRecords', updated)
          that.setData({ showDetail: false, detailRecord: null })
          that.loadHabitDetail(that.data.type)
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 返回
  goBack: function() {
    var hasChanges = this.data.images.length > 0 ||
                     (this.data.note && this.data.note.trim().length > 0) ||
                     this.data.score !== 5

    // 检查表单数据是否有填写
    if (!hasChanges && this.data.formData) {
      var keys = Object.keys(this.data.formData)
      for (var i = 0; i < keys.length; i++) {
        var val = this.data.formData[keys[i]]
        if (val && val !== '' && val !== 0 && !(Array.isArray(val) && val.length === 0)) {
          hasChanges = true
          break
        }
      }
    }

    if (hasChanges) {
      wx.showModal({
        title: '提示',
        content: '当前有未保存的内容，是否暂存？',
        confirmText: '暂存',
        cancelText: '不保存',
        success: function(res) {
          if (res.confirm) {
            wx.setStorageSync('habitDraft_' + this.data.type, {
              images: this.data.images,
              note: this.data.note,
              score: this.data.score,
              formData: this.data.formData,
              time: new Date().toISOString()
            })
            wx.showToast({ title: '已暂存', icon: 'success' })
            setTimeout(function() { wx.navigateBack() }, 1000)
          } else {
            wx.navigateBack()
          }
        }.bind(this)
      })
    } else {
      wx.navigateBack()
    }
  },

  // 恢复暂存数据
  restoreDraft: function(type) {
    var draft = wx.getStorageSync('habitDraft_' + type)
    if (!draft) return
    wx.removeStorageSync('habitDraft_' + type)
    this.setData({
      images: draft.images || [],
      note: draft.note || '',
      score: draft.score || 5,
      formData: draft.formData || this.data.formData
    })
    wx.showToast({ title: '已恢复暂存内容', icon: 'success' })
  },

  // 跳转到统计页
  goStats: function() {
    wx.navigateTo({
      url: '/packageHabits/pages/habits/habit-stats/habit-stats?type=' + this.data.type
    })
  },
})
