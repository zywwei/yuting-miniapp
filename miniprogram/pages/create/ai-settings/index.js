var aiManager = require('../../../utils/ai-manager.js')

Page({
  data: {
    activeTab: 'prompt', // model 或 prompt，默认打开提示词
    callType: 'direct',
    domesticModels: [],
    platformModels: [],
    currentModel: 'minimax',
    currentSubModel: '',
    currentSubModelName: '',
    currentModelInfo: {},
    expandModel: false,
    configuredModels: {},
    templates: [],
    currentTemplate: 'default',
    currentTemplateContent: '',
    customPrompt: '',
    apiKey: '',
    secretKey: '',
    showApiKey: false,
    showSecretKey: false,
    saving: false,
    testing: false
  },

  onLoad: function() {
    this.initModels()
    this.initTemplates()
    this.loadConfig()
  },

  onShow: function() {
    this.setThemeColor()
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

  // 初始化模型列表
  initModels: function() {
    var modelsObj = aiManager.getModels()
    var domesticModels = []
    var platformModels = []
    
    for (var key in modelsObj) {
      var model = {
        key: key,
        info: modelsObj[key]
      }
      
      if (modelsObj[key].callType === 'direct') {
        domesticModels.push(model)
      } else if (modelsObj[key].callType === 'plan') {
        platformModels.push(model)
      }
    }
    
    this.setData({ 
      domesticModels: domesticModels,
      platformModels: platformModels
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
      }
      
      that.setData({
        callType: callType,
        currentModel: config.currentModel || 'minimax',
        currentTemplate: currentTemplate,
        currentTemplateContent: templateContent,
        customPrompt: config.systemPrompt || '',
        apiKey: config.models[config.currentModel]?.apiKey || '',
        secretKey: config.models[config.currentModel]?.secretKey || '',
        currentModelInfo: modelInfo || {},
        currentSubModel: currentSubModel,
        currentSubModelName: currentSubModelName,
        configuredModels: configuredModels,
        expandModel: false
      })
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
    
    // 如果点击的是当前选中的模型，切换展开/折叠
    if (key === this.data.currentModel) {
      this.setData({
        expandModel: !this.data.expandModel
      })
      return
    }
    
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
      }
      
      this.setData({ 
        currentModel: key,
        currentModelInfo: modelInfo || {},
        currentSubModel: defaultSubModel,
        currentSubModelName: defaultSubModelName,
        expandModel: true, // 切换厂商时自动展开
        apiKey: apiKey,
        secretKey: secretKey,
        showApiKey: false,
        showSecretKey: false
      })
    }.bind(this))
  },

  // 选择子模型
  selectSubModel: function(e) {
    var key = e.currentTarget.dataset.key
    var name = e.currentTarget.dataset.name
    this.setData({ 
      currentSubModel: key,
      currentSubModelName: name
    })
  },

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
  testApiKey: function() {
    var that = this
    
    if (!this.data.apiKey) {
      wx.showToast({
        title: '请先输入API Key',
        icon: 'none'
      })
      return
    }
    
    this.setData({ testing: true })
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'chat',
        childId: '',
        sessionId: 'test_' + Date.now(),
        message: '你好',
        model: this.data.currentModel
      }
    }).then(function(res) {
      that.setData({ testing: false })
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '测试成功！',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.msg || '测试失败',
          icon: 'none'
        })
      }
    }).catch(function(err) {
      that.setData({ testing: false })
      wx.showToast({
        title: '测试失败：' + err.message,
        icon: 'none'
      })
    })
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
  }
})
