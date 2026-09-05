var aiManager = getApp().globalData.aiManager
var childStorage = getApp().globalData.childStorage
var auth = require('../../../../utils/auth.js')
var contextDetector = require('../../../utils/ai-context-detector')
var skillsManager = require('../../../utils/ai-skills')
var markdown = require('../../../utils/markdown')
var speakTool = require('../../../../utils/speak')
const { previewImage: previewImageHelper } = getApp().globalData.pageHelpers

// 常用表情列表
// 表情分类
var EMOJI_CATEGORIES = {
  'face': {
    name: '表情',
    list: ['😊', '😄', '😍', '🥰', '😎', '🤔', '😅', '😢', '😭', '😡', '🤗', '😏', '😴', '🤮', '🥳']
  },
  'gesture': {
    name: '手势',
    list: ['👍', '👎', '👏', '🙏', '💪', '✌️', '🤝', '👋', '👀', '🤙']
  },
  'heart': {
    name: '爱心',
    list: ['❤️', '💕', '💖', '💗', '💝', '💓', '💞', '💘', '💟', '♥️']
  },
  'symbol': {
    name: '符号',
    list: ['🔥', '💯', '✅', '❌', '⚠️', '✨', '🌟', '⭐', '🎉', '🎊']
  },
  'object': {
    name: '物品',
    list: ['📚', '📖', '✏️', '📝', '🎨', '🎭', '🎪', '🎠', '🎡', '🎢']
  },
  'people': {
    name: '人物',
    list: ['🦷', '👦', '👧', '👶', '🧒', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '🏠', '🏫', '🌳']
  }
}

// 默认表情列表（兼容旧代码）
var EMOJI_LIST = EMOJI_CATEGORIES.face.list

// 消息ID计数器
var messageIdCounter = 0

// 全量模型列表每页展示条数（滚动到底加载下一页）
var ALL_MODELS_PAGE_SIZE = 50

// AI画画预设选项（画幅/清晰度，直接点选）
var ASPECT_RATIO_OPTIONS = [
  { key: '1:1', name: '1:1 方图' },
  { key: '4:3', name: '4:3 横版' },
  { key: '3:4', name: '3:4 竖版' },
  { key: '16:9', name: '16:9 宽屏' },
  { key: '9:16', name: '9:16 全屏' }
]
var QUALITY_OPTIONS = [
  { key: 'low', name: '低' },
  { key: 'standard', name: '标准' },
  { key: 'high', name: '高清' },
  { key: 'auto', name: '自动' }
]
// 支持全量模型列表同步的供应商
var DYNAMIC_MODEL_PROVIDERS = ['openrouter', 'kilo', 'opencode']
// 图片生成推荐模型（按此顺序展示，其余收进"更多模型"）
var RECOMMENDED_IMAGE_MODELS = [
  'openai/gpt-image-2',
  'google/gemini-2.5-flash-image',
  'google/gemini-3.1-flash-image',
  'openai/gpt-image-1',
  'bytedance-seed/seedream-4.5',
  'qwen/qwen-image-3-pro',
  'black-forest-labs/flux.2-pro',
  'x-ai/grok-imagine-image-2.0'
]

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
    inputHeight: 36, // 输入框高度，自适应
    selectedImages: [],
    loading: false,
    loadingText: '思考中...',
    scrollToView: '',
    currentSessionId: '',
    sessions: [],
    filteredSessions: [],
    showSessionModal: false,
    showEmojiBar: false,
    showMorePanel: false,
    emojiList: EMOJI_LIST,
    emojiCategories: EMOJI_CATEGORIES,
    emojiCategoryKeys: Object.keys(EMOJI_CATEGORIES),
    currentEmojiCategory: 'face',
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
    expandProvider: false,
    // 流式思考相关
    streamThinkingEnabled: false,
    currentTaskId: null,
    currentThinkingContent: '',
    currentSpeakingId: null, // 当前正在朗读的消息ID
    isPageUnloaded: false, // 页面是否已卸载
    // 键盘高度
    keyboardHeight: 0,
    // 全量模型选择（供应商模型列表同步）
    showAllModelsModal: false,
    allModelsLoading: false,
    allModelsList: [],
    allModelsFiltered: [],
    allModelsFilter: 'all',
    allModelsSearch: '',
    allModelsTotal: 0,
    allModelsShown: 0,
    allModelsPage: 1,
    allModelsRefreshing: false,
    _allModelsProvider: '',
    // AI画画
    showDrawModal: false,
    drawModels: [],
    drawRecommendModels: [],
    drawMoreModels: [],
    showDrawModelList: false,
    showDrawMoreModels: false,
    drawModelsLoading: false,
    drawModelsError: false,
    drawModelKey: '',
    drawModelName: '',
    aspectRatioOptions: ASPECT_RATIO_OPTIONS,
    qualityOptions: QUALITY_OPTIONS,
    drawAspectRatio: '1:1',
    drawQuality: 'standard',
    drawPrompt: '',
    drawing: false,
    drawWaitingText: '',
    drawRefImages: [],
    // 欢迎消息
    welcomeTitle: '你好，我是AI助手',
    quickQuestions: [],
    // 上下文统计
    contextTokens: 0,
    outputTokens: 0,
    totalTokensUsed: 0,
    estimatedCost: '0.0000',
    costModelName: '',
    showContextStats: false,
    modelPrices: null,
    // 数据上下文浮窗
    showContextBanner: false,
    contextBannerItems: [],
    contextDataTypes: [],
    pendingExtraContext: null,
    // Skills相关
    activeSkill: null,
    showSkillBar: false,
    showSkillSearch: false,
    skillSearchResults: [],
    skillSearchQuery: '',
    // 技能列表
    skillList: [],
    skillGrouped: [],
    skillFilterKeyword: '',
    showSkillModal: false,
    skillActiveTab: 'all',
    skillCategories: [],
    filteredSkillList: []
  },

  onLoad: function() {
    var that = this
    this.checkConfig()
    this.initSession()
    // 初始化语音工具
    try {
      speakTool.preload()
      var initEngineList = speakTool.getEngineList()
      var initVoiceList = speakTool.getVoiceList()
      var initVoice = speakTool.getCurrentVoice()
      var initEngineName = '语音设置'
      var initVoiceName = ''
      for (var i = 0; i < initEngineList.length; i++) {
        if (initEngineList[i].active) { initEngineName = initEngineList[i].name; break }
      }
      for (var j = 0; j < initVoiceList.length; j++) {
        if (initVoiceList[j].id === initVoice) { initVoiceName = initVoiceList[j].name; break }
      }
      this.setData({ currentEngineName: initEngineName, currentVoiceName: initVoiceName })
    } catch (e) { console.error('speakTool.preload失败:', e) }
    // 读取流式思考开关状态
    var streamEnabled = childStorage.get('streamThinkingEnabled') || false
    this.setData({ streamThinkingEnabled: streamEnabled })
    // 恢复激活的技能状态
    this.restoreActiveSkill()
    // 从云端同步技能数据
    skillsManager.syncFromCloud()
    // 生成欢迎消息和快捷问题
    this.generateWelcomeContent()
    
    // 监听键盘高度变化（保存引用以便onUnload移除）
    this._onKeyboardHeightChange = function(res) {
      that.setData({ keyboardHeight: res.height })
    }
    wx.onKeyboardHeightChange(this._onKeyboardHeightChange)
  },

  onShow: function() {
    this.setThemeColor()
    this.checkConfig()
  },

  // 生成欢迎消息和快捷问题
  generateWelcomeContent: function() {
    var hour = new Date().getHours()
    var welcomeTitle = '你好，我是AI助手'
    var quickQuestions = []
    
    // 根据时间段生成不同的欢迎语
    if (hour < 6) {
      welcomeTitle = '夜深了，有什么我可以帮你的吗？'
    } else if (hour < 9) {
      welcomeTitle = '早上好！新的一天开始了'
    } else if (hour < 12) {
      welcomeTitle = '上午好！有什么我可以帮你的吗？'
    } else if (hour < 14) {
      welcomeTitle = '中午好！休息一下吧'
    } else if (hour < 18) {
      welcomeTitle = '下午好！有什么我可以帮你的吗？'
    } else if (hour < 22) {
      welcomeTitle = '晚上好！今天过得怎么样？'
    } else {
      welcomeTitle = '夜深了，有什么我可以帮你的吗？'
    }
    
    // 生成快捷问题（从预设中随机选择4个）
    var allQuestions = [
      { q: '我最近的学习情况怎么样？', label: '学习情况', icon: '📚' },
      { q: '我的刷牙习惯坚持得怎么样？', label: '刷牙习惯', icon: '🦷' },
      { q: '给我讲个有趣的故事吧', label: '讲个故事', icon: '📖' },
      { q: '我的摆摊生意怎么样？', label: '摆摊经营', icon: '🏪' },
      { q: '帮我画一幅画', label: '画画助手', icon: '🎨' },
      { q: '今天有什么作业需要帮忙吗？', label: '作业帮忙', icon: '✏️' },
      { q: '给我出一道数学题', label: '数学练习', icon: '🔢' },
      { q: '推荐一本好看的书', label: '推荐阅读', icon: '📕' }
    ]
    
    // 使用Fisher-Yates洗牌算法随机选择4个
    for (var i = allQuestions.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var temp = allQuestions[i]
      allQuestions[i] = allQuestions[j]
      allQuestions[j] = temp
    }
    quickQuestions = allQuestions.slice(0, 4)
    
    this.setData({
      welcomeTitle: welcomeTitle,
      quickQuestions: quickQuestions
    })
  },

  onUnload: function() {
    // 标记页面已卸载
    this._isPageUnloaded = true
    
    // 移除键盘高度监听
    if (this._onKeyboardHeightChange) {
      wx.offKeyboardHeightChange(this._onKeyboardHeightChange)
    }
    
    // 页面卸载时清除所有定时器和 watcher
    if (this._thinkingPollTimer) {
      clearInterval(this._thinkingPollTimer)
    }
    if (this._drawTimer) {
      clearInterval(this._drawTimer)
      this._drawTimer = null
    }
    if (this._thinkingWatcher) {
      this._thinkingWatcher.close()
    }
    if (this._contextBannerTimer) {
      clearTimeout(this._contextBannerTimer)
    }
    // 停止音频播放
    if (this._audioContext) {
      this._audioContext.stop()
      this._audioContext = null
    }
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
          hasDynamicModels: DYNAMIC_MODEL_PROVIDERS.indexOf(key) > -1,
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
    
    // 获取配置（ai-manager已有5分钟缓存，无需额外Promise缓存）
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
          // P0-7 配套：非 admin 配置为脱敏版，已配置状态以服务端 hasKeyByProvider 为准
          configured: !!(configuredModels[provider.key] && configuredModels[provider.key].apiKey) || !!(config.hasKeyByProvider && config.hasKeyByProvider[provider.key]),
          hasDynamicModels: provider.hasDynamicModels,
          subModels: provider.subModels
        }
      })
      
      // 排序：已配置的供应商放在前面，当前选中的排第一
      updatedProviders.sort(function(a, b) {
        // 当前选中的排第一
        if (a.key === currentProvider) return -1
        if (b.key === currentProvider) return 1
        // 已配置的排在未配置之前
        if (a.configured && !b.configured) return -1
        if (!a.configured && b.configured) return 1
        return 0
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
          // 全量模型弹窗选中的 id 不在本地预设列表时，用 id 兜底展示（所见即所用）
          if (!currentModelKey) {
            currentModelKey = subModel
            currentSubModelName = subModel
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
        // P0-7 配套：非 admin 配置为脱敏版，已配置状态以服务端 hasKeyByProvider 为准
        isConfigured: !!(configuredModels[currentProvider] && configuredModels[currentProvider].apiKey) || !!(config.hasKeyByProvider && config.hasKeyByProvider[currentProvider]),
        modelInfo: {
          icon: (models[currentProvider] || models['minimax'] || { icon: '🤖' }).icon,
          name: (models[currentProvider] || models['minimax'] || { name: 'AI助手' }).name
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
    this.loadTokenStats(sessionId)
  },

  // 加载历史消息
  loadHistory: function() {
    var that = this
    
    that.setData({ loadingHistory: true })
    
    aiManager.getHistory(this.data.currentSessionId).then(function(result) {
      var messages = result.list.map(function(item, index) {
        messageIdCounter++
        // 云端图片消息字段为 imageFileID（AI生成图片），本地缓存为 image
        var image = item.imageFileID || item.image || null
        // 生成图判定：云端有 imageFileID，或本地缓存的云存储图片（用户发的图 role 为 user，可区分）
        var isGenerated = !!(image && item.role === 'assistant' && (item.imageFileID || image.indexOf('cloud://') === 0))
        return {
          id: 'msg_' + messageIdCounter,
          role: item.role,
          content: item.content,
          richText: item.role === 'assistant' ? markdown.parseMarkdown(item.content) : '',
          image: image,
          isGenerated: isGenerated,
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
    // 检查日期是否有效
    if (isNaN(date.getTime())) return ''
    
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
          hasDynamicModels: DYNAMIC_MODEL_PROVIDERS.indexOf(key) > -1,
          subModels: models[key].subModels || []
        })
      }
    }
    
    // 获取配置并排序
    aiManager.getConfig().then(function(config) {
      var configuredModels = config.models || {}
      var currentProvider = config.currentModel || 'minimax'
      
      // 更新配置状态
      allProviders = allProviders.map(function(provider) {
        return Object.assign({}, provider, {
          configured: !!(configuredModels[provider.key] && configuredModels[provider.key].apiKey)
        })
      })
      
      // 排序：已配置的供应商放在前面，当前选中的排第一
      allProviders.sort(function(a, b) {
        if (a.key === currentProvider) return -1
        if (b.key === currentProvider) return 1
        if (a.configured && !b.configured) return -1
        if (!a.configured && b.configured) return 1
        return 0
      })
      
      that.setData({ allProviders: allProviders })
    }).catch(function() {
      that.setData({ allProviders: allProviders })
    })
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
      // 非 admin 拿到的是脱敏配置（apiKey 为空），以服务端 hasKeyByProvider 为准判断
      var hasKeyByProvider = config.hasKeyByProvider || {}
      var localConfigured = !!(config.models && config.models[key] && config.models[key].apiKey)
      if (!localConfigured && !hasKeyByProvider[key]) {
        wx.showToast({
          title: '请先配置该供应商的API Key',
          icon: 'none'
        })
        return
      }
      
      // 获取该供应商的子模型
      var provider = models[key] || {}
      var providerModels = provider.subModels || []
      var defaultModel = providerModels.length > 0 ? providerModels[0].key : ''
      
      // 切换供应商
      that.setData({
        currentProvider: key,
        currentModelKey: defaultModel,
        modelInfo: {
          icon: provider.icon || '🤖',
          name: provider.name || 'AI助手'
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
        
        // 重新计算费用
        that.estimateCost()
        
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
    // P1 修复：scroll-into-view 值恒为 'msg-bottom'，重复 setData 相同值经
    // 框架 diff 后不会触发滚动——长回复打字机期间每 15 字符调用的本方法
    // 全部无效、视图不再跟随。先置空打断相等性，下一拍设回锚点强制滚动
    this.setData({ scrollToView: '' })
    setTimeout(function() {
      that.setData({ scrollToView: 'msg-bottom' })
    }, 100)
  },

  // 输入消息
  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value,
      showMorePanel: false,
      showEmojiBar: false
    })
  },

  // 输入框行数变化
  onInputLineChange: function(e) {
    var lineCount = e.detail.lineCount || 1
    // 限制最大6行高度（每行约36rpx，与wxss中的line-height一致）
    var maxLines = 6
    var lineHeight = 36
    var height = Math.min(lineCount, maxLines) * lineHeight
    this.setData({ inputHeight: height })
  },

  // 选择图片
  chooseImage: function() {
    var that = this
    this.setData({ showMorePanel: false })
    var currentCount = this.data.selectedImages.length
    var maxCount = 9
    var remainCount = maxCount - currentCount
    
    if (remainCount <= 0) {
      wx.showToast({ title: '最多选择9张图片', icon: 'none' })
      return
    }
    
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var newImages = res.tempFiles.map(function(file) {
          return file.tempFilePath
        })
        that.setData({ 
          selectedImages: that.data.selectedImages.concat(newImages)
        })
      }
    })
  },

  // 移除选中的图片
  removeImage: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.selectedImages.filter(function(img, i) {
      return i !== index
    })
    this.setData({ selectedImages: images })
  },

  // 清空所有选中的图片
  clearImages: function() {
    this.setData({ selectedImages: [] })
  },

  // 预览图片
  previewImage: function(e) {
    var url = e.currentTarget.dataset.url
    previewImageHelper(url, [url])
  },

  // ========== 全量模型选择（供应商模型列表同步） ==========

  // 打开全量模型弹窗（data-provider 指定平台，默认当前供应商）
  showAllModels: function(e) {
    var provider = (e && e.currentTarget && e.currentTarget.dataset.provider) || this.data.currentProvider
    if (DYNAMIC_MODEL_PROVIDERS.indexOf(provider) === -1) {
      wx.showToast({ title: '该平台暂不支持模型同步', icon: 'none' })
      return
    }
    this.setData({
      showAllModelsModal: true,
      allModelsList: [],
      allModelsFiltered: [],
      allModelsSearch: '',
      allModelsFilter: 'all',
      allModelsPage: 1,
      _allModelsProvider: provider
    })
    this.fetchAllModels(provider, false)
  },

  // 拉取全量模型列表
  fetchAllModels: function(provider, forceRefresh) {
    var that = this
    that.setData({ allModelsLoading: true })
    aiManager.listModels(provider, 'chat', forceRefresh).then(function(data) {
      var list = (data.models || []).map(function(m, i) {
        return {
          id: m.id,
          name: m.name,
          desc: (m.contextLength ? '上下文' + that.formatContextLength(m.contextLength) : '') + (m.isFree ? ' · 免费' : (m.pricing && m.pricing.prompt != null ? ' · $' + m.pricing.prompt + '/百万token' : '')),
          isFree: m.isFree
        }
      })
      that.setData({
        allModelsLoading: false,
        allModelsList: list,
        allModelsTotal: list.length,
        allModelsRefreshing: false
      })
      that._allModelsCache = list
      that.applyAllModelsFilter()
    }).catch(function(err) {
      console.error('拉取模型列表失败:', err)
      that.setData({ allModelsLoading: false })
      wx.showToast({ title: err.message || '获取模型列表失败', icon: 'none' })
    })
  },

  // 格式化上下文长度
  formatContextLength: function(len) {
    if (len >= 1000000) return (len / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (len >= 1000) return Math.round(len / 1000) + 'K'
    return '' + len
  },

  // 应用搜索/筛选（本地过滤，不重复请求）
  applyAllModelsFilter: function() {
    var keyword = (this.data.allModelsSearch || '').toLowerCase()
    var filter = this.data.allModelsFilter
    var source = this._allModelsCache || this.data.allModelsList
    var filtered = source.filter(function(m) {
      if (filter === 'free' && !m.isFree) return false
      if (!keyword) return true
      return m.id.toLowerCase().indexOf(keyword) > -1 || m.name.toLowerCase().indexOf(keyword) > -1
    })
    this.setData({
      allModelsFiltered: filtered.slice(0, ALL_MODELS_PAGE_SIZE * this.data.allModelsPage),
      allModelsShown: filtered.length
    })
  },

  // 搜索输入
  onAllModelsSearch: function(e) {
    this.setData({ allModelsSearch: e.detail.value, allModelsPage: 1 })
    this.applyAllModelsFilter()
  },

  // 切换筛选（全部/免费）
  switchAllModelsFilter: function(e) {
    this.setData({ allModelsFilter: e.currentTarget.dataset.filter, allModelsPage: 1 })
    this.applyAllModelsFilter()
  },

  // 滚动到底加载更多
  loadMoreAllModels: function() {
    var nextPage = this.data.allModelsPage + 1
    var total = this.data.allModelsShown
    // 只要已展示数量小于筛选总数就翻页（总数不是整页倍数时也能展示完尾部）
    if (this.data.allModelsFiltered.length < total) {
      this.setData({ allModelsPage: nextPage })
      this.applyAllModelsFilter()
    }
  },

  // 刷新模型列表（3秒冷却，防连续点击放大上游请求）
  refreshAllModels: function() {
    if (this.data.allModelsRefreshing) return
    this.setData({ allModelsPage: 1, allModelsSearch: '', allModelsFilter: 'all', allModelsRefreshing: true })
    var that = this
    setTimeout(function() {
      that.setData({ allModelsRefreshing: false })
    }, 3000)
    this.fetchAllModels(this.data._allModelsProvider, true)
  },

  // 选中全量模型（写入配置，同 quickSwitchModel）
  selectAllModel: function(e) {
    var that = this
    var key = e.currentTarget.dataset.key
    var name = e.currentTarget.dataset.name
    var provider = this.data._allModelsProvider

    aiManager.getConfig().then(function(config) {
      var saveConfig = {
        currentModel: provider,
        models: {}
      }
      saveConfig.models[provider] = config.models[provider] || {}
      saveConfig.models[provider].model = key

      aiManager.saveConfig(saveConfig).then(function() {
        var models = aiManager.getModels()
        var providerInfo = models[provider] || {}
        that.setData({
          currentProvider: provider,
          currentModelKey: key,
          currentSubModelName: name,
          modelInfo: {
            icon: providerInfo.icon || '🤖',
            name: providerInfo.name || 'AI助手'
          },
          showAllModelsModal: false
        })
        that.estimateCost()
        wx.showToast({ title: '已切换到' + name, icon: 'none' })
      }).catch(function(err) {
        console.error('保存模型选择失败:', err)
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
    }).catch(function(err) {
      console.error('获取配置失败:', err)
      wx.showToast({ title: err.message || '获取配置失败', icon: 'none' })
    })
  },

  // 关闭全量模型弹窗
  hideAllModels: function() {
    this.setData({ showAllModelsModal: false })
  },

  // ========== AI画画 ==========

  // 打开画画弹窗（从更多面板进入）
  showDraw: function() {
    this.setData({ showMorePanel: false, showDrawModal: true, showDrawModelList: false })
    this.loadDrawModels()
  },

  // 关闭画画弹窗
  hideDraw: function() {
    this.setData({ showDrawModal: false })
  },

  // 加载图片生成模型列表
  loadDrawModels: function(forceRefresh) {
    var that = this
    var cached = this.data.drawModels
    if (cached && cached.length > 0 && !forceRefresh) return

    that.setData({ drawModelsLoading: true, drawModelsError: false })
    aiManager.listModels('openrouter', 'image', !!forceRefresh).then(function(data) {
      var list = (data.models || []).map(function(m) {
        return { id: m.id, name: m.name }
      })
      // 分组：推荐模型按常量顺序展示，其余收进"更多模型"
      var recommendIds = {}
      for (var k = 0; k < RECOMMENDED_IMAGE_MODELS.length; k++) {
        recommendIds[RECOMMENDED_IMAGE_MODELS[k]] = true
      }
      var recommendModels = []
      var moreModels = []
      for (var i = 0; i < list.length; i++) {
        if (recommendIds[list[i].id]) {
          recommendModels.push(list[i])
        } else {
          moreModels.push(list[i])
        }
      }
      // 推荐分组按常量顺序排序
      recommendModels.sort(function(a, b) {
        return RECOMMENDED_IMAGE_MODELS.indexOf(a.id) - RECOMMENDED_IMAGE_MODELS.indexOf(b.id)
      })
      // 默认选中：已选中的保留，否则优先 gpt-image-2，再否则推荐第一个
      var defaultKey = that.data.drawModelKey
      if (!defaultKey) {
        for (var m = 0; m < recommendModels.length; m++) {
          if (recommendModels[m].id === 'openai/gpt-image-2') {
            defaultKey = recommendModels[m].id
            break
          }
        }
        if (!defaultKey && recommendModels.length > 0) defaultKey = recommendModels[0].id
        if (!defaultKey && list.length > 0) defaultKey = list[0].id
      }
      var defaultName = ''
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === defaultKey) { defaultName = list[j].name; break }
      }
      that.setData({
        drawModels: list,
        drawRecommendModels: recommendModels,
        drawMoreModels: moreModels,
        drawModelsLoading: false,
        drawModelKey: defaultKey,
        drawModelName: defaultName
      })
    }).catch(function(err) {
      console.error('获取图片模型失败:', err)
      // 降级：用内置推荐常量保证画画功能可用（name 用 id 展示）
      var fallback = RECOMMENDED_IMAGE_MODELS.map(function(id) {
        return { id: id, name: id }
      })
      var fallbackKey = that.data.drawModelKey || 'openai/gpt-image-2'
      that.setData({
        drawModels: fallback,
        drawRecommendModels: fallback,
        drawMoreModels: [],
        drawModelsLoading: false,
        drawModelsError: true,
        drawModelKey: fallbackKey,
        drawModelName: fallbackKey
      })
      wx.showToast({ title: '模型列表同步失败，已用内置列表', icon: 'none' })
    })
  },

  // 重试加载图片模型
  retryDrawModels: function() {
    this.setData({ drawModels: [] })
    this.loadDrawModels(true)
  },

  // 展开/收起图片模型列表
  toggleDrawModelList: function() {
    this.setData({ showDrawModelList: !this.data.showDrawModelList })
  },

  // 展开/收起更多图片模型
  toggleDrawMoreModels: function() {
    this.setData({ showDrawMoreModels: !this.data.showDrawMoreModels })
  },

  // 选择图片模型
  selectDrawModel: function(e) {
    this.setData({
      drawModelKey: e.currentTarget.dataset.key,
      drawModelName: e.currentTarget.dataset.name,
      showDrawModelList: false,
      showDrawMoreModels: false
    })
  },

  // 切换画幅
  selectDrawRatio: function(e) {
    this.setData({ drawAspectRatio: e.currentTarget.dataset.key })
  },

  // 切换清晰度
  selectDrawQuality: function(e) {
    this.setData({ drawQuality: e.currentTarget.dataset.key })
  },

  // 画画提示词输入
  onDrawPromptInput: function(e) {
    this.setData({ drawPrompt: e.detail.value })
  },

  // 选择参考图（最多3张）
  chooseDrawRefImage: function() {
    var that = this
    var remain = 3 - this.data.drawRefImages.length
    if (remain <= 0) {
      wx.showToast({ title: '参考图最多3张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var newImages = res.tempFiles.map(function(file) {
          return file.tempFilePath
        })
        that.setData({
          drawRefImages: that.data.drawRefImages.concat(newImages)
        })
      }
    })
  },

  // 移除参考图
  removeDrawRefImage: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.drawRefImages.filter(function(img, i) {
      return i !== index
    })
    this.setData({ drawRefImages: images })
  },

  // 预览参考图
  previewDrawRef: function(e) {
    var url = e.currentTarget.dataset.url
    previewImageHelper(url, this.data.drawRefImages)
  },

  // 上传参考图（返回 fileID 数组）
  uploadDrawRefs: function(localImages) {
    var cloud = getApp().globalData.cloud
    var tasks = localImages.map(function(path) {
      return cloud.uploadImageCompressed(path, 'ai-chat-images')
    })
    return Promise.all(tasks)
  },

  // 提交生成图片（提示词立即上屏，等待过程显示秒数）
  submitDraw: function() {
    var that = this
    var prompt = this.data.drawPrompt.trim()
    if (!prompt) {
      wx.showToast({ title: '请先描述想画的内容', icon: 'none' })
      return
    }
    if (!this.data.drawModelKey) {
      wx.showToast({ title: '请先选择图片模型', icon: 'none' })
      return
    }
    if (this.data.drawing) return

    var sessionId = this.data.currentSessionId
    var refLocalImages = (this.data.drawRefImages || []).slice()
    that.setData({ drawing: true, showDrawModal: false, drawPrompt: '', drawRefImages: [] })

    // 有参考图先上传，再上屏+生成
    if (refLocalImages.length > 0) {
      that.setData({ loading: true, loadingText: '画画中...', drawWaitingText: '🎨 上传参考图中…' })
      that.uploadDrawRefs(refLocalImages).then(function(fileIDs) {
        that.startDrawRequest(prompt, sessionId, fileIDs)
      }).catch(function(err) {
        console.error('参考图上传失败:', err)
        that.setData({ loading: false, drawing: false, drawWaitingText: '' })
        that.showError('参考图上传失败：' + (err.message || '请重试'))
      })
      return
    }
    that.startDrawRequest(prompt, sessionId, [])
  },

  // 发起画画请求（用户气泡上屏 + 秒计时 + 调接口）
  startDrawRequest: function(prompt, sessionId, refFileIDs) {
    var that = this
    // 提示词气泡立即上屏（不等图片回来，参考图一并展示）
    messageIdCounter++
    var userMsg = {
      id: 'msg_' + messageIdCounter,
      role: 'user',
      content: prompt,
      images: refFileIDs.length > 0 ? refFileIDs : null,
      thinking: null,
      showThinking: false,
      timeStr: this.formatTime(new Date())
    }
    aiManager.saveToLocal(sessionId, 'user', prompt, null, null)
    that.setData({
      messages: that.data.messages.concat(userMsg),
      loading: true,
      loadingText: '画画中...',
      drawWaitingText: '🎨 画画中，已等待 0 秒…'
    })
    that.scrollToBottom()

    // 等待秒数计时（每秒更新）
    var waitedSeconds = 0
    if (that._drawTimer) clearInterval(that._drawTimer)
    that._drawTimer = setInterval(function() {
      waitedSeconds++
      that.setData({ drawWaitingText: '🎨 画画中，已等待 ' + waitedSeconds + ' 秒…' })
    }, 1000)

    aiManager.generateImage(prompt, this.data.drawModelKey, {
      aspectRatio: this.data.drawAspectRatio,
      quality: this.data.drawQuality,
      sessionId: sessionId,
      refImageFileIDs: refFileIDs
    }).then(function(result) {
      that.clearDrawTimer()
      that.addDrawMessages(result.fileID)
    }).catch(function(err) {
      console.error('生成图片失败:', err)
      that.clearDrawTimer()
      that.setData({ loading: false, drawing: false })
      that.showError('画画失败：' + (err.message || '请稍后重试'))
    })
  },

  // 清理画画计时器
  clearDrawTimer: function() {
    if (this._drawTimer) {
      clearInterval(this._drawTimer)
      this._drawTimer = null
    }
    this.setData({ drawWaitingText: '' })
  },

  // 画画结果入列（AI图片气泡，用户提示词已在提交时上屏）
  addDrawMessages: function(fileID) {
    var that = this
    messageIdCounter++
    var aiMsg = {
      id: 'msg_' + messageIdCounter,
      role: 'assistant',
      content: '',
      richText: '',
      image: fileID,
      thinking: null,
      showThinking: false,
      timeStr: this.formatTime(new Date()),
      isGenerated: true
    }
    // 本地缓存（保存/分享/历史刷新都需要 fileID 可恢复）
    aiManager.saveToLocal(this.data.currentSessionId, 'assistant', '', null, fileID)

    that.setData({
      messages: that.data.messages.concat(aiMsg),
      loading: false,
      drawing: false
    })
    that.scrollToBottom()
  },

  // 保存AI生成的图片到相册
  saveGeneratedImage: function(e) {
    var fileID = e.currentTarget.dataset.fileid
    if (!fileID) return
    var that = this
    wx.showLoading({ title: '保存中...' })
    wx.cloud.getTempFileURL({
      fileList: [fileID]
    }).then(function(res) {
      var url = res.fileList && res.fileList[0] && res.fileList[0].tempFileURL
      if (!url) throw new Error('获取图片链接失败')
      return new Promise(function(resolve, reject) {
        wx.downloadFile({
          url: url,
          success: function(dl) { resolve(dl.tempFilePath) },
          fail: function(err) { reject(new Error('下载失败: ' + (err.errMsg || ''))) }
        })
      })
    }).then(function(tempPath) {
      wx.hideLoading()
      return new Promise(function(resolve, reject) {
        wx.saveImageToPhotosAlbum({
          filePath: tempPath,
          success: function() { resolve() },
          fail: function(err) {
            if (err.errMsg.indexOf('auth deny') > -1 || err.errMsg.indexOf('authorize') > -1) {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存图片到相册',
                confirmText: '去授权',
                success: function(res) {
                  if (res.confirm) wx.openSetting()
                }
              })
              reject(new Error('cancel'))
            } else {
              reject(new Error('保存失败'))
            }
          }
        })
      })
    }).then(function() {
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    }).catch(function(err) {
      wx.hideLoading()
      if (err.message !== 'cancel') {
        console.error('保存图片失败:', err)
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      }
    })
  },

  // 分享AI生成的图片到其他程序
  shareGeneratedImage: function(e) {
    var fileID = e.currentTarget.dataset.fileid
    if (!fileID) return
    var that = this
    wx.showLoading({ title: '加载中...' })
    wx.cloud.getTempFileURL({
      fileList: [fileID]
    }).then(function(res) {
      var url = res.fileList && res.fileList[0] && res.fileList[0].tempFileURL
      if (!url) throw new Error('获取图片链接失败')
      // 部分低版本基础库 showShareImageMenu 只支持本地路径，先下载
      return new Promise(function(resolve, reject) {
        wx.downloadFile({
          url: url,
          success: function(dl) { resolve(dl.tempFilePath) },
          fail: function(err) { reject(new Error('下载失败: ' + (err.errMsg || ''))) }
        })
      })
    }).then(function(tempPath) {
      wx.hideLoading()
      wx.showShareImageMenu({
        path: tempPath,
        fail: function(err) {
          // 用户取消不算错误
          if (err.errMsg.indexOf('cancel') === -1) {
            wx.showToast({ title: '分享失败', icon: 'none' })
          }
        }
      })
    }).catch(function(err) {
      wx.hideLoading()
      console.error('分享图片失败:', err)
      wx.showToast({ title: err.message || '分享失败', icon: 'none' })
    })
  },

  // ========== Skills相关方法 ==========

  // 恢复激活的技能状态
  restoreActiveSkill: function() {
    var activeSkill = skillsManager.getActiveSkill()
    if (activeSkill) {
      this.setData({
        activeSkill: activeSkill,
        showSkillBar: true
      })
    }
  },

  // 检测技能触发
  detectAndActivateSkill: function(message) {
    var skill = skillsManager.detectSkill(message)
    if (skill) {
      this.activateSkill(skill)
      return true
    }
    return false
  },

  // 激活技能
  activateSkill: function(skill) {
    skillsManager.activateSkill(skill.id)
    this.setData({
      activeSkill: skill,
      showSkillBar: true
    })
    wx.showToast({ title: '已激活: ' + skill.name, icon: 'success' })
    
    // 自动注入技能关联数据
    this.autoInjectSkillData(skill)
  },

  // 自动注入技能关联数据
  autoInjectSkillData: function(skill) {
    var that = this
    // 检测技能关联的数据类型
    var dataTypes = contextDetector.detectDataTypes('', skill)
    if (dataTypes.length === 0) return
    
    // 异步获取数据摘要
    contextDetector.getDataSummary(dataTypes).then(function(result) {
      if (result.hasData) {
        // 构建上下文文本
        contextDetector.buildContextText(dataTypes).then(function(text) {
          if (text) {
            that.setData({ pendingExtraContext: text })
            console.log('技能关联数据已注入:', dataTypes)
          }
        })
      }
    })
  },

  // 取消激活技能
  deactivateSkill: function() {
    skillsManager.deactivateSkill()
    this.setData({
      activeSkill: null,
      showSkillBar: false
    })
    wx.showToast({ title: '已取消技能', icon: 'none' })
  },

  // 检测技能查找意图
  detectSkillSearch: function(message) {
    var query = skillsManager.detectSkillSearchIntent(message)
    if (query) {
      this.searchAndShowSkills(query)
      return true
    }
    return false
  },

  // 搜索并显示技能
  searchAndShowSkills: function(query) {
    var that = this
    that.setData({ showSkillSearch: true, skillSearchQuery: query })
    
    skillsManager.searchSkillsFromNetwork(query).then(function(results) {
      that.setData({ skillSearchResults: results })
    }).catch(function(err) {
      console.error('搜索技能失败:', err)
      wx.showToast({ title: '搜索失败', icon: 'none' })
      that.setData({ showSkillSearch: false })
    })
  },

  // 安装技能
  installSkill: function(e) {
    var skill = e.currentTarget.dataset.skill
    if (!skill) return
    
    skillsManager.saveSkill(skill)
    this.setData({ showSkillSearch: false })
    wx.showToast({ title: '已安装: ' + skill.name, icon: 'success' })
  },

  // 关闭技能搜索
  closeSkillSearch: function() {
    this.setData({ showSkillSearch: false, skillSearchResults: [] })
  },

  // 显示技能列表
  showSkillList: function() {
    var grouped = skillsManager.getGroupedSkills()
    var categories = skillsManager.SKILL_CATEGORIES
    this.setData({ 
      skillGrouped: grouped, 
      skillFilterKeyword: '', 
      showSkillModal: true,
      showMorePanel: false,
      skillActiveTab: 'all',
      skillCategories: categories,
      filteredSkillList: []
    })
  },

  // 搜索技能
  onSkillFilterInput: function(e) {
    var keyword = e.detail.value.trim()
    this.setData({ skillFilterKeyword: keyword })
    this.filterSkillGrouped(keyword)
  },

  filterSkillGrouped: function(keyword) {
    if (!keyword) {
      this.setData({ skillGrouped: skillsManager.getGroupedSkills() })
      if (this.data.skillActiveTab !== 'all') {
        this.filterSkillsByCategory(this.data.skillActiveTab)
      }
      return
    }
    var kw = keyword.toLowerCase()
    var allGrouped = skillsManager.getGroupedSkills()
    var filtered = []
    allGrouped.forEach(function(group) {
      var matched = group.skills.filter(function(s) {
        return s.name.toLowerCase().indexOf(kw) >= 0 ||
               (s.description && s.description.toLowerCase().indexOf(kw) >= 0)
      })
      if (matched.length > 0) {
        filtered.push({ category: group.category, skills: matched })
      }
    })
    this.setData({ skillGrouped: filtered })
    if (this.data.skillActiveTab !== 'all') {
      this.filterSkillsByCategory(this.data.skillActiveTab)
    }
  },

  clearSkillFilter: function() {
    this.setData({ skillFilterKeyword: '' })
    this.filterSkillGrouped('')
  },

  // 切换技能分类Tab
  switchSkillTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ skillActiveTab: tab })
    if (tab !== 'all') {
      this.filterSkillsByCategory(tab)
    }
  },

  // 按分类筛选技能
  filterSkillsByCategory: function(categoryId) {
    var allSkills = skillsManager.getAllSkills()
    var keyword = this.data.skillFilterKeyword
    var filtered = allSkills.filter(function(skill) {
      var category = skill.category || 'other'
      return category === categoryId
    })
    if (keyword) {
      var kw = keyword.toLowerCase()
      filtered = filtered.filter(function(s) {
        return s.name.toLowerCase().indexOf(kw) >= 0 ||
               (s.description && s.description.toLowerCase().indexOf(kw) >= 0)
      })
    }
    this.setData({ filteredSkillList: filtered })
  },

  // 隐藏技能列表
  hideSkillList: function() {
    this.setData({ showSkillModal: false })
  },

  // 选择技能
  selectSkill: function(e) {
    var skillId = e.currentTarget.dataset.id
    var skill = skillsManager.getSkillById(skillId)
    if (skill) {
      this.activateSkill(skill)
      this.hideSkillList()
    }
  },

  // 切换技能启用状态
  toggleSkillEnabled: function(e) {
    var skillId = e.currentTarget.dataset.id
    var newState = skillsManager.toggleSkill(skillId)
    var grouped = skillsManager.getGroupedSkills()
    this.setData({ skillGrouped: grouped })
    wx.showToast({ title: newState ? '已启用' : '已禁用', icon: 'none' })
  },

  // 删除技能
  deleteSkill: function(e) {
    var skillId = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个技能吗？',
      success: function(res) {
        if (res.confirm) {
          skillsManager.deleteSkill(skillId)
          var grouped = skillsManager.getGroupedSkills()
          that.setData({ skillGrouped: grouped })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 导入技能
  importSkill: function() {
    var that = this
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'], // 不带点号
      success: function(res) {
        var filePath = res.tempFiles[0].path
        var fs = wx.getFileSystemManager()
        fs.readFile({
          filePath: filePath,
          encoding: 'utf8',
          success: function(data) {
            try {
              var imported = skillsManager.importSkillsFromJson(data.data)
              wx.showToast({ title: '已导入' + imported.length + '个技能', icon: 'success' })
              var grouped = skillsManager.getGroupedSkills()
              that.setData({ skillGrouped: grouped })
            } catch (err) {
              wx.showToast({ title: '导入失败: ' + err.message, icon: 'none' })
            }
          }
        })
      }
    })
  },

  // ========== 数据上下文浮窗方法 ==========

  // 检测消息是否涉及用户数据
  detectAndShowBanner: function(message) {
    var that = this
    var types = contextDetector.detectDataTypes(message, this.data.activeSkill)
    if (types.length === 0) return

    // 清除之前的定时器
    if (this._contextBannerTimer) {
      clearTimeout(this._contextBannerTimer)
    }

    contextDetector.getDataSummary(types).then(function(result) {
      if (!result.hasData) return
      that.setData({
        showContextBanner: true,
        contextBannerItems: result.items,
        contextDataTypes: types
      })
      // 10秒后自动消失
      var timer = setTimeout(function() {
        that.dismissBanner()
      }, 10000)
      that._contextBannerTimer = timer
    })
  },

  // 用户点击"发送数据"
  confirmSendContext: function() {
    var that = this
    var types = this.data.contextDataTypes
    this.dismissBanner()
    wx.showLoading({ title: '获取数据中...' })
    contextDetector.buildContextText(types).then(function(text) {
      wx.hideLoading()
      that.setData({ pendingExtraContext: text })
      wx.showToast({ title: '数据已附加', icon: 'success', duration: 1000 })
      // 使用暂存的选项发送消息
      setTimeout(function() {
        that.doSendMessage()
      }, 500)
    }).catch(function(err) {
      wx.hideLoading()
      console.error('获取数据失败:', err)
      wx.showToast({ title: '数据获取失败', icon: 'none' })
      // 即使数据获取失败，也发送消息
      that.doSendMessage()
    })
  },

  // 用户点击"跳过"
  skipContext: function() {
    this.setData({ pendingExtraContext: null })
    this.dismissBanner()
    // 使用暂存的选项发送消息（不带数据）
    this.doSendMessage()
  },

  // 关闭浮窗
  dismissBanner: function() {
    if (this._contextBannerTimer) {
      clearTimeout(this._contextBannerTimer)
    }
    this._contextBannerTimer = null
    this.setData({
      showContextBanner: false,
      contextBannerItems: [],
      contextDataTypes: []
    })
  },

  // 发送消息（检测入口）
  sendMessage: function(options) {
    var message = options && options.content ? options.content : this.data.inputValue.trim()
    var images = options && options.images ? options.images : this.data.selectedImages
    
    if ((!message && images.length === 0) || this.data.loading) return
    
    // 如果浮窗正在显示，先关闭
    if (this.data.showContextBanner) {
      this.dismissBanner()
    }
    
    // 优先级1: 检测技能触发
    if (message && this.detectAndActivateSkill(message)) {
      // 技能激活后，提取消息中除技能名外的内容
      var cleanMessage = message.replace(/^\/\S+\s*/, '').trim()
      if (cleanMessage) {
        this.setData({ inputValue: cleanMessage })
        // 继续发送剩余内容
      } else {
        // 只是激活技能，不发送消息
        return
      }
    }
    
    // 优先级2: 检测技能查找意图
    if (message && this.detectSkillSearch(message)) {
      return // 显示搜索结果，不发送消息
    }
    
    // 优先级3: 检测数据关键词（仅在没有待处理的extraContext时）
    if (message && !this.data.pendingExtraContext) {
      var types = contextDetector.detectDataTypes(message, this.data.activeSkill)
      if (types.length > 0) {
        // 暂存消息内容和选项，显示浮窗
        // 使用深拷贝避免被后续调用覆盖
        this._pendingOptions = JSON.parse(JSON.stringify(options || { content: message, images: images }))
        this._pendingOptions._timestamp = Date.now() // 添加时间戳用于验证
        this.detectAndShowBanner(message)
        return
      }
    }
    
    // 正常发送
    this.doSendMessage(options)
  },

  // 实际发送消息
  doSendMessage: function(options) {
    var that = this
    var opts = options || this._pendingOptions || {}
    var message = opts.content ? opts.content : this.data.inputValue.trim()
    var images = opts.images ? opts.images : this.data.selectedImages
    var isRetry = opts.isRetry
    this._pendingOptions = null

    if ((!message && images.length === 0) || this.data.loading) return

    // 添加用户消息到列表（重试时不重复添加）
    if (!isRetry) {
      messageIdCounter++
      var userMsg = {
        id: 'msg_' + messageIdCounter,
        role: 'user',
        content: message || null,
        images: images.length > 0 ? images : null,
        thinking: null,
        showThinking: false,
        timeStr: this.formatTime(new Date())
      }

      this.setData({
        messages: this.data.messages.concat(userMsg),
        inputValue: '',
        selectedImages: [],
        showMorePanel: false,
        showEmojiBar: false
      })
    }

    this.setData({ loading: true, loadingText: '思考中...' })
    this.scrollToBottom()

    // 处理图片上传
    var localImages = images.filter(function(img) {
      return img.indexOf('cloud://') === -1
    })
    
    if (localImages.length > 0) {
      this.uploadAndSendMultiple(message, images)
    } else {
      // 只发送第一张图片（兼容旧接口）
      this.sendToAI(message, images.length > 0 ? images[0] : null)
    }
  },

  // 上传图片并发送
  uploadAndSend: function(message, imagePath) {
    var that = this
    var cloud = getApp().globalData.cloud
    
    // 压缩并上传图片到云存储
    try {
      cloud.uploadImageCompressed(imagePath, 'ai-chat-images').then(function(fileID) {
        // 发送包含图片的消息
        that.sendToAI(message, fileID)
      }).catch(function(err) {
        console.error('上传图片失败:', err)
        that.showError('图片上传失败，请重试', message, imagePath)
      })
    } catch (err) {
      // 捕获同步异常（如cloud对象未初始化等）
      console.error('上传图片异常:', err)
      that.showError('图片上传失败，请重试', message, imagePath)
    }
  },

  // 上传多张图片并发送
  uploadAndSendMultiple: function(message, images) {
    var that = this
    var cloud = getApp().globalData.cloud
    var uploadedCount = 0
    var totalImages = images.length
    var uploadedFileIDs = []
    
    // 分离本地图片和已上传的云图片
    var localImages = images.filter(function(img) {
      return img.indexOf('cloud://') === -1
    })
    var cloudImages = images.filter(function(img) {
      return img.indexOf('cloud://') === 0
    })
    
    // 如果没有本地图片，直接发送
    if (localImages.length === 0) {
      that.sendToAI(message, cloudImages.length > 0 ? cloudImages : null)
      return
    }

    // 上传每张本地图片
    localImages.forEach(function(imagePath, index) {
      try {
        cloud.uploadImageCompressed(imagePath, 'ai-chat-images').then(function(fileID) {
          uploadedCount++
          uploadedFileIDs[index] = fileID

          // 所有图片上传完成
          if (uploadedCount === localImages.length) {
            // 合并云图片和新上传的图片
            var allFileIDs = cloudImages.concat(uploadedFileIDs.filter(Boolean))
            that.sendToAI(message, allFileIDs.length > 0 ? allFileIDs : null)
          }
        }).catch(function(err) {
          console.error('上传图片失败:', err)
          uploadedCount++
          // 即使某张图片上传失败，也继续发送
          if (uploadedCount === localImages.length) {
            var allFileIDs = cloudImages.concat(uploadedFileIDs.filter(Boolean))
            that.sendToAI(message, allFileIDs.length > 0 ? allFileIDs : null)
          }
        })
      } catch (err) {
        console.error('上传图片异常:', err)
        uploadedCount++
        if (uploadedCount === localImages.length) {
          var allFileIDs = cloudImages.concat(uploadedFileIDs.filter(Boolean))
          that.sendToAI(message, allFileIDs.length > 0 ? allFileIDs : null)
        }
      }
    })
  },

  // 发送到AI
  sendToAI: function(message, imageFileID) {
    var that = this
    var modelInfo = aiManager.getCurrentModelInfo()
    var model = modelInfo ? modelInfo.key : null
    var extraContext = this.data.pendingExtraContext
    var skillPrompt = this.data.activeSkill ? this.data.activeSkill.prompt : null

    // 用完即清
    this.setData({ pendingExtraContext: null })

    // 统一为数组格式
    var imageFileIDs = Array.isArray(imageFileID) ? imageFileID : (imageFileID ? [imageFileID] : [])

    // 根据开关选择流式或普通模式
    if (this.data.streamThinkingEnabled) {
      this.sendToAIStream(message, model, imageFileIDs, extraContext, skillPrompt)
    } else {
      // 长时间等待提示（不作为错误处理）
      var msgTimeout = setTimeout(function() {
        that.setData({ loadingText: 'AI思考时间较长，请耐心等待...' })
      }, 10000)

      // P1 修复补充（I-1）：非流式是默认路径（streamThinkingEnabled 默认 false），
      // 与流式路径同样需要会话归属快照——生成期间切会话时回复只落在原会话
      // （aiManager.sendMessage 内部已按发送时会话落库），不再写入当前界面。
      // 注意 sessionChanged 必须在回调时点与「当时的」currentSessionId 比对
      var originSessionId = that.data.currentSessionId || aiManager.getCurrentSessionId()
      aiManager.sendMessage(message, model, imageFileIDs, extraContext, skillPrompt).then(function(result) {
        clearTimeout(msgTimeout)
        messageIdCounter++
        // 检查AI回复是否包含图片URL
        var aiImage = null
        var aiContent = result.content
        if (result.content) {
          // 1. 先匹配markdown图片语法 ![alt](url)
          var mdImageMatch = result.content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
          if (mdImageMatch) {
            aiImage = mdImageMatch[1]
            aiContent = result.content.replace(mdImageMatch[0], '').trim()
          } else {
            // 2. 匹配图片URL模式（http/https开头，以图片扩展名结尾或云文件ID）
            var imageUrlMatch = result.content.match(/(https?:\/\/[^\s]*\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s]*)?|cloud:\/\/[^\s]+)/i)
            if (imageUrlMatch) {
              aiImage = imageUrlMatch[0]
              aiContent = result.content.replace(imageUrlMatch[0], '').trim()
            }
          }
        }
        
        var aiMsg = {
          id: 'msg_' + messageIdCounter,
          role: 'assistant',
          content: aiContent || result.content,
          richText: markdown.parseMarkdown(aiContent || result.content),
          image: aiImage,
          thinking: result.thinking || null,
          showThinking: false,
          timeStr: that.formatTime(new Date())
        }
        
        // I-1：回调时点比对会话归属——已切会话则仅复位 loading（落库已由
        // aiManager.sendMessage 按发送时快照完成），不把回复渲染进当前界面。
        // P1 修复补充：token 用量同样按会话归属，切换时丢弃本次统计，
        // 防止旧会话 usage 记入新会话并持久化到新会话的 tokenStats
        if (originSessionId && originSessionId !== that.data.currentSessionId) {
          console.log('非流式回复归属原会话', originSessionId)
          that.setData({ loading: false })
          return
        }

        // 累计token用量
        that.updateTokenUsage(result.usage)

        that.setData({
          messages: that.data.messages.concat(aiMsg),
          loading: false
        })

        that.scrollToBottom()
      }).catch(function(err) {
        clearTimeout(msgTimeout)
        console.error('非流式调用失败:', err)
        // I-1：失败提示气泡同样按会话归属——切换后仅复位 loading，不污染新会话
        if (originSessionId && originSessionId !== that.data.currentSessionId) {
          that.setData({ loading: false })
          return
        }
        that.showError('发送失败：' + (err.message || '网络错误，请稍后重试'), message, imageFileID)
      })
    }
  },

  // 流式发送到AI
  sendToAIStream: function(message, model, imageFileID, extraContext, skillPrompt) {
    var that = this
    // I-1：发起失败提示同样按会话归属
    var originSessionId = that.data.currentSessionId || aiManager.getCurrentSessionId()

    aiManager.sendMessageStream(message, model, imageFileID, extraContext, skillPrompt).then(function(data) {
      that.setData({
        currentTaskId: data.taskId,
        currentThinkingContent: ''
      })

      that.startThinkingPoll(data.taskId)
    }).catch(function(err) {
      console.error('云函数调用失败:', err)
      if (originSessionId && originSessionId !== that.data.currentSessionId) {
        that.setData({ loading: false })
        return
      }
      that.showError('发送失败：' + (err.message || '网络错误，请稍后重试'), message, imageFileID)
    })
  },

  // 处理AI响应（提取公共逻辑）
  handleAIResponse: function(finalContent, thinkingContent, originSessionId) {
    var that = this
    messageIdCounter++

    // P1 修复：生成完成回调按「发起请求时的会话」归属——若用户在生成期间
    // 已切换/新建会话，回复只落库到原会话，不再写入当前界面造成串会话
    var sessionChanged = !!originSessionId && originSessionId !== this.data.currentSessionId

    console.log('handleAIResponse:', { finalContent: finalContent ? finalContent.substring(0, 100) : finalContent, thinkingContent: thinkingContent ? '有' : '无' })
    
    var aiImage = null
    var aiContent = finalContent
    if (finalContent) {
      var mdImageMatch = finalContent.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
      if (mdImageMatch) {
        aiImage = mdImageMatch[1]
        aiContent = finalContent.replace(mdImageMatch[0], '').trim()
      } else {
        var imageUrlMatch = finalContent.match(/(https?:\/\/[^\s]*\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s]*)?|cloud:\/\/[^\s]+)/i)
        if (imageUrlMatch) {
          aiImage = imageUrlMatch[0]
          aiContent = finalContent.replace(imageUrlMatch[0], '').trim()
        }
      }
    }
    
    var displayContent = aiContent || finalContent || '（无内容）'
    var msgId = 'msg_' + messageIdCounter

    // 添加AI回复消息（思考过程始终默认折叠，和识字模块一致）
    var aiMsg = {
      id: msgId,
      role: 'assistant',
      content: '',
      richText: '',
      image: aiImage,
      thinking: thinkingContent || null,
      showThinking: false,  // 思考结束后始终默认折叠
      isTyping: true,
      timeStr: that.formatTime(new Date())
    }

    if (sessionChanged) {
      // 已切换会话：回复仅落库到原会话，不污染当前界面
      console.log('handleAIResponse: 会话已切换，回复归属原会话', originSessionId)
      // 必须复位 loading：sendMessage 以 loading 为入口守卫，若不复位，
      // 切换/新建会话后输入框将永久无法发送（只能退出重进）
      that.setData({ loading: false })
    } else {
      that.setData({
        messages: that.data.messages.concat(aiMsg),
        loading: false
      })

      that.scrollToBottom()

      // 开始打字机效果
      that.typeWriterContent(msgId, displayContent, 0)
    }

    aiManager.saveToLocal(originSessionId || null, 'assistant', finalContent, thinkingContent)
  },

  typeWriterContent: function(msgId, fullContent, index) {
    var that = this
    
    // 检查页面是否已卸载
    if (that._isPageUnloaded) return
    
    if (!fullContent || index > fullContent.length) {
      // 打字完成
      var messages = that.data.messages.map(function(msg) {
        if (msg.id === msgId) {
          return Object.assign({}, msg, {
            content: fullContent,
            richText: markdown.parseMarkdown(fullContent),
            isTyping: false
          })
        }
        return msg
      })
      that.setData({ messages: messages })
      that.scrollToBottom()
      return
    }
    
    var currentContent = fullContent.substring(0, index)
    var messages = that.data.messages.map(function(msg) {
      if (msg.id === msgId) {
        return Object.assign({}, msg, {
          content: currentContent,
          richText: markdown.parseMarkdown(currentContent)
        })
      }
      return msg
    })
    that.setData({ messages: messages })
    
    // 动态调整延迟
    var delay = 20
    if (index > 0 && index < fullContent.length) {
      var lastChar = fullContent[index - 1]
      if ('。！？'.indexOf(lastChar) !== -1) {
        delay = 100
      } else if ('，、；：'.indexOf(lastChar) !== -1) {
        delay = 50
      }
    }
    
    if (index % 15 === 0) {
      that.scrollToBottom()
    }
    
    setTimeout(function() {
      that.typeWriterContent(msgId, fullContent, index + 1)
    }, delay)
  },

  // 累计token用量
  updateTokenUsage: function(usage) {
    if (!usage) return
    var promptTokens = usage.prompt_tokens || 0
    var completionTokens = usage.completion_tokens || 0
    var totalTokens = promptTokens + completionTokens
    
    var newContextTokens = this.data.contextTokens + promptTokens
    var newOutputTokens = this.data.outputTokens + completionTokens
    var newTotalTokensUsed = this.data.totalTokensUsed + totalTokens
    
    this.setData({
      contextTokens: newContextTokens,
      outputTokens: newOutputTokens,
      totalTokensUsed: newTotalTokensUsed
    })
    
    // 计算预估费用
    this.estimateCost()
    
    // 持久化到本地存储
    this.saveTokenStats()
  },

  // 保存token统计到本地
  saveTokenStats: function() {
    var sessionId = this.data.currentSessionId || aiManager.getCurrentSessionId()
    if (!sessionId) return
    var modelInfo = aiManager.getCurrentModelInfo()
    childStorage.set('tokenStats_' + sessionId, {
      contextTokens: this.data.contextTokens,
      outputTokens: this.data.outputTokens,
      totalTokensUsed: this.data.totalTokensUsed,
      estimatedCost: this.data.estimatedCost,
      lastModelKey: modelInfo ? modelInfo.key : ''
    })
  },

  // 从本地加载token统计
  loadTokenStats: function(sessionId) {
    var stats = childStorage.get('tokenStats_' + sessionId)
    if (stats) {
      this.setData({
        contextTokens: stats.contextTokens || 0,
        outputTokens: stats.outputTokens || 0,
        totalTokensUsed: stats.totalTokensUsed || 0,
        estimatedCost: stats.estimatedCost || '0.0000'
      })
    } else {
      this.setData({
        contextTokens: 0,
        outputTokens: 0,
        totalTokensUsed: 0,
        estimatedCost: '0.0000'
      })
    }
  },

  // 预估费用（根据模型价格计算）
  estimateCost: function() {
    var that = this
    var modelInfo = aiManager.getCurrentModelInfo()
    var key = modelInfo ? modelInfo.key : 'minimax'
    
    // 如果已缓存价格，直接使用
    if (this.data.modelPrices) {
      this.calculateCost(key, this.data.modelPrices)
      return
    }
    
    // 从云端获取价格配置
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(), action: 'getModelPrices' }
    }).then(function(res) {
      if (res.result.code === 0) {
        var prices = res.result.data
        that.setData({ modelPrices: prices })
        that.calculateCost(key, prices)
      } else {
        // 使用默认价格并缓存，避免重复请求
        var defaultPrices = that.getDefaultPrices()
        that.setData({ modelPrices: defaultPrices })
        that.calculateCost(key, defaultPrices)
      }
    }).catch(function() {
      // 使用默认价格并缓存，避免重复请求
      var defaultPrices = that.getDefaultPrices()
      that.setData({ modelPrices: defaultPrices })
      that.calculateCost(key, defaultPrices)
    })
  },

  // 获取默认价格
  getDefaultPrices: function() {
    return {
      'minimax': { input: 2.1, output: 8.4, name: 'MiniMax-M3' },
      'minimax-plan': { input: 2.1, output: 8.4, name: 'MiniMax-M3' },
      'deepseek': { input: 1, output: 2, name: 'DeepSeek-V4-Flash' },
      'qwen': { input: 12, output: 36, name: 'Qwen3.7-Max' },
      'zhipu': { input: 5, output: 5, name: 'GLM-5.2' },
      'zhipu-plan': { input: 5, output: 5, name: 'GLM-5.2' },
      'kimi': { input: 4, output: 12, name: 'Kimi-K2.6' },
      'kimi-plan': { input: 4, output: 12, name: 'Kimi-K2.6' },
      'wenxin': { input: 8, output: 8, name: 'ERNIE-4.0-Turbo' },
      'wenxin-plan': { input: 8, output: 8, name: 'ERNIE-4.0-Turbo' },
      'siliconflow': { input: 1, output: 2, name: 'DeepSeek-V4' },
      'mimo': { input: 3, output: 6, name: 'MiMo-V2.5-Pro' },
      'mimo-plan': { input: 3, output: 6, name: 'MiMo-V2.5-Pro' },
      'openrouter': { input: 0, output: 0, name: 'OpenRouter Free' },
      'kilo': { input: 0, output: 0, name: 'Kilo Free' },
      'opencode': { input: 0, output: 0, name: 'OpenCode Free' }
    }
  },

  // 计算费用
  calculateCost: function(key, prices) {
    var price = prices[key] || prices['minimax']
    var inputCost = (this.data.contextTokens / 1000000) * price.input
    var outputCost = (this.data.outputTokens / 1000000) * price.output
    var totalCost = inputCost + outputCost
    
    this.setData({
      estimatedCost: totalCost.toFixed(4),
      costModelName: price.name
    })
    
    // 持久化
    this.saveTokenStats()
  },

  // 开始轮询思考进度
  startThinkingPoll: function(taskId) {
    var that = this
    // P1 修复：快照发起请求时的会话 id——生成期间用户可能切换/新建会话，
    // 完成回调需据此判断回复归属，避免把上一个会话的回复串进当前会话
    var originSessionId = this.data.currentSessionId || aiManager.getCurrentSessionId()
    var pollCount = 0
    var maxPolls = 120 // 最多轮询120次（约60秒）
    var failCount = 0
    var maxFails = 5 // 连续失败5次后放弃
    
    // 清除之前的定时器
    if (this._thinkingPollTimer) {
      clearInterval(this._thinkingPollTimer)
    }
    
    var timer = setInterval(function() {
      pollCount++
      
      if (pollCount > maxPolls) {
        clearInterval(timer)
        // P1 修复：错误气泡按会话归属——切换会话后仅复位 loading
        if (originSessionId && originSessionId !== that.data.currentSessionId) {
          that.setData({ loading: false })
          return
        }
        that.showError('请求超时，请重试')
        return
      }
      
      aiManager.getThinkingProgress(taskId).then(function(progress) {
        // 用户可能在轮询期间切换/新建会话；thinking 仅属发起请求的会话，
        // 会话已切换时不得改写当前（新）会话最后一条消息
        var sessionStillCurrent = !originSessionId || originSessionId === that.data.currentSessionId

        // 实时更新思考内容到消息气泡
        if (sessionStillCurrent && progress.thinkingContent !== undefined && progress.thinkingContent !== that.data.currentThinkingContent) {
          that.setData({ currentThinkingContent: progress.thinkingContent })

          // 实时更新最后一条消息的thinking字段
          that.updateLastMessageThinking(progress.thinkingContent)
        }

        // 检查是否完成
        if (progress.status === 'completed') {
          clearInterval(timer)
          failCount = 0
          that._thinkingPollTimer = null
          that.setData({
            currentTaskId: null,
            currentThinkingContent: ''
          })

          // 折叠思考过程，然后添加AI回复消息
          // P1 修复（#7b）：token 用量纳入会话归属守卫——切会话后到达的完成
          // 回调不再把旧会话 usage 记入新会话并持久化到新会话的 tokenStats
          if (sessionStillCurrent) {
            that.updateTokenUsage(progress.usage)
            that.collapseLastMessageThinking()
          }
          that.handleAIResponse(progress.finalContent, progress.thinkingContent, originSessionId)

        } else if (progress.status === 'error') {
          clearInterval(timer)
          failCount = 0
          that._thinkingPollTimer = null
          that.setData({
            currentTaskId: null,
            currentThinkingContent: ''
          })
          that.showError('AI回复失败：' + (progress.thinkingContent || '未知错误'))
        }
      }).catch(function(err) {
        failCount++
        console.error('轮询思考进度失败:', failCount + '/' + maxFails, err)
        if (failCount >= maxFails) {
          clearInterval(timer)
          that._thinkingPollTimer = null
          that.setData({
            currentTaskId: null,
            currentThinkingContent: ''
          })
          that.showError('网络异常，请重试')
        }
      })
    }, 1000) // 每1000ms轮询一次
    
    this._thinkingPollTimer = timer
  },

  // 更新加载中的消息显示思考内容
  updateLoadingMessage: function(thinkingContent) {
    // 这里可以更新UI显示思考过程
    // 由于微信小程序的限制，我们通过loadingText来展示状态
    var shortContent = thinkingContent.length > 50 ? thinkingContent.substring(0, 50) + '...' : thinkingContent
    this.setData({
      loadingText: '思考中: ' + shortContent
    })
  },

  // 更新最后一条AI消息的思考内容
  updateLastMessageThinking: function(thinking) {
    var messages = this.data.messages.slice()
    if (messages.length > 0) {
      var lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'assistant') {
        messages[messages.length - 1] = Object.assign({}, lastMsg, { thinking: thinking })
        this.setData({ messages: messages })
        this.scrollToBottom()
      }
    }
  },

  // 折叠最后一条消息的思考过程（思考结束后自动折叠，和识字模块一致）
  collapseLastMessageThinking: function() {
    var messages = this.data.messages.slice()
    if (messages.length > 0) {
      var lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'assistant' && lastMsg.thinking) {
        messages[messages.length - 1] = Object.assign({}, lastMsg, { showThinking: false })
        this.setData({ messages: messages })
      }
    }
  },

  // 切换流式思考开关
  toggleStreamThinking: function() {
    var newValue = !this.data.streamThinkingEnabled
    this.setData({
      streamThinkingEnabled: newValue
    })

    // 保存开关状态到本地存储
    childStorage.set('streamThinkingEnabled', newValue)
    
    wx.showToast({
      title: newValue ? '已开启实时思考' : '已关闭实时思考',
      icon: 'none'
    })
  },

  // 切换上下文统计显示
  toggleContextStats: function() {
    this.setData({
      showContextStats: !this.data.showContextStats
    })
  },

  // 显示错误
  showError: function(msg, originalContent, originalImage) {
    messageIdCounter++
    var errorText = '❌ ' + msg
    var errorMsg = {
      id: 'msg_' + messageIdCounter,
      role: 'assistant',
      content: errorText,
      richText: markdown.parseMarkdown(errorText),
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
        // 创建新对象，避免直接修改原对象
        return Object.assign({}, msg, { showThinking: !msg.showThinking })
      }
      return msg
    })
    
    this.setData({ messages: messages })
  },

  // 新建会话
  newSession: function() {
    var that = this
    
    // 如果当前有对话内容，显示确认弹窗
    if (this.data.messages.length > 0) {
      wx.showModal({
        title: '新建对话',
        content: '当前对话内容将被清空，是否开启新对话？',
        confirmText: '新建',
        cancelText: '取消',
        success: function(res) {
          if (res.confirm) {
            that.doNewSession()
          }
        }
      })
    } else {
      this.doNewSession()
    }
  },

  // 执行新建会话
  doNewSession: function() {
    var sessionId = aiManager.createSession()
    aiManager.setCurrentSessionId(sessionId)
    
    this.setData({
      currentSessionId: sessionId,
      messages: [],
      contextTokens: 0,
      outputTokens: 0,
      totalTokensUsed: 0,
      estimatedCost: '0.0000',
      costModelName: ''
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
      loadingSessions: true,
      sessionLimit: 500 // 当前加载限制
    })
    
    aiManager.getSessions(500).then(function(result) {
      var sessions = result.sessions || []
      var hasMore = result.hasMore || false
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
        hasMoreSessions: hasMore,
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
    
    var kw = keyword.toLowerCase()
    var filtered = sessions.filter(function(session) {
      // 搜索最后消息、模型名称、会话标题
      return (session.lastMessage && session.lastMessage.toLowerCase().indexOf(kw) !== -1) || 
             (session.modelName && session.modelName.toLowerCase().indexOf(kw) !== -1) ||
             (session.title && session.title.toLowerCase().indexOf(kw) !== -1)
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
    var that = this
    if (this.data.loadingSessions || !this.data.hasMoreSessions) return
    
    // 增加加载限制
    var newLimit = (this.data.sessionLimit || 500) + 500
    
    this.setData({ 
      loadingSessions: true,
      sessionLimit: newLimit
    })
    
    aiManager.getSessions(newLimit).then(function(result) {
      var sessions = result.sessions || []
      var hasMore = result.hasMore || false
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
        filteredSessions: that.data.searchKeyword ? 
          formattedSessions.filter(function(s) {
            var kw = that.data.searchKeyword.toLowerCase()
            return (s.lastMessage && s.lastMessage.toLowerCase().indexOf(kw) !== -1) || 
                   (s.modelName && s.modelName.toLowerCase().indexOf(kw) !== -1)
          }) : formattedSessions,
        totalSessions: formattedSessions.length,
        totalMessages: totalMessages,
        totalTokens: that.formatTokens(totalTokens),
        hasMoreSessions: hasMore && newLimit < 2000, // 最大2000条
        loadingSessions: false
      })
    }).catch(function(err) {
      console.error('加载更多会话失败:', err)
      that.setData({ loadingSessions: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
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

  // 空操作（用于catchtap阻止冒泡）
  noop: function() {
    // 空函数
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
    this.loadTokenStats(sessionId)
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

  // 切换更多面板
  toggleMorePanel: function() {
    this.setData({
      showMorePanel: !this.data.showMorePanel,
      showEmojiBar: false,
      inputFocus: false
    })
  },

  // 切换表情栏
  toggleEmojiBar: function() {
    this.setData({ 
      showEmojiBar: !this.data.showEmojiBar,
      showMorePanel: false,
      inputFocus: false
    })
  },

  // 切换表情分类
  switchEmojiCategory: function(e) {
    var category = e.currentTarget.dataset.category
    this.setData({ 
      currentEmojiCategory: category,
      emojiList: EMOJI_CATEGORIES[category].list
    })
  },

  // 插入表情
  insertEmoji: function(e) {
    var emoji = e.currentTarget.dataset.emoji
    this.setData({
      inputValue: this.data.inputValue + emoji
      // 不关闭表情栏，方便连续输入
    })
  },

  // 初始化录音管理器（只注册一次事件）
  initRecorderManager: function() {
    var that = this
    
    // 如果已经初始化过，直接返回
    if (this._recorderInitialized) return
    
    this.recorderManager = wx.getRecorderManager()
    
    this.recorderManager.onStart(function() {
      console.log('录音开始')
    })
    
    this.recorderManager.onStop(function(res) {
      that.setData({ isRecording: false })

      // P1 修复：「松开取消」此前只调 stop()，onStop 无法区分取消与正常结束，
      // 取消的录音仍会被识别并把文字填进输入框——取消语义完全失效
      if (that._cancelRecording) {
        that._cancelRecording = false
        console.log('录音已取消，丢弃音频')
        return
      }

      // 语音转文字
      if (res.tempFilePath) {
        that.speechToText(res.tempFilePath)
      }
    })
    
    this.recorderManager.onError(function(err) {
      console.error('录音错误', err)
      that.setData({ isRecording: false })
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
    })
    
    this._recorderInitialized = true
  },

  // 开始录音
  startRecording: function() {
    // 确保录音管理器已初始化
    this.initRecorderManager()

    // 清除上一次的取消标志，防止误丢本次录音
    this._cancelRecording = false

    this.setData({ isRecording: true })

    // 使用PCM格式录音（百度语音识别需要），不支持时降级到AAC
    try {
      this.recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'pcm'
      })
    } catch (err) {
      console.warn('PCM格式不支持，降级到AAC:', err)
      this.recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'aac'
      })
    }
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
      // P1 修复：置取消标志，onStop 回调据此丢弃音频（否则取消的录音仍会识别填字）
      this._cancelRecording = true
      this.recorderManager.stop()
      this.setData({ isRecording: false })
      wx.showToast({
        title: '已取消录音',
        icon: 'none'
      })
    }
  },

  // 语音转文字
  speechToText: function(tempFilePath) {
    var that = this
    wx.showLoading({ title: '识别中...' })
    
    // 读取PCM音频文件并转为base64
    var fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: tempFilePath,
      success: function(res) {
        // 将音频数据转为base64
        var base64Data = wx.arrayBufferToBase64(res.data)
        
        // 调用云函数进行语音识别
        wx.cloud.callFunction({
          name: 'ai-chat',
          data: { familyId: auth.getCurrentFamilyId(),
            action: 'speechToText',
            audioData: base64Data
          },
          success: function(result) {
            wx.hideLoading()
            if (result.result && result.result.code === 0 && result.result.data.text) {
              // 识别成功，将文字填入输入框
              that.setData({
                inputValue: that.data.inputValue + result.result.data.text
              })
              wx.showToast({ title: '识别成功', icon: 'success' })
            } else {
              wx.showToast({ 
                title: result.result ? result.result.msg : '未识别到内容', 
                icon: 'none' 
              })
            }
          },
          fail: function(err) {
            wx.hideLoading()
            console.error('语音识别失败:', err)
            wx.showToast({ title: '识别失败，请重试', icon: 'none' })
          }
        })
      },
      fail: function(err) {
        wx.hideLoading()
        console.error('读取音频文件失败:', err)
        wx.showToast({ title: '识别失败', icon: 'none' })
      }
    })
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
    // 将单个image转为images数组格式
    this.sendMessage({
      content: content,
      images: image ? [image] : [],
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

  // 转发消息
  forwardMessage: function(e) {
    var content = e.currentTarget.dataset.content
    if (!content) return

    // 设置转发内容
    this._shareContent = content

    // 隐藏操作菜单
    this.hideMessageActions()

    // 复制内容到剪贴板（微信小程序只能分享页面链接，不能直接分享文本）
    wx.setClipboardData({
      data: content,
      success: function() {
        wx.showToast({ title: '已复制，可粘贴发送', icon: 'success', duration: 2000 })
      }
    })
  },

  // 分享给朋友（生命周期函数）
  onShareAppMessage: function() {
    var content = this._shareContent || '来自AI助手的分享'
    // 截取前100字作为标题
    var title = content.substring(0, 100)
    if (content.length > 100) title += '...'
    
    return {
      title: title,
      path: '/packageCreate/pages/create/ai-chat/index'
    }
  },

  // 收藏消息
  collectMessage: function(e) {
    var id = e.currentTarget.dataset.id
    var content = e.currentTarget.dataset.content
    if (!content) return
    
    // 保存到本地收藏
    var collections = childStorage.get('messageCollections') || []
    collections.unshift({
      id: id,
      content: content.substring(0, 200), // 只保存前200字
      time: new Date().toISOString()
    })
    // 最多保存100条收藏
    if (collections.length > 100) {
      collections = collections.slice(0, 100)
    }
    childStorage.set('messageCollections', collections)
    
    wx.showToast({ title: '已收藏', icon: 'success' })
    this.hideMessageActions()
  },

  // 朗读消息
  speakMessage: function(e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var content = e.currentTarget.dataset.content
    if (!content) return
    
    // 如果正在播放，停止播放
    if (speakTool.getIsSpeaking() && this.data.currentSpeakingId === id) {
      speakTool.stopSpeak()
      this.updateSpeakingState(id, false)
      return
    }
    
    // 停止之前的播放
    speakTool.stopSpeak()
    if (this.data.currentSpeakingId) {
      this.updateSpeakingState(this.data.currentSpeakingId, false)
    }
    
    // 提取纯文本（去除markdown标记）
    var plainText = content
      .replace(/[#*`\[\]()!>~|]/g, '')
      .replace(/\n+/g, '。')
      .substring(0, 500)
    
    // 更新状态
    this.updateSpeakingState(id, true)
    
    // 使用speak工具朗读
    speakTool.speak(plainText, function(success) {
      that.updateSpeakingState(id, false)
    })
  },

  // 更新朗读状态
  updateSpeakingState: function(id, isSpeaking) {
    var messages = this.data.messages.map(function(msg) {
      if (msg.id === id) {
        return Object.assign({}, msg, { isSpeaking: isSpeaking })
      }
      return msg
    })
    this.setData({ 
      messages: messages,
      currentSpeakingId: isSpeaking ? id : null
    })
  },

  // 显示语音设置
  showVoiceSettings: function() {
    var that = this
    this.setData({ showMorePanel: false })
    
    try {
      var currentVoice = speakTool.getCurrentVoice()
      var currentEngine = speakTool.getEngine()
    } catch (err) {
      console.error('获取语音设置失败:', err)
      wx.showToast({ title: '语音功能加载失败', icon: 'none' })
      return
    }
    
    // 引擎Tab
    var engineTabs = [
      { key: 'edge', name: 'Edge TTS' },
      { key: 'baidu', name: '百度TTS' },
      { key: 'mimo', name: '大模型TTS' }
    ]
    
    // Edge TTS音色
    var edgeVoiceList = speakTool.getEdgeVoiceList()
    
    // 百度TTS音色分组
    var baiduVoiceGroups = speakTool.getBaiduVoiceGroups()
    var baiduGroupTabs = [{ key: 'all', name: '全部' }]
    Object.keys(baiduVoiceGroups).forEach(function(groupName) {
      baiduGroupTabs.push({ key: groupName, name: groupName })
    })
    var baiduVoiceList = speakTool.getBaiduVoiceList()
    
    // 大模型TTS音色
    var mimoVoiceList = speakTool.getMimoVoiceList()
    
    // 获取当前音色名称
    var currentVoiceName = ''
    var allLists = [edgeVoiceList, baiduVoiceList, mimoVoiceList]
    for (var i = 0; i < allLists.length; i++) {
      for (var j = 0; j < allLists[i].length; j++) {
        if (allLists[i][j].id === currentVoice) {
          currentVoiceName = allLists[i][j].name
          break
        }
      }
      if (currentVoiceName) break
    }

    this.setData({
      showVoiceModal: true,
      engineTabs: engineTabs,
      currentEngineTab: currentEngine || 'edge',
      edgeVoiceList: edgeVoiceList,
      baiduGroupTabs: baiduGroupTabs,
      currentBaiduGroupTab: 'all',
      baiduVoiceList: baiduVoiceList,
      mimoCallType: 'direct',
      mimoVoiceList: mimoVoiceList,
      currentVoiceName: currentVoiceName,
      currentVoiceId: currentVoice
    })
  },

  // 切换引擎Tab
  switchEngineTab: function(e) {
    var engineKey = e.currentTarget.dataset.key
    this.setData({ currentEngineTab: engineKey })
  },

  // 切换百度分组Tab
  switchBaiduGroupTab: function(e) {
    var groupKey = e.currentTarget.dataset.key
    var baiduVoiceGroups = speakTool.getBaiduVoiceGroups()
    var allBaiduList = speakTool.getBaiduVoiceList()
    
    var filteredList = allBaiduList
    if (groupKey !== 'all') {
      filteredList = allBaiduList.filter(function(voice) {
        return voice.group === groupKey
      })
    }
    
    this.setData({
      currentBaiduGroupTab: groupKey,
      baiduVoiceList: filteredList
    })
  },

  // 切换大模型分组Tab
  switchMimoGroupTab: function(e) {
    // 目前大模型只有一个音色，不需要过滤
    this.setData({ currentMimoGroupTab: 'all' })
  },

  // 切换大模型调用方式
  switchMimoCallType: function(e) {
    var callType = e.currentTarget.dataset.type
    this.setData({ mimoCallType: callType })
  },

  // 切换TTS引擎
  selectVoiceEngine: function(e) {
    var engineId = e.currentTarget.dataset.id
    speakTool.setEngine(engineId)
    var newList = speakTool.getEngineList()
    var newVoice = speakTool.getCurrentVoice()
    var engineName = '语音设置'
    for (var i = 0; i < newList.length; i++) {
      if (newList[i].active) { engineName = newList[i].name; break }
    }
    var voiceList = speakTool.getVoiceList()
    var voiceName = ''
    for (var j = 0; j < voiceList.length; j++) {
      if (voiceList[j].id === newVoice) { voiceName = voiceList[j].name; break }
    }
    
    // 更新筛选后的引擎列表
    var filteredEngineList = newList
    if (this.data.currentEngineGroupTab !== 'all') {
      filteredEngineList = newList.filter(function(engine) {
        return engine.group === this.data.currentEngineGroupTab
      }.bind(this))
    }
    
    this.setData({
      filteredEngineList: filteredEngineList,
      voiceVoiceList: voiceList,
      currentVoiceId: newVoice,
      currentEngineName: engineName,
      currentVoiceName: voiceName
    })
    wx.showToast({ title: '已切换', icon: 'success' })
  },

  // 切换音色
  selectVoice: function(e) {
    var voiceId = e.currentTarget.dataset.id
    var engine = e.currentTarget.dataset.engine
    
    // 根据引擎切换
    if (engine) {
      speakTool.setEngine(engine)
    }
    
    // 设置音色
    speakTool.setVoice(voiceId)
    
    // 获取音色名称
    var voiceName = ''
    var voiceList = []
    if (engine === 'edge') {
      voiceList = this.data.edgeVoiceList
    } else if (engine === 'baidu') {
      voiceList = this.data.baiduVoiceList
    } else if (engine === 'mimo') {
      voiceList = this.data.mimoVoiceList
    }
    
    for (var i = 0; i < voiceList.length; i++) {
      if (voiceList[i].id === voiceId) {
        voiceName = voiceList[i].name
        break
      }
    }
    
    this.setData({ 
      currentVoiceId: voiceId, 
      currentVoiceName: voiceName
    })
    
    wx.showToast({ title: '已切换到 ' + voiceName, icon: 'success' })
  },

  // 关闭语音设置弹窗
  hideVoiceModal: function() {
    this.setData({ showVoiceModal: false })
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
