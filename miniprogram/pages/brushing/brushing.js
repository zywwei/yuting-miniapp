const util = require('../../utils/util.js')
const audio = require('../../utils/audio.js')
const cloud = require('../../utils/cloud.js')

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
    tempImagePath: '',
    score: 5,
    note: '',
    scoreLabels: ['加油哦', '还不错', '很好', '非常好', '超级棒！'],
    scoreLabel: '超级棒！',
    // 成功提示
    showSuccess: false,
    successText: '打卡成功！'
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    let capsuleRight = 80
    try {
      const capsule = wx.getMenuButtonBoundingClientRect()
      capsuleRight = sysInfo.windowWidth - capsule.left + 8
    } catch (e) {}

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      capsuleRight: capsuleRight
    })

    this.loadTodayInfo()
    this.loadRecords()
  },

  onShow() {
    this.loadRecords()
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

    const morningRecord = records.find(r => r.date === today && r.timeOfDay === 'morning') || null
    const eveningRecord = records.find(r => r.date === today && r.timeOfDay === 'evening') || null

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

  // 打卡
  checkIn(e) {
    const timeOfDay = e.currentTarget.dataset.time

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({
          showScoreModal: true,
          modalTime: timeOfDay,
          tempImagePath: tempFilePath,
          score: 5,
          scoreLabel: '超级棒！',
          note: ''
        })
      }
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

  // 确认评分并保存（云端同步）
  async confirmScore() {
    const { modalTime, tempImagePath, score, note } = this.data

    wx.showLoading({ title: '保存中...' })

    try {
      const record = {
        id: util.generateId(),
        date: util.getTodayStr(),
        timeOfDay: modalTime,
        imagePath: tempImagePath,
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
    const timeOfDay = e.currentTarget.dataset.time
    wx.navigateTo({
      url: `/pages/brushing-timer/brushing-timer?time=${timeOfDay}`
    })
  },

  // 预览图片
  previewImage(e) {
    const path = e.currentTarget.dataset.path
    if (path) {
      wx.previewImage({
        current: path,
        urls: [path]
      })
    }
  },

  // 跳转到统计页
  goStats() {
    wx.navigateTo({
      url: '/pages/brushing-stats/brushing-stats'
    })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  }
})
