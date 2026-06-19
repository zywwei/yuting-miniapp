const util = require('../../../utils/util.js')
const audio = require('../../../utils/audio.js')
const cloud = require('../../../utils/cloud.js')
const achievements = require('../../../utils/achievements.js')
const { getNavBarInfo, previewImage, getTodayStr, getYesterdayStr } = require('../../../utils/page-helpers.js')
const { CHAPTERS, getOrSelectTodayChapter } = require('../brushing-timer/constants.js')

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
    morningSwiperIndex: 0,
    eveningSwiperIndex: 0,
    yesterdayMorning: null,
    yesterdayEvening: null,
    yesterdayDate: '',
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
    // 详情弹窗
    showDetail: false,
    detailRecord: null,
    // ===== 主线故事系统 =====
    currentChapter: null,
    currentEnemy: null,
    enemyCurrentHp: 6,
    isEnemyDefeated: false,
    showStorySection: true,
    minionDefeated: 0,
    minionTotal: 3,
    areasCompleted: 0
  },

  onLoad() {
    const navInfo = getNavBarInfo()
    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight
    })

    this.loadTodayInfo()
    this.loadRecords()
    this.loadStoryProgress()
  },

  async onShow() {
    await this.loadRecords()
    this.applyEditedPhoto()
    this.loadStoryProgress()
  },

  // 加载故事进度
  loadStoryProgress() {
    const storyProgress = util.getStoryProgress()
    const round = storyProgress.round || 1
    const currentChapterId = storyProgress.currentChapter || 1

    // 获取或选择今天的章节（持久化）
    const chapter = getOrSelectTodayChapter(currentChapterId, util.getTodayStr)

    // 根据早晚选择不同敌人
    const hour = new Date().getHours()
    const isEvening = hour >= 14
    const baseEnemy = isEvening && chapter.eveningEnemy ? chapter.eveningEnemy : chapter.enemy
    const enemyHpMax = chapter.isHidden ? 6 : baseEnemy.hp + (round - 1) * 3
    const enemy = { ...baseEnemy, hp: enemyHpMax }

    const enemyHp = util.getEnemyCurrentHp(enemy.id, enemy.hp)

    // 计算今日战斗进度
    const today = util.getTodayStr()
    const records = wx.getStorageSync('brushingRecords') || []
    const todayRecords = records.filter(r => r.date === today && r.fromTimer)
    const areasCompleted = todayRecords.reduce((sum, r) => sum + (r.completedAreas ? r.completedAreas.length : 0), 0)
    // 每2个区域消灭1个小怪物
    const minionDefeated = Math.min(Math.floor(areasCompleted / 2), 3)

    this.setData({
      round: round,
      currentChapter: chapter,
      currentEnemy: enemy,
      enemyCurrentHp: enemyHp,
      isEnemyDefeated: enemyHp <= 0,
      minionDefeated: minionDefeated,
      minionTotal: 3,
      areasCompleted: areasCompleted
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
    const editedData = wx.getStorageSync('brushingEditedPhoto')
    if (!editedData) return
    wx.removeStorageSync('brushingEditedPhoto')

    const editedPath = typeof editedData === 'string' ? editedData : editedData.path
    const timeOfDay = typeof editedData === 'string' ? null : editedData.timeOfDay
    const hour = new Date().getHours()
    const targetTimeOfDay = timeOfDay || (hour < 14 ? 'morning' : 'evening')

    const originalPath = wx.getStorageSync('brushingEditOriginalPath')
    wx.removeStorageSync('brushingEditOriginalPath')

    const today = util.getTodayStr()
    const records = wx.getStorageSync('brushingRecords') || []
    const index = records.findIndex(r => r.date === today && r.timeOfDay === targetTimeOfDay)
    if (index === -1) return

    const record = records[index]
    let images = (record.images || []).slice()

    // 替换被编辑的那张图
    if (originalPath) {
      const imgIndex = images.indexOf(originalPath)
      if (imgIndex !== -1) {
        images[imgIndex] = editedPath
      } else {
        images.push(editedPath)
      }
    } else {
      images = [editedPath]
    }

    // 上传编辑后的图片到云端
    wx.showLoading({ title: '保存编辑...' })
    try {
      if (cloud.isCloudReady && cloud.isCloudReady()) {
        const cloudPath = `brushing/${record.id}_edit_${Date.now()}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: editedPath })
        const cloudImageIDs = images.map(img => img === editedPath ? uploadRes.fileID : img)
        records[index] = { ...record, images: cloudImageIDs, imagePath: cloudImageIDs[0] }
        wx.setStorageSync('brushingRecords', records)
        try {
          await wx.cloud.database().collection('brushingRecords').doc(record.id).update({
            data: { images: cloudImageIDs, cloudFileID: cloudImageIDs[0] }
          })
        } catch (e) {}
      } else {
        records[index] = { ...record, images, imagePath: images[0] }
        wx.setStorageSync('brushingRecords', records)
      }
    } catch (err) {
      console.error('保存编辑失败:', err)
      records[index] = { ...record, images, imagePath: images[0] }
      wx.setStorageSync('brushingRecords', records)
    }

    wx.hideLoading()

    // 更新 detailRecord 以刷新详情弹窗
    if (this.data.showDetail && this.data.detailRecord) {
      const updated = records.find(r => r.date === today && r.timeOfDay === targetTimeOfDay)
      if (updated) {
        this.setData({ detailRecord: updated })
      }
    }

    this.loadRecords()
    wx.showToast({ title: '编辑已保存！', icon: 'success' })
  },

  // 加载今日信息
  loadTodayInfo() {
    const d = new Date()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekdayIcons = ['😴', '💪', '⚡', '🌟', '🎯', '🎉', '🌈']
    const month = d.getMonth() + 1
    const day = d.getDate()

    this.setData({
      todayInfo: {
        day: `${month}月${day}日`,
        weekday: weekdays[d.getDay()],
        weekdayIcon: weekdayIcons[d.getDay()]
      }
    })
  },

  // 加载今日记录（云端优先）
  async loadRecords() {
    const today = util.getTodayStr()
    const yesterday = util.getYesterdayStr()
    const records = await cloud.fetchBrushingRecords()
    const stats = util.getBrushingStats(records)

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

    // 今日记录
    const morningRecord = formatRecord(records.find(r => r.date === today && r.timeOfDay === 'morning'))
    const eveningRecord = formatRecord(records.find(r => r.date === today && r.timeOfDay === 'evening'))

    // 昨日记录
    const yesterdayMorning = formatRecord(records.find(r => r.date === yesterday && r.timeOfDay === 'morning'))
    const yesterdayEvening = formatRecord(records.find(r => r.date === yesterday && r.timeOfDay === 'evening'))

    // 昨日日期格式化
    const yesterdayDateObj = new Date()
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1)
    const yesterdayMonth = yesterdayDateObj.getMonth() + 1
    const yesterdayDay = yesterdayDateObj.getDate()
    const yesterdayWeekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const yesterdayDateStr = `${yesterdayMonth}月${yesterdayDay}日 ${yesterdayWeekdays[yesterdayDateObj.getDay()]}`

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
      morningSwiperIndex: 0,
      eveningSwiperIndex: 0,
      yesterdayMorning,
      yesterdayEvening,
      yesterdayDate: yesterdayDateStr,
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
          score: 4,
          scoreLabel: '非常好',
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
      const today = util.getTodayStr()

      // 检查是否已有同日同时段记录
      const existingRecords = wx.getStorageSync('brushingRecords') || []
      const duplicate = existingRecords.find(r => r.date === today && r.timeOfDay === modalTime)
      if (duplicate) {
        wx.hideLoading()
        wx.showToast({ title: '今天已经打过卡了', icon: 'none' })
        this.setData({ showScoreModal: false })
        return
      }

      const record = {
        id: util.generateId(),
        date: today,
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

      // 检查成就解锁（使用云端合并数据）
      var newAchievements = await achievements.checkAchievementsAsync()

      wx.hideLoading()
      this.setData({ showScoreModal: false })
      this.loadRecords()
      this.showSuccessToast(modalTime)

      // 显示成就解锁提示
      if (newAchievements.length > 0) {
        setTimeout(function() {
          wx.showToast({
            title: '🎉 解锁: ' + newAchievements[0].title,
            icon: 'success',
            duration: 2000
          })
        }, 2500)
      }
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
    const timeOfDay = e.currentTarget.dataset.time || 'morning'
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
      fail: (err) => {
        console.log('用户取消选择或选择失败:', err)
      },
      success: async (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        const allImages = [...existingImages, ...newImages]
        wx.showLoading({ title: '保存中...' })
        try {
          const record = timeOfDay === 'morning' ? this.data.morningRecord : this.data.eveningRecord
          if (record) {
            await cloud.updateBrushingRecord(timeOfDay, {
              imagePath: allImages[0] || '',
              images: allImages
            })
          } else {
            util.saveBrushingRecord({
              id: util.generateId(),
              date: util.getTodayStr(),
              timeOfDay: timeOfDay,
              imagePath: allImages[0] || '',
              images: allImages,
              score: 1,
              note: '补拍照片',
              points: 0,
              completedAreas: [],
              duration: 0,
              createTime: new Date().toISOString()
            })
          }
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
    const timeOfDay = e.currentTarget.dataset.timeOfDay || 'morning'
    wx.setStorageSync('brushingEditOriginalPath', path)
    wx.navigateTo({
      url: '/pages/create/draw/draw?mode=brushing&photo=' + encodeURIComponent(path) + '&timeOfDay=' + timeOfDay
    })
  },

  // swiper切换事件
  onMorningSwiperChange(e) {
    this.setData({ morningSwiperIndex: e.detail.current })
  },
  onEveningSwiperChange(e) {
    this.setData({ eveningSwiperIndex: e.detail.current })
  },

  // 预览图片
  previewImage(e) {
    const path = e.currentTarget.dataset.path
    const images = e.currentTarget.dataset.images
    if (images && images.length > 0) {
      wx.previewImage({
        current: path,
        urls: images
      })
    } else {
      previewImage(path)
    }
  },

  // 跳转到统计页
  goStats() {
    wx.navigateTo({
      url: '/pages/habits/brushing-stats/brushing-stats'
    })
  },

  // 查看详情（跳转到统计页）
  viewDetail(e) {
    const timeOfDay = e.currentTarget.dataset.time
    const record = timeOfDay === 'morning' ? this.data.morningRecord : this.data.eveningRecord
    if (!record) {
      wx.showToast({ title: '暂无记录', icon: 'none' })
      return
    }

    this.setData({
      showDetail: true,
      detailRecord: record
    })
  },

  // 关闭详情弹窗
  closeDetail() {
    this.setData({ showDetail: false, detailRecord: null })
  },

  // 详情更新后刷新数据
  onDetailUpdated() {
    this.loadRecords()
    // 重新读取当前详情记录，确保组件数据同步
    const records = wx.getStorageSync('brushingRecords') || []
    const timeOfDay = this.data.detailRecord ? this.data.detailRecord.timeOfDay : null
    if (timeOfDay) {
      const today = util.getTodayStr()
      const updated = records.find(r => r.date === today && r.timeOfDay === timeOfDay)
      if (updated) {
        this.setData({ detailRecord: updated })
      }
    }
  },

  // 返回首页
  goBack() {
    var hasChanges = this.data.tempImagePaths.length > 0 ||
                     (this.data.note && this.data.note.trim().length > 0) ||
                     this.data.score !== 5
    if (hasChanges) {
      wx.showModal({
        title: '提示',
        content: '当前有未保存的打卡内容，确定退出吗？',
        confirmText: '退出',
        cancelText: '取消',
        success: function(res) {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 预览昨日照片
  previewYesterdayImage(e) {
    const timeOfDay = e.currentTarget.dataset.time
    const record = timeOfDay === 'morning' ? this.data.yesterdayMorning : this.data.yesterdayEvening
    if (!record) {
      wx.showToast({ title: '昨天没有记录哦~', icon: 'none' })
      return
    }

    const images = record.images || []
    if (images.length === 0 && !record.imagePath) {
      wx.showToast({ title: '昨天没有拍照哦~', icon: 'none' })
      return
    }

    // 构建图片列表
    const imageList = images.length > 0 ? images : [record.imagePath]
    const current = e.currentTarget.dataset.path || imageList[0]

    wx.previewImage({
      current: current,
      urls: imageList
    })
  }
})
