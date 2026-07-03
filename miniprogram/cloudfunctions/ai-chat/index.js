const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// Polyfill global crypto for msedge-tts (Web Crypto API)
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.subtle === 'undefined') {
  const nodeCrypto = require('crypto')
  if (nodeCrypto.webcrypto) {
    globalThis.crypto = nodeCrypto.webcrypto
  } else {
    // Fallback: create a minimal crypto object with subtle.digest
    globalThis.crypto = {
      subtle: {
        digest: async (algorithm, data) => {
          const hash = nodeCrypto.createHash(algorithm.replace('-', '').toLowerCase())
          hash.update(Buffer.from(data))
          return hash.digest()
        }
      },
      getRandomValues: (arr) => nodeCrypto.randomFillSync(arr)
    }
  }
}

// 导入AI模型调用模块 - 国内模型
const wenxin = require('./models/wenxin')
const qwen = require('./models/qwen')
const deepseek = require('./models/deepseek')
const minimax = require('./models/minimax')
const zhipu = require('./models/zhipu')
const kimi = require('./models/kimi')
const siliconflow = require('./models/siliconflow')
const mimo = require('./models/xiaomi') // MiMo模型使用小米的调用模块
const openaiCompatible = require('./models/openai-compatible') // OpenRouter、Kilo、OpenCode等通用模块

// 模型默认配置
const MODEL_DEFAULTS = {
  'minimax': { module: minimax, defaultModel: 'MiniMax-M3' },
  'minimax-plan': { module: minimax, defaultModel: 'MiniMax-M3' },
  'zhipu': { module: zhipu, defaultModel: 'glm-5.2' },
  'zhipu-plan': { module: zhipu, defaultModel: 'glm-5.2' },
  'kimi': { module: kimi, defaultModel: 'kimi-k2.6' },
  'kimi-plan': { module: kimi, defaultModel: 'kimi-k2.7-code' },
  'wenxin': { module: wenxin, defaultModel: 'ernie-4.0-turbo-8k', needSecretKey: true },
  'wenxin-plan': { module: wenxin, defaultModel: 'ernie-4.0-turbo-8k', needSecretKey: true },
  'qwen': { module: qwen, defaultModel: 'qwen3.7-max' },
  'deepseek': { module: deepseek, defaultModel: 'deepseek-v4-flash' },
  'siliconflow': { module: siliconflow, defaultModel: 'deepseek-ai/DeepSeek-V4' },
  'mimo': { module: mimo, defaultModel: 'mimo-v2.5-pro', baseUrl: 'https://api.xiaomimimo.com/v1' },
  'mimo-plan': { module: mimo, defaultModel: 'mimo-v2.5-pro', baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1' },
  'openrouter': { module: openaiCompatible, callFn: 'callOpenRouter', defaultModel: 'openrouter/free' },
  'kilo': { module: openaiCompatible, callFn: 'callKilo', defaultModel: 'kilo-auto/free' },
  'opencode': { module: openaiCompatible, callFn: 'callOpenCode', defaultModel: 'mimo-v2.5-free' }
}

/**
 * 统一调用AI模型
 * @param {string} modelName - 模型名称
 * @param {string} apiKey - API密钥
 * @param {Array} messages - 消息列表
 * @param {string} model - 具体模型版本
 * @param {string} secretKey - 密钥（文心一言需要）
 * @returns {Promise<Object>} 响应结果
 */
async function callAIModel(modelName, apiKey, messages, model, secretKey) {
  const config = MODEL_DEFAULTS[modelName]
  if (!config) {
    return { code: -4, msg: '不支持的模型: ' + modelName }
  }

  const actualModel = model || config.defaultModel
  
  // 特殊处理需要自定义调用函数的模型
  if (config.callFn) {
    return await config.module[config.callFn](apiKey, messages, actualModel)
  }
  
  // 特殊处理需要baseUrl的模型
  if (config.baseUrl) {
    return await config.module.callAPI(apiKey, messages, actualModel, config.baseUrl)
  }
  
  // 特殊处理需要secretKey的模型
  if (config.needSecretKey) {
    return await config.module.callAPI(apiKey, secretKey || '', messages, actualModel)
  }
  
  // 默认调用
  return await config.module.callAPI(apiKey, messages, actualModel)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  const startTime = Date.now()

  // 获取用户身份
  const member = await getMemberByOpenid(OPENID)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  // 记录请求日志
  console.log(`[AI请求] action=${action}, userId=${OPENID}, time=${new Date().toISOString()}`)

  // 检查速率限制
  const rateLimitError = checkRateLimit(OPENID, action)
  if (rateLimitError) {
    console.log(`[AI限流] userId=${OPENID}, action=${action}`)
    return rateLimitError
  }

  switch (action) {
    case 'getConfig':
      return await getConfig(member, event.childId)
    case 'saveConfig':
      return await saveConfig(member, event.childId, event.config)
    case 'chat':
      return await chat(member, event.childId, event.sessionId, event.message, event.model, event.imageFileID, event.extraContext, event.skillPrompt)
    case 'chatStream':
      return await chatStream(member, event.childId, event.sessionId, event.message, event.model, event.imageFileID, event.extraContext, event.skillPrompt)
    case 'getThinkingProgress':
      return await getThinkingProgress(event.taskId)
    case 'getUserPreference':
      return await getUserPreference(member, event.key)
    case 'saveUserPreference':
      return await saveUserPreference(member, event.key, event.value)
    case 'testConfig':
      return await testConfig(member, event.childId, event.model, event.apiKey, event.secretKey)
    case 'getHistory':
      return await getHistory(member, event.childId, event.sessionId, event.page, event.pageSize)
    case 'clearHistory':
      return await clearHistory(member, event.childId, event.sessionId)
    case 'getSessions':
      return await getSessions(member, event.childId, event.limit)
    case 'deleteSession':
      return await deleteSession(member, event.childId, event.sessionId)
    case 'getModelPrices':
      return getModelPrices()
    case 'speechToText':
      return await speechToText(event.audioData)
    case 'textToSpeech':
      return await textToSpeech(event.text, event.voice, event.baiduPer, event.mimoVoice)
    case 'getTtsConfig':
      return await getTtsConfig(member)
    case 'saveTtsConfig':
      return await saveTtsConfig(member, event)
    case 'testTts':
      return await testTts(member, event)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 速率限制配置
const RATE_LIMIT_CONFIG = {
  'chat': { maxRequests: 20, windowMs: 60000 }, // 每分钟最多20次
  'chatStream': { maxRequests: 20, windowMs: 60000 },
  'testConfig': { maxRequests: 5, windowMs: 60000 }
}

// 速率限制存储（内存中，重启后清空）
const rateLimitStore = {}

/**
 * 检查速率限制
 * @param {string} userId - 用户ID
 * @param {string} action - 操作类型
 * @returns {Object|null} 如果超限返回错误对象，否则返回null
 */
function checkRateLimit(userId, action) {
  const config = RATE_LIMIT_CONFIG[action]
  if (!config) return null
  
  const key = `${userId}:${action}`
  const now = Date.now()
  
  // 清理过期记录
  if (rateLimitStore[key]) {
    rateLimitStore[key] = rateLimitStore[key].filter(time => now - time < config.windowMs)
  } else {
    rateLimitStore[key] = []
  }
  
  // 检查是否超限
  if (rateLimitStore[key].length >= config.maxRequests) {
    return {
      code: -6,
      msg: `请求过于频繁，请稍后再试`
    }
  }

  // 记录本次请求
  rateLimitStore[key].push(now)

  // 定期清理空 key，防止内存泄漏
  if (rateLimitStore[key].length === 0) {
    delete rateLimitStore[key]
  }

  return null
}

// 获取用户身份
async function getMemberByOpenid(openid) {
  const res = await db.collection('familyMembers')
    .where({ openid, status: 'active' })
    .get()
  return res.data[0] || null
}

// 获取AI配置
async function getConfig(member, childId) {
  try {
    const res = await db.collection('aiConfigs')
      .where({
        familyId: member.familyId,
        childId: childId || ''
      })
      .get()

    if (res.data.length > 0) {
      return { code: 0, data: res.data[0] }
    }

    // 返回默认配置（与前端ai-manager.js的getDefaultConfig保持一致）
    return {
      code: 0,
      data: {
        familyId: member.familyId,
        childId: childId || '',
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
        promptTemplate: 'default',
        createTime: new Date(),
        updateTime: new Date()
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取配置失败: ' + err.message }
  }
}

// 保存AI配置
async function saveConfig(member, childId, config) {
  try {
    // 查找现有配置
    const existing = await db.collection('aiConfigs')
      .where({
        familyId: member.familyId,
        childId: childId || ''
      })
      .get()

    // 合并models配置，使用深合并避免覆盖已有的API Key
    let mergedModels = {}
    if (existing.data.length > 0 && existing.data[0].models) {
      // 先复制云端的完整配置
      for (const providerKey in existing.data[0].models) {
        mergedModels[providerKey] = { ...existing.data[0].models[providerKey] }
      }
    }
    // 再合并前端传来的配置（只覆盖有值的字段）
    if (config.models) {
      for (const providerKey in config.models) {
        if (!mergedModels[providerKey]) {
          mergedModels[providerKey] = {}
        }
        for (const field in config.models[providerKey]) {
          // 只覆盖非空值，避免空字符串覆盖已有的apiKey
          if (config.models[providerKey][field] !== undefined && config.models[providerKey][field] !== '') {
            mergedModels[providerKey][field] = config.models[providerKey][field]
          }
        }
      }
    }

    const data = {
      familyId: member.familyId,
      childId: childId || '',
      currentModel: config.currentModel,
      models: mergedModels,
      systemPrompt: config.systemPrompt || '',
      updateTime: new Date()
    }

    if (existing.data.length > 0) {
      // 更新现有配置
      await db.collection('aiConfigs')
        .doc(existing.data[0]._id)
        .update({ data })
    } else {
      // 创建新配置
      data.createTime = new Date()
      await db.collection('aiConfigs')
        .add({ data })
    }

    return { code: 0, msg: '配置保存成功' }
  } catch (err) {
    return { code: -2, msg: '保存配置失败: ' + err.message }
  }
}

// 测试API配置
async function testConfig(member, childId, model, apiKey, secretKey) {
  try {
    if (!apiKey) {
      return { code: -3, msg: '请先输入API Key' }
    }

    // 构建测试消息
    const messages = [{ role: 'user', content: '你好' }]
    
    // 调用AI模型测试
    const result = await callAIModel(model, apiKey, messages, null, secretKey)

    if (result.code === 0) {
      return { code: 0, msg: '测试成功！' }
    } else {
      return result
    }
  } catch (err) {
    return { code: -2, msg: '测试失败: ' + err.message }
  }
}

// 验证并准备聊天参数（chat和chatStream共用）
async function validateAndPrepare(member, childId, sessionId, message, model, imageFileID, extraContext, skillPrompt) {
  // 1. 输入验证
  const hasImages = Array.isArray(imageFileID) ? imageFileID.length > 0 : !!imageFileID
  if (!message && !hasImages) {
    return { code: -5, msg: '消息内容不能为空' }
  }
  
  // 消息长度限制（4000字符）
  if (message && message.length > 4000) {
    return { code: -5, msg: '消息内容过长，请限制在4000字符以内' }
  }
  
  // 模型白名单验证
  const allowedModels = ['minimax', 'minimax-plan', 'zhipu', 'zhipu-plan', 'kimi', 'kimi-plan', 
                        'wenxin', 'wenxin-plan', 'qwen', 'deepseek', 'siliconflow', 'mimo', 'mimo-plan',
                        'openrouter', 'kilo', 'opencode']
  if (model && !allowedModels.includes(model)) {
    return { code: -5, msg: '不支持的模型类型' }
  }

  // 2. 获取配置
  const configResult = await getConfig(member, childId)
  if (configResult.code !== 0) {
    return configResult
  }
  const config = configResult.data

  // 3. 检查API Key
  const modelConfig = config.models[model || config.currentModel]
  if (!modelConfig || !modelConfig.apiKey) {
    return { code: -3, msg: '请先配置API Key' }
  }

  // 4. 获取对话历史
  const historyResult = await getHistory(member, childId, sessionId, 1, 20)
  const history = historyResult.code === 0 ? historyResult.data.list : []

  // 5. 构建消息列表（支持图片、额外上下文、技能提示词）
  const messages = await buildMessages(config, history, message, imageFileID, extraContext, skillPrompt, member)

  // 6. 确定使用的模型
  const aiModel = model || config.currentModel

  return {
    code: 0,
    data: { config, modelConfig, messages, aiModel }
  }
}

// 发送消息并获取AI回复
async function chat(member, childId, sessionId, message, model, imageFileID, extraContext, skillPrompt) {
  try {
    // 1. 验证并准备参数
    const prepared = await validateAndPrepare(member, childId, sessionId, message, model, imageFileID, extraContext, skillPrompt)
    if (prepared.code !== 0) return prepared

    const { config, modelConfig, messages, aiModel } = prepared.data

    // 2. 调用AI模型
    const result = await callAIModel(aiModel, modelConfig.apiKey, messages, modelConfig.model, modelConfig.secretKey)

    if (result.code !== 0) {
      return result
    }

    // 3. 保存用户消息和AI回复（并行执行，使用allSettled避免单个失败影响整体）
    const saveResults = await Promise.allSettled([
      saveMessage(member, childId, sessionId, 'user', message, aiModel),
      saveMessage(member, childId, sessionId, 'assistant', result.data.content, aiModel, result.data.usage, result.data.thinking)
    ])
    
    // 记录保存失败的情况
    saveResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`保存消息${index === 0 ? '用户' : 'AI'}失败:`, result.reason)
      }
    })
    
    // 4. 检查是否需要生成会话标题（会话第一条消息）
    generateSessionTitleIfNeeded(member, childId, sessionId, message)

    return {
      code: 0,
      data: {
        content: result.data.content,
        thinking: result.data.thinking || null,
        usage: result.data.usage
      }
    }
  } catch (err) {
    return { code: -2, msg: '对话失败: ' + err.message }
  }
}

// 构建消息列表
async function buildMessages(config, history, newMessage, imageFileID, extraContext, skillPrompt, member) {
  const messages = []

  // 调试日志
  console.log('buildMessages params:', {
    hasExtraContext: !!extraContext,
    extraContextLength: extraContext ? extraContext.length : 0,
    hasSkillPrompt: !!skillPrompt,
    skillPromptLength: skillPrompt ? skillPrompt.length : 0
  })

  // 系统提示词
  let systemPrompt = config.systemPrompt || ''
  
  // 如果没有自定义提示词，根据模板获取
  if (!systemPrompt && config.promptTemplate) {
    const templates = {
      'default': '你是{{childName}}的成长陪伴AI助手。请用亲切、友好的语气与他互动，回答他的各种问题，帮助他学习和成长。',
      'learning': '你是一位耐心的学习辅导老师，擅长用简单易懂的方式解释知识。请根据孩子的学习进度，用生动有趣的方式帮助他学习新知识。遇到难题时，用比喻和例子来解释，让孩子更容易理解。',
      'habit': '你是一位习惯养成专家，擅长用正面激励的方式帮助孩子养成好习惯。请根据孩子的打卡记录，给予鼓励和建议。当他完成目标时，要热情表扬；当他遇到困难时，要温柔鼓励，帮助他坚持下去。',
      'story': '你是一位创意故事大王，擅长根据孩子的兴趣和经历创作有趣的故事。请根据孩子的成长数据，创作富有想象力的故事。故事要生动有趣，富有教育意义，可以融入孩子的生活经历，让他感到亲切和有趣。',
      'coding': '你是一位编程教学专家，擅长用简单易懂的方式教孩子学习编程。请用生动的例子和有趣的项目，帮助孩子理解编程概念。代码示例要简洁明了，注释清晰，适合初学者理解。',
      'math': '你是一位数学辅导老师，擅长用直观的方式解释数学概念。请根据孩子的学习进度，用生活中的例子来解释数学问题。解题过程要详细清晰，帮助孩子理解解题思路，培养数学思维。'
    }
    systemPrompt = templates[config.promptTemplate] || templates['default']
  }
  
  // 替换占位符 {{childName}}
  if (systemPrompt && member) {
    const childName = member.childName || member.name || '小朋友'
    systemPrompt = systemPrompt.replace(/\{\{childName\}\}/g, childName)
  }
  
  // 如果有技能提示词，附加到系统提示词
  if (skillPrompt) {
    systemPrompt = systemPrompt + '\n\n【当前技能指令】\n' + skillPrompt
  }
  
  // 如果有额外上下文（用户数据），附加到系统提示词
  if (extraContext) {
    systemPrompt = systemPrompt + '\n\n' + extraContext
  }
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    })
  }

  // 历史消息（验证role合法性）
  const validRoles = ['user', 'assistant', 'system']
  for (const item of history) {
    const role = item.role
    // 跳过无效role的消息
    if (!role || !validRoles.includes(role)) {
      console.warn('跳过无效role的历史消息:', role)
      continue
    }
    messages.push({
      role: role,
      content: item.content
    })
  }

  // 新消息（支持图片，兼容单张和多张）
  const imageIDs = Array.isArray(imageFileID) ? imageFileID : (imageFileID ? [imageFileID] : [])
  
  if (imageIDs.length > 0) {
    // 批量获取临时URL
    const cloudIDs = imageIDs.filter(id => id.startsWith('cloud://'))
    let urlMap = {}
    if (cloudIDs.length > 0) {
      try {
        const urlRes = await cloud.getTempFileURL({ fileList: cloudIDs })
        if (urlRes.fileList) {
          urlRes.fileList.forEach(item => {
            if (item.tempFileURL) urlMap[item.fileID] = item.tempFileURL
          })
        }
      } catch (err) {
        console.error('获取图片临时链接失败:', err)
      }
    }
    
    // 构建content数组：多张图片 + 文本
    const content = []
    imageIDs.forEach(id => {
      const url = urlMap[id] || id
      content.push({ type: 'image_url', image_url: { url: url } })
    })
    content.push({ type: 'text', text: newMessage || '请描述这些图片' })
    
    messages.push({ role: 'user', content: content })
  } else {
    messages.push({ role: 'user', content: newMessage })
  }

  return messages
}

// 保存消息
async function saveMessage(member, childId, sessionId, role, content, model, usage, thinking) {
  try {
    await db.collection('aiChats').add({
      data: {
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId,
        role: role,
        content: content,
        thinking: thinking || null,
        model: model,
        tokenUsage: usage || null,
        createTime: new Date()
      }
    })
    return true
  } catch (err) {
    console.error('保存消息失败:', err)
    throw err // 向上抛出异常，让调用者处理
  }
}

// 流式聊天 - 支持思考过程实时展示
async function chatStream(member, childId, sessionId, message, model, imageFileID, extraContext, skillPrompt) {
  try {
    // 1. 验证并准备参数
    const prepared = await validateAndPrepare(member, childId, sessionId, message, model, imageFileID, extraContext, skillPrompt)
    if (prepared.code !== 0) return prepared

    const { config, modelConfig, messages, aiModel } = prepared.data

    // 2. 创建任务记录
    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    await db.collection('aiThinkingProgress').add({
      data: {
        taskId: taskId,
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId,
        status: 'thinking',
        thinkingContent: '',
        finalContent: '',
        model: model || config.currentModel,
        createTime: new Date(),
        updateTime: new Date(),
        expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2小时后过期
      }
    })

    // 异步清理过期的思考记录（24小时前）- 不阻塞主流程
    const expireTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    db.collection('aiThinkingProgress')
      .where({ createTime: db.command.lt(expireTime) })
      .limit(50)
      .get()
      .then(async function(res) {
        if (res.data && res.data.length > 0) {
          const deletePromises = res.data.map(item =>
            db.collection('aiThinkingProgress').doc(item._id).remove()
          )
          await Promise.all(deletePromises)
          console.log(`清理了${res.data.length}条过期记录`)
        }
      })
      .catch(function(err) {
        console.error('清理过期记录失败:', err)
      })

    // 7. 异步调用AI模型
    callAIWithProgress(aiModel, modelConfig, messages, taskId, member, childId, sessionId, message).catch(function(err) {
      console.error('流式AI调用异常:', err)
      updateThinkingProgress(taskId, 'error', err.message || '未知错误')
    })

    // 8. 立即返回任务ID
    return {
      code: 0,
      data: {
        taskId: taskId,
        status: 'thinking'
      }
    }
  } catch (err) {
    return { code: -2, msg: '对话失败: ' + err.message }
  }
}

// 异步调用AI并更新思考进度（支持流式）
async function callAIWithProgress(aiModel, modelConfig, messages, taskId, member, childId, sessionId, message) {
  try {
    await updateThinkingProgress(taskId, 'thinking', '')

    const config = MODEL_DEFAULTS[aiModel]
    const model = modelConfig.model || config.defaultModel

    // 获取正确的 caller（支持 baseUrl 的模型需要创建新的 caller）
    let caller = config.module.caller || config.module
    if (config.baseUrl && config.module.caller) {
      // 需要使用不同的 baseUrl，创建新的 caller
      const url = new URL(config.baseUrl)
      const OpenAICompatibleCaller = require('./models/base-caller').OpenAICompatibleCaller
      caller = new OpenAICompatibleCaller({
        hostname: url.hostname,
        path: url.pathname + '/chat/completions'
      })
    }

    // 尝试流式调用
    if (caller && typeof caller.callStream === 'function') {
      let lastThinkingLen = 0
      let lastContentLen = 0
      let updateTimer = null
      let latestChunk = null

      const streamResult = await caller.callStream(modelConfig.apiKey, messages, model, (chunk) => {
        latestChunk = chunk
        // 节流更新：最多每500ms更新一次数据库
        if (updateTimer) return
        updateTimer = setTimeout(() => {
          updateTimer = null
          const thinkingDelta = latestChunk.thinking.length - lastThinkingLen
          const contentDelta = latestChunk.content.length - lastContentLen
          if (thinkingDelta > 0 || contentDelta > 0) {
            lastThinkingLen = latestChunk.thinking.length
            lastContentLen = latestChunk.content.length
            updateThinkingProgress(taskId, 'thinking', latestChunk.thinking, latestChunk.content).catch(() => {})
          }
        }, 500)
      })

      // 流结束后，刷新最后一次更新
      if (updateTimer) {
        clearTimeout(updateTimer)
        updateTimer = null
      }
      if (latestChunk && (latestChunk.thinking.length > lastThinkingLen || latestChunk.content.length > lastContentLen)) {
        await updateThinkingProgress(taskId, 'thinking', latestChunk.thinking, latestChunk.content).catch(() => {})
      }

      if (streamResult.code !== 0) {
        await updateThinkingProgress(taskId, 'error', streamResult.msg)
        return
      }

      await Promise.all([
        saveMessage(member, childId, sessionId, 'user', message, aiModel),
        saveMessage(member, childId, sessionId, 'assistant', streamResult.data.content, aiModel, streamResult.data.usage, streamResult.data.thinking)
      ])

      await updateThinkingProgress(taskId, 'completed', streamResult.data.thinking || '', streamResult.data.content, streamResult.data.usage)
    } else {
      // 降级：非流式调用
      const result = await callAIModel(aiModel, modelConfig.apiKey, messages, modelConfig.model, modelConfig.secretKey)

      if (result.code !== 0) {
        await updateThinkingProgress(taskId, 'error', result.msg)
        return
      }

      if (result.data.thinking) {
        await updateThinkingProgress(taskId, 'thinking', result.data.thinking)
      }

      await Promise.all([
        saveMessage(member, childId, sessionId, 'user', message, aiModel),
        saveMessage(member, childId, sessionId, 'assistant', result.data.content, aiModel, result.data.usage, result.data.thinking)
      ])

      await updateThinkingProgress(taskId, 'completed', result.data.thinking || '', result.data.content, result.data.usage)
    }

  } catch (err) {
    console.error('AI调用失败:', err)
    await updateThinkingProgress(taskId, 'error', err.message)
  }
}

// 更新思考进度
async function updateThinkingProgress(taskId, status, thinkingContent, finalContent, usage) {
  try {
    const data = {
      status: status,
      updateTime: new Date()
    }
    
    if (thinkingContent !== undefined) {
      data.thinkingContent = thinkingContent
    }
    if (finalContent !== undefined) {
      data.finalContent = finalContent
    }
    if (usage !== undefined) {
      data.usage = usage
    }

    await db.collection('aiThinkingProgress')
      .where({ taskId: taskId })
      .update({ data: data })
  } catch (err) {
    console.error('更新思考进度失败:', err)
  }
}

// 获取思考进度
async function getThinkingProgress(taskId) {
  try {
    if (!taskId) {
      return { code: -5, msg: '缺少任务ID' }
    }

    const res = await db.collection('aiThinkingProgress')
      .where({ taskId: taskId })
      .get()

    if (res.data.length === 0) {
      return { code: -1, msg: '任务不存在' }
    }

    const progress = res.data[0]
    return {
      code: 0,
      data: {
        taskId: progress.taskId,
        status: progress.status,
        thinkingContent: progress.thinkingContent,
        finalContent: progress.finalContent,
        usage: progress.usage
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取进度失败: ' + err.message }
  }
}

// 获取对话历史
async function getHistory(member, childId, sessionId, page, pageSize) {
  try {
    const where = {
      familyId: member.familyId,
      childId: childId || ''
    }
    if (sessionId) {
      where.sessionId = sessionId
    }

    const countRes = await db.collection('aiChats')
      .where(where)
      .count()

    const res = await db.collection('aiChats')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list: res.data.reverse(),
        total: countRes.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取历史失败: ' + err.message }
  }
}

// 清空对话历史
async function clearHistory(member, childId, sessionId) {
  try {
    const where = {
      familyId: member.familyId,
      childId: childId || ''
    }
    if (sessionId) {
      where.sessionId = sessionId
    }

    // 批量删除（每次最多删除100条，循环执行）
    let deleted = 0
    let hasMore = true
    
    while (hasMore) {
      const res = await db.collection('aiChats')
        .where(where)
        .limit(100)
        .get()
      
      if (res.data.length === 0) {
        hasMore = false
        break
      }
      
      // 批量删除当前批次
      const deletePromises = res.data.map(item => 
        db.collection('aiChats').doc(item._id).remove()
      )
      await Promise.all(deletePromises)
      deleted += res.data.length
      
      // 如果返回的数据少于100条，说明已经删完
      if (res.data.length < 100) {
        hasMore = false
      }
    }

    return { code: 0, msg: '历史已清空', data: { deleted } }
  } catch (err) {
    return { code: -2, msg: '清空历史失败: ' + err.message }
  }
}

// 获取会话列表
async function getSessions(member, childId, limit) {
  try {
    // 默认限制500条，可传入自定义limit
    const queryLimit = Math.min(limit || 500, 2000) // 最大2000条
    
    const res = await db.collection('aiChats')
      .where({
        familyId: member.familyId,
        childId: childId || ''
      })
      .orderBy('createTime', 'desc')
      .limit(queryLimit)
      .get()

    // 按sessionId分组，获取每个会话的最新消息和统计信息
    const sessionMap = {}
    for (const item of res.data) {
      if (!sessionMap[item.sessionId]) {
        sessionMap[item.sessionId] = {
          sessionId: item.sessionId,
          lastMessage: item.content,
          lastTime: item.createTime,
          modelName: item.model || '未知模型',
          messageCount: 1,
          totalTokens: 0
        }
      } else {
        sessionMap[item.sessionId].messageCount++
      }
      
      // 累加token使用量
      if (item.tokenUsage) {
        const usage = item.tokenUsage
        sessionMap[item.sessionId].totalTokens += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
      }
    }

    const sessions = Object.values(sessionMap)
    return { 
      code: 0, 
      data: {
        sessions: sessions,
        hasMore: res.data.length >= queryLimit // 如果返回的数据等于limit，可能还有更多
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取会话列表失败: ' + err.message }
  }
}

// 删除会话
async function deleteSession(member, childId, sessionId) {
  try {
    const where = {
      familyId: member.familyId,
      childId: childId || '',
      sessionId: sessionId
    }
    
    // 循环删除（每次最多删除1000条，因为where().remove()有限制）
    let deleted = 0
    let hasMore = true
    
    while (hasMore) {
      const res = await db.collection('aiChats')
        .where(where)
        .limit(1000)
        .get()
      
      if (res.data.length === 0) {
        hasMore = false
        break
      }
      
      // 批量删除当前批次
      const deletePromises = res.data.map(item => 
        db.collection('aiChats').doc(item._id).remove()
      )
      await Promise.all(deletePromises)
      deleted += res.data.length
      
      if (res.data.length < 1000) {
        hasMore = false
      }
    }
    
    // 同时删除会话标题
    await db.collection('aiSessionTitles')
      .where({
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId
      })
      .remove()
      .catch(function(err) {
        console.error('删除会话标题失败:', err)
      })

    return { code: 0, msg: '会话已删除', data: { deleted: deleted } }
  } catch (err) {
    return { code: -2, msg: '删除会话失败: ' + err.message }
  }
}

// 获取用户偏好设置
async function getUserPreference(member, key) {
  try {
    const res = await db.collection('userPreferences')
      .where({
        openid: member.openid,
        key: key
      })
      .get()

    if (res.data.length > 0) {
      return { code: 0, data: { value: res.data[0].value } }
    }

    return { code: 0, data: { value: null } }
  } catch (err) {
    return { code: -2, msg: '获取偏好设置失败: ' + err.message }
  }
}

// 保存用户偏好设置
async function saveUserPreference(member, key, value) {
  try {
    // 输入验证
    if (!key || typeof key !== 'string' || key.length > 100) {
      return { code: -1, msg: '无效的设置key' }
    }
    
    // value类型和长度检查
    if (value !== null && value !== undefined) {
      const valueType = typeof value
      if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean' && valueType !== 'object') {
        return { code: -1, msg: '无效的设置值类型' }
      }
      // 字符串长度限制
      if (valueType === 'string' && value.length > 1000) {
        return { code: -1, msg: '设置值过长' }
      }
      // 对象序列化后长度限制
      if (valueType === 'object') {
        try {
          const jsonStr = JSON.stringify(value)
          if (jsonStr.length > 10000) {
            return { code: -1, msg: '设置值过大' }
          }
        } catch (e) {
          return { code: -1, msg: '无效的设置值' }
        }
      }
    }

    const existing = await db.collection('userPreferences')
      .where({
        openid: member.openid,
        key: key
      })
      .get()

    if (existing.data.length > 0) {
      await db.collection('userPreferences')
        .doc(existing.data[0]._id)
        .update({
          data: {
            value: value,
            updateTime: new Date()
          }
        })
    } else {
      await db.collection('userPreferences')
        .add({
          data: {
            openid: member.openid,
            key: key,
            value: value,
            createTime: new Date(),
            updateTime: new Date()
          }
        })
    }

    return { code: 0, msg: '保存成功' }
  } catch (err) {
    return { code: -2, msg: '保存偏好设置失败: ' + err.message }
  }
}

// 生成会话标题（异步执行，不阻塞主流程）
async function generateSessionTitleIfNeeded(member, childId, sessionId, firstMessage) {
  try {
    // 检查是否已有标题
    const existingTitle = await db.collection('aiSessionTitles')
      .where({
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId
      })
      .get()
    
    if (existingTitle.data.length > 0) {
      return // 已有标题，跳过
    }
    
    // 检查是否是第一条消息（通过消息数量判断）
    const messageCount = await db.collection('aiChats')
      .where({
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId
      })
      .count()
    
    // 只有当消息数为2（用户消息+AI回复）时才生成标题
    if (messageCount.total > 2) {
      return
    }
    
    // 生成标题（取用户消息前20个字符）
    let title = firstMessage.substring(0, 20)
    if (firstMessage.length > 20) {
      title += '...'
    }
    
    // 保存标题
    await db.collection('aiSessionTitles').add({
      data: {
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId,
        title: title,
        createTime: new Date()
      }
    })
    
    console.log('会话标题已生成:', title)
  } catch (err) {
    console.error('生成会话标题失败:', err)
  }
}

// 获取会话标题
async function getSessionTitle(member, childId, sessionId) {
  try {
    const res = await db.collection('aiSessionTitles')
      .where({
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId
      })
      .get()
    
    if (res.data.length > 0) {
      return res.data[0].title
    }
    return null
  } catch (err) {
    console.error('获取会话标题失败:', err)
    return null
  }
}

// 获取模型价格配置
function getModelPrices() {
  // 每百万token价格（元）- 2026年6月官网最新价格
  const prices = {
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
  
  return { code: 0, data: prices }
}

// 从云数据库读取百度API密钥（带25天TTL）
let _baiduKeysCache = null
let _baiduKeysCacheTime = 0
const BAIDU_KEYS_TTL = 25 * 24 * 60 * 60 * 1000 // 25天

async function getBaiduKeys() {
  const now = Date.now()
  if (_baiduKeysCache && (now - _baiduKeysCacheTime) < BAIDU_KEYS_TTL) {
    console.log('使用缓存的百度密钥')
    return _baiduKeysCache
  }
  
  // 优先从aiConfigs获取（新配置，语音设置页面配置）
  // 注意：getBaiduKeys没有member参数，需要查询所有配置
  const configRes = await db.collection('aiConfigs').where({ 
    baiduTtsApiKey: db.command.exists(true) 
  }).get()
  if (configRes.data.length > 0 && configRes.data[0].baiduTtsApiKey && configRes.data[0].baiduTtsSecretKey) {
    console.log('使用aiConfigs中的百度TTS配置')
    _baiduKeysCache = { 
      apiKey: configRes.data[0].baiduTtsApiKey, 
      secretKey: configRes.data[0].baiduTtsSecretKey 
    }
    _baiduKeysCacheTime = now
    return _baiduKeysCache
  }
  
  // 备用：从systemConfig获取（旧配置）
  const res = await db.collection('systemConfig').where({ key: 'baiduTTS' }).get()
  console.log('数据库查询结果:', JSON.stringify(res.data))
  if (res.data.length === 0) {
    throw new Error('百度TTS密钥未配置，请在语音设置中配置')
  }
  console.log('使用systemConfig中的百度TTS配置')
  _baiduKeysCache = { apiKey: res.data[0].apiKey, secretKey: res.data[0].secretKey }
  _baiduKeysCacheTime = now
  return _baiduKeysCache
}

// 百度access_token缓存
let _baiduTokenCache = null
let _baiduTokenCacheTime = 0
const BAIDU_TOKEN_TTL = 25 * 24 * 60 * 60 * 1000 // 25天

// 获取百度access_token
async function getBaiduAccessToken() {
  const now = Date.now()
  if (_baiduTokenCache && (now - _baiduTokenCacheTime) < BAIDU_TOKEN_TTL) {
    return _baiduTokenCache
  }

  const https = require('https')
  const keys = await getBaiduKeys()
  return new Promise((resolve, reject) => {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${keys.apiKey}&client_secret=${keys.secretKey}`

    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (!result.access_token) {
            console.error('百度token获取失败:', data)
            reject(new Error('百度token获取失败: ' + (result.error_description || '未知错误')))
            return
          }
          _baiduTokenCache = result.access_token
          _baiduTokenCacheTime = now
          resolve(result.access_token)
        } catch (err) {
          console.error('百度token解析失败:', err.message)
          reject(err)
        }
      })
    }).on('error', (err) => {
      console.error('百度token请求失败:', err.message)
      reject(err)
    })
  })
}

// 百度语音识别
async function speechToText(audioData) {
  const https = require('https')
  
  try {
    // 获取access_token
    const accessToken = await getBaiduAccessToken()
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        format: 'pcm',
        rate: 16000,
        channel: 1,
        cuid: 'wechat-mini-program',
        token: accessToken,
        speech: audioData,
        len: Buffer.from(audioData, 'base64').length
      })
      
      const options = {
        hostname: 'vop.baidu.com',
        path: '/server_api',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }
      
      const req = https.request(options, (res) => {
        let responseData = ''
        res.on('data', (chunk) => responseData += chunk)
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData)
            if (result.err_no === 0 && result.result && result.result.length > 0) {
              resolve({
                code: 0,
                data: { text: result.result[0] }
              })
            } else {
              resolve({
                code: -1,
                msg: result.err_msg || '识别失败'
              })
            }
          } catch (err) {
            resolve({
              code: -1,
              msg: '解析响应失败: ' + err.message
            })
          }
        })
      })
      
      req.on('error', (err) => {
        resolve({
          code: -1,
          msg: '请求失败: ' + err.message
        })
      })
      
      req.write(postData)
      req.end()
    })
  } catch (err) {
    return {
      code: -1,
      msg: '获取token失败: ' + err.message
    }
  }
}

// 语音合成（优先使用Edge TTS，降级到百度TTS）
async function textToSpeech(text, voice, baiduPer, mimoVoice) {
  const maxLen = 1000
  const truncatedText = text.length > maxLen ? text.substring(0, maxLen) : text
  const ttsVoice = voice || 'zh-CN-XiaoxiaoNeural'

  console.log('textToSpeech调用:', { voice, ttsVoice, baiduPer, mimoVoice })

  // 根据参数判断使用哪个引擎
  // 如果有 mimoVoice 参数，使用小米TTS
  // 如果有 baiduPer 参数，使用百度TTS
  // 如果有 voice 参数，使用Edge TTS
  if (mimoVoice) {
    // 使用小米TTS
    try {
      return await mimoTTS(truncatedText, 'mimo-v2.5-tts', null, mimoVoice)
    } catch (err) {
      console.error('小米TTS异常:', err.message)
      return { code: -1, msg: '小米TTS服务不可用: ' + err.message }
    }
  } else if (baiduPer) {
    // 使用百度TTS
    try {
      return await baiduTTS(truncatedText, ttsVoice, baiduPer)
    } catch (err) {
      console.error('百度TTS异常:', err.message)
      return { code: -1, msg: '百度TTS服务不可用: ' + err.message }
    }
  } else {
    // 使用Edge TTS
    try {
      const result = await edgeTTS(truncatedText, ttsVoice)
      if (result.code === 0) {
        return result
      }
      console.log('Edge TTS失败:', result.msg)
      return result
    } catch (err) {
      console.log('Edge TTS异常:', err.message)
      return { code: -1, msg: 'Edge TTS服务不可用: ' + err.message }
    }
  }
}

// Edge TTS（免费，使用Edge浏览器朗读功能的接口）
// 使用msedge-tts库，支持Sec-MS-GEC安全令牌
const { MsEdgeTTS } = require('msedge-tts')

async function edgeTTS(text, voice) {
  const MAX_RETRIES = 3
  const voiceName = voice || 'zh-CN-XiaoxiaoNeural'
  
  console.log('edgeTTS调用:', { voice, voiceName })
  
  // 移除emoji和特殊字符（Edge TTS不支持）
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/\s+/g, ' ').trim()
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    const tts = new MsEdgeTTS()
    try {
      // 设置语音和输出格式
      console.log('设置语音:', voiceName)
      await tts.setMetadata(voiceName, 'audio-24khz-48kbitrate-mono-mp3', {})
      console.log('语音设置完成，当前voice:', tts._voice)
      
      // 合成语音
      const { audioStream } = await tts.toStream(text)
      
      // 收集音频数据
      const audioData = []
      await new Promise((resolve, reject) => {
        audioStream.on('data', (chunk) => audioData.push(chunk))
        audioStream.on('end', resolve)
        audioStream.on('error', reject)
      })
      
      const audioBuffer = Buffer.concat(audioData)
      if (audioBuffer.length > 0) {
        return { code: 0, data: { audio: audioBuffer.toString('base64') } }
      } else {
        console.log(`Edge TTS尝试 ${i + 1} 失败: 返回空音频`)
      }
    } catch (err) {
      console.log(`Edge TTS尝试 ${i + 1} 异常:`, err.message)
    } finally {
      // 确保关闭WebSocket连接
      try { tts.close() } catch (e) {}
    }
    
    // 等待递增延迟后重试
    if (i < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, (i + 1) * 1000))
    }
  }

  return { code: -1, msg: 'Edge TTS重试耗尽' }
}

// 百度TTS（备用）
async function baiduTTS(text, voice, baiduPer) {
  const https = require('https')

  if (!text || text.trim() === '') {
    return { code: -1, msg: '文本为空' }
  }

  // 移除emoji和特殊字符（百度TTS不支持）
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/\s+/g, ' ').trim()

  // per: 0=度小美女声，1=度小宇男声，3=度逍遥情感男声，4=度丫丫童声
  let per = 0 // 默认度小美女声
  if (baiduPer !== undefined && baiduPer !== '') {
    per = parseInt(baiduPer) || 0
  } else if (voice) {
    // 兼容旧逻辑：从Edge TTS voice name推断
    if (voice.includes('Yunxi') || voice.includes('Yunyang') || voice.includes('Yunjian')) {
      per = 1
    } else if (voice.includes('Xiaoyi')) {
      per = 3
    }
  }

  console.log('baiduTTS参数:', { voice, baiduPer, per })
  
  try {
    const accessToken = await getBaiduAccessToken()
    console.log('百度access_token:', accessToken ? '已获取' : '获取失败')
    if (!accessToken) {
      return { code: -1, msg: '百度access_token获取失败' }
    }

    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        tex: text,
        tok: accessToken,
        cuid: 'wechat-mini-program',
        ctp: 1,
        lan: 'zh',
        spd: 5,
        pit: 5,
        vol: 5,
        per: per
      })
      const postData = params.toString()

      const options = {
        hostname: 'tsn.baidu.com',
        path: '/text2audio',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }
      
      const req = https.request(options, (res) => {
        const contentType = res.headers['content-type'] || ''
        
        if (contentType.includes('audio')) {
          const chunks = []
          res.on('data', (chunk) => chunks.push(chunk))
          res.on('end', () => {
            const audioBuffer = Buffer.concat(chunks)
            resolve({
              code: 0,
              data: {
                audio: audioBuffer.toString('base64')
              }
            })
          })
        } else {
          let responseData = ''
          res.on('data', (chunk) => responseData += chunk)
          res.on('end', () => {
            try {
              const result = JSON.parse(responseData)
              console.error('百度TTS错误响应:', result)
              resolve({
                code: -1,
                msg: result.err_msg || '百度TTS失败'
              })
            } catch (err) {
              console.error('百度TTS响应解析失败:', responseData)
              resolve({
                code: -1,
                msg: '百度TTS失败'
              })
            }
          })
        }
      })
      
      req.on('error', (err) => {
        resolve({
          code: -1,
          msg: '百度TTS请求失败: ' + err.message
        })
      })
      
      req.write(postData)
      req.end()
    })
  } catch (err) {
    return {
      code: -1,
      msg: '获取百度token失败: ' + err.message
    }
  }
}

// 小米TTS（大模型语音合成）
// 文档：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5
async function mimoTTS(text, voice, overrideApiKey, overrideVoice) {
  const https = require('https')
  
  if (!text || text.trim() === '') {
    return { code: -1, msg: '文本为空' }
  }
  
  // 移除emoji和特殊字符
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/\s+/g, ' ').trim()
  
  // 限制文本长度，避免音频数据过大
  if (text.length > 500) {
    text = text.substring(0, 500)
  }
  
  const voiceName = voice || 'mimo-v2.5-tts'
  const voiceParam = overrideVoice || '冰糖'
  
  // 获取小米API密钥（复用mimo模型的配置）
  let apiKey = overrideApiKey
  if (!apiKey) {
    // 从数据库获取TTS配置（查询有mimoTtsApiKey的配置）
    const configResult = await db.collection('aiConfigs').where({
      mimoTtsApiKey: db.command.exists(true)
    }).get()
    
    if (configResult.data && configResult.data.length > 0) {
      const config = configResult.data[0]
      // 优先使用TTS专用密钥，如果没有则使用模型配置的密钥
      apiKey = config.mimoTtsApiKey || config.models?.mimo?.apiKey || ''
    }
  }
  
  if (!apiKey) {
    return { code: -1, msg: '小米API密钥未配置，请先在模型配置中设置小米模型' }
  }
  
  console.log('mimoTTS调用参数:', {
    voiceName,
    voiceParam,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
    textLength: text.length
  })
  
  return new Promise((resolve, reject) => {
    // 小米TTS使用chat/completions格式，不是audio/speech格式
    const data = JSON.stringify({
      model: voiceName,
      messages: [
        {
          role: 'assistant',
          content: text
        }
      ],
      audio: {
        format: 'wav',
        voice: voiceParam
      }
    })
    
    console.log('mimoTTS请求数据:', data)
    
    const options = {
      hostname: 'api.xiaomimimo.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(data)
      }
    }
    
    const req = https.request(options, (res) => {
      console.log('小米TTS响应状态码:', res.statusCode)
      
      let responseData = ''
      res.on('data', (chunk) => responseData += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          console.log('小米TTS响应:', JSON.stringify(result).substring(0, 500))
          
          if (res.statusCode === 200 && result.choices && result.choices[0]) {
            // 小米TTS返回格式：choices[0].message.audio.data
            const message = result.choices[0].message
            if (message && message.audio && message.audio.data) {
              resolve({
                code: 0,
                data: {
                  audio: message.audio.data
                }
              })
            } else {
              console.error('小米TTS响应格式错误:', result)
              resolve({ code: -1, msg: '响应格式错误' })
            }
          } else {
            console.error('小米TTS错误响应:', result)
            resolve({
              code: -1,
              msg: result.error?.message || '小米TTS失败'
            })
          }
        } catch (err) {
          console.error('小米TTS响应解析失败:', responseData)
          resolve({
            code: -1,
            msg: '小米TTS失败'
          })
        }
      })
    })
    
    req.on('error', (err) => {
      resolve({
        code: -1,
        msg: '小米TTS请求失败: ' + err.message
      })
    })
    
    req.write(data)
    req.end()
  })
}

// 获取小米TTS API密钥
async function getMimoTtsApiKey() {
  try {
    const result = await db.collection('ai_config').where({
      userId: 'system'
    }).get()
    
    if (result.data && result.data.length > 0) {
      const config = result.data[0]
      return config.mimoTtsApiKey || ''
    }
    return ''
  } catch (err) {
    console.error('获取小米TTS API密钥失败:', err)
    return ''
  }
}

// 获取TTS配置
async function getTtsConfig(member) {
  try {
    // 从aiConfigs集合获取（与模型配置共用）
    // 使用与getConfig相同的查询条件
    const result = await db.collection('aiConfigs').where({
      familyId: member.familyId,
      childId: member.childId || ''
    }).get()
    
    if (result.data && result.data.length > 0) {
      const config = result.data[0]
      return {
        code: 0,
        data: {
          mimoTtsApiKey: config.mimoTtsApiKey || '',
          mimoTtsPlanApiKey: config.mimoTtsPlanApiKey || '',
          baiduTtsAppId: config.baiduTtsAppId || '',
          baiduTtsApiKey: config.baiduTtsApiKey || '',
          baiduTtsSecretKey: config.baiduTtsSecretKey || ''
        }
      }
    }
    
    return {
      code: 0,
      data: {
        mimoTtsApiKey: '',
        mimoTtsPlanApiKey: '',
        baiduTtsAppId: '',
        baiduTtsApiKey: '',
        baiduTtsSecretKey: ''
      }
    }
  } catch (err) {
    console.error('获取TTS配置失败:', err)
    return { code: -1, msg: '获取配置失败' }
  }
}

// 保存TTS配置
async function saveTtsConfig(member, event) {
  try {
    console.log('saveTtsConfig调用:', { 
      familyId: member.familyId,
      eventKeys: Object.keys(event),
      mimoTtsApiKey: event.mimoTtsApiKey ? '已提供' : '未提供',
      mimoTtsPlanApiKey: event.mimoTtsPlanApiKey ? '已提供' : '未提供'
    })
    
    const { engine, mimoTtsApiKey, mimoTtsPlanApiKey, baiduAppId, baiduApiKey, baiduSecretKey } = event
    
    // 输入验证和清理
    const updateData = {}
    
    // 小米TTS配置
    if (mimoTtsApiKey !== undefined) {
      const trimmedKey = mimoTtsApiKey.trim()
      if (trimmedKey.length > 200) {
        return { code: -1, msg: 'API密钥长度不能超过200字符' }
      }
      updateData.mimoTtsApiKey = trimmedKey
    }
    if (mimoTtsPlanApiKey !== undefined) {
      const trimmedKey = mimoTtsPlanApiKey.trim()
      if (trimmedKey.length > 200) {
        return { code: -1, msg: 'API密钥长度不能超过200字符' }
      }
      updateData.mimoTtsPlanApiKey = trimmedKey
    }
    
    // 百度TTS配置
    if (baiduAppId !== undefined) {
      updateData.baiduTtsAppId = baiduAppId.trim()
    }
    if (baiduApiKey !== undefined) {
      updateData.baiduTtsApiKey = baiduApiKey.trim()
    }
    if (baiduSecretKey !== undefined) {
      updateData.baiduTtsSecretKey = baiduSecretKey.trim()
    }
    
    console.log('saveTtsConfig准备保存的数据:', updateData)
    
    // 查询现有配置（使用aiConfigs集合，与模型配置共用）
    // 使用与saveConfig相同的查询条件
    const result = await db.collection('aiConfigs').where({
      familyId: member.familyId,
      childId: member.childId || ''
    }).get()
    
    console.log('saveTtsConfig查询结果:', result.data.length, '条记录')
    
    if (result.data && result.data.length > 0) {
      // 更新现有配置
      console.log('更新现有配置，ID:', result.data[0]._id)
      await db.collection('aiConfigs').doc(result.data[0]._id).update({
        data: updateData
      })
    } else {
      // 创建新配置
      console.log('创建新配置')
      await db.collection('aiConfigs').add({
        data: {
          familyId: member.familyId,
          childId: member.childId || '',
          ...updateData
        }
      })
    }
    
    return { code: 0, msg: '保存成功' }
  } catch (err) {
    console.error('保存TTS配置失败:', err)
    return { code: -1, msg: '保存失败' }
  }
}

// 测试TTS连接
async function testTts(member, event) {
  const { engine } = event
  
  try {
    if (engine === 'mimo') {
      // 获取TTS配置中的API密钥
      console.log('testTts查询条件:', { familyId: member.familyId })
      const configResult = await db.collection('aiConfigs').where({
        familyId: member.familyId
      }).get()
      
      console.log('testTts查询结果:', configResult.data)
      
      let apiKey = ''
      if (configResult.data && configResult.data.length > 0) {
        const config = configResult.data[0]
        console.log('TTS配置字段:', Object.keys(config))
        // 优先使用直接调用的密钥，如果没有则使用套餐密钥
        apiKey = config.mimoTtsApiKey || config.mimoTtsPlanApiKey || ''
      }
      
      if (!apiKey) {
        return { code: -1, msg: '请先在语音设置中配置小米TTS API密钥' }
      }
      
      console.log('开始测试小米TTS，密钥长度:', apiKey.length)
      
      // 尝试中文音色
      const voices = ['冰糖', '茉莉', '苏打', '白桦', 'mimo_default']
      let lastError = null
      
      for (const voice of voices) {
        console.log('尝试音色:', voice)
        const result = await mimoTTS('你好，这是小米TTS测试。', 'mimo-v2.5-tts', apiKey, voice)
        
        console.log('音色', voice, '测试结果:', result)
        
        if (result.code === 0) {
          return { 
            code: 0, 
            msg: '测试成功，使用音色: ' + voice,
            data: {
              voice: voice,
              audioLength: result.data?.audio?.length || 0
            }
          }
        }
        
        lastError = result.msg
      }
      
      return { code: -1, msg: '所有音色测试失败，最后错误: ' + lastError }
    }
    
    return { code: -1, msg: '不支持的引擎' }
  } catch (err) {
    console.error('测试TTS失败:', err)
    return { code: -1, msg: '测试失败: ' + err.message }
  }
}
