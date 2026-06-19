var util = require('../../utils/util.js')
var achievements = require('../../utils/achievements.js')
var { previewImage } = require('../../utils/page-helpers.js')

Page({
  data: {
    type: 'diary',
    title: '',
    content: '',
    mood: 'happy',
    tags: [],
    tagInput: '',
    images: [],
    types: [
      { value: 'diary', label: '成长日记', icon: '📖' },
      { value: 'funny', label: '今日趣事', icon: '😄' },
      { value: 'learning', label: '学习笔记', icon: '📚' }
    ],
    moods: [
      { value: 'happy', label: '开心', icon: '😊' },
      { value: 'excited', label: '兴奋', icon: '🤩' },
      { value: 'calm', label: '平静', icon: '😌' },
      { value: 'tired', label: '累了', icon: '😴' }
    ]
  },

  onShow: function() {
    this.applyEditedPhoto()
    this.checkUnsaved()
  },

  // 检查是否有未保存内容，启用返回确认
  checkUnsaved: function() {
    var hasChanges = (this.data.title && this.data.title.trim().length > 0) ||
                     (this.data.content && this.data.content.trim().length > 0) ||
                     this.data.images.length > 0 ||
                     this.data.tags.length > 0
    if (hasChanges) {
      wx.enableAlertBeforeUnload({
        message: '当前有未保存的笔记内容，确定退出吗？'
      })
    } else {
      wx.disableAlertBeforeUnload()
    }
  },

  // 从画画编辑器返回时，应用编辑后的照片
  applyEditedPhoto: function() {
    var editedPath = wx.getStorageSync('noteEditedPhoto')
    if (!editedPath) return
    wx.removeStorageSync('noteEditedPhoto')

    var originalPath = wx.getStorageSync('noteEditPhoto')
    wx.removeStorageSync('noteEditPhoto')

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

  // 选择笔记类型
  selectType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ type: type })
  },

  // 输入标题
  onTitleInput: function(e) {
    this.setData({ title: e.detail.value })
  },

  // 输入内容
  onContentInput: function(e) {
    this.setData({ content: e.detail.value })
  },

  // 选择心情
  selectMood: function(e) {
    var mood = e.currentTarget.dataset.mood
    this.setData({ mood: mood })
  },

  // 输入标签
  onTagInput: function(e) {
    this.setData({ tagInput: e.detail.value })
  },

  // 添加标签
  addTag: function() {
    var tagInput = this.data.tagInput
    var tags = this.data.tags
    if (!tagInput.trim()) return
    if (tags.length >= 5) {
      wx.showToast({ title: '最多5个标签', icon: 'none' })
      return
    }
    if (tags.indexOf(tagInput.trim()) !== -1) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    var newTags = tags.concat([tagInput.trim()])
    this.setData({ tags: newTags, tagInput: '' })
  },

  // 删除标签
  removeTag: function(e) {
    var index = e.currentTarget.dataset.index
    var tags = this.data.tags.slice()
    tags.splice(index, 1)
    this.setData({ tags: tags })
  },

  // 拍照（支持多张）
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
          if (wx.cloud) {
            var cloudPath = 'notes/' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg'
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
    wx.setStorageSync('noteEditPhoto', path)
    wx.navigateTo({
      url: '/pages/create/draw/draw?mode=note&photo=' + encodeURIComponent(path)
    })
  },

  // 预览图片
  previewImage: function(e) {
    var path = e.currentTarget.dataset.path
    previewImage(path, this.data.images)
  },

  // 保存笔记
  save: function() {
    var that = this
    var type = this.data.type
    var title = this.data.title
    var content = this.data.content
    var mood = this.data.mood
    var tags = this.data.tags
    var images = this.data.images

    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
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
      var notes = wx.getStorageSync('notes') || []

      var newNote = {
        id: util.generateId(),
        type: type,
        title: title.trim(),
        content: content.trim(),
        mood: mood,
        tags: tags,
        images: savedImages,
        imagePath: savedImages[0] || '',
        createTime: new Date().toISOString()
      }

      notes.unshift(newNote)
      wx.setStorageSync('notes', notes)

      wx.disableAlertBeforeUnload()
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })

      // 检查成就解锁
      var newAchievements = achievements.checkAchievements()
      if (newAchievements.length > 0) {
        setTimeout(function() {
          wx.showToast({
            title: '🎉 解锁: ' + newAchievements[0].title,
            icon: 'success',
            duration: 2000
          })
        }, 1500)
      }

      setTimeout(function() { wx.navigateBack() }, 1500)
    })
  }
})
