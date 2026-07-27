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
    moodCollapsed: true,
    // 格式工具栏状态
    showFormatToolbar: false,
    formatBold: false,
    formatItalic: false,
    formatUnderline: false,
    contentLength: 0,
    titleLength: 0,
    // 草稿箱状态
    showDraftRecovery: false,
    draftData: null,
    // 语音录制状态
    isRecording: false,
    voicePath: '',
    voiceDuration: 0,
    isPlaying: false,
    // 标签推荐
    tagSuggestions: [],
    showTagSuggestions: false,
    // 照片排序
    isSorting: false,
    sortIndex: -1,
    sortStartX: 0,
    sortStartY: 0,
    // 键盘高度
    keyboardHeight: 0
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
    this.initDraftDebounce()
    this.initRecorder()
    this.checkDraftRecovery()
  },

  onShow: function() {
    this.applyEditedPhoto()
    this.checkUnsaved()
  },

  onUnload: function() {
    // 页面卸载时保存草稿（如果不是正常保存退出）
    if (!this._isSaving) {
      this.saveDraft()
    }
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
      voicePath: note.voice || '',
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

  // 草稿箱功能
  getDraftKey: function() {
    // 如果是编辑模式，使用笔记ID作为key
    // 如果是新建模式，使用当前草稿ID（如果有）或生成新的ID
    if (this.data.isEdit) {
      return 'note_draft_' + this.data.editId
    }
    // 如果已经加载了草稿，使用草稿的key
    if (this._currentDraftKey) {
      return this._currentDraftKey
    }
    // 生成新的草稿key
    return 'note_draft_new_' + Date.now()
  },

  saveDraft: function() {
    var draftKey = this.getDraftKey()
    this._currentDraftKey = draftKey
    var draftData = {
      type: this.data.type,
      title: this.data.title,
      content: this.data.content,
      mood: this.data.mood,
      tags: this.data.tags,
      images: this.data.images,
      visibility: this.data.visibility,
      visibleTo: this.data.visibleTo,
      timestamp: Date.now()
    }
    wx.setStorageSync(draftKey, draftData)
  },

  loadDraft: function() {
    // 如果是从草稿箱进入，加载指定的草稿
    if (this._currentDraftKey) {
      var draftData = wx.getStorageSync(this._currentDraftKey)
      if (draftData) {
        return draftData
      }
    }
    
    // 否则查找最新的草稿
    var storageInfo = wx.getStorageInfoSync()
    var latestDraft = null
    var latestKey = null
    
    for (var i = 0; i < storageInfo.keys.length; i++) {
      var key = storageInfo.keys[i]
      if (key.startsWith('note_draft_')) {
        var draftData = wx.getStorageSync(key)
        if (draftData && draftData.timestamp) {
          if (!latestDraft || draftData.timestamp > latestDraft.timestamp) {
            latestDraft = draftData
            latestKey = key
          }
        }
      }
    }
    
    if (latestDraft) {
      this._currentDraftKey = latestKey
      return latestDraft
    }
    return null
  },

  clearDraft: function() {
    var draftKey = this.getDraftKey()
    wx.removeStorageSync(draftKey)
  },

  checkDraftRecovery: function() {
    if (this.data.isEdit) return // 编辑模式不检查草稿
    
    // 检查是否从草稿箱进入（draftKey参数）
    var pages = getCurrentPages()
    var currentPage = pages[pages.length - 1]
    var options = currentPage.options || {}
    
    if (options.draftKey) {
      // 从草稿箱进入，加载指定的草稿
      var draftKey = decodeURIComponent(options.draftKey)
      var draftData = wx.getStorageSync(draftKey)
      if (draftData) {
        this._currentDraftKey = draftKey
        this.setData({ draftData: draftData })
        this.recoverDraft()
      }
    } else {
      // 正常进入，检查是否有草稿需要恢复
      var draftData = this.loadDraft()
      if (draftData) {
        this.setData({
          showDraftRecovery: true,
          draftData: draftData
        })
      }
    }
  },

  recoverDraft: function() {
    var draftData = this.data.draftData
    if (!draftData) return

    this.setData({
      type: draftData.type || 'diary',
      title: draftData.title || '',
      content: draftData.content || '',
      mood: draftData.mood || 'happy',
      tags: draftData.tags || [],
      images: draftData.images || [],
      visibility: draftData.visibility || 'family',
      visibleTo: draftData.visibleTo || [],
      showDraftRecovery: false,
      draftData: null
    })

    // 设置编辑器内容
    this._setEditorContent(draftData.title || '', draftData.content || '')
    
    wx.showToast({ title: '草稿已恢复', icon: 'success' })
  },

  discardDraft: function() {
    this.clearDraft()
    this.setData({
      showDraftRecovery: false,
      draftData: null
    })
  },

  // 保存到草稿箱并返回
  saveDraftAndBack: function() {
    // 检查是否有内容
    var stripHtml = function(html) {
      return html ? html.replace(/<[^>]+>/g, '').trim() : ''
    }
    
    var hasContent = stripHtml(this.data.title).length > 0 ||
                     stripHtml(this.data.content).length > 0 ||
                     this.data.images.length > 0 ||
                     this.data.tags.length > 0
    
    if (!hasContent) {
      wx.showToast({ title: '请先写点内容', icon: 'none' })
      return
    }
    
    // 保存草稿
    this.saveDraft()
    this._isSaving = true // 设置标志，避免onUnload弹出提示
    wx.disableAlertBeforeUnload() // 禁用返回确认提示
    wx.showToast({ title: '已保存到草稿箱', icon: 'success' })
    
    setTimeout(function() {
      wx.navigateBack()
    }, 1500)
  },

  // 防抖保存草稿
  debounceSaveDraft: null,

  initDraftDebounce: function() {
    var that = this
    var timer = null
    this.debounceSaveDraft = function() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(function() {
        that.saveDraft()
      }, 1000)
    }
  },

  // 语音录制功能
  recorderManager: null,
  innerAudioContext: null,

  initRecorder: function() {
    var that = this
    this.recorderManager = wx.getRecorderManager()
    this.innerAudioContext = wx.createInnerAudioContext()
    
    this.recorderManager.onStart(function() {
      that.setData({ isRecording: true, voiceDuration: 0 })
      that._recordTimer = setInterval(function() {
        that.setData({ voiceDuration: that.data.voiceDuration + 1 })
        if (that.data.voiceDuration >= 60) {
          that.stopRecord()
        }
      }, 1000)
    })
    
    this.recorderManager.onStop(function(res) {
      that.setData({ isRecording: false })
      if (that._recordTimer) {
        clearInterval(that._recordTimer)
        that._recordTimer = null
      }
      
      if (res.duration < 1000) {
        wx.showToast({ title: '录音时间太短', icon: 'none' })
        return
      }
      
      that.setData({
        voicePath: res.tempFilePath,
        voiceDuration: Math.floor(res.duration / 1000)
      })
    })
    
    this.recorderManager.onError(function(err) {
      that.setData({ isRecording: false })
      if (that._recordTimer) {
        clearInterval(that._recordTimer)
        that._recordTimer = null
      }
      wx.showToast({ title: '录音失败', icon: 'none' })
      console.warn('录音失败:', err)
    })
    
    this.innerAudioContext.onEnded(function() {
      that.setData({ isPlaying: false })
    })
    
    this.innerAudioContext.onError(function(err) {
      that.setData({ isPlaying: false })
      console.warn('播放失败:', err)
    })
  },

  startRecord: function() {
    var that = this
    wx.authorize({
      scope: 'scope.record',
      success: function() {
        that.recorderManager.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 96000,
          format: 'mp3'
        })
      },
      fail: function() {
        wx.showToast({ title: '请授权录音权限', icon: 'none' })
      }
    })
  },

  stopRecord: function() {
    if (this.data.isRecording) {
      this.recorderManager.stop()
    }
  },

  cancelRecord: function() {
    if (this.data.isRecording) {
      this.recorderManager.stop()
      this.setData({ voicePath: '', voiceDuration: 0 })
    }
  },

  playVoice: function() {
    if (!this.data.voicePath) return
    
    if (this.data.isPlaying) {
      this.innerAudioContext.stop()
      this.setData({ isPlaying: false })
    } else {
      this.innerAudioContext.src = this.data.voicePath
      this.innerAudioContext.play()
      this.setData({ isPlaying: true })
    }
  },

  deleteVoice: function() {
    if (this.innerAudioContext) {
      this.innerAudioContext.stop()
    }
    this.setData({ 
      voicePath: '', 
      voiceDuration: 0,
      isPlaying: false 
    })
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
    var title = e.detail.html || e.detail.text || ''
    this.setData({ 
      title: title,
      titleLength: title.replace(/<[^>]+>/g, '').length
    })
    this.checkUnsaved()
    if (this.debounceSaveDraft) this.debounceSaveDraft()
  },

  // 输入内容
  onContentInput: function(e) {
    var content = e.detail.html || e.detail.text || ''
    this.setData({ 
      content: content,
      contentLength: content.replace(/<[^>]+>/g, '').length
    })
    this.checkUnsaved()
    if (this.debounceSaveDraft) this.debounceSaveDraft()
  },

  // 编辑器获取焦点
  onEditorFocus: function() {
    // 工具栏始终显示，无需处理
  },

  // 编辑器失去焦点
  onEditorBlur: function() {
    // 工具栏始终显示，无需处理
  },

  // 阻止工具栏点击时编辑器失去焦点
  preventBlur: function() {
    // 空函数，仅用于catchtap阻止事件冒泡
  },

  // 键盘高度变化
  onKeyboardHeightChange: function(e) {
    var keyboardHeight = e.detail.height || 0
    this.setData({ keyboardHeight: keyboardHeight })
  },

  // 格式化文本
  formatText: function(e) {
    var format = e.currentTarget.dataset.format
    if (!this.contentEditorCtx) return

    var that = this
    switch(format) {
      case 'bold':
        this.contentEditorCtx.format('bold')
        this.setData({ formatBold: !this.data.formatBold })
        break
      case 'italic':
        this.contentEditorCtx.format('italic')
        this.setData({ formatItalic: !this.data.formatItalic })
        break
      case 'underline':
        this.contentEditorCtx.format('underline')
        this.setData({ formatUnderline: !this.data.formatUnderline })
        break
      case 'list':
        this.contentEditorCtx.format('list', 'bullet')
        break
      case 'header':
        this.contentEditorCtx.format('header', 'h2')
        break
      case 'clear':
        this.contentEditorCtx.removeFormat()
        this.setData({ formatBold: false, formatItalic: false, formatUnderline: false })
        break
    }
  },

  // 选择心情
  selectMood: function(e) {
    var mood = e.currentTarget.dataset.mood
    this.setData({ mood: mood })
  },

  // 输入标签
  onTagInput: function(e) {
    var value = e.detail.value
    this.setData({ tagInput: value })
    
    // 标签推荐
    if (value && value.trim()) {
      this.getTagSuggestions(value.trim())
    } else {
      this.setData({ showTagSuggestions: false, tagSuggestions: [] })
    }
  },

  // 标签输入框获取焦点
  onTagInputFocus: function() {
    // 显示历史标签推荐
    if (!this.data.tagInput) {
      this.getPopularTags()
    }
  },

  // 获取热门标签
  getPopularTags: function() {
    var notes = childStorage.get('notes') || []
    var tagCount = {}
    
    // 统计所有标签使用次数
    notes.forEach(function(note) {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(function(tag) {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })
    
    // 获取最热门的标签
    var suggestions = Object.keys(tagCount)
      .filter(function(tag) {
        return this.data.tags.indexOf(tag) === -1
      }.bind(this))
      .sort(function(a, b) {
        return tagCount[b] - tagCount[a]
      })
      .slice(0, 5)
    
    this.setData({
      tagSuggestions: suggestions,
      showTagSuggestions: suggestions.length > 0
    })
  },

  // 获取标签推荐
  getTagSuggestions: function(input) {
    var notes = childStorage.get('notes') || []
    var tagCount = {}
    
    // 统计所有标签使用次数
    notes.forEach(function(note) {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(function(tag) {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })
    
    // 过滤匹配的标签
    var suggestions = Object.keys(tagCount)
      .filter(function(tag) {
        return tag.indexOf(input) > -1 && this.data.tags.indexOf(tag) === -1
      }.bind(this))
      .sort(function(a, b) {
        return tagCount[b] - tagCount[a]
      })
      .slice(0, 5)
    
    this.setData({
      tagSuggestions: suggestions,
      showTagSuggestions: suggestions.length > 0
    })
  },

  // 选择推荐标签
  selectTagSuggestion: function(e) {
    var tag = e.currentTarget.dataset.tag
    var tags = this.data.tags
    
    if (tags.length >= 5) {
      wx.showToast({ title: '最多5个标签', icon: 'none' })
      return
    }
    
    if (tags.indexOf(tag) === -1) {
      tags.push(tag)
      this.setData({ 
        tags: tags, 
        tagInput: '',
        showTagSuggestions: false,
        tagSuggestions: []
      })
    }
  },

  // 隐藏标签推荐
  hideTagSuggestions: function() {
    var that = this
    setTimeout(function() {
      that.setData({ showTagSuggestions: false })
    }, 200)
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

  // 开始排序
  startSort: function(e) {
    var index = e.currentTarget.dataset.index
    wx.vibrateShort()
    this.setData({ 
      isSorting: true, 
      sortIndex: index,
      sortStartX: 0,
      sortStartY: 0
    })
  },

  // 照片触摸开始
  onPhotoTouchStart: function(e) {
    if (!this.data.isSorting) return
    this.setData({
      sortStartX: e.touches[0].clientX,
      sortStartY: e.touches[0].clientY
    })
  },

  // 照片触摸移动
  onPhotoTouchMove: function(e) {
    if (!this.data.isSorting || this.data.sortIndex < 0) return
    
    var deltaX = e.touches[0].clientX - this.data.sortStartX
    var deltaY = e.touches[0].clientY - this.data.sortStartY
    
    // 计算移动距离，判断是否需要交换位置
    if (Math.abs(deltaX) > 80 || Math.abs(deltaY) > 80) {
      var images = this.data.images.slice()
      var currentIndex = this.data.sortIndex
      var targetIndex = -1
      
      if (deltaX > 80 && currentIndex < images.length - 1) {
        targetIndex = currentIndex + 1
      } else if (deltaX < -80 && currentIndex > 0) {
        targetIndex = currentIndex - 1
      }
      
      if (targetIndex >= 0) {
        // 交换位置
        var temp = images[currentIndex]
        images[currentIndex] = images[targetIndex]
        images[targetIndex] = temp
        
        this.setData({ 
          images: images,
          sortIndex: targetIndex,
          sortStartX: e.touches[0].clientX,
          sortStartY: e.touches[0].clientY
        })
        
        wx.vibrateShort()
      }
    }
  },

  // 照片触摸结束
  onPhotoTouchEnd: function() {
    // 不立即结束排序模式，让用户可以继续拖动其他照片
  },

  // 完成排序
  finishSort: function() {
    this.setData({ 
      isSorting: false, 
      sortIndex: -1 
    })
    wx.showToast({ title: '排序完成', icon: 'success' })
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

    // 上传语音文件
    var saveVoice = function(callback) {
      if (!that.data.voicePath) {
        callback('')
        return
      }
      
      // 如果是本地临时文件，需要上传到云存储
      if (that.data.voicePath.startsWith('http://tmp/') || that.data.voicePath.startsWith('wxfile://')) {
        wx.cloud.uploadFile({
          cloudPath: 'notes/voice/' + Date.now() + '.mp3',
          filePath: that.data.voicePath,
          success: function(res) {
            callback(res.fileID)
          },
          fail: function() {
            callback(that.data.voicePath)
          }
        })
      } else {
        callback(that.data.voicePath)
      }
    }

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
      saveVoice(function(voiceFileID) {
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
            voice: voiceFileID,
            visibility: visibility,
            visibleTo: visibleTo,
            updateTime: new Date().toISOString()
          })

          wx.disableAlertBeforeUnload()
          wx.hideLoading()
          wx.showToast({ title: '更新成功', icon: 'success' })
          that.clearDraft()
          that._isSaving = true
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
            voice: voiceFileID,
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
          that.clearDraft()
          that._isSaving = true

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
    })
  }
})
