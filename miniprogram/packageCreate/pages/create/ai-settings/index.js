var aiManager = getApp().globalData.aiManager
var auth = require('../../../../utils/auth.js')

// 全量模型列表每页展示条数
var ALL_MODELS_PAGE_SIZE = 50

Page({
  data: {
    activeTab: 'prompt', // model 或 prompt，默认打开提示词
    callType: 'direct',
    domesticModels: [],
    platformModels: [],
    currentModel: 'minimax',
    currentSubModel: '',
    currentSubModelName: '',
    isCustomSubModel: false,
    hasKeyByProvider: {},
    balanceMap: {},
    currentModelInfo: {},
    expandModel: false,
    configuredModels: {},
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
    allModelsBrowseOnly: false,
    _allModelsProvider: '',
    templates: [],
    currentTemplate: 'default',
    currentTemplateContent: '',
    customPrompt: '',
    apiKey: '',
    secretKey: '',
    showApiKey: false,
    showSecretKey: false,
    saving: false,
    testing: false,
    // TTS配置
    ttsEngines: [
      { key: 'edge', name: 'Edge TTS' },
      { key: 'baidu', name: '百度TTS' },
      { key: 'mimo', name: '大模型TTS' }
    ],
    currentTtsEngine: 'edge',
    ttsCallType: 'direct',
    // 小米TTS配置
    mimoTtsApiKey: '',
    mimoTtsPlanApiKey: '',
    showMimoTtsKey: false,
    showMimoTtsPlanKey: false,
    savingMimoTts: false,
    testingMimoTts: false,
    // 百度TTS配置
    baiduAppId: '',
    baiduApiKey: '',
    baiduSecretKey: '',
    showBaiduApiKey: false,
    showBaiduSecretKey: false,
    savingBaiduTts: false,
    testingBaiduTts: false,
    baiduVoiceGroups: [],
    currentBaiduGroup: 'all',
    currentBaiduVoiceList: [],
    // 小米TTS音色
    mimoVoiceList: []
  },

  onLoad: function() {
    this.initModels()
    this.initTemplates()
    this.loadConfig()
    this.initVoiceLists()
  },

  onShow: function() {
    this.setThemeColor()
    this.loadConfig()
  },

  setThemeColor: function() {
    var app = getApp()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: app.globalData.themeColor || '#FF9AAB',
      animation: { duration: 0 }
    })
  },

  // 切换Tab
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 初始化音色列表
  initVoiceLists: function() {
    var speakTool = require('../../../../utils/speak')
    
    // 百度TTS音色分组
    var baiduVoiceGroups = [
      { key: 'all', name: '全部' },
      { key: '基础音库', name: '基础音库' },
      { key: '精品音库', name: '精品音库' },
      { key: '臻品音库', name: '臻品音库' },
      { key: '大模型音库', name: '大模型音库' }
    ]
    
    var baiduVoiceList = speakTool.getBaiduVoiceList()
    
    // 小米TTS音色
    var mimoVoiceList = speakTool.getMimoVoiceList()
    
    this.setData({
      baiduVoiceGroups: baiduVoiceGroups,
      currentBaiduGroup: 'all',
      currentBaiduVoiceList: baiduVoiceList,
      mimoVoiceList: mimoVoiceList
    })
  },

  // 切换百度音色分组
  switchBaiduGroup: function(e) {
    var groupKey = e.currentTarget.dataset.key
    var speakTool = require('../../../../utils/speak')
    var baiduVoiceList = speakTool.getBaiduVoiceList()
    
    var filteredList = baiduVoiceList
    if (groupKey !== 'all') {
      filteredList = baiduVoiceList.filter(function(voice) {
        return voice.group === groupKey
      })
    }
    
    this.setData({
      currentBaiduGroup: groupKey,
      currentBaiduVoiceList: filteredList
    })
  },

  // 初始化模型列表
  initModels: function() {
    var that = this
    var modelsObj = aiManager.getModels()
    var domesticModels = []
    var platformModels = []
    
    for (var key in modelsObj) {
      var model = {
        key: key,
        info: Object.assign({}, modelsObj[key], {
          subModels: aiManager.getMergedSubModels(key)
        }),
        configured: false,
        hasDynamicModels: this.hasDynamicModels(key)
      }
      
      if (modelsObj[key].callType === 'direct') {
        domesticModels.push(model)
      } else if (modelsObj[key].callType === 'plan') {
        platformModels.push(model)
      }
    }
    
    // 获取配置并更新状态
    aiManager.getConfig().then(function(config) {
      var configuredModels = config.models || {}
      var currentModel = config.currentModel || 'minimax'
      
      // 更新配置状态
      domesticModels = domesticModels.map(function(m) {
        return Object.assign({}, m, {
          configured: !!(configuredModels[m.key] && configuredModels[m.key].apiKey)
        })
      })
      
      platformModels = platformModels.map(function(m) {
        return Object.assign({}, m, {
          configured: !!(configuredModels[m.key] && configuredModels[m.key].apiKey)
        })
      })
      
      // 排序：已配置的排前面，当前选中的排第一
      var sortFn = function(a, b) {
        if (a.key === currentModel) return -1
        if (b.key === currentModel) return 1
        if (a.configured && !b.configured) return -1
        if (!a.configured && b.configured) return 1
        return 0
      }
      
      domesticModels.sort(sortFn)
      platformModels.sort(sortFn)
      
      that.setData({ 
        domesticModels: domesticModels,
        platformModels: platformModels
      })
    }).catch(function() {
      that.setData({ 
        domesticModels: domesticModels,
        platformModels: platformModels
      })
    })
  },

  // 初始化提示词模板
  initTemplates: function() {
    var templatesObj = aiManager.getPromptTemplates()
    var templates = []
    
    for (var key in templatesObj) {
      templates.push({
        key: key,
        icon: templatesObj[key].icon,
        name: templatesObj[key].name,
        desc: templatesObj[key].desc || '',
        prompt: templatesObj[key].prompt || ''
      })
    }
    
    this.setData({ templates: templates })
  },

  // 加载配置
  loadConfig: function() {
    var that = this
    
    aiManager.getConfig().then(function(config) {
      var modelInfo = aiManager.getModelInfo(config.currentModel)
      var callType = modelInfo ? modelInfo.callType : 'direct'
      var currentTemplate = config.promptTemplate || 'default'
      
      // 获取当前模板内容
      var templateContent = that.getTemplateContent(currentTemplate)
      
      // 获取已配置的厂商列表
      var configuredModels = {}
      if (config.models) {
        for (var key in config.models) {
          if (config.models[key] && config.models[key].apiKey) {
            configuredModels[key] = true
          }
        }
      }
      
      // 获取当前子模型和名称
      var currentSubModel = config.models[config.currentModel]?.model || ''
      var currentSubModelName = ''
      
      if (!currentSubModel && modelInfo && modelInfo.subModels && modelInfo.subModels.length > 0) {
        currentSubModel = modelInfo.subModels[0].key
        currentSubModelName = modelInfo.subModels[0].name
      } else if (currentSubModel && modelInfo && modelInfo.subModels) {
        for (var i = 0; i < modelInfo.subModels.length; i++) {
          if (modelInfo.subModels[i].key === currentSubModel) {
            currentSubModelName = modelInfo.subModels[i].name
            break
          }
        }
        // 全量模型弹窗选中的 id 不在本地预设列表时，用 id 兜底展示
        if (!currentSubModelName) {
          currentSubModelName = currentSubModel
        }
      }
      
      // 更新模型列表的配置状态并排序
      var domesticModels = that.data.domesticModels.map(function(m) {
        return Object.assign({}, m, {
          configured: !!configuredModels[m.key]
        })
      })
      
      var platformModels = that.data.platformModels.map(function(m) {
        return Object.assign({}, m, {
          configured: !!configuredModels[m.key]
        })
      })
      
      // 排序：已配置的排前面，当前选中的排第一
      var currentModel = config.currentModel || 'minimax'
      var sortFn = function(a, b) {
        if (a.key === currentModel) return -1
        if (b.key === currentModel) return 1
        if (a.configured && !b.configured) return -1
        if (!a.configured && b.configured) return 1
        return 0
      }
      
      domesticModels.sort(sortFn)
      platformModels.sort(sortFn)
      
      that.setData({
        callType: callType,
        currentModel: currentModel,
        currentTemplate: currentTemplate,
        currentTemplateContent: templateContent,
        customPrompt: config.systemPrompt || '',
        apiKey: config.models[config.currentModel]?.apiKey || '',
        secretKey: config.models[config.currentModel]?.secretKey || '',
        hasKeyByProvider: config.hasKeyByProvider || {},
        currentModelInfo: modelInfo || {},
        currentSubModel: currentSubModel,
        currentSubModelName: currentSubModelName,
        isCustomSubModel: that.isCustomSubModelKey(currentModel, currentSubModel),
        configuredModels: configuredModels,
        domesticModels: domesticModels,
        platformModels: platformModels,
        expandModel: false
      })
    })
    
    // 加载TTS配置
    that.loadTtsConfig()
  },

  // 加载TTS配置
  loadTtsConfig: function() {
    var that = this
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'getTtsConfig'
      },
      success: function(result) {
        if (result.result && result.result.code === 0) {
          var ttsConfig = result.result.data || {}
          // P0-7：云函数不再回传明文密钥，只回就绪状态；表单留空=保持已有配置不变
          that.setData({
            mimoTtsReady: !!ttsConfig.mimoTtsReady,
            baiduTtsReady: !!ttsConfig.baiduTtsReady,
            mimoTtsApiKey: '',
            mimoTtsPlanApiKey: '',
            baiduAppId: '',
            baiduApiKey: '',
            baiduSecretKey: ''
          })
        }
      },
      fail: function(err) {
        console.error('加载TTS配置失败:', err)
      }
    })
  },

  // 获取模板内容
  getTemplateContent: function(templateKey) {
    var templatesObj = aiManager.getPromptTemplates()
    var template = templatesObj[templateKey]
    return template ? template.prompt : ''
  },

  // 切换调用方式
  switchCallType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ callType: type, expandModel: false })
    
    // 切换后自动选择第一个模型
    if (type === 'direct') {
      var firstModel = this.data.domesticModels[0]
      if (firstModel) {
        this.selectModel({ currentTarget: { dataset: { key: firstModel.key } } })
      }
    } else {
      var firstPlatform = this.data.platformModels[0]
      if (firstPlatform) {
        this.selectModel({ currentTarget: { dataset: { key: firstPlatform.key } } })
      }
    }
  },

  // 选择模型
  selectModel: function(e) {
    var key = e.currentTarget.dataset.key
    var modelInfo = aiManager.getModelInfo(key)
    
    // 如果点击的是当前选中的模型，切换展开/折叠并加载配置
    if (key === this.data.currentModel) {
      this.setData({
        expandModel: !this.data.expandModel
      })
      // 即使是当前模型，也要加载配置以确保显示正确的API Key
      if (this.data.expandModel) {
        this.loadModelConfig(key, modelInfo)
      }
      return
    }
    
    // 加载配置并更新UI
    var that = this
    this.loadModelConfigData(key, modelInfo, function(apiKey, secretKey, subModel, subModelName) {
      that.setData({ 
        currentModel: key,
        currentModelInfo: modelInfo || {},
        currentSubModel: subModel,
        currentSubModelName: subModelName,
        isCustomSubModel: that.isCustomSubModelKey(key, subModel),
        expandModel: true,
        apiKey: apiKey,
        secretKey: secretKey,
        showApiKey: false,
        showSecretKey: false
      })
    })
    // 展开时顺带查询余额
    this.loadBalance(key)
  },

  // 加载模型配置
  loadModelConfig: function(key, modelInfo) {
    var that = this
    this.loadModelConfigData(key, modelInfo, function(apiKey, secretKey, subModel, subModelName) {
      that.setData({ 
        currentSubModel: subModel,
        currentSubModelName: subModelName,
        isCustomSubModel: that.isCustomSubModelKey(key, subModel),
        apiKey: apiKey,
        secretKey: secretKey,
        showApiKey: false,
        showSecretKey: false
      })
    })
    // 展开时顺带查询余额（支持的平台显示，不支持的静默）
    this.loadBalance(key)
  },

  // 查询供应商余额（一直显示：查询中/余额/未查到；不支持的平台直接显示未查到）
  loadBalance: function(provider, forceRefresh) {
    var that = this
    if (this.data.balanceMap[provider] && !forceRefresh) return
    var supported = (aiManager.getBalanceProviders && aiManager.getBalanceProviders()) || []
    if (supported.indexOf(provider) === -1) {
      var unsupportedMap = Object.assign({}, this.data.balanceMap)
      unsupportedMap[provider] = '未查到'
      that.setData({ balanceMap: unsupportedMap })
      return
    }
    var loadingMap = Object.assign({}, this.data.balanceMap)
    loadingMap[provider] = '查询中…'
    that.setData({ balanceMap: loadingMap })
    aiManager.getBalance(provider, forceRefresh).then(function(data) {
      var balanceMap = Object.assign({}, that.data.balanceMap)
      balanceMap[provider] = data.text
      that.setData({ balanceMap: balanceMap })
    }).catch(function() {
      var balanceMap = Object.assign({}, that.data.balanceMap)
      balanceMap[provider] = '未查到'
      that.setData({ balanceMap: balanceMap })
    })
  },

  // 加载模型配置数据（公共函数）
  loadModelConfigData: function(key, modelInfo, callback) {
    // 设置默认子模型
    var defaultSubModel = ''
    var defaultSubModelName = ''
    if (modelInfo && modelInfo.subModels && modelInfo.subModels.length > 0) {
      defaultSubModel = modelInfo.subModels[0].key
      defaultSubModelName = modelInfo.subModels[0].name
    }
    
    // 加载该厂商已保存的API Key
    var apiKey = ''
    var secretKey = ''
    
    aiManager.getConfig().then(function(config) {
      if (config.models && config.models[key]) {
        apiKey = config.models[key].apiKey || ''
        secretKey = config.models[key].secretKey || ''
        
        // 如果该厂商已保存了子模型，使用保存的子模型
        if (config.models[key].model) {
          defaultSubModel = config.models[key].model
          // 查找子模型名称
          if (modelInfo && modelInfo.subModels) {
            for (var i = 0; i < modelInfo.subModels.length; i++) {
              if (modelInfo.subModels[i].key === defaultSubModel) {
                defaultSubModelName = modelInfo.subModels[i].name
                break
              }
            }
          }
        }
      }
      
      callback(apiKey, secretKey, defaultSubModel, defaultSubModelName)
    })
  },

  // 选择子模型
  selectSubModel: function(e) {
    var key = e.currentTarget.dataset.key
    var name = e.currentTarget.dataset.name
    this.setData({ 
      currentSubModel: key,
      currentSubModelName: name,
      isCustomSubModel: this.isCustomSubModelKey(this.data.currentModel, key)
    })
  },

  // ========== 全量模型选择（供应商模型列表同步） ==========

  // 是否支持同步（以 ai-manager 为准）
  hasDynamicModels: function(key) {
    var list = (aiManager.getDynamicModelProviders && aiManager.getDynamicModelProviders()) || []
    return list.indexOf(key) > -1
  },

  // 打开全量模型弹窗
  showAllModels: function(e) {
    var provider = (e && e.currentTarget && e.currentTarget.dataset.provider) || this.data.currentModel
    if (!this.hasDynamicModels(provider)) {
      wx.showToast({ title: '该平台暂不支持模型同步', icon: 'none' })
      return
    }
    // siliconflow 无降级浏览能力，无 key 时提前拦截
    var hasKeyMap = this.data.hasKeyByProvider || {}
    if (provider === 'siliconflow' && !hasKeyMap[provider]) {
      wx.showToast({ title: '请先配置该供应商的API Key', icon: 'none' })
      return
    }
    this.setData({
      showAllModelsModal: true,
      allModelsList: [],
      allModelsFiltered: [],
      allModelsSearch: '',
      allModelsFilter: 'all',
      allModelsPage: 1,
      allModelsBrowseOnly: false,
      _allModelsProvider: provider
    })
    this.fetchAllModels(provider, false)
  },

  // 关闭全量模型弹窗
  hideAllModels: function() {
    this.setData({ showAllModelsModal: false })
  },

  // 拉取全量模型列表
  fetchAllModels: function(provider, forceRefresh) {
    var that = this
    that.setData({ allModelsLoading: true })
    aiManager.listModels(provider, 'chat', forceRefresh).then(function(data) {
      var list = (data.models || []).map(function(m) {
        return {
          id: m.id,
          name: m.name,
          desc: (m.contextLength ? '上下文' + that.formatContextLength(m.contextLength) : '') + (m.isFree ? ' · 免费' : (m.pricing && m.pricing.prompt != null ? ' · $' + m.pricing.prompt + '/百万token' : '')),
          isFree: m.isFree,
          supportsReasoning: !!m.supportsReasoning,
          supportsReasoningEffort: !!m.supportsReasoningEffort,
          reasoningEfforts: m.reasoningEfforts,
          defaultEffort: m.defaultEffort || null
        }
      })
      that.setData({
        allModelsLoading: false,
        allModelsList: list,
        allModelsTotal: list.length,
        allModelsRefreshing: false,
        allModelsBrowseOnly: !!(data.browseOnly)
      })
      that._allModelsCache = list
      that.applyAllModelsFilter()
      // 模型同步成功后联动刷新余额
      that.loadBalance(provider, true)
    }).catch(function(err) {
      console.error('拉取模型列表失败:', err)
      that.setData({ allModelsLoading: false, allModelsRefreshing: false })
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
    // 标记已在预设中的模型
    var merged = aiManager.getMergedSubModels(this.data._allModelsProvider)
    var presetKeys = {}
    for (var i = 0; i < merged.length; i++) { presetKeys[merged[i].key] = true }
    var filtered = source.filter(function(m) {
      if (filter === 'free' && !m.isFree) return false
      if (!keyword) return true
      return m.id.toLowerCase().indexOf(keyword) > -1 || m.name.toLowerCase().indexOf(keyword) > -1
    }).map(function(m) {
      return Object.assign({}, m, { inPreset: !!presetKeys[m.id] })
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
    if (this.data.allModelsFiltered.length < this.data.allModelsShown) {
      this.setData({ allModelsPage: nextPage })
      this.applyAllModelsFilter()
    }
  },

  // 刷新模型列表（3秒冷却）
  refreshAllModels: function() {
    if (this.data.allModelsRefreshing) return
    this.setData({ allModelsPage: 1, allModelsSearch: '', allModelsFilter: 'all', allModelsRefreshing: true })
    var that = this
    setTimeout(function() {
      that.setData({ allModelsRefreshing: false })
    }, 3000)
    this.fetchAllModels(this.data._allModelsProvider, true)
  },

  // 选中全量模型（仅更新页面状态，随保存配置统一保存）
  selectAllModel: function(e) {
    // 浏览模式（未配 Key）仅可看不可选
    if (this.data.allModelsBrowseOnly) {
      wx.showToast({ title: '仅浏览，配置 Key 后可选', icon: 'none' })
      return
    }
    var key = e.currentTarget.dataset.key
    this.setData({
      currentSubModel: key,
      currentSubModelName: e.currentTarget.dataset.name,
      isCustomSubModel: this.isCustomSubModelKey(this.data.currentModel, key),
      showAllModelsModal: false
    })
    wx.showToast({ title: '已选择，点保存配置生效', icon: 'none' })
  },

  // 从在线列表加入预设（立即保存）
  addPresetModel: function(e) {
    var that = this
    if (this.data.allModelsBrowseOnly) {
      wx.showToast({ title: '仅浏览，配置 Key 后可加预设', icon: 'none' })
      return
    }
    var provider = this.data._allModelsProvider
    var key = e.currentTarget.dataset.key
    var name = e.currentTarget.dataset.name
    aiManager.addCustomSubModel(provider, { key: key, name: name }).then(function() {
      wx.showToast({ title: '已加入预设', icon: 'success' })
      that.refreshSettingsModels(provider)
    }).catch(function(err) {
      wx.showToast({ title: err.message || '添加失败', icon: 'none' })
    })
  },

  // 从预设列表删除模型（立即保存）
  removePresetModel: function(e) {
    var that = this
    var provider = e.currentTarget.dataset.provider
    var key = e.currentTarget.dataset.key
    wx.showModal({
      title: '删除预设',
      content: '确定从预设列表删除该模型吗？',
      success: function(res) {
        if (!res.confirm) return
        aiManager.removeSubModel(provider, key).then(function() {
          // 删除的是当前选中则回退到第一项
          if (provider === that.data.currentModel && key === that.data.currentSubModel) {
            var list = aiManager.getMergedSubModels(provider)
            if (list.length > 0) {
              that.setData({
                currentSubModel: list[0].key,
                currentSubModelName: list[0].name,
                isCustomSubModel: that.isCustomSubModelKey(provider, list[0].key)
              })
            }
          }
          that.refreshSettingsModels(provider)
          wx.showToast({ title: '已删除', icon: 'success' })
        }).catch(function(err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        })
      }
    })
  },

  // 刷新指定供应商的预设列表展示
  refreshSettingsModels: function(provider) {
    var that = this
    var merged = aiManager.getMergedSubModels(provider)
    var updateList = function(list) {
      return list.map(function(m) {
        if (m.key === provider) {
          return Object.assign({}, m, { info: Object.assign({}, m.info, { subModels: merged }) })
        }
        return m
      })
    }
    var update = {
      domesticModels: updateList(this.data.domesticModels),
      platformModels: updateList(this.data.platformModels)
    }
    if (provider === this.data.currentModel) {
      update.currentModelInfo = Object.assign({}, this.data.currentModelInfo, { subModels: merged })
      update.isCustomSubModel = that.isCustomSubModelKey(provider, this.data.currentSubModel)
    }
    this.setData(update)
    // 同步更新全量弹窗里的预设标识
    if (this.data.showAllModelsModal) {
      this.applyAllModelsFilter()
    }
  },

  // 判断子模型是否为在线同步的自定义模型（不在合并后的预设列表里）
  isCustomSubModelKey: function(provider, key) {
    if (!key) return false
    var merged = aiManager.getMergedSubModels(provider)
    for (var i = 0; i < merged.length; i++) {
      if (merged[i].key === key) return false
    }
    return true
  },

  // 阻止事件冒泡（弹窗内容区点击不关闭）
  stopPropagation: function() {},

  // 选择提示词模板
  selectTemplate: function(e) {
    var key = e.currentTarget.dataset.key
    var templateContent = this.getTemplateContent(key)
    
    this.setData({ 
      currentTemplate: key,
      currentTemplateContent: templateContent
    })
  },

  // 复制模板内容
  copyTemplateContent: function() {
    var content = this.data.currentTemplateContent
    
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
  },

  // 输入API Key
  onApiKeyInput: function(e) {
    this.setData({ apiKey: e.detail.value })
  },

  // 输入Secret Key
  onSecretKeyInput: function(e) {
    this.setData({ secretKey: e.detail.value })
  },

  // 切换Key可见性
  toggleKeyVisibility: function() {
    this.setData({ showApiKey: !this.data.showApiKey })
  },

  // 切换Secret可见性
  toggleSecretVisibility: function() {
    this.setData({ showSecretKey: !this.data.showSecretKey })
  },

  // 输入自定义提示词
  onPromptInput: function(e) {
    this.setData({ customPrompt: e.detail.value })
  },

  // 测试API Key
  testApiKey: async function() {
    var that = this
    
    if (!this.data.apiKey) {
      wx.showToast({
        title: '请先输入API Key',
        icon: 'none'
      })
      return
    }
    
    this.setData({ testing: true })
    
    try {
      // 直接测试API Key，不需要先保存
      var res = await wx.cloud.callFunction({
        name: 'ai-chat',
        data: { familyId: auth.getCurrentFamilyId(),
          action: 'testConfig',
          model: this.data.currentModel,
          apiKey: this.data.apiKey,
          secretKey: this.data.secretKey || ''
        }
      })
      
      that.setData({ testing: false })
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '测试成功！',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.msg || '测试失败',
          icon: 'none',
          duration: 3000
        })
      }
    } catch (err) {
      that.setData({ testing: false })
      var msg = '测试失败'
      if (err.message && err.message.indexOf('timed out') >= 0) {
        msg = '云函数超时，请稍后重试'
      } else if (err.message) {
        msg = err.message
      }
      wx.showToast({
        title: msg,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 保存配置
  saveConfig: function() {
    var that = this
    
    if (this.data.saving) return
    
    if (!this.data.apiKey) {
      wx.showToast({
        title: '请输入API Key',
        icon: 'none'
      })
      return
    }
    
    if ((this.data.currentModel === 'wenxin' || this.data.currentModel === 'wenxin-plan') && !this.data.secretKey) {
      wx.showToast({
        title: '请输入Secret Key',
        icon: 'none'
      })
      return
    }
    
    this.setData({ saving: true })
    
    var modelsConfig = {}
    var modelConfig = {
      apiKey: this.data.apiKey,
      enabled: true
    }
    
    if (this.data.currentModel === 'wenxin' || this.data.currentModel === 'wenxin-plan') {
      modelConfig.secretKey = this.data.secretKey
    }
    
    if (this.data.currentSubModel) {
      modelConfig.model = this.data.currentSubModel
    }
    
    modelsConfig[this.data.currentModel] = modelConfig
    
    var config = {
      currentModel: this.data.currentModel,
      models: modelsConfig,
      systemPrompt: this.data.customPrompt,
      promptTemplate: this.data.currentTemplate
    }
    
    aiManager.saveConfig(config).then(function(res) {
      that.setData({ saving: false })
      
      var configuredModels = that.data.configuredModels
      configuredModels[that.data.currentModel] = true
      that.setData({ configuredModels: configuredModels })
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    }).catch(function(err) {
      that.setData({ saving: false })
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      })
    })
  },

  // 保存提示词配置
  savePrompt: function() {
    var that = this
    
    if (this.data.saving) return
    
    this.setData({ saving: true })
    
    var config = {
      systemPrompt: this.data.customPrompt,
      promptTemplate: this.data.currentTemplate
    }
    
    aiManager.saveConfig(config).then(function(res) {
      that.setData({ saving: false })
      wx.showToast({
        title: '提示词已保存',
        icon: 'success'
      })
    }).catch(function(err) {
      that.setData({ saving: false })
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      })
    })
  },

  // ========== TTS配置相关方法 ==========

  // 切换TTS引擎
  switchTtsEngine: function(e) {
    var engine = e.currentTarget.dataset.key
    this.setData({ currentTtsEngine: engine })
  },

  // 切换TTS调用方式
  switchTtsCallType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ ttsCallType: type })
  },

  // 输入小米TTS密钥
  onMimoTtsKeyInput: function(e) {
    this.setData({ mimoTtsApiKey: e.detail.value })
  },

  // 输入小米TTS套餐密钥
  onMimoTtsPlanKeyInput: function(e) {
    this.setData({ mimoTtsPlanApiKey: e.detail.value })
  },

  // 切换小米TTS密钥可见性
  toggleMimoTtsKeyVisibility: function() {
    this.setData({ showMimoTtsKey: !this.data.showMimoTtsKey })
  },

  // 切换小米TTS套餐密钥可见性
  toggleMimoTtsPlanKeyVisibility: function() {
    this.setData({ showMimoTtsPlanKey: !this.data.showMimoTtsPlanKey })
  },

  // 保存小米TTS密钥
  saveMimoTtsKey: function() {
    var that = this
    
    if (this.data.savingMimoTts) return

    // P0-7 配套：脱敏后表单不回显已存密钥，空值提交会覆盖真值，必须拦截
    var newKey = (this.data.mimoTtsApiKey || '').trim()
    if (!newKey) {
      wx.showToast({ title: '请输入新的API Key', icon: 'none' })
      return
    }

    this.setData({ savingMimoTts: true })

    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'saveTtsConfig',
        mimoTtsApiKey: newKey
      },
      success: function(result) {
        that.setData({ savingMimoTts: false })
        
        if (result.result && result.result.code === 0) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: result.result?.msg || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        that.setData({ savingMimoTts: false })
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 保存小米TTS套餐密钥
  saveMimoTtsPlanKey: function() {
    var that = this
    
    if (this.data.savingMimoTts) return

    // P0-7 配套：空值提交会覆盖已存真值，必须拦截
    var newKey = (this.data.mimoTtsPlanApiKey || '').trim()
    if (!newKey) {
      wx.showToast({ title: '请输入新的API Key', icon: 'none' })
      return
    }

    this.setData({ savingMimoTts: true })

    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'saveTtsConfig',
        mimoTtsPlanApiKey: newKey
      },
      success: function(result) {
        that.setData({ savingMimoTts: false })
        
        if (result.result && result.result.code === 0) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: result.result?.msg || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        that.setData({ savingMimoTts: false })
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 测试小米TTS连接
  testMimoTts: function() {
    var that = this
    
    if (this.data.testingMimoTts) return
    
    this.setData({ testingMimoTts: true })
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'testTts',
        engine: 'mimo'
      },
      success: function(result) {
        that.setData({ testingMimoTts: false })
        
        if (result.result && result.result.code === 0) {
          wx.showToast({
            title: '测试成功！',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: result.result?.msg || '测试失败',
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: function(err) {
        that.setData({ testingMimoTts: false })
        wx.showToast({
          title: '测试失败',
          icon: 'none'
        })
      }
    })
  },

  // ========== 百度TTS配置相关方法 ==========

  // 输入百度App ID
  onBaiduAppIdInput: function(e) {
    this.setData({ baiduAppId: e.detail.value })
  },

  // 输入百度API Key
  onBaiduApiKeyInput: function(e) {
    this.setData({ baiduApiKey: e.detail.value })
  },

  // 输入百度Secret Key
  onBaiduSecretKeyInput: function(e) {
    this.setData({ baiduSecretKey: e.detail.value })
  },

  // 切换百度API Key可见性
  toggleBaiduApiKeyVisibility: function() {
    this.setData({ showBaiduApiKey: !this.data.showBaiduApiKey })
  },

  // 切换百度Secret Key可见性
  toggleBaiduSecretKeyVisibility: function() {
    this.setData({ showBaiduSecretKey: !this.data.showBaiduSecretKey })
  },

  // 保存百度TTS配置
  saveBaiduTtsConfig: function() {
    var that = this
    
    if (this.data.savingBaiduTts) return

    // P0-7 配套：脱敏后表单不回显，只提交非空字段防止空串覆盖已存真值
    var patch = {}
    var baiduAppId = (this.data.baiduAppId || '').trim()
    var baiduApiKey = (this.data.baiduApiKey || '').trim()
    var baiduSecretKey = (this.data.baiduSecretKey || '').trim()
    if (baiduAppId) patch.baiduAppId = baiduAppId
    if (baiduApiKey) patch.baiduApiKey = baiduApiKey
    if (baiduSecretKey) patch.baiduSecretKey = baiduSecretKey
    if (Object.keys(patch).length === 0) {
      wx.showToast({ title: '请至少填写一项', icon: 'none' })
      return
    }

    this.setData({ savingBaiduTts: true })

    wx.cloud.callFunction({
      name: 'ai-chat',
      data: Object.assign({ familyId: auth.getCurrentFamilyId(),
        action: 'saveTtsConfig',
        engine: 'baidu'
      }, patch),
      success: function(result) {
        that.setData({ savingBaiduTts: false })
        
        if (result.result && result.result.code === 0) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: result.result?.msg || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        that.setData({ savingBaiduTts: false })
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 测试百度TTS连接
  testBaiduTts: function() {
    var that = this
    
    if (this.data.testingBaiduTts) return
    
    this.setData({ testingBaiduTts: true })
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'testTts',
        engine: 'baidu'
      },
      success: function(result) {
        that.setData({ testingBaiduTts: false })
        
        if (result.result && result.result.code === 0) {
          wx.showToast({
            title: '测试成功！',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: result.result?.msg || '测试失败',
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: function(err) {
        that.setData({ testingBaiduTts: false })
        wx.showToast({
          title: '测试失败',
          icon: 'none'
        })
      }
    })
  }
})
