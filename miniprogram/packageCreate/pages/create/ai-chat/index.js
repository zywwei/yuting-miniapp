var aiManager = require('/packageCreate/utils/ai-manager.js')
var childStorage = require('/utils/child-storage.js')

// 常用表情列表
var EMOJI_LIST = [
  '😊', '😄', '😍', '🥰', '😎', '🤔', '😅', '😢', '😭', '😡',
  '👍', '👎', '👏', '🙏', '💪', '🎉', '🎊', '✨', '🌟', '⭐',
  '❤️', '💕', '💖', '💗', '💝', '🔥', '💯', '✅', '❌', '⚠️',
  '📚', '📖', '✏️', '📝', '🎨', '🎭', '🎪', '🎠', '🎡', '🎢',
  '🦷', '👦', '👧', '👶', '🧒', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '🏠', '🏫', '🌳'
]

// 消息ID计数器
var messageIdCounter = 0

Page({
  data: {
    isConfigured: false,
    modelInfo: {
      icon: '🤖',
      name: 'AI助手'
    },
    currentSubModelName: '',
    currentTemplateName: '通用助手',
    messages: [],
    inputValue: '',
    selectedImage: '',
    loading: false,
    loadingText: '思考中...',
    scrollToView: '',
    currentSessionId: '',
    sessions: [],
    filteredSessions: [],
    showSessionModal: false,
    showEmojiBar: false,
    emojiList: EMOJI_LIST,
    inputFocus: false,
    isRecording: false,
    showActionModal: false,
    actionMessage: {},
    searchKeyword: '',
    totalSessions: 0,
    totalMessages: 0,
    totalTokens: 0,
    hasMoreSessions: false,
    loadingSessions: false,
    sessionPage: 1,
    loadingHistory: false,
    // 快速切换相关
    showQuickSwitchModal: false,
    quickSwitchTab: 'template',
    allProviders: [],
    currentProvider: '',
    currentProviderModels: [],
    currentModelKey: '',
    templateList: [],
    currentTemplateKey: 'default',
    expandProvider: false
  },

  onLoad: function() {
    this.checkConfig()
    this.initSession()
  },

  onShow: function() {
    this.setThemeColor()
    this.checkConfig()
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  // 检查配置
  checkConfig: function() {
    var that = this
    var isConfigured = aiManager.isConfigured()
    var modelInfo = aiManager.getCurrentModelInfo()
    
    // 获取所有供应商（直接从MODELS获取，不依赖配置）
    var models = aiManager.getModels()
    var allProviders = []
    var templateList = []
    
    // 构建供应商列表
    for (var key in models) {
      if (models[key].subModels && models[key].subModels.length > 0) {
        allProviders.push({
          key: key,
          name: models[key].name,
          icon: models[key].icon,
          color: models[key].color,
          description: models[key].description,
          configured: false, // 后面根据配置更新
          subModels: models[key].subModels || []
        })
      }
    }
    
    // 获取提示词模板
    var templates = aiManager.getPromptTemplates()
    for (var key in templates) {
      templateList.push({
        key: key,
        name: templates[key].name,
        icon: templates[key].icon,
        desc: templates[key].desc || ''
      })
    }
    
    // 先设置基础数据
    that.setData({
      isConfigured: isConfigured,
      modelInfo: modelInfo ? {
        icon: modelInfo.info.icon,
        name: modelInfo.info.name
      } : that.data.modelInfo,
      allProviders: allProviders,
      templateList: templateList
    })
    
    // 获取配置（可能是异步的）
    aiManager.getConfig().then(function(config) {
      var configuredModels = config.models || {}
      var currentProvider = config.currentModel || 'minimax'
      var currentTemplateKey = config.promptTemplate || 'default'
      var currentTemplateName = '通用助手'
      
      // 更新供应商的配置状态
      var updatedProviders = allProviders.map(function(provider) {
        return {
          key: provider.key,
          name: provider.name,
          icon: provider.icon,
          color: provider.color,
          description: provider.description,
          configured: !!(configuredModels[provider.key] && configuredModels[provider.key].apiKey),
          subModels: provider.subModels
        }
      })
      
      // 获取当前供应商的子模型
      var currentProviderModels = []
      var currentSubModelName = ''
      var currentModelKey = ''
      
      if (models[currentProvider] && models[currentProvider].subModels) {
        currentProviderModels = models[currentProvider].subModels
        var subModel = configuredModels[currentProvider] ? configuredModels[currentProvider].model : ''
        
        if (subModel) {
          for (var i = 0; i < currentProviderModels.length; i++) {
            if (currentProviderModels[i].key === subModel) {
              currentSubModelName = currentProviderModels[i].name
              currentModelKey = subModel
              break
            }
          }
        }
        
        if (!currentModelKey && currentProviderModels.length > 0) {
          currentModelKey = currentProviderModels[0].key
          currentSubModelName = currentProviderModels[0].name
        }
      }
      
      // 如果有自定义提示词，添加到列表
      if (config.systemPrompt && config.systemPrompt.trim()) {
        templateList.unshift({
          key: 'custom',
          name: '自定义提示词',
          icon: '✏️',
          desc: config.systemPrompt.substring(0, 50) + (config.systemPrompt.length > 50 ? '...' : '')
        })
      }
      
      // 获取当前模板名称
      for (var i = 0; i < templateList.length; i++) {
        if (templateList[i].key === currentTemplateKey) {
          currentTemplateName = templateList[i].name
          break
        }
      }
      
      that.setData({
        allProviders: updatedProviders,
        currentProvider: currentProvider,
        currentProviderModels: currentProviderModels,
        currentModelKey: currentModelKey,
        currentSubModelName: currentSubModelName,
        currentTemplateKey: currentTemplateKey,
        currentTemplateName: currentTemplateName,
        isConfigured: !!(configuredModels[currentProvider] && configuredModels[currentProvider].apiKey),
        modelInfo: {
          icon: (models[currentProvider] || MODELS['minimax']).icon,
          name: (models[currentProvider] || MODELS['minimax']).name
        }
      })
    }).catch(function(err) {
      console.error('获取配置失败:', err)
      // 使用默认值
      var defaultProvider = 'minimax'
      var defaultModels = models[defaultProvider] ? models[defaultProvider].subModels || [] : []
      
      that.setData({
        currentProvider: defaultProvider,
        currentProviderModels: defaultModels,
        currentModelKey: defaultModels.length > 0 ? defaultModels[0].key : '',
        currentSubModelName: defaultModels.length > 0 ? defaultModels[0].name : '',
        currentTemplateKey: 'default',
        currentTemplateName: '通用助手'
      })
    })
  },

  // 初始化会话
  initSession: function() {
    var sessionId = aiManager.getCurrentSessionId()
    this.setData({ currentSessionId: sessionId })
    this.loadHistory()
  },

  // 加载历史消息
  loadHistory: function() {
    var that = this
    
    that.setData({ loadingHistory: true })
    
    aiManager.getHistory(this.data.currentSessionId).then(function(result) {
      var messages = result.list.map(function(item, index) {
        messageIdCounter++
        return {
          id: 'msg_' + messageIdCounter,
          role: item.role,
          content: item.content,
          image: item.image || null,
          thinking: item.thinking || null,
          showThinking: false,
          timeStr: that.formatTime(item.createTime)
        }
      })
      
      that.setData({ 
        messages: messages,
        loadingHistory: false
      })
      that.scrollToBottom()
    }).catch(function(err) {
      console.error('加载历史消息失败:', err)
      that.setData({ loadingHistory: false })
      wx.showToast({
        title: '加载历史消息失败',
        icon: 'none'
      })
    })
  },

  // 格式化时间
  formatTime: function(time) {
    if (!time) return ''
    
    var date = new Date(time)
    var hours = date.getHours().toString().padStart(2, '0')
    var minutes = date.getMinutes().toString().padStart(2, '0')
    
    return hours + ':' + minutes
  },

  // 显示快速切换弹窗
  showQuickSwitch: function() {
    var that = this
    
    // 如果数据还没加载，先加载数据
    if (that.data.allProviders.length === 0 || that.data.templateList.length === 0) {
      that.loadQuickSwitchData()
    }
    
    // 获取当前配置，检查是否有自定义提示词
    aiManager.getConfig().then(function(config) {
      var templateList = []
      
      // 获取提示词模板
      var templates = aiManager.getPromptTemplates()
      for (var key in templates) {
        templateList.push({
          key: key,
          name: templates[key].name,
          icon: templates[key].icon,
          desc: templates[key].desc || ''
        })
      }
      
      // 如果有自定义提示词，添加到列表
      if (config.systemPrompt && config.systemPrompt.trim()) {
        templateList.unshift({
          key: 'custom',
          name: '自定义提示词',
          icon: '✏️',
          desc: config.systemPrompt.substring(0, 50) + (config.systemPrompt.length > 50 ? '...' : '')
        })
      }
      
      that.setData({
        templateList: templateList,
        showQuickSwitchModal: true
      })
    }).catch(function(err) {
      console.error('获取配置失败:', err)
      that.setData({ showQuickSwitchModal: true })
    })
  },

  // 加载快速切换数据
  loadQuickSwitchData: function() {
    var that = this
    var models = aiManager.getModels()
    var allProviders = []
    
    // 构建供应商列表
    for (var key in models) {
      if (models[key].subModels && models[key].subModels.length > 0) {
        allProviders.push({
          key: key,
          name: models[key].name,
          icon: models[key].icon,
          color: models[key].color,
          description: models[key].description,
          configured: false,
          subModels: models[key].subModels || []
        })
      }
    }
    
    that.setData({ allProviders: allProviders })
  },

  // 隐藏快速切换弹窗
  hideQuickSwitch: function() {
    this.setData({ 
      showQuickSwitchModal: false,
      expandProvider: false
    })
  },

  // 切换快速切换Tab
  switchQuickTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ quickSwitchTab: tab })
  },

  // 快速切换供应商
  quickSwitchProvider: function(e) {
    var that = this
    var key = e.currentTarget.dataset.key
    var models = aiManager.getModels()
    
    // 如果点击的是当前供应商，切换展开/折叠
    if (key === this.data.currentProvider) {
      this.setData({
        expandProvider: !this.data.expandProvider
      })
      return
    }
    
    // 检查是否已配置
    aiManager.getConfig().then(function(config) {
      if (!config.models || !config.models[key] || !config.models[key].apiKey) {
        wx.showToast({
          title: '请先配置该供应商的API Key',
          icon: 'none'
        })
        return
      }
      
      // 获取该供应商的子模型
      var providerModels = models[key] ? models[key].subModels || [] : []
      var defaultModel = providerModels.length > 0 ? providerModels[0].key : ''
      
      // 切换供应商
      that.setData({
        currentProvider: key,
        currentModelKey: defaultModel,
        modelInfo: {
          icon: models[key].icon,
          name: models[key].name
        },
        expandProvider: true
      })

      // 保存供应商切换到云端
      var saveConfig = {
        currentModel: key,
        models: config.models || {}
      }
      aiManager.saveConfig(saveConfig)
    })
  },

  // 快速切换模型
  quickSwitchModel: function(e) {
    var that = this
    var key = e.currentTarget.dataset.key
    var name = e.currentTarget.dataset.name
    
    // 保存配置
    aiManager.getConfig().then(function(config) {
      var currentProvider = that.data.currentProvider
      var saveConfig = {
        currentModel: currentProvider,
        models: {}
      }
      saveConfig.models[currentProvider] = config.models[currentProvider] || {}
      saveConfig.models[currentProvider].model = key
      
      aiManager.saveConfig(saveConfig).then(function() {
        that.setData({
          currentModelKey: key,
          currentSubModelName: name,
          showQuickSwitchModal: false,
          expandProvider: false
        })
        
        wx.showToast({
          title: '已切换到' + name,
          icon: 'success'
        })
      })
    })
  },

  // 快速切换助手类型
  quickSwitchTemplate: function(e) {
    var that = this
    var key = e.currentTarget.dataset.key
    var name = e.currentTarget.dataset.name
    
    // 保存配置
    aiManager.getConfig().then(function(config) {
      var saveConfig = {
        promptTemplate: key
      }
      
      aiManager.saveConfig(saveConfig).then(function() {
        that.setData({
          currentTemplateKey: key,
          currentTemplateName: name,
          showQuickSwitchModal: false
        })
        
        wx.showToast({
          title: '已切换到' + name,
          icon: 'success'
        })
      })
    })
  },

  // 滚动到底部
  scrollToBottom: function() {
    var that = this
    setTimeout(function() {
      that.setData({ scrollToView: 'msg-bottom' })
    }, 100)
  },

  // 输入消息
  onInput: function(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 选择图片
  chooseImage: function() {
    var that = this
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath
        that.setData({ selectedImage: tempFilePath })
      }
    })
  },

  // 移除选中的图片
  removeImage: function() {
    this.setData({ selectedImage: '' })
  },

  // 预览图片
  previewImage: function(e) {
    var url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url],
      current: url
    })
  },

  // 发送消息
  sendMessage: function(options) {
    var that = this
    var message = options && options.content ? options.content : this.data.inputValue.trim()
    var image = options && options.image ? options.image : this.data.selectedImage
    var isRetry = options && options.isRetry
    
    if ((!message && !image) || this.data.loading) return
    
    // 添加用户消息到列表（重试时不重复添加）
    if (!isRetry) {
      messageIdCounter++
      var userMsg = {
        id: 'msg_' + messageIdCounter,
        role: 'user',
        content: message || null,
        image: image || null,
        thinking: null,
        showThinking: false,
        timeStr: this.formatTime(new Date())
      }
      
      this.setData({
        messages: this.data.messages.concat(userMsg),
        inputValue: '',
        selectedImage: ''
      })
    }
    
    this.setData({
      loading: true,
      loadingText: '思考中...'
    })
    
    this.scrollToBottom()
    
    // 如果有图片，先上传再发送
    if (image && !options) {
      this.uploadAndSend(message, image)
    } else {
      this.sendToAI(message, image)
    }
  },

  // 上传图片并发送
  uploadAndSend: function(message, imagePath) {
    var that = this
    
    // 上传图片到云存储
    wx.cloud.uploadFile({
      cloudPath: 'ai-chat-images/' + Date.now() + '.jpg',
      filePath: imagePath,
      success: function(res) {
        var fileID = res.fileID
        // 发送包含图片的消息
        that.sendToAI(message, fileID)
      },
      fail: function(err) {
        console.error('上传图片失败:', err)
        that.showError('图片上传失败，请重试')
      }
    })
  },

  // 发送到AI
  sendToAI: function(message, imageFileID) {
    var that = this
    var modelInfo = aiManager.getCurrentModelInfo()
    var model = modelInfo ? modelInfo.key : null
    
    aiManager.sendMessage(message, model, imageFileID).then(function(result) {
      messageIdCounter++
      var aiMsg = {
        id: 'msg_' + messageIdCounter,
        role: 'assistant',
        content: result.content,
        image: null,
        thinking: result.thinking || null,
        showThinking: false,
        timeStr: that.formatTime(new Date())
      }
      
      that.setData({
        messages: that.data.messages.concat(aiMsg),
        loading: false
      })
      
      that.scrollToBottom()
    }).catch(function(err) {
      that.showError('发送失败：' + (err.message || '网络错误，请稍后重试'), message, imageFileID)
    })
  },

  // 显示错误
  showError: function(msg, originalContent, originalImage) {
    messageIdCounter++
    var errorMsg = {
      id: 'msg_' + messageIdCounter,
      role: 'assistant',
      content: '❌ ' + msg,
      image: null,
      thinking: null,
      showThinking: false,
      timeStr: this.formatTime(new Date()),
      isError: true,
      originalContent: originalContent || null,
      originalImage: originalImage || null
    }
    
    this.setData({
      messages: this.data.messages.concat(errorMsg),
      loading: false
    })
    
    this.scrollToBottom()
  },

  // 快速提问
  quickQuestion: function(e) {
    var question = e.currentTarget.dataset.q
    this.setData({ inputValue: question })
    this.sendMessage()
  },

  // 切换思考过程显示
  toggleThinking: function(e) {
    var id = e.currentTarget.dataset.id
    var messages = this.data.messages.map(function(msg) {
      if (msg.id === id) {
        msg.showThinking = !msg.showThinking
      }
      return msg
    })
    
    this.setData({ messages: messages })
  },

  // 新建会话
  newSession: function() {
    var sessionId = aiManager.createSession()
    aiManager.setCurrentSessionId(sessionId)
    
    this.setData({
      currentSessionId: sessionId,
      messages: []
    })
    
    wx.showToast({
      title: '新会话已创建',
      icon: 'success'
    })
  },

  // 显示会话列表
  showSessions: function() {
    var that = this
    
    that.setData({ 
      showSessionModal: true,
      sessionPage: 1,
      searchKeyword: '',
      loadingSessions: true
    })
    
    aiManager.getSessions().then(function(sessions) {
      var totalMessages = 0
      var totalTokens = 0
      
      var formattedSessions = sessions.map(function(session) {
        totalMessages += session.messageCount || 0
        totalTokens += session.totalTokens || 0
        
        return {
          sessionId: session.sessionId,
          lastMessage: session.lastMessage || '新会话',
          messageCount: session.messageCount || 0,
          modelName: session.modelName || '未知模型',
          totalTokens: session.totalTokens || 0,
          timeStr: that.formatDate(session.lastTime)
        }
      })
      
      that.setData({
        sessions: formattedSessions,
        filteredSessions: formattedSessions,
        totalSessions: formattedSessions.length,
        totalMessages: totalMessages,
        totalTokens: that.formatTokens(totalTokens),
        hasMoreSessions: false,
        loadingSessions: false
      })
    }).catch(function(err) {
      console.error('获取会话列表失败:', err)
      that.setData({ loadingSessions: false })
      wx.showToast({
        title: '获取会话列表失败',
        icon: 'none'
      })
    })
  },

  // 搜索会话
  onSearchInput: function(e) {
    var keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterSessions(keyword)
  },

  // 过滤会话
  filterSessions: function(keyword) {
    var sessions = this.data.sessions
    
    if (!keyword) {
      this.setData({ filteredSessions: sessions })
      return
    }
    
    var filtered = sessions.filter(function(session) {
      return session.lastMessage.indexOf(keyword) !== -1 || 
             session.modelName.indexOf(keyword) !== -1
    })
    
    this.setData({ filteredSessions: filtered })
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({ 
      searchKeyword: '',
      filteredSessions: this.data.sessions
    })
  },

  // 加载更多会话
  loadMoreSessions: function() {
    if (this.data.loadingSessions || !this.data.hasMoreSessions) return
    
    this.setData({ 
      sessionPage: this.data.sessionPage + 1,
      loadingSessions: true
    })
    
    // 实际项目中这里应该调用分页接口
    // 暂时模拟加载完成
    this.setData({ 
      hasMoreSessions: false,
      loadingSessions: false
    })
  },

  // 格式化token数量
  formatTokens: function(tokens) {
    if (!tokens) return '0'
    if (tokens >= 1000000) {
      return (tokens / 1000000).toFixed(1) + 'M'
    } else if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'K'
    }
    return tokens.toString()
  },

  // 格式化日期
  formatDate: function(time) {
    if (!time) return ''
    
    var date = new Date(time)
    var now = new Date()
    var month = (date.getMonth() + 1).toString().padStart(2, '0')
    var day = date.getDate().toString().padStart(2, '0')
    var hours = date.getHours().toString().padStart(2, '0')
    var minutes = date.getMinutes().toString().padStart(2, '0')
    
    // 今天的消息只显示时间
    if (date.toDateString() === now.toDateString()) {
      return hours + ':' + minutes
    }
    
    // 今年的消息显示月日
    if (date.getFullYear() === now.getFullYear()) {
      return month + '-' + day + ' ' + hours + ':' + minutes
    }
    
    // 其他显示年月日
    return date.getFullYear() + '-' + month + '-' + day
  },

  // 隐藏会话列表
  hideSessions: function() {
    this.setData({ showSessionModal: false })
  },

  // 阻止冒泡
  stopPropagation: function() {
    // 空函数，用于阻止事件冒泡
  },

  // 切换会话
  switchSession: function(e) {
    var sessionId = e.currentTarget.dataset.id
    aiManager.setCurrentSessionId(sessionId)
    
    this.setData({
      currentSessionId: sessionId,
      showSessionModal: false,
      loadingHistory: true,
      messages: []
    })
    
    this.loadHistory()
  },

  // 删除会话
  deleteSession: function(e) {
    var that = this
    var sessionId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个会话吗？',
      success: function(res) {
        if (res.confirm) {
          aiManager.deleteSession(sessionId).then(function() {
            wx.showToast({
              title: '会话已删除',
              icon: 'success'
            })
            
            // 如果删除的是当前会话，创建新会话
            if (sessionId === that.data.currentSessionId) {
              that.newSession()
            }
            
            // 刷新会话列表
            that.showSessions()
          }).catch(function(err) {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 切换表情栏
  toggleEmojiBar: function() {
    this.setData({ 
      showEmojiBar: !this.data.showEmojiBar,
      inputFocus: false
    })
  },

  // 插入表情
  insertEmoji: function(e) {
    var emoji = e.currentTarget.dataset.emoji
    this.setData({
      inputValue: this.data.inputValue + emoji,
      showEmojiBar: false,
      inputFocus: true
    })
  },

  // 开始录音
  startRecording: function() {
    var that = this
    this.setData({ isRecording: true })
    
    // 开始录音
    this.recorderManager = wx.getRecorderManager()
    this.recorderManager.onStart(function() {
      console.log('录音开始')
    })
    
    this.recorderManager.onStop(function(res) {
      console.log('录音结束', res)
      that.setData({ isRecording: false })
      
      // 语音转文字（这里需要接入语音识别API）
      // 暂时显示提示
      wx.showToast({
        title: '语音识别功能开发中',
        icon: 'none'
      })
    })
    
    this.recorderManager.onError(function(err) {
      console.error('录音错误', err)
      that.setData({ isRecording: false })
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
    })
    
    this.recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'aac'
    })
  },

  // 停止录音
  stopRecording: function() {
    if (this.data.isRecording && this.recorderManager) {
      this.recorderManager.stop()
    }
  },

  // 取消录音
  cancelRecording: function() {
    if (this.data.isRecording && this.recorderManager) {
      this.recorderManager.stop()
      this.setData({ isRecording: false })
      wx.showToast({
        title: '已取消录音',
        icon: 'none'
      })
    }
  },

  // 显示消息操作菜单
  showMessageActions: function(e) {
    var id = e.currentTarget.dataset.id
    var role = e.currentTarget.dataset.role
    var content = e.currentTarget.dataset.content
    
    // 找到对应的消息
    var message = this.data.messages.find(function(msg) {
      return msg.id === id
    })
    
    this.setData({
      showActionModal: true,
      actionMessage: {
        id: id,
        role: role,
        content: content,
        image: message ? message.image : null
      }
    })
  },

  // 隐藏消息操作菜单
  hideMessageActions: function() {
    this.setData({
      showActionModal: false,
      actionMessage: {}
    })
  },

  // 复制消息
  copyMessage: function(e) {
    var content = e.currentTarget.dataset.content
    
    if (!content) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      })
      return
    }
    
    wx.setClipboardData({
      data: content,
      success: function() {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
    
    this.hideMessageActions()
  },

  // 重新发送消息
  resendMessage: function(e) {
    var content = e.currentTarget.dataset.content
    var image = e.currentTarget.dataset.image
    
    this.hideMessageActions()
    
    // 直接发送，不重复添加用户消息
    this.sendMessage({
      content: content,
      image: image,
      isRetry: true
    })
  },

  // 重试错误消息
  retryMessage: function(e) {
    var id = e.currentTarget.dataset.id
    
    // 找到错误消息，获取原始内容
    var errorMsg = this.data.messages.find(function(msg) {
      return msg.id === id
    })
    
    if (errorMsg && errorMsg.originalContent) {
      // 直接发送，不重复添加用户消息
      this.sendMessage({
        content: errorMsg.originalContent,
        image: errorMsg.originalImage,
        isRetry: true
      })
    }
  },

  // 删除消息
  deleteMessage: function(e) {
    var id = e.currentTarget.dataset.id
    var that = this
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      success: function(res) {
        if (res.confirm) {
          var messages = that.data.messages.filter(function(msg) {
            return msg.id !== id
          })
          
          that.setData({ messages: messages })
          
          wx.showToast({
            title: '消息已删除',
            icon: 'success'
          })
        }
        
        that.hideMessageActions()
      }
    })
  },

  // 跳转设置
  goSettings: function() {
    wx.navigateTo({
      url: '/packageCreate/pages/create/ai-settings/index'
    })
  }
})
