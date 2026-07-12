var util = require('../../utils/util.js')
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var achievements = require('../../utils/achievements.js')
var auth = require('../../utils/auth.js')
var { previewImage } = require('../../utils/page-helpers.js')
var noteTypes = require('../../utils/note-types.js')

Page({
  data: {
    isEdit: false,
    editId: '',
    type: 'diary',
    title: '',
    content: '',
    mood: 'happy',
    tags: [],
    tagInput: '',
    images: [],
    visibility: 'family',
    visibleTo: [],
    familyMembers: [],
    types: noteTypes.getAllTypes(),
    typeGroups: noteTypes.TYPE_GROUPS,
    moods: noteTypes.MOODS,
    moodGroups: noteTypes.MOOD_GROUPS,
    visibilityOptions: [
      { value: 'family', label: '家庭公开', icon: '👨‍👩‍👧‍👦', desc: '所有家庭成员可见' },
      { value: 'designated', label: '指定人', icon: '👥', desc: '仅选中的成员可见' },
      { value: 'private', label: '仅自己', icon: '🔒', desc: '仅自己可见' }
    ],
    showCustomTypeModal: false,
    customTypeName: '',
    customTypeIcon: '📝',
    customIconOptions: ['📝', '🎨', '🎵', '📷', '🎬', '💻', '🏠', '🌟', '💡', '❤️'],
    typeCollapsed: true,
    moodCollapsed: true
  },

  titleEditorCtx: null,
  contentEditorCtx: null,

  onLoad: function(options) {
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id })
      this.loadNoteForEdit(options.id)
      wx.setNavigationBarTitle({ title: '编辑笔记' })
    }
    this.loadFamilyMembers()
  },

  onShow: function() {
    this.applyEditedPhoto()
    this.checkUnsaved()
  },

  // 加载笔记数据用于编辑
  loadNoteForEdit: function(id) {
    var notes = childStorage.get('notes') || []
    var note = notes.find(function(n) { return n.id === id })
    if (!note) {
      wx.showToast({ title: '笔记不存在', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }
    
    // 验证编辑权限
    var member = auth.getMember()
    var isCreator = note.createdBy === (member ? member._id : '')
    var isAdmin = member && member.permissions && member.permissions.indexOf('admin') >= 0
    if (!isCreator && !isAdmin) {
      wx.showToast({ title: '无权限编辑', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }
    
    this.setData({
      type: note.type || 'diary',
      title: note.title || '',
      content: note.content || '',
      mood: note.mood || 'happy',
      tags: note.tags || [],
      images: note.images || [],
      visibility: note.visibility || 'family',
      visibleTo: note.visibleTo || []
    })

    // 设置编辑器内容
    this._setEditorContent(note.title || '', note.content || '')
  },

  // 设置编辑器内容
  _setEditorContent: function(title, content) {
    var that = this
    setTimeout(function() {
      if (that.titleEditorCtx && title) {
        that.titleEditorCtx.setContents({ html: title })
      }
      if (that.contentEditorCtx && content) {
        that.contentEditorCtx.setContents({ html: content })
      }
    }, 300)
  },

  // 角色图标映射
  ROLE_ICONS: {
    father: '👨',
    mother: '👩',
    child: '🧒',
    grandpa: '👴',
    grandma: '👵',
    uncle: '👨',
    aunt: '👩',
    other: '👤'
  },

  // 加载家庭成员列表
  loadFamilyMembers: function() {
    var that = this
    cloud.getFamilyMembers().then(function(members) {
      // 过滤掉自己（云函数已只返回活跃成员）
      var member = auth.getMember()
      var memberId = member ? member._id : ''
      var filtered = members.filter(function(m) {
        return m._id !== memberId
      }).map(function(m) {
        // 添加角色图标
        m.roleIcon = that.ROLE_ICONS[m.role] || '👤'
        // 添加选中状态标记
        m._selected = that.data.visibleTo.indexOf(m._id) >= 0
        return m
      })
      that.setData({ familyMembers: filtered })
    }).catch(function() {
      console.warn('加载家庭成员失败')
    })
  },

  // 头像加载错误处理
  onAvatarError: function(e) {
    var index = e.currentTarget.dataset.index
    var familyMembers = this.data.familyMembers
    if (familyMembers[index]) {
      familyMembers[index].avatar = ''
      this.setData({ familyMembers: familyMembers })
    }
  },

  // 检查是否有未保存内容，启用返回确认
  checkUnsaved: function() {
    // 去除 HTML 标签后检查是否为空
    var stripHtml = function(html) {
      return html ? html.replace(/<[^>]+>/g, '').trim() : ''
    }

    var hasChanges = stripHtml(this.data.title).length > 0 ||
                     stripHtml(this.data.content).length > 0 ||
                     this.data.images.length > 0 ||
                     this.data.tags.length > 0
    // 新建模式有内容时启用保护，编辑模式下暂不启用（后续可添加变更检测）
    if (hasChanges && !this.data.isEdit) {
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

  // 切换类型折叠状态
  toggleTypeCollapsed: function() {
    this.setData({ typeCollapsed: !this.data.typeCollapsed })
  },

  // 切换心情折叠状态
  toggleMoodCollapsed: function() {
    this.setData({ moodCollapsed: !this.data.moodCollapsed })
  },

  // 选择笔记类型
  selectType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ type: type })
  },

  // 显示自定义类型弹窗
  showCustomTypeModal: function() {
    if (noteTypes.getCustomTypes().length >= noteTypes.MAX_CUSTOM_TYPES) {
      wx.showToast({ title: '最多创建' + noteTypes.MAX_CUSTOM_TYPES + '个自定义类型', icon: 'none' })
      return
    }
    this.setData({ showCustomTypeModal: true })
  },

  // 隐藏自定义类型弹窗
  hideCustomTypeModal: function() {
    this.setData({ showCustomTypeModal: false, customTypeName: '' })
  },

  // 自定义类型名称输入
  onCustomTypeNameInput: function(e) {
    this.setData({ customTypeName: e.detail.value })
  },

  // 选择自定义类型图标
  selectCustomIcon: function(e) {
    this.setData({ customTypeIcon: e.currentTarget.dataset.icon })
  },

  // 创建自定义类型
  createCustomType: function() {
    var name = this.data.customTypeName.trim()
    if (!name) {
      wx.showToast({ title: '请输入类型名称', icon: 'none' })
      return
    }
    if (name.length > 6) {
      wx.showToast({ title: '名称最多6个字', icon: 'none' })
      return
    }
    var value = 'custom_' + Date.now()
    var result = noteTypes.addCustomType({
      value: value,
      label: name,
      icon: this.data.customTypeIcon
    })
    if (result.success) {
      this.setData({
        types: noteTypes.getAllTypes(),
        type: value,
        showCustomTypeModal: false,
        customTypeName: ''
      })
      wx.showToast({ title: '创建成功', icon: 'success' })
    } else {
      var msg = result.reason === 'max_limit' ? '最多创建' + noteTypes.MAX_CUSTOM_TYPES + '个自定义类型' : result.reason === 'builtin_conflict' ? '与内置类型冲突' : '类型名称已存在'
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  // 删除自定义类型（长按触发）
  deleteCustomType: function(e) {
    var value = e.currentTarget.dataset.value
    var that = this

    // 检查是否有笔记使用该类型
    var notes = childStorage.get('notes') || []
    var notesWithType = notes.filter(function(n) { return n.type === value })
    var confirmContent = notesWithType.length > 0
      ? '有 ' + notesWithType.length + ' 篇笔记使用此类型，删除后将显示为"成长日记"，确定继续？'
      : '确定要删除这个自定义类型吗？'

    wx.showModal({
      title: '删除类型',
      content: confirmContent,
      success: function(res) {
        if (res.confirm) {
          noteTypes.removeCustomType(value)
          that.setData({
            types: noteTypes.getAllTypes(),
            type: that.data.type === value ? 'diary' : that.data.type
          })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 标题编辑器就绪
  onTitleEditorReady: function() {
    var that = this
    this.createSelectorQuery().select('#titleEditor').context(function(res) {
      that.titleEditorCtx = res.context
      // 如果是编辑模式，设置内容
      if (that.data.isEdit && that.data.title) {
        setTimeout(function() {
          that.titleEditorCtx.setContents({ html: that.data.title })
        }, 100)
      }
    }).exec()
  },

  // 内容编辑器就绪
  onContentEditorReady: function() {
    var that = this
    this.createSelectorQuery().select('#contentEditor').context(function(res) {
      that.contentEditorCtx = res.context
      // 如果是编辑模式，设置内容
      if (that.data.isEdit && that.data.content) {
        setTimeout(function() {
          that.contentEditorCtx.setContents({ html: that.data.content })
        }, 100)
      }
    }).exec()
  },

  // 输入标题
  onTitleInput: function(e) {
    this.setData({ title: e.detail.html || e.detail.text || '' })
    this.checkUnsaved()
  },

  // 输入内容
  onContentInput: function(e) {
    this.setData({ content: e.detail.html || e.detail.text || '' })
    this.checkUnsaved()
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
        var hasUploadFail = false

        tempFiles.forEach(function(f, index) {
          var tempPath = f.tempFilePath
          cloud.uploadImageCompressed(tempPath, 'notes').then(function(fileID) {
            newImages[index] = fileID
          }).catch(function() {
            newImages[index] = tempPath
            hasUploadFail = true
          }).finally(function() {
            uploadCount++
            if (uploadCount === tempFiles.length) {
              var images = that.data.images.concat(newImages)
              that.setData({ images: images })
              wx.hideLoading()
              if (hasUploadFail) {
                wx.showToast({ title: '部分图片上传失败，仅保存到本机', icon: 'none' })
              }
            }
          })
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
    wx.setStorageSync('noteEditPhoto', path)
    wx.navigateTo({
      url: '/packageCreate/pages/create/draw/draw?mode=note'
    })
  },

  // 预览图片
  previewImage: function(e) {
    var path = e.currentTarget.dataset.path
    previewImage(path, this.data.images)
  },

  // 选择可见范围
  selectVisibility: function(e) {
    var visibility = e.currentTarget.dataset.visibility
    var validVisibility = ['family', 'designated', 'private']
    // 无效值回退到默认
    if (validVisibility.indexOf(visibility) < 0) {
      visibility = 'family'
    }
    this.setData({ visibility: visibility })
    if (visibility !== 'designated') {
      this.setData({ visibleTo: [] })
    }
  },

  // 切换成员可见状态
  toggleMember: function(e) {
    var id = e.currentTarget.dataset.id
    var visibleTo = this.data.visibleTo.slice()
    var index = visibleTo.indexOf(id)
    if (index >= 0) {
      visibleTo.splice(index, 1)
    } else {
      visibleTo.push(id)
    }
    
    // 更新成员选中状态
    var familyMembers = this.data.familyMembers.map(function(m) {
      m._selected = visibleTo.indexOf(m._id) >= 0
      return m
    })
    
    this.setData({ 
      visibleTo: visibleTo,
      familyMembers: familyMembers
    })
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
    var visibility = this.data.visibility
    var visibleTo = this.data.visibleTo

    // 去除 HTML 标签后检查是否为空
    var stripHtml = function(html) {
      return html ? html.replace(/<[^>]+>/g, '').trim() : ''
    }

    if (!stripHtml(title)) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    if (visibility === 'designated' && visibleTo.length === 0) {
      wx.showToast({ title: '请选择可见成员', icon: 'none' })
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
        if (img.startsWith(wx.env.USER_DATA_PATH) || img.startsWith('cloud://') || img.startsWith('http')) {
          savedImages[index] = img
          savedCount++
          if (savedCount === images.length) {
            callback(savedImages)
          }
        } else {
          util.saveImageToPersistent(img, 'note').then(function(savedPath) {
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
      // 保存富文本内容，保留HTML格式
      var saveTitle = title
      var saveContent = content

      if (that.data.isEdit) {
        // 更新模式
        var noteManager = require('../../utils/note-manager.js')
        noteManager.updateNote(that.data.editId, {
          type: type,
          title: saveTitle,
          content: saveContent,
          mood: mood,
          tags: tags,
          images: savedImages,
          imagePath: savedImages[0] || '',
          visibility: visibility,
          visibleTo: visibleTo,
          updateTime: new Date().toISOString()
        })

        wx.disableAlertBeforeUnload()
        wx.hideLoading()
        wx.showToast({ title: '更新成功', icon: 'success' })
        setTimeout(function() { wx.navigateBack() }, 1500)
      } else {
        // 新建模式
        var member = auth.getMember()
        var noteData = {
          type: type,
          title: saveTitle,
          content: saveContent,
          mood: mood,
          tags: tags,
          images: savedImages,
          imagePath: savedImages[0] || '',
          visibility: visibility,
          visibleTo: visibleTo,
          createdBy: member ? member._id : '',
          createdByName: member ? member.roleName : ''
        }

        // 统一走 noteManager.addNote：生成 id/createTime、写本地、触发云同步
        var noteManager = require('../../utils/note-manager.js')
        noteManager.addNote(noteData)

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
      }
    })
  }
})
