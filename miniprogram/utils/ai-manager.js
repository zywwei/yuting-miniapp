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
    baseUrl: 'https://api.siliconflow.cn/v1',
    subModels: [
      { key: 'deepseek-ai/DeepSeek-V4', name: 'DeepSeek-V4', desc: '推理能力强' },
      { key: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', desc: '中文优秀' },
      { key: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B', desc: '智谱轻量' },
      { key: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama-3.1-70B', desc: '开源强大' },
      { key: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B', desc: '免费使用' }
    ]
  },
  'openrouter': {
    name: 'OpenRouter',
    provider: 'OpenRouter',
    icon: '🔀',
    description: '500+模型聚合平台',
    color: '#7C3AED',
    callType: 'plan',
    category: 'platform',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    subModels: [
      { key: 'openrouter/free', name: '免费模型', desc: '自动选择最佳免费模型' },
      { key: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', desc: 'Google免费模型' },
      { key: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', desc: 'Meta免费模型' },
      { key: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', desc: '推理免费模型' },
      { key: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', desc: 'Anthropic旗舰' },
      { key: 'openai/gpt-5.2', name: 'GPT-5.2', desc: 'OpenAI最新' },
      { key: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Google旗舰' },
      { key: 'deepseek/deepseek-v4', name: 'DeepSeek-V4', desc: '推理能力强' }
    ]
  },
  'kilo': {
    name: 'Kilo Gateway',
    provider: 'Kilo',
    icon: '🚀',
    description: '500+模型，零加价',
    color: '#059669',
    callType: 'plan',
    category: 'platform',
    baseUrl: 'https://api.kilo.ai/api/gateway',
    defaultModel: 'kilo-auto/free',
    subModels: [
      { key: 'kilo-auto/free', name: 'Auto Free', desc: '自动选择免费模型' },
      { key: 'stepfun/step-3.7-flash:free', name: 'StepFun 3.7', desc: '免费模型' },
      { key: 'poolside/laguna-m.1:free', name: 'Poolside Laguna', desc: '免费模型' },
      { key: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra', desc: 'NVIDIA免费' },
      { key: 'kilo-auto/balanced', name: 'Auto Balanced', desc: '性价比均衡' },
      { key: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', desc: 'Anthropic最新' },
      { key: 'openai/gpt-5.4', name: 'GPT-5.4', desc: 'OpenAI最新' },
      { key: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Google最新' }
    ]
  },
  'opencode': {
    name: 'OpenCode Zen',
    provider: 'OpenCode',
    icon: '🔮',
    description: '精选免费编程模型',
    color: '#6366F1',
    callType: 'plan',
    category: 'platform',
    baseUrl: 'https://opencode.ai/zen/v1',
    defaultModel: 'mimo-v2.5-free',
    subModels: [
      { key: 'mimo-v2.5-free', name: 'MiMo V2.5 Free', desc: '小米免费模型' },
      { key: 'deepseek-v4-flash-free', name: 'DeepSeek V4 Free', desc: '免费编程模型' },
      { key: 'north-mini-code-free', name: 'North Mini Code', desc: '免费编程模型' },
      { key: 'nemotron-3-ultra-free', name: 'Nemotron 3 Ultra', desc: 'NVIDIA免费' },
      { key: 'big-pickle', name: 'Big Pickle', desc: '免费神秘模型' },
      { key: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', desc: '编程首选' },
      { key: 'gpt-5.4', name: 'GPT-5.4', desc: 'OpenAI最新' },
      { key: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', desc: '推理最强' },
      { key: 'glm-5.2', name: 'GLM 5.2', desc: '智谱最新' }
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
      data: { familyId: auth.getCurrentFamilyId(),
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
        // 云端失败，使用本地缓存，也更新缓存时间避免频繁重试
        if (localConfig) {
          configCacheTime = now
        }
        resolve(localConfig || getDefaultConfig())
      }
    }).catch(function(err) {
      console.error('获取AI配置失败:', err)
      // 云端失败，使用本地缓存，也更新缓存时间避免频繁重试
      if (localConfig) {
        configCacheTime = now
      }
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
 * 保存AI配置（合并模式，不会丢失已有字段）
 */
function saveConfig(config) {
  return new Promise(function(resolve, reject) {
    // 先读取本地配置，合并后再保存
    var localConfig = childStorage.get(CONFIG_KEY) || getDefaultConfig()
    var oldConfig = JSON.parse(JSON.stringify(localConfig)) // 深拷贝备份，用于回滚
    var merged = {}
    
    // 复制本地配置的所有字段
    for (var k in localConfig) {
      merged[k] = localConfig[k]
    }
    
    // 合并传入的字段
    for (var k in config) {
      if (k === 'models' && config.models && localConfig.models) {
        // models 做深度合并
        merged.models = {}
        for (var mk in localConfig.models) {
          merged.models[mk] = {}
          for (var fk in localConfig.models[mk]) {
            merged.models[mk][fk] = localConfig.models[mk][fk]
          }
        }
        for (var mk in config.models) {
          if (!merged.models[mk]) merged.models[mk] = {}
          for (var fk in config.models[mk]) {
            merged.models[mk][fk] = config.models[mk][fk]
          }
        }
      } else {
        merged[k] = config[k]
      }
    }
    
    // 保存合并后的完整配置到本地缓存
    childStorage.set(CONFIG_KEY, merged)
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'saveConfig',
        childId: auth.getCurrentChildId(),
        config: config
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result)
      } else {
        // 云端保存失败，回滚本地配置
        console.error('云端保存配置失败，回滚本地:', res.result.msg)
        childStorage.set(CONFIG_KEY, oldConfig)
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('保存AI配置失败:', err)
      // 云端失败，回滚本地配置
      childStorage.set(CONFIG_KEY, oldConfig)
      reject(err)
    })
  })
}

/**
 * 发送消息
 * @param {string} message - 文本消息
 * @param {string} model - 模型名称（可选）
 * @param {string} imageFileID - 图片文件ID（可选，支持多模态）
 * @param {string} extraContext - 额外上下文（可选，数据注入）
 * @param {string} skillPrompt - 技能提示词（可选，技能激活时使用）
 */
function sendMessage(message, model, imageFileID, extraContext, skillPrompt) {
  return new Promise(function(resolve, reject) {
    var sessionId = getCurrentSessionId()
    
    var data = {
      action: 'chat',
      childId: auth.getCurrentChildId(),
      sessionId: sessionId,
      message: message || '',
      model: model
    }
    
    // 如果有图片，添加到请求数据（兼容数组和字符串）
    var hasImages = Array.isArray(imageFileID) ? imageFileID.length > 0 : !!imageFileID
    if (hasImages) {
      data.imageFileID = imageFileID
    }
    
    // 如果有额外上下文，添加到请求数据（限制长度）
    if (extraContext) {
      data.extraContext = extraContext.substring(0, 2000)
    }
    
    // 如果有技能提示词，添加到请求数据（限制长度）
    if (skillPrompt) {
      data.skillPrompt = skillPrompt.substring(0, 1000)
    }
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: Object.assign({ familyId: auth.getCurrentFamilyId() }, data)
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
    }
    )
  })
}

/**
 * 流式发送消息 - 支持思考过程实时展示
 * @param {string} message - 文本消息
 * @param {string} model - 模型名称（可选）
 * @param {string} imageFileID - 图片文件ID（可选，支持数组）
 * @param {string} extraContext - 额外上下文（可选，数据注入）
 * @param {string} skillPrompt - 技能提示词（可选，技能激活时使用）
 * @returns {Promise} 返回taskId用于轮询
 */
function sendMessageStream(message, model, imageFileID, extraContext, skillPrompt) {
  return new Promise(function(resolve, reject) {
    var sessionId = getCurrentSessionId()
    
    var data = {
      action: 'chatStream',
      childId: auth.getCurrentChildId(),
      sessionId: sessionId,
      message: message || '',
      model: model
    }
    
    var hasImages = Array.isArray(imageFileID) ? imageFileID.length > 0 : !!imageFileID
    if (hasImages) {
      data.imageFileID = imageFileID
    }
    
    if (extraContext) {
      data.extraContext = extraContext.substring(0, 2000)
    }
    
    if (skillPrompt) {
      data.skillPrompt = skillPrompt.substring(0, 1000)
    }
    
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: Object.assign({ familyId: auth.getCurrentFamilyId() }, data)
    }).then(function(res) {
      if (res.result.code === 0) {
        // 保存用户消息到本地
        saveToLocal(sessionId, 'user', message, null, imageFileID)
        resolve(res.result.data)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('发送消息失败:', err)
      reject(err)
    }
    )
  })
}

/**
 * 获取思考进度
 * @param {string} taskId - 任务ID
 * @returns {Promise} 返回思考进度
 */
function getThinkingProgress(taskId) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'getThinkingProgress',
        taskId: taskId
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('获取思考进度失败:', err)
      reject(err)
    })
  })
}

/**
 * 实时监听思考进度（使用 db.watch）
 * @param {string} taskId - 任务ID
 * @param {Function} onChange - 变化回调，参数为 progress 对象
 * @param {Function} onError - 错误回调
 * @returns {Object} watcher 对象，需要调用 close() 关闭
 */
function watchThinkingProgress(taskId, onChange, onError) {
  var db = wx.cloud.database()
  var watcher = db.collection('aiThinkingProgress')
    .where({ taskId: taskId })
    .watch({
      onChange: function(snapshot) {
        if (snapshot.docs.length > 0) {
          var progress = snapshot.docs[0]
          onChange({
            taskId: progress.taskId,
            status: progress.status,
            thinkingContent: progress.thinkingContent,
            finalContent: progress.finalContent,
            usage: progress.usage
          })
        }
      },
      onError: function(err) {
        console.error('监听思考进度失败:', err)
        if (onError) onError(err)
      }
    })
  return watcher
}

/**
 * 获取用户偏好设置
 * @param {string} key - 设置键名
 * @returns {Promise} 返回设置值
 */
function getUserPreference(key) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'getUserPreference',
        key: key
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result.data.value)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('获取用户偏好失败:', err)
      reject(err)
    })
  })
}

/**
 * 保存用户偏好设置
 * @param {string} key - 设置键名
 * @param {*} value - 设置值
 * @returns {Promise}
 */
function saveUserPreference(key, value) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'saveUserPreference',
        key: key,
        value: value
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result)
      } else {
        reject(new Error(res.result.msg))
      }
    }).catch(function(err) {
      console.error('保存用户偏好失败:', err)
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
      data: { familyId: auth.getCurrentFamilyId(),
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
 * @param {number} limit - 限制数量，默认500
 */
function getSessions(limit) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'getSessions',
        childId: auth.getCurrentChildId(),
        limit: limit || 500
      }
    }).then(function(res) {
      if (res.result.code === 0) {
        resolve(res.result.data)
      } else {
        resolve({ sessions: [], hasMore: false })
      }
    }).catch(function(err) {
      console.error('获取会话列表失败:', err)
      resolve({ sessions: [], hasMore: false })
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
      data: { familyId: auth.getCurrentFamilyId(),
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
      data: { familyId: auth.getCurrentFamilyId(),
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
  // 使用更长的随机字符串增强唯一性
  var timestamp = Date.now()
  var random1 = Math.random().toString(36).substr(2, 12)
  var random2 = Math.random().toString(36).substr(2, 8)
  var sessionId = 'session_' + timestamp + '_' + random1 + random2
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

// 本地缓存上限（P1-10）：所有会话共用一个 storage key（单 key 1MB 上限），
// 无限增长会导致 setStorageSync 抛错、聊天整体不可用
var MAX_MESSAGES_PER_SESSION = 50  // 每会话保留最近 N 条
var MAX_SESSIONS = 30              // 最多保留 N 个会话（LRU 淘汰最旧）

/**
 * 保存到本地缓存
 * @param {string} sessionId - 会话ID，为null时自动获取当前会话
 * @param {string} role - 消息角色
 * @param {string} content - 消息内容
 * @param {string} thinking - 思考内容
 * @param {string} image - 图片
 */
function saveToLocal(sessionId, role, content, thinking, image) {
  // 如果sessionId为空，自动获取当前会话
  if (!sessionId) {
    sessionId = getCurrentSessionId()
  }

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

  // 截断：每会话只留最近 N 条（旧消息云端仍有，仅本地兜底展示受限）
  if (localChats[sessionId].length > MAX_MESSAGES_PER_SESSION) {
    localChats[sessionId] = localChats[sessionId].slice(-MAX_MESSAGES_PER_SESSION)
  }

  // 会话数 LRU：超过上限时按"最近一条消息时间"淘汰最旧会话
  var sessionIds = Object.keys(localChats)
  if (sessionIds.length > MAX_SESSIONS) {
    sessionIds.sort(function(a, b) {
      var ta = localChats[a].length ? localChats[a][localChats[a].length - 1].createTime : ''
      var tb = localChats[b].length ? localChats[b][localChats[b].length - 1].createTime : ''
      return tb.localeCompare(ta) // 新的在前
    })
    sessionIds.slice(MAX_SESSIONS).forEach(function(oldId) {
      delete localChats[oldId]
    })
  }

  try {
    childStorage.set(CHATS_KEY, localChats)
  } catch (e) {
    // 兜底：极端情况下仍超限则放弃本地缓存（云端是权威数据源），不影响聊天主流程
    console.warn('AI 本地历史写入失败，跳过本地缓存:', e)
  }
}

/**
 * 检查是否已配置
 */
function isConfigured() {
  var config = childStorage.get(CONFIG_KEY)
  if (!config) return false

  var currentModel = config.currentModel || 'minimax'

  // P0-7 配套：非 admin 拿到的是脱敏配置（apiKey 为空串），
  // 以服务端 hasKeyByProvider 为准——聊天走云端代理用的是服务端密钥
  if (config.hasKeyByProvider && typeof config.hasKeyByProvider[currentModel] !== 'undefined') {
    return !!config.hasKeyByProvider[currentModel]
  }

  if (!config.models) return false

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

/**
 * 获取平台全量模型列表（云端同步，24h缓存）
 * @param {string} provider - 平台key（openrouter/kilo/opencode）
 * @param {string} type - 'chat' 文本模型 | 'image' 图片生成模型
 * @param {boolean} forceRefresh - 强制刷新
 * @returns {Promise<Object>} { models, provider, type, cached }
 */
function listModels(provider, type, forceRefresh) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'listModels',
        provider: provider,
        type: type || 'chat',
        forceRefresh: !!forceRefresh
      }
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(new Error((res.result && res.result.msg) || '获取模型列表失败'))
      }
    }).catch(function(err) {
      console.error('获取模型列表失败:', err)
      reject(err)
    })
  })
}

/**
 * AI 图片生成
 * @param {string} prompt - 图片描述
 * @param {string} imageModel - 图片模型id
 * @param {Object} options - { aspectRatio: 画幅, quality: 清晰度, sessionId: 会话ID, refImageFileIDs: 参考图fileID数组 }
 * @returns {Promise<Object>} { fileID, model, prompt }
 */
function generateImage(prompt, imageModel, options) {
  options = options || {}
  return new Promise(function(resolve, reject) {
    var reqData = { familyId: auth.getCurrentFamilyId(),
      action: 'generateImage',
      childId: auth.getCurrentChildId(),
      sessionId: options.sessionId || getCurrentSessionId(),
      prompt: prompt,
      model: imageModel,
      aspectRatio: options.aspectRatio || '',
      quality: options.quality || ''
    }
    if (options.refImageFileIDs && options.refImageFileIDs.length > 0) {
      reqData.imageFileID = options.refImageFileIDs
    }
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: reqData
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(new Error((res.result && res.result.msg) || '图片生成失败'))
      }
    }).catch(function(err) {
      console.error('图片生成失败:', err)
      reject(err)
    })
  })
}

/**
 * 读取AI画画配额配置
 * @returns {Promise<Object>} { generateImageDaily, generateImagePerMinute }
 */
function getQuotaConfig() {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'getQuotaConfig'
      }
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(new Error((res.result && res.result.msg) || '获取配额配置失败'))
      }
    }).catch(function(err) {
      console.error('获取配额配置失败:', err)
      reject(err)
    })
  })
}

/**
 * 保存AI画画配额配置（仅家庭创建者）
 * @param {Object} config - { generateImageDaily, generateImagePerMinute }
 * @returns {Promise}
 */
function saveQuotaConfig(config) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'ai-chat',
      data: { familyId: auth.getCurrentFamilyId(),
        action: 'saveQuotaConfig',
        config: config
      }
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        resolve(res.result)
      } else {
        reject(new Error((res.result && res.result.msg) || '保存配额配置失败'))
      }
    }).catch(function(err) {
      console.error('保存配额配置失败:', err)
      reject(err)
    })
  })
}

module.exports = {
  getModels: getModels,
  getModelInfo: getModelInfo,
  getPromptTemplates: getPromptTemplates,
  getConfig: getConfig,
  saveConfig: saveConfig,
  sendMessage: sendMessage,
  sendMessageStream: sendMessageStream,
  getThinkingProgress: getThinkingProgress,
  watchThinkingProgress: watchThinkingProgress,
  getUserPreference: getUserPreference,
  saveUserPreference: saveUserPreference,
  getHistory: getHistory,
  getSessions: getSessions,
  clearHistory: clearHistory,
  deleteSession: deleteSession,
  createSession: createSession,
  getCurrentSessionId: getCurrentSessionId,
  setCurrentSessionId: setCurrentSessionId,
  saveToLocal: saveToLocal,
  isConfigured: isConfigured,
  getCurrentModelInfo: getCurrentModelInfo,
  listModels: listModels,
  generateImage: generateImage,
  getQuotaConfig: getQuotaConfig,
  saveQuotaConfig: saveQuotaConfig
}
