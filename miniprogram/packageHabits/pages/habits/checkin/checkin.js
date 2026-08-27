const util = getApp().globalData.util
const cloud = getApp().globalData.cloud
const childStorage = getApp().globalData.childStorage
const achievements = getApp().globalData.achievements
const { getNavBarInfo, previewImage } = getApp().globalData.pageHelpers
const { getHabitConfig } = require('./habit-config.js')
const formHelper = require('../habit-form-helper.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    // 习惯信息
    habitType: '',
    habitName: '',
    habitIcon: '',
    habitColor: '#4CAF50',
    // 特色表单配置
    habitConfig: null,
    habitFields: [],
    // 打卡数据
    formData: {},
    images: [],
    note: '',
    score: 5,
    scoreLabels: ['加油哦', '还不错', '很好', '非常好', '超级棒！'],
    scoreLabel: '超级棒！',
    // 状态
    showSuccess: false,
    successText: '打卡成功！',
    // 今日记录
    todayRecords: []
  },

  onLoad: function(options) {
    var navInfo = getNavBarInfo()
    var habitType = options.type || 'custom'
    // P1-7：自定义习惯的精确隔离 id
    this._habitId = options.habitId || ''
    var config = getHabitConfig(habitType)

    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      habitType: habitType,
      habitName: decodeURIComponent(options.name || '自定义习惯'),
      habitIcon: options.icon || '⭐',
      habitColor: options.color || '#4CAF50',
      habitConfig: config,
      habitFields: config.fields || [],
      formData: this.initFormData(config)
    })

    this.loadTodayRecords()
    // P1-16：恢复该习惯的暂存草稿（goBack 写入 checkinDraft_，此前只写不读）
    this.restoreDraftIfExists(habitType)
    // 记录初始表单基线，返回时按"与基线是否一致"判断是否有未保存修改
    this._baseline = this.captureFormState()
  },

  // 恢复暂存草稿：确认恢复则回填表单并重算基线；放弃则清除草稿避免重复弹窗
  restoreDraftIfExists: function(habitType) {
    var draft = wx.getStorageSync('checkinDraft_' + habitType)
    if (!draft || !draft.time) return
    var that = this
    wx.showModal({
      title: '发现暂存',
      content: '有 ' + String(draft.time).slice(0, 10) + ' 暂存的打卡内容，是否恢复？',
      confirmText: '恢复',
      cancelText: '放弃',
      success: function(res) {
        if (res.confirm) {
          var score = draft.score || 5
          that.setData({
            images: draft.images || [],
            note: draft.note || '',
            score: score,
            scoreLabel: that.data.scoreLabels[score - 1] || that.data.scoreLabel,
            formData: Object.assign({}, that.data.formData, draft.formData || {})
          })
          // 内容已回到表单，清除草稿；重算基线避免返回时误提示
          wx.removeStorageSync('checkinDraft_' + habitType)
          that._baseline = that.captureFormState()
        } else {
          wx.removeStorageSync('checkinDraft_' + habitType)
        }
      }
    })
  },

  // 初始化表单数据
  initFormData: function(config) {
    var formData = {}
    if (config && config.fields) {
      config.fields.forEach(function(field) {
        if (field.type === 'counter') {
          formData[field.key] = field.default || 0
        } else if (field.type === 'mood' || field.type === 'select') {
          formData[field.key] = field.multiple ? [] : ''
        } else {
          formData[field.key] = ''
        }
      })
    }
    return formData
  },

  onShow: function() {
    this.loadTodayRecords()
    this.applyEditedPhoto()
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
      // 找到原图位置并替换
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

  // 加载今日记录
  loadTodayRecords: function() {
    var today = util.getTodayStr()
    var records = childStorage.get('habitRecords') || []
    // P1 修复：与 detail.js P1-7 同款三段式过滤——自定义习惯按 habitId 精确隔离，
    // 旧记录无 habitId 时回落 type 聚合；否则多个 custom 习惯的「今日已打卡」互相混计
    var habitId = this._habitId || ''
    var habitType = this.data.habitType
    var todayRecords = records.filter(function(r) {
      return r.date === today && r.type === habitType &&
        (!habitId || !r.habitId || r.habitId === habitId)
    })

    this.setData({ todayRecords: todayRecords })
  },

  // 拍照打卡（支持多张）
  takePhoto: function() {
    var remainCount = 9 - this.data.images.length
    if (remainCount <= 0) {
      wx.showToast({ title: '最多9张照片', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function(res) {
        var that = this
        var tempFiles = res.tempFiles
        wx.showLoading({ title: '上传中...' })

        var uploadCount = 0
        var newImages = []

        tempFiles.forEach(function(f, index) {
          var tempPath = f.tempFilePath
          // 使用压缩上传
          cloud.uploadImageCompressed(tempPath, 'habits').then(function(fileID) {
            newImages[index] = fileID
          }).catch(function() {
            newImages[index] = tempPath
          }).finally(function() {
            uploadCount++
            if (uploadCount === tempFiles.length) {
              var images = that.data.images.concat(newImages)
              that.setData({ images: images })
              wx.hideLoading()
            }
          })
        })
      }.bind(this)
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

  // 输入备注
  onNoteInput: function(e) {
    this.setData({ note: e.detail.value })
  },

  // ===== 特色表单处理（抽取到 habit-form-helper，使用路径更新优化）=====

  onFieldInput: function(e) { formHelper.onFieldInput(this, e) },
  onFieldTimeChange: function(e) { formHelper.onFieldTimeChange(this, e) },
  onFieldCounter: function(e) { formHelper.onFieldCounter(this, e) },
  onFieldSelect: function(e) { formHelper.onFieldSelect(this, e) },
  onFieldMood: function(e) { formHelper.onFieldMood(this, e) },

  // 选择评分
  selectScore: function(e) {
    var score = e.currentTarget.dataset.score
    this.setData({
      score: score,
      scoreLabel: this.data.scoreLabels[score - 1]
    })
  },

  // 保存打卡
  save: function() {
    var that = this
    var images = this.data.images
    var note = this.data.note.trim()
    var score = this.data.score
    var formData = this.data.formData
    var config = this.data.habitConfig

    // H2：防重复提交（图片持久化为异步回调，期间可被连点）
    if (this._saving) return
    this._saving = true

    // H3：required 字段校验（此前书名等留空照常入库）
    var missingField = null
    ;(config && config.fields || []).forEach(function(field) {
      if (!missingField && field.required) {
        var v = formData[field.key]
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          missingField = field.label || field.key
        }
      }
    })
    if (missingField) {
      this._saving = false
      wx.showToast({ title: '请填写：' + missingField, icon: 'none' })
      return
    }

    // 生成特色摘要
    var summary = ''
    if (config && config.summary) {
      summary = config.summary(formData)
    }

    wx.showLoading({ title: '保存中...', mask: true })

    // 持久化图片
    var saveImages = function(callback) {
      if (images.length === 0) {
        callback([])
        return
      }

      var savedCount = 0
      var savedImages = []

      images.forEach(function(img, index) {
        if (img.startsWith(wx.env.USER_DATA_PATH) || img.startsWith('cloud://')) {
          savedImages[index] = img
          savedCount++
          if (savedCount === images.length) {
            callback(savedImages)
          }
        } else {
          util.saveImageToPersistent(img).then(function(savedPath) {
            savedImages[index] = savedPath
            savedCount++
            if (savedCount === images.length) {
              callback(savedImages)
            }
          }).catch(function() {
            savedImages[index] = img
            savedCount++
            if (savedCount === images.length) {
              callback(savedImages)
            }
          })
        }
      })
    }

    saveImages(function(savedImages) {
      // H2 兜底：保存主流程任何一步异常都必须复位锁与 loading，
      // 否则 _saving 永久卡 true，该页无法再次打卡
      try {
      var record = {
        id: util.generateId(),
        type: that.data.habitType,
        habitId: that._habitId || '',
        date: util.getTodayStr(),
        images: savedImages,
        imagePath: savedImages[0] || '',
        note: note,
        score: score,
        formData: formData,
        summary: summary,
        createTime: new Date().toISOString()
      }

      // 保存到本地
      var records = childStorage.get('habitRecords') || []
      records.unshift(record)
      childStorage.set('habitRecords', records)

      // 尝试同步云端
      if (cloud.isCloudReady && cloud.isCloudReady()) {
        cloud.uploadHabitRecord(record).catch(function(err) {
          console.warn('云端同步失败，已保留本地:', err)
        })
      }

      wx.hideLoading()
      that._saving = false // H2：保存流程结束
      that.setData({
        images: [],
        note: '',
        score: 5,
        scoreLabel: '超级棒！',
        // H4：重建表单配置，清除选项 selected 残留高亮
        habitFields: (that.data.habitConfig && that.data.habitConfig.fields) || [],
        formData: that.initFormData(that.data.habitConfig)
      })
      // 打卡已保存，更新基线避免返回时误报未保存
      that._baseline = that.captureFormState()
      that.loadTodayRecords()
      that.showSuccessToast()

      // 检查成就解锁
      var newAchievements = achievements.checkAchievements()
      if (newAchievements.length > 0) {
        setTimeout(function() {
          wx.showToast({
            title: '🎉 解锁: ' + newAchievements[0].title,
            icon: 'success',
            duration: 2000
          })
        }, 2500)
      }
      } catch (saveErr) {
        console.error('保存打卡记录失败:', saveErr)
        wx.hideLoading()
        that._saving = false
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  },

  // 显示成功提示
  showSuccessToast: function() {
    this.setData({
      showSuccess: true,
      successText: this.data.habitIcon + ' 打卡成功！'
    })
    setTimeout(function() {
      this.setData({ showSuccess: false })
    }.bind(this), 2000)
  },

  // 捕获当前表单状态快照（用于判断是否有未保存修改）
  captureFormState: function() {
    return JSON.stringify({
      images: this.data.images || [],
      note: (this.data.note || '').trim(),
      score: this.data.score,
      formData: this.data.formData || {}
    })
  },

  // 返回
  goBack: function() {
    // 与初始基线比较：没有实际修改（含打卡完成后已重置）则不提示
    var hasChanges = this._baseline === undefined || this.captureFormState() !== this._baseline

    if (hasChanges) {
      wx.showModal({
        title: '提示',
        content: '当前有未保存的内容，是否暂存？',
        confirmText: '暂存',
        cancelText: '不保存',
        success: function(res) {
          if (res.confirm) {
            wx.setStorageSync('checkinDraft_' + this.data.habitType, {
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
  }
})
