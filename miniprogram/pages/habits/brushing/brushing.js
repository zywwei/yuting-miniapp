const util = require('../../../utils/util.js')
const audio = require('../../../utils/audio.js')
const cloud = require('../../../utils/cloud.js')
const { getNavBarInfo, previewImage } = require('../../../utils/page-helpers.js')
const { CHAPTERS } = require('../brushing-timer/constants.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    todayInfo: {
      day: '',
      weekday: ''
    },
    streakDays: 0,
    morningRecord: null,
    eveningRecord: null,
    encourageText: '今天也要认真刷牙哦~',
    // 弹窗状态
    showScoreModal: false,
    modalTime: '',
    tempImagePaths: [],
    score: 5,
    note: '',
    scoreLabels: ['加油哦', '还不错', '很好', '非常好', '超级棒！'],
    scoreLabel: '超级棒！',
    // 成功提示
    showSuccess: false,
    successText: '打卡成功！',
    // 提醒设置
    reminderMorning: false,
    reminderMorningTime: '07:30',
    reminderEvening: false,
    reminderEveningTime: '20:30',
    // ===== 主线故事系统 =====
    currentChapter: null,
    currentEnemy: null,
    enemyCurrentHp: 6,
    isEnemyDefeated: false,
    showStorySection: true
  },

  _morningTimer: null,
  _eveningTimer: null,

  onLoad() {
    const navInfo = getNavBarInfo()
    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight
    })

    this.loadTodayInfo()
    this.loadRecords()
    this.loadReminderSettings()
    this.loadStoryProgress()
  },

  onShow() {
    this.loadRecords()
    this.applyEditedPhoto()
    this.loadStoryProgress()
  },

  // 加载故事进度
  loadStoryProgress() {
    const storyProgress = util.getStoryProgress()
    const round = storyProgress.round || 1
    const currentChapterId = storyProgress.currentChapter || 1
    const chapter = CHAPTERS.find(c => c.id === currentChapterId) || CHAPTERS[0]

    // 敌人HP随轮数增加
    const baseEnemy = chapter.enemy
    const enemyHpMax = Math.min(baseEnemy.hp + (round - 1) * 2, 12)
    const enemy = { ...baseEnemy, hp: enemyHpMax }

    const enemyHp = util.getEnemyCurrentHp(enemy.id, enemy.hp)

    this.setData({
      round: round,
      currentChapter: chapter,
      currentEnemy: enemy,
      enemyCurrentHp: enemyHp,
      isEnemyDefeated: enemyHp <= 0
    })

    // 根据故事进度更新鼓励语
    this.updateEncourageTextWithStory()
  },

  // 更新鼓励语（结合故事进度）
  updateEncourageTextWithStory() {
    const { round, currentEnemy, isEnemyDefeated, morningRecord, eveningRecord } = this.data

    let encourageText = '今天也要认真刷牙哦~'

    if (morningRecord && eveningRecord) {
      encourageText = '太棒啦！今天早晚都刷了，牙齿会闪闪发亮！✨'
    } else if (morningRecord) {
      encourageText = '早上完成啦！晚上也要记得刷牙哦~🌙'
    } else if (eveningRecord) {
      encourageText = '晚上完成啦！明天早上也要继续加油~☀️'
    }

    // 故事相关鼓励语
    if (currentEnemy && isEnemyDefeated) {
      encourageText = `${currentEnemy.name}已经被打败啦！继续冒险~`
    } else if (currentEnemy && !isEnemyDefeated) {
      if (!morningRecord && !eveningRecord) {
        encourageText = `第${round}轮：去打败${currentEnemy.name}！`
      } else if (morningRecord || eveningRecord) {
        encourageText = `${currentEnemy.name}还剩${this.data.enemyCurrentHp}点血量，继续战斗！`
      }
    }

    this.setData({ encourageText })
  },

  // 从画画编辑器返回时，应用编辑后的照片
  async applyEditedPhoto() {
    const editedPath = wx.getStorageSync('brushingEditedPhoto')
    if (!editedPath) return
    wx.removeStorageSync('brushingEditedPhoto')

    // 判断是早上还是晚上（根据当前时间）
    const hour = new Date().getHours()
    const timeOfDay = hour < 14 ? 'morning' : 'evening'

    wx.showLoading({ title: '保存编辑...' })
    try {
      const record = timeOfDay === 'morning' ? this.data.morningRecord : this.data.eveningRecord
      const existingImages = (record && record.images) || []
      const allImages = [...existingImages, editedPath]

      await cloud.updateBrushingRecord(timeOfDay, {
        imagePath: allImages[0] || '',
        images: allImages
      })
      wx.hideLoading()
      this.loadRecords()
      wx.showToast({ title: '编辑已保存！', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('保存编辑失败:', err)
    }
  },

  onUnload() {
    this.clearReminder('morning')
    this.clearReminder('evening')
  },

  // 加载今日信息
  loadTodayInfo() {
    const d = new Date()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const month = d.getMonth() + 1
    const day = d.getDate()

    this.setData({
      todayInfo: {
        day: `${month}月${day}日`,
        weekday: weekdays[d.getDay()]
      }
    })
  },

  // 加载今日记录（云端优先）
  async loadRecords() {
    const today = util.getTodayStr()
    const records = await cloud.fetchBrushingRecords()
    const stats = util.getBrushingStats()

    // 格式化时间和时长
    const formatRecord = (r) => {
      if (!r) return null
      const d = r.duration || 0
      const durationText = d >= 60 ? `${Math.floor(d / 60)}分${d % 60}秒` : d > 0 ? `${d}秒` : ''
      return {
        ...r,
        createTimeFormatted: r.createTime ? util.formatDate(r.createTime) : '',
        durationText
      }
    }
    const morningRecord = formatRecord(records.find(r => r.date === today && r.timeOfDay === 'morning'))
    const eveningRecord = formatRecord(records.find(r => r.date === today && r.timeOfDay === 'evening'))

    // 更新鼓励语
    let encourageText = '今天也要认真刷牙哦~'
    if (morningRecord && eveningRecord) {
      encourageText = '太棒啦！今天早晚都刷了，牙齿会闪闪发亮！✨'
    } else if (morningRecord) {
      encourageText = '早上完成啦！晚上也要记得刷牙哦~🌙'
    } else if (eveningRecord) {
      encourageText = '晚上完成啦！明天早上也要继续加油~☀️'
    }

    this.setData({
      morningRecord,
      eveningRecord,
      streakDays: stats.streak,
      encourageText
    })
  },

  // 拍照打卡（支持多张）
  checkIn(e) {
    const timeOfDay = e.currentTarget.dataset.time

    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const imagePaths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          showScoreModal: true,
          modalTime: timeOfDay,
          tempImagePaths: imagePaths,
          score: 5,
          scoreLabel: '超级棒！',
          note: ''
        })
      }
    })
  },

  // 直接打卡（不拍照）
  directCheckIn(e) {
    const timeOfDay = e.currentTarget.dataset.time
    this.setData({
      showScoreModal: true,
      modalTime: timeOfDay,
      tempImagePaths: [],
      score: 5,
      scoreLabel: '超级棒！',
      note: ''
    })
  },

  // 选择评分
  selectScore(e) {
    const score = e.currentTarget.dataset.score
    const labels = this.data.scoreLabels
    this.setData({
      score: score,
      scoreLabel: labels[score - 1]
    })
  },

  // 输入备注
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 取消评分
  cancelScore() {
    this.setData({ showScoreModal: false })
  },

  // 确认评分并保存（云端同步，支持多图）
  async confirmScore() {
    const { modalTime, tempImagePaths, score, note } = this.data
    const images = tempImagePaths || []

    wx.showLoading({ title: '保存中...' })

    try {
      const record = {
        id: util.generateId(),
        date: util.getTodayStr(),
        timeOfDay: modalTime,
        imagePath: images[0] || '',
        images: images,
        score: score,
        note: note.trim(),
        createTime: new Date().toISOString()
      }

      // 上传到云端（内部自动处理本地降级）
      await cloud.uploadBrushingRecord(record)
      audio.brushingSuccess()

      wx.hideLoading()
      this.setData({ showScoreModal: false })
      this.loadRecords()
      this.showSuccessToast(modalTime)
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 显示成功提示
  showSuccessToast(timeOfDay) {
    const texts = {
      morning: '早上打卡成功！☀️',
      evening: '晚上打卡成功！🌙'
    }
    this.setData({
      showSuccess: true,
      successText: texts[timeOfDay]
    })

    setTimeout(() => {
      this.setData({ showSuccess: false })
    }, 2000)
  },

  // 跳转到计时刷牙页
  goTimer(e) {
    var timeOfDay = e.currentTarget.dataset.time
    wx.navigateTo({
      url: '/pages/habits/brushing-timer/brushing-timer?time=' + timeOfDay
    })
  },

  // 添加照片（支持多张）
  addPhoto(e) {
    const timeOfDay = e.currentTarget.dataset.time
    const existingImages = (timeOfDay === 'morning' ? this.data.morningRecord : this.data.eveningRecord)?.images || []
    const remainCount = 9 - existingImages.length

    if (remainCount <= 0) {
      wx.showToast({ title: '最多9张照片', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        const allImages = [...existingImages, ...newImages]
        wx.showLoading({ title: '保存中...' })
        try {
          await cloud.updateBrushingRecord(timeOfDay, {
            imagePath: allImages[0] || '',
            images: allImages
          })
          wx.hideLoading()
          this.loadRecords()
          this.setData({
            showSuccess: true,
            successText: '添加成功！📷'
          })
          setTimeout(() => {
            this.setData({ showSuccess: false })
          }, 2000)
        } catch (err) {
          wx.hideLoading()
          console.error('添加照片失败:', err)
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  // 删除照片
  deletePhoto(e) {
    const timeOfDay = e.currentTarget.dataset.time
    const index = e.currentTarget.dataset.index
    const record = timeOfDay === 'morning' ? this.data.morningRecord : this.data.eveningRecord
    if (!record) return

    const images = (record.images || []).filter((_, i) => i !== index)

    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            await cloud.updateBrushingRecord(timeOfDay, {
              imagePath: images[0] || '',
              images: images
            })
            wx.hideLoading()
            this.loadRecords()
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 跳转画画编辑器编辑照片
  editPhotoInDraw(e) {
    const path = e.currentTarget.dataset.path
    wx.navigateTo({
      url: '/pages/create/draw/draw?mode=brushing&photo=' + encodeURIComponent(path)
    })
  },

  // 预览图片
  previewImage(e) {
    var path = e.currentTarget.dataset.path
    previewImage(path)
  },

  // 跳转到统计页
  goStats() {
    wx.navigateTo({
      url: '/pages/habits/brushing-stats/brushing-stats'
    })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  },

  // ===== 提醒设置 =====
  loadReminderSettings() {
    const settings = wx.getStorageSync('brushingReminder') || {}
    this.setData({
      reminderMorning: settings.morning || false,
      reminderMorningTime: settings.morningTime || '07:30',
      reminderEvening: settings.evening || false,
      reminderEveningTime: settings.eveningTime || '20:30'
    })
    if (settings.morning) this.scheduleReminder('morning', settings.morningTime)
    if (settings.evening) this.scheduleReminder('evening', settings.eveningTime)
  },

  saveReminderSettings() {
    wx.setStorageSync('brushingReminder', {
      morning: this.data.reminderMorning,
      morningTime: this.data.reminderMorningTime,
      evening: this.data.reminderEvening,
      eveningTime: this.data.reminderEveningTime
    })
  },

  toggleMorningReminder(e) {
    this.setData({ reminderMorning: e.detail.value })
    this.saveReminderSettings()
    if (e.detail.value) {
      this.scheduleReminder('morning', this.data.reminderMorningTime)
      wx.showToast({ title: '早上提醒已开启', icon: 'none' })
    } else {
      this.clearReminder('morning')
      wx.showToast({ title: '早上提醒已关闭', icon: 'none' })
    }
  },

  toggleEveningReminder(e) {
    this.setData({ reminderEvening: e.detail.value })
    this.saveReminderSettings()
    if (e.detail.value) {
      this.scheduleReminder('evening', this.data.reminderEveningTime)
      wx.showToast({ title: '晚上提醒已开启', icon: 'none' })
    } else {
      this.clearReminder('evening')
      wx.showToast({ title: '晚上提醒已关闭', icon: 'none' })
    }
  },

  setMorningTime(e) {
    this.setData({ reminderMorningTime: e.detail.value })
    this.saveReminderSettings()
    if (this.data.reminderMorning) {
      this.scheduleReminder('morning', e.detail.value)
    }
  },

  setEveningTime(e) {
    this.setData({ reminderEveningTime: e.detail.value })
    this.saveReminderSettings()
    if (this.data.reminderEvening) {
      this.scheduleReminder('evening', e.detail.value)
    }
  },

  scheduleReminder(type, timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(hour, minute, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const delay = target - now

    const timer = setTimeout(() => {
      wx.showModal({
        title: type === 'morning' ? '☀️ 早上好！' : '🌙 晚上好！',
        content: type === 'morning' ? '该起床刷牙啦，钰婷！' : '睡前记得刷牙哦，钰婷！',
        confirmText: '去刷牙',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/habits/brushing-timer/brushing-timer?time=' + type })
          }
        }
      })
      // 安排明天的提醒
      this.scheduleReminder(type, timeStr)
    }, delay)

    if (type === 'morning') this._morningTimer = timer
    else this._eveningTimer = timer
  },

  clearReminder(type) {
    if (type === 'morning' && this._morningTimer) {
      clearTimeout(this._morningTimer)
      this._morningTimer = null
    }
    if (type === 'evening' && this._eveningTimer) {
      clearTimeout(this._eveningTimer)
      this._eveningTimer = null
    }
  }
})
