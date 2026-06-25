/**
 * AI对话前端管理器
 * 封装所有与AI对话相关的前端操作
 */

var childStorage = require('./child-storage.js')
var auth = require('./auth.js')

// 本地存储key
var CONFIG_KEY = 'aiConfig'
var CHATS_KEY = 'aiChats'

// 预设模型列表 - 2026年6月最新版本
var MODELS = {
  // 直接调用(按量付费) - 国内模型
  'minimax': {
    name: 'MiniMax',
    provider: 'MiniMax',
    icon: '🎵',
    description: '多模态，超长上下文',
    color: '#7C3AED',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'MiniMax-M3',
    subModels: [
      { key: 'MiniMax-M3', name: 'M3', desc: '最新旗舰，1M上下文' },
      { key: 'MiniMax-M2.7', name: 'M2.7', desc: '自我迭代' },
      { key: 'MiniMax-M2.7-highspeed', name: 'M2.7高速', desc: '速度更快' },
      { key: 'MiniMax-M2.5', name: 'M2.5', desc: '性价比高' }
    ]
  },
  'zhipu': {
    name: '智谱GLM',
    provider: '智谱AI',
    icon: '🔬',
    description: '旗舰模型，1M上下文',
    color: '#059669',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'glm-5.2',
    subModels: [
      { key: 'glm-5.2', name: 'GLM-5.2', desc: '旗舰，1M上下文' },
      { key: 'glm-5.1', name: 'GLM-5.1', desc: 'Coding能力强' },
      { key: 'glm-4.7', name: 'GLM-4.7', desc: '通用对话' },
      { key: 'glm-4.7-flash', name: 'GLM-4.7-Flash', desc: '免费模型' }
    ]
  },
  'kimi': {
    name: 'Kimi',
    provider: '月之暗面',
    icon: '🌙',
    description: '多模态，超长上下文',
    color: '#6366F1',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'kimi-k2.6',
    subModels: [
      { key: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', desc: '最强Coding' },
      { key: 'kimi-k2.6', name: 'Kimi K2.6', desc: '多模态理解' },
      { key: 'kimi-k2.5', name: 'Kimi K2.5', desc: '性价比高' }
    ]
  },
  'wenxin': {
    name: '文心一言',
    provider: '百度',
    icon: '📝',
    description: '中文优化，知识丰富',
    color: '#2932E1',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'ernie-4.0-turbo-8k',
    subModels: [
      { key: 'ernie-4.0-turbo-8k', name: 'ERNIE 4.0 Turbo', desc: '最新旗舰' },
      { key: 'ernie-3.5-8k', name: 'ERNIE 3.5', desc: '高性价比' },
      { key: 'ernie-speed-8k', name: 'ERNIE Speed', desc: '快速响应' }
    ]
  },
  'qwen': {
    name: '通义千问',
    provider: '阿里',
    icon: '💡',
    description: '中文强，性价比高',
    color: '#FF6A00',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'qwen3.7-max',
    subModels: [
      { key: 'qwen3.7-max', name: 'Qwen3.7-Max', desc: '最新旗舰' },
      { key: 'qwen3.7-plus', name: 'Qwen3.7-Plus', desc: '均衡性能' },
      { key: 'qwen3.6-flash', name: 'Qwen3.6-Flash', desc: '快速响应' }
    ]
  },
  'deepseek': {
    name: 'DeepSeek',
    provider: 'DeepSeek',
    icon: '🔮',
    description: '最新旗舰，推理优秀',
    color: '#4D6BFE',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'deepseek-v4-flash',
    subModels: [
      { key: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', desc: '最强性能' },
      { key: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', desc: '快速响应' }
    ]
  },
  'mimo': {
    name: 'MiMo',
    provider: '小米',
    icon: '📱',
    description: '按量计费，灵活使用',
    color: '#FF6900',
    callType: 'direct',
    category: 'domestic',
    defaultModel: 'mimo-v2.5-pro',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    subModels: [
      { key: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro', desc: '最新旗舰' },
      { key: 'mimo-v2.5', name: 'MiMo V2.5', desc: '均衡性能' },
      { key: 'mimo-v2', name: 'MiMo V2', desc: '轻量快速' }
    ]
  },
  // 套餐(Plan) - 厂家套餐
  'mimo-plan': {
    name: 'MiMo Token Plan',
    provider: '小米',
    icon: '🎫',
    description: '固定订阅，套餐限量',
    color: '#FF6900',
    callType: 'plan',
    category: 'platform',
    defaultModel: 'mimo-v2.5-pro',
    baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    subModels: [
      { key: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro', desc: '最新旗舰' },
      { key: 'mimo-v2.5', name: 'MiMo V2.5', desc: '均衡性能' },
      { key: 'mimo-v2', name: 'MiMo V2', desc: '轻量快速' }
    ]
  },
  'zhipu-plan': {
    name: '智谱 Coding Plan',
    provider: '智谱AI',
    icon: '💻',
    description: '编程套餐，专属优惠',
    color: '#059669',
    callType: 'plan',
    category: 'platform',
    defaultModel: 'glm-5.2',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    subModels: [
      { key: 'glm-5.2', name: 'GLM-5.2', desc: '旗舰，1M上下文' },
      { key: 'glm-5.1', name: 'GLM-5.1', desc: 'Coding能力强' },
      { key: 'glm-4.7', name: 'GLM-4.7', desc: '通用对话' }
    ]
  },
  'minimax-plan': {
    name: 'MiniMax Token Plan',
    provider: 'MiniMax',
    icon: '🎫',
    description: 'Plus¥49/Max¥119/Ultra¥469',
    color: '#7C3AED',
    callType: 'plan',
    category: 'platform',
    defaultModel: 'MiniMax-M3',
    subModels: [
      { key: 'MiniMax-M3', name: 'M3', desc: '最新旗舰，1M上下文' },
      { key: 'MiniMax-M2.7', name: 'M2.7', desc: '自我迭代' },
      { key: 'MiniMax-M2.7-highspeed', name: 'M2.7高速', desc: '速度更快' },
      { key: 'MiniMax-M2.5', name: 'M2.5', desc: '性价比高' }
    ]
  },
  'wenxin-plan': {
    name: '文心 Coding Plan',
    provider: '百度',
    icon: '💻',
    description: '编程套餐，企业版可选',
    color: '#2932E1',
    callType: 'plan',
    category: 'platform',
    defaultModel: 'ernie-4.0-turbo-8k',
    subModels: [
      { key: 'ernie-4.0-turbo-8k', name: 'ERNIE 4.0 Turbo', desc: '最新旗舰' },
      { key: 'ernie-3.5-8k', name: 'ERNIE 3.5', desc: '高性价比' },
      { key: 'ernie-speed-8k', name: 'ERNIE Speed', desc: '快速响应' }
    ]
  },
  'kimi-plan': {
    name: 'Kimi Coding Plan',
    provider: '月之暗面',
    icon: '💻',
    description: '编程套餐，K2.7 Code专属',
    color: '#6366F1',
    callType: 'plan',
    category: 'platform',
    defaultModel: 'kimi-k2.7-code',
    subModels: [
      { key: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', desc: '最强Coding' },
      { key: 'kimi-k2.6', name: 'Kimi K2.6', desc: '多模态理解' }
    ]
  },
  // 套餐(Plan) - 第三方平台
  'siliconflow': {
    name: '硅基流动',
    provider: '硅基流动',
    icon: '⚡',
    description: '聚合平台，多模型可选',
    color: '#0EA5E9',
    callType: 'plan',
    category: 'platform',
    subModels: [
      { key: 'deepseek-ai/DeepSeek-V4', name: 'DeepSeek-V4', desc: '推理能力强' },
      { key: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', desc: '中文优秀' },
      { key: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B', desc: '智谱轻量' },
      { key: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama-3.1-70B', desc: '开源强大' },
      { key: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B', desc: '免费使用' }
    ]
  }
}

// 预设提示词模板
var PROMPT_TEMPLATES = {
  'default': {
    name: '通用助手',
    icon: '💬',
    desc: '全能型AI助手，适合日常对话',
    prompt: '你是{{childName}}的成长陪伴AI助手。请用亲切、友好的语气与他互动，回答他的各种问题，帮助他学习和成长。'
  },
  'learning': {
    name: '学习辅导',
    icon: '📚',
    desc: '专注学习，耐心解答知识问题',
    prompt: '你是一位耐心的学习辅导老师，擅长用简单易懂的方式解释知识。请根据孩子的学习进度，用生动有趣的方式帮助他学习新知识。遇到难题时，用比喻和例子来解释，让孩子更容易理解。'
  },
  'habit': {
    name: '习惯养成',
    icon: '⭐',
    desc: '正面激励，培养良好习惯',
    prompt: '你是一位习惯养成专家，擅长用正面激励的方式帮助孩子养成好习惯。请根据孩子的打卡记录，给予鼓励和建议。当他完成目标时，要热情表扬；当他遇到困难时，要温柔鼓励，帮助他坚持下去。'
  },
  'story': {
    name: '创意故事',
    icon: '📖',
    desc: '想象力丰富，创作有趣故事',
    prompt: '你是一位创意故事大王，擅长根据孩子的兴趣和经历创作有趣的故事。请根据孩子的成长数据，创作富有想象力的故事。故事要生动有趣，富有教育意义，可以融入孩子的生活经历，让他感到亲切和有趣。'
  },
  'coding': {
    name: '编程助手',
    icon: '💻',
    desc: '编程教学，代码辅导',
    prompt: '你是一位编程教学专家，擅长用简单易懂的方式教孩子学习编程。请用生动的例子和有趣的项目，帮助孩子理解编程概念。代码示例要简洁明了，注释清晰，适合初学者理解。'
  },
  'math': {
    name: '数学辅导',
    icon: '🔢',
    desc: '数学解题，思维训练',
    prompt: '你是一位数学辅导老师，擅长用直观的方式解释数学概念。请根据孩子的学习进度，用生活中的例子来解释数学问题。解题过程要详细清晰，帮助孩子理解解题思路，培养数学思维。'
  }
}

/**
 * 获取模型列表
 */
function getModels() {
  return MODELS
}

/**
 * 获取模型信息
 */
function getModelInfo(modelKey) {
  return MODELS[modelKey] || null
}

/**
 * 获取提示词模板
 */
function getPromptTemplates() {
  return PROMPT_TEMPLATES
}

// 配置缓存时间（5分钟）
var configCacheTime = 0
var configCacheDuration = 5 * 60 * 1000

/**
 * 获取AI配置（带缓存）
 */
function getConfig() {
  return new Promise(function(resolve, reject) {
    // 先从本地缓存获取
    var localConfig = childStorage.get(CONFIG_KEY)
    var now = Date.now()
    
    // 如果缓存有效（5分钟内），直接使用本地缓存
    if (localConfig && (now - configCacheTime) < configCacheDuration) {
      resolve(localConfig)
      return
    }
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'getConfig',
        childId: auth.getCurrentChildId()
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        var config = res.result.data
        // 更新本地缓存和缓存时间
        childStorage.set(CONFIG_KEY, config)
        configCacheTime = now
        resolve(config)
      } else {
        // 云端失败，使用本地缓存
        resolve(localConfig || getDefaultConfig())
      }
    }).catch(function(err) {
      console.error('获取AI配置失败:', err)
      // 云端失败，使用本地缓存
      resolve(localConfig || getDefaultConfig())
    })
  })
}

/**
 * 获取默认配置
 */
function getDefaultConfig() {
  return {
    currentModel: 'minimax',
    models: {
      'minimax': { apiKey: '', enabled: true },
      'zhipu': { apiKey: '', enabled: true },
      'kimi': { apiKey: '', enabled: true },
      'wenxin': { apiKey: '', secretKey: '', enabled: true },
      'qwen': { apiKey: '', enabled: true },
      'deepseek': { apiKey: '', enabled: true },
      'mimo': { apiKey: '', enabled: true }
    },
    systemPrompt: '',
    promptTemplate: 'default'
  }
}

/**
 * 保存AI配置
 */
function saveConfig(config) {
  return new Promise(function(resolve, reject) {
    // 先保存到本地缓存
    childStorage.set(CONFIG_KEY, config)
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'saveConfig',
        childId: auth.getCurrentChildId(),
        config: config
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('保存AI配置失败:', err)
      // 本地已保存，云端失败不影响使用
      resolve({ code: 0, msg: '配置已保存到本地' })
    })
  })
}

/**
 * 发送消息
 * @param {string} message - 文本消息
 * @param {string} model - 模型名称（可选）
 * @param {string} imageFileID - 图片文件ID（可选，支持多模态）
 */
function sendMessage(message, model, imageFileID) {
  return new Promise(function(resolve, reject) {
    var sessionId = getCurrentSessionId()
    
    var data = {
      action: 'chat',
      childId: auth.getCurrentChildId(),
      sessionId: sessionId,
      message: message || '',
      model: model
    }
    
    // 如果有图片，添加到请求数据
    if (imageFileID) {
      data.imageFileID = imageFileID
    }
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: data
    }).then(function(res) {
      if (res.result.code === 0) {
        // 保存到本地缓存
        saveToLocal(sessionId, 'user', message, null, imageFileID)
        saveToLocal(sessionId, 'assistant', res.result.data.content, res.result.data.thinking)
        resolve(res.result.data)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('发送消息失败:', err)
      reject(err)
    })
  })
}

/**
 * 获取对话历史
 */
function getHistory(sessionId, page, pageSize) {
  return new Promise(function(resolve, reject) {
    page = page || 1
    pageSize = pageSize || 50
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'getHistory',
        childId: auth.getCurrentChildId(),
        sessionId: sessionId,
        page: page,
        pageSize: pageSize
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result.data)
      } else {
        // 云端失败，尝试从本地缓存获取
        var localChats = childStorage.get(CHATS_KEY) || {}
        var sessionChats = localChats[sessionId] || []
        resolve({
          list: sessionChats,
          total: sessionChats.length,
          page: page,
          pageSize: pageSize
        })
      }
    }).catch(function(err) {
      console.error('获取对话历史失败:', err)
      // 云端失败，尝试从本地缓存获取
      var localChats = childStorage.get(CHATS_KEY) || {}
      var sessionChats = localChats[sessionId] || []
      resolve({
        list: sessionChats,
        total: sessionChats.length,
        page: page,
        pageSize: pageSize
      })
    })
  })
}

/**
 * 获取会话列表
 */
function getSessions() {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'getSessions',
        childId: auth.getCurrentChildId()
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result.data)
      } else {
        resolve([])
      }
    }).catch(function(err) {
      console.error('获取会话列表失败:', err)
      resolve([])
    })
  })
}

/**
 * 清空对话历史
 */
function clearHistory(sessionId) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'clearHistory',
        childId: auth.getCurrentChildId(),
        sessionId: sessionId
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        // 清除本地缓存
        var localChats = childStorage.get(CHATS_KEY) || {}
        delete localChats[sessionId]
        childStorage.set(CHATS_KEY, localChats)
        resolve(res.result)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('清空对话历史失败:', err)
      reject(err)
    })
  })
}

/**
 * 删除会话
 */
function deleteSession(sessionId) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: {
        action: 'deleteSession',
        childId: auth.getCurrentChildId(),
        sessionId: sessionId
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        // 清除本地缓存
        var localChats = childStorage.get(CHATS_KEY) || {}
        delete localChats[sessionId]
        childStorage.set(CHATS_KEY, localChats)
        resolve(res.result)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('删除会话失败:', err)
      reject(err)
    })
  })
}

/**
 * 创建新会话
 */
function createSession() {
  var sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  return sessionId
}

/**
 * 获取当前会话ID
 */
function getCurrentSessionId() {
  var sessionId = childStorage.get('currentAiSessionId')
  if (!sessionId) {
    sessionId = createSession()
    childStorage.set('currentAiSessionId', sessionId)
  }
  return sessionId
}

/**
 * 设置当前会话ID
 */
function setCurrentSessionId(sessionId) {
  childStorage.set('currentAiSessionId', sessionId)
}

/**
 * 保存到本地缓存
 */
function saveToLocal(sessionId, role, content, thinking, image) {
  var localChats = childStorage.get(CHATS_KEY) || {}
  if (!localChats[sessionId]) {
    localChats[sessionId] = []
  }
  
  // 添加新消息
  localChats[sessionId].push({
    role: role,
    content: content,
    thinking: thinking || null,
    image: image || null,
    createTime: new Date().toISOString()
  })
  
  childStorage.set(CHATS_KEY, localChats)
}

/**
 * 检查是否已配置
 */
function isConfigured() {
  var config = childStorage.get(CONFIG_KEY)
  if (!config || !config.models) return false
  
  var currentModel = config.currentModel || 'minimax'
  var modelConfig = config.models[currentModel]
  
  return modelConfig && modelConfig.apiKey && modelConfig.apiKey.length > 0
}

/**
 * 获取当前模型信息
 */
function getCurrentModelInfo() {
  var config = childStorage.get(CONFIG_KEY)
  if (!config) return {
    key: 'minimax',
    info: MODELS['minimax'],
    configured: false
  }
  
  var currentModel = config.currentModel || 'minimax'
  return {
    key: currentModel,
    info: MODELS[currentModel] || MODELS['minimax'],
    configured: isConfigured()
  }
}

module.exports = {
  getModels: getModels,
  getModelInfo: getModelInfo,
  getPromptTemplates: getPromptTemplates,
  getConfig: getConfig,
  saveConfig: saveConfig,
  sendMessage: sendMessage,
  getHistory: getHistory,
  getSessions: getSessions,
  clearHistory: clearHistory,
  deleteSession: deleteSession,
  createSession: createSession,
  getCurrentSessionId: getCurrentSessionId,
  setCurrentSessionId: setCurrentSessionId,
  isConfigured: isConfigured,
  getCurrentModelInfo: getCurrentModelInfo
}
