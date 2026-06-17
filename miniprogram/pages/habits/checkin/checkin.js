var util = require('../../../utils/util.js')
var cloud = require('../../../utils/cloud.js')
var { getNavBarInfo, previewImage } = require('../../../utils/page-helpers.js')
var { getHabitConfig } = require('./habit-config.js')

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
    var records = wx.getStorageSync('habitRecords') || []
    var todayRecords = records.filter(function(r) {
      return r.date === today && r.type === this.data.habitType
    }.bind(this))

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
        var newImages = res.tempFiles.map(function(f) { return f.tempFilePath })
        var images = this.data.images.concat(newImages)
        this.setData({ images: images })
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
      url: '/pages/create/draw/draw?mode=habit&photo=' + encodeURIComponent(path)
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

    if (field.multiple) {
      // 多选
      var arr = formData[key] || []
      var index = arr.indexOf(value)
      if (index > -1) {
        arr.splice(index, 1)
      } else {
        arr.push(value)
      }
      formData[key] = arr
    } else {
      // 单选
      formData[key] = value
    }

    this.setData({ formData: formData })
  },

  // 心情选择
  onFieldMood: function(e) {
    var key = e.currentTarget.dataset.key
    var value = e.currentTarget.dataset.value
    var formData = this.data.formData
    formData[key] = value
    this.setData({ formData: formData })
  },

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

    // 生成特色摘要
    var summary = ''
    if (config && config.summary) {
      summary = config.summary(formData)
    }

    wx.showLoading({ title: '保存中...' })

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
      var record = {
        id: util.generateId(),
        type: that.data.habitType,
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
      var records = wx.getStorageSync('habitRecords') || []
      records.unshift(record)
      wx.setStorageSync('habitRecords', records)

      // 尝试同步云端
      if (cloud.isCloudReady && cloud.isCloudReady()) {
        cloud.uploadHabitRecord(record).catch(function(err) {
          console.warn('云端同步失败，已保留本地:', err)
        })
      }

      wx.hideLoading()
      that.setData({
        images: [],
        note: '',
        score: 5,
        scoreLabel: '超级棒！',
        formData: that.initFormData(that.data.habitConfig)
      })
      that.loadTodayRecords()
      that.showSuccessToast()
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

  // 返回
  goBack: function() {
    wx.navigateBack()
  }
})
