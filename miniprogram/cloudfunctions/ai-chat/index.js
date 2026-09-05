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
const modelList = require('./models/model-list') // 平台模型列表同步

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
  const { action, familyId } = event
  const startTime = Date.now()

  // 获取用户身份
  const member = await getMemberByOpenid(OPENID, familyId)
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
      return await getThinkingProgress(member, event.taskId)
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
    case 'listModels':
      return modelList.listModels(db, event.provider, event.type || 'chat', !!event.forceRefresh)
    case 'generateImage': {
      // 动态配额（aiQuotaConfig，创建者可在家长中心修改）：先分钟限流，后家庭日配额
      const imageQuota = await getImageQuota(member.familyId)
      const minuteErr = checkRateLimit(OPENID, 'generateImage', imageQuota.perMinute)
      if (minuteErr) return minuteErr
      const quotaErr = await checkDailyQuota(member, 'generateImage', imageQuota.daily, 'AI画画')
      if (quotaErr) return quotaErr
      return await generateImage(member, event)
    }
    case 'getQuotaConfig':
      return await getQuotaConfig(member)
    case 'saveQuotaConfig':
      return await saveQuotaConfig(member, event, OPENID)
    case 'speechToText': {
      // B4：外部付费接口纳入家庭级日配额（防费用滥用）
      const quotaErr = await checkDailyQuota(member, 'speechToText')
      if (quotaErr) return quotaErr
      return await speechToText(event.audioData, member.familyId)
    }
    case 'textToSpeech': {
      const quotaErr = await checkDailyQuota(member, 'textToSpeech')
      if (quotaErr) return quotaErr
      // B6：透传 familyId，密钥只取本家庭的
      return await textToSpeech(event.text, event.voice, event.baiduPer, event.mimoVoice, member.familyId)
    }
    case 'getTtsConfig':
      return await getTtsConfig(member, event.childId)
    case 'saveTtsConfig':
      return await saveTtsConfig(member, event)
    case 'testTts': {
      const quotaErr = await checkDailyQuota(member, 'testTts')
      if (quotaErr) return quotaErr
      return await testTts(member, event)
    }
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// B4：家庭级日配额（落库计数，防多实例绕过内存限流刷外部付费接口）。
// 以 key 作为文档 _id + inc 原子自增：并发首次创建时同 _id 的 add 只会成功一个，
// 计数不会分散到多条文档，也不会互相覆盖少计
const DAILY_QUOTA = {
  speechToText: 20,
  textToSpeech: 50,
  testTts: 5
  // generateImage 走动态配额（aiQuotaConfig 集合，家庭创建者可在家长中心修改），见 getImageQuota
}

// AI画画配额默认值（无配置时生效）
const DEFAULT_IMAGE_QUOTA = {
  daily: 100,     // 每日次数
  perMinute: 20   // 每分钟次数
}

// 配额数值归一化（非法值返回 fallback；fallback 为 null 时返回 null 表示不合法）
function normalizeQuotaNumber(value, min, max, fallback) {
  const n = parseInt(value)
  if (isNaN(n) || n < min) return fallback
  return Math.min(n, max)
}

// 读取家庭AI画画配额（无配置/读取失败时用默认值）
async function getImageQuota(familyId) {
  try {
    const res = await db.collection('aiQuotaConfig').doc(familyId).get()
    const conf = res.data || {}
    return {
      daily: normalizeQuotaNumber(conf.generateImageDaily, 1, 1000, DEFAULT_IMAGE_QUOTA.daily),
      perMinute: normalizeQuotaNumber(conf.generateImagePerMinute, 1, 100, DEFAULT_IMAGE_QUOTA.perMinute)
    }
  } catch (err) {
    return { daily: DEFAULT_IMAGE_QUOTA.daily, perMinute: DEFAULT_IMAGE_QUOTA.perMinute }
  }
}

// 读取配额配置（前端展示用）
async function getQuotaConfig(member) {
  const quota = await getImageQuota(member.familyId)
  return {
    code: 0,
    data: { generateImageDaily: quota.daily, generateImagePerMinute: quota.perMinute }
  }
}

// 保存配额配置（仅家庭创建者，families.creatorOpenid 为准）
async function saveQuotaConfig(member, event, openid) {
  try {
    const familyRes = await db.collection('families').doc(member.familyId).get()
    const creatorOpenid = familyRes.data && familyRes.data.creatorOpenid
    if (!creatorOpenid || creatorOpenid !== openid) {
      return { code: -4, msg: '仅家庭创建者可修改配额' }
    }
  } catch (err) {
    console.error('校验创建者身份失败:', err)
    return { code: -4, msg: '身份校验失败' }
  }

  const conf = event.config || {}
  const daily = normalizeQuotaNumber(conf.generateImageDaily, 1, 1000, null)
  const perMinute = normalizeQuotaNumber(conf.generateImagePerMinute, 1, 100, null)
  if (daily === null || perMinute === null) {
    return { code: -5, msg: '配额数值不合法（每日1-1000，每分钟1-100）' }
  }

  try {
    await db.collection('aiQuotaConfig').doc(member.familyId).set({
      data: {
        familyId: member.familyId,
        generateImageDaily: daily,
        generateImagePerMinute: perMinute,
        updateTime: new Date()
      }
    })
    return { code: 0, msg: '保存成功' }
  } catch (err) {
    console.error('保存配额配置失败:', err)
    return { code: -2, msg: '保存失败: ' + err.message }
  }
}

async function checkDailyQuota(member, action, customLimit, actionName) {
  var limit = (typeof customLimit === 'number' && customLimit > 0) ? customLimit : DAILY_QUOTA[action]
  if (!limit || !member || !member.familyId) return null
  try {
    var now = Date.now()
    var key = member.familyId + '_' + new Date(now).toISOString().slice(0, 10) + '_' + action
    try {
      // expireAt：2 天缓冲（覆盖跨时区/跨日边界），供 cleanupExpiredQuota 判定过期
      await db.collection('aiDailyQuota').add({ data: { _id: key, count: 0, expireAt: new Date(now + 2 * 24 * 60 * 60 * 1000) } })
    } catch (e) {
      // 文档已存在（当日已有调用或并发首建撞车）：忽略，统一走下方原子自增
    }
    // 异步清理过期配额文档——按 familyId_日期_action 建档每天新增、只增不减，
    // 不清理会无限累积；fire-and-forget，不阻塞配额主流程
    cleanupExpiredQuota()
    await db.collection('aiDailyQuota').doc(key).update({ data: { count: db.command.inc(1) } })
    var fresh = await db.collection('aiDailyQuota').doc(key).get()
    var count = (fresh.data && fresh.data.count) || 0
    if (count > limit) {
      return { code: -6, msg: '今日' + (actionName || action) + '调用次数已达上限，明天再试吧' }
    }
    return null
  } catch (e) {
    // 配额存储故障不阻塞业务（内存限流仍在第一道）
    console.warn('日配额检查失败:', e)
    return null
  }
}

// 清理过期的 aiDailyQuota 配额文档（与 chatStream 清理 aiThinkingProgress 同模式：
// 按 expireAt 查询、limit 分批、异步删除）。部署前创建的存量文档无 expireAt 字段，
// 通过 _id 中的日期段兜底判定，但今天的配额文档即便缺字段也保留，
// 避免误删导致当日计数清零、配额被重置
function cleanupExpiredQuota() {
  const cmd = db.command
  db.collection('aiDailyQuota')
    .where(cmd.or([
      { expireAt: cmd.lt(new Date()) },
      { expireAt: cmd.exists(false) }
    ]))
    .limit(20)
    .get()
    .then(async function(res) {
      if (!res.data || res.data.length === 0) return
      var todaySeg = '_' + new Date().toISOString().slice(0, 10) + '_'
      var stale = res.data.filter(function(item) {
        if (item.expireAt) return true
        // _id 形如 familyId_YYYY-MM-DD_action（action 不含下划线），倒数第二段为日期
        var parts = String(item._id).split('_')
        return parts.length < 3 || ('_' + parts[parts.length - 2] + '_') !== todaySeg
      })
      if (stale.length > 0) {
        const deletePromises = stale.map(function(item) {
          return db.collection('aiDailyQuota').doc(item._id).remove()
        })
        await Promise.all(deletePromises)
        console.log('清理了' + stale.length + '条过期配额记录')
      }
    })
    .catch(function(err) {
      console.warn('清理过期配额记录失败:', err)
    })
}

// 速率限制配置
const RATE_LIMIT_CONFIG = {
  'chat': { maxRequests: 20, windowMs: 60000 }, // 每分钟最多20次
  'chatStream': { maxRequests: 20, windowMs: 60000 },
  'testConfig': { maxRequests: 5, windowMs: 60000 },
  // B4：外部付费接口同样纳入内存级快速限流（家庭级日配额见 DAILY_QUOTA）
  'speechToText': { maxRequests: 10, windowMs: 60000 },
  'textToSpeech': { maxRequests: 20, windowMs: 60000 },
  'testTts': { maxRequests: 3, windowMs: 60000 },
  // generateImage 走动态配额（aiQuotaConfig），见 generateImage 分支
  'listModels': { maxRequests: 10, windowMs: 60000 }
}

// 速率限制存储（内存中，重启后清空）
const rateLimitStore = {}

/**
 * 检查速率限制
 * @param {string} userId - 用户ID
 * @param {string} action - 操作类型
 * @param {number} customMax - 自定义上限（覆盖配置，用于动态配额）
 * @returns {Object|null} 如果超限返回错误对象，否则返回null
 */
function checkRateLimit(userId, action, customMax) {
  const config = RATE_LIMIT_CONFIG[action]
  const max = (typeof customMax === 'number' && customMax > 0) ? customMax : (config && config.maxRequests)
  if (!max) return null
  
  const windowMs = (config && config.windowMs) || 60000
  const key = `${userId}:${action}`
  const now = Date.now()
  
  // 清理过期记录
  if (rateLimitStore[key]) {
    rateLimitStore[key] = rateLimitStore[key].filter(time => now - time < windowMs)
  } else {
    rateLimitStore[key] = []
  }
  
  // 检查是否超限
  if (rateLimitStore[key].length >= max) {
    return {
      code: -6,
      msg: `请求过于频繁，请稍后再试`
    }
  }

  // 记录本次请求
  rateLimitStore[key].push(now)

  return null
}

// 获取用户身份
async function getMemberByOpenid(openid, familyId) {
  // 优先按客户端传入的当前家庭精确匹配（多家庭切换场景）；未传时保持旧行为取第一条
  const cond = familyId
    ? { openid, familyId, status: 'active' }
    : { openid, status: 'active' }
  const res = await db.collection('familyMembers')
    .where(cond)
    .get()
  return res.data[0] || null
}

function isAdmin(member) {
  return !!(member && member.permissions && member.permissions.indexOf('admin') >= 0)
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
      const cfg = res.data[0]
      // 密钥防泄漏（P0-7）：仅管理员返回完整配置；其他成员返回脱敏版——
      // models 结构保留、apiKey/secretKey 清空，保证前端 hasValidConfig 等逻辑不崩；
      // direct 直调对非管理员视为"未配置"，聊天仍可走云端代理。
      if (isAdmin(member)) {
        // 附带各供应商"是否已配置密钥"映射，供前端供应商切换判断（脱敏/明文两分支结构一致）
        const hasKeyByProviderAdmin = {}
        if (cfg.models) {
          for (const mk in cfg.models) {
            hasKeyByProviderAdmin[mk] = !!(cfg.models[mk] && (cfg.models[mk].apiKey || cfg.models[mk].secretKey))
          }
        }
        return { code: 0, data: Object.assign({ hasKeyByProvider: hasKeyByProviderAdmin }, cfg) }
      }
      const safeModels = {}
      const hasKeyByProvider = {}
      if (cfg.models) {
        for (const mk in cfg.models) {
          safeModels[mk] = Object.assign({}, cfg.models[mk], { apiKey: '', secretKey: '' })
          hasKeyByProvider[mk] = !!(cfg.models[mk] && (cfg.models[mk].apiKey || cfg.models[mk].secretKey))
        }
      }
      return { code: 0, data: {
        familyId: cfg.familyId,
        childId: cfg.childId,
        currentModel: cfg.currentModel,
        models: safeModels,
        hasKeyByProvider: hasKeyByProvider,
        mimoTtsReady: !!cfg.mimoTtsApiKey,
        baiduTtsReady: !!(cfg.baiduTtsApiKey && cfg.baiduTtsSecretKey)
      }}
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
    // P1-19：仅管理员可修改全家 AI 配置（防止儿童角色覆盖付费密钥/切换高价模型）
    if (!isAdmin(member)) {
      return { code: -1, msg: '仅家庭管理员可修改 AI 配置' }
    }

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
  
  // B7：技能提示词/额外上下文长度上限——两者直接拼进 systemPrompt，
  // 无上限可被用于注入覆盖人设并放大 token 成本（message 本身限 4000）
  const EXTRA_LIMIT = 4000
  if (skillPrompt && skillPrompt.length > EXTRA_LIMIT) {
    return { code: -4, msg: '技能指令过长' }
  }
  if (extraContext && extraContext.length > EXTRA_LIMIT) {
    return { code: -4, msg: '附加上下文过长' }
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

  // 历史消息（验证role合法性；B10：无 content 的历史消息一并跳过，
  // 防止纯图片消息回放时向 AI API 传空内容导致会话异常）
  const validRoles = ['user', 'assistant', 'system']
  for (const item of history) {
    const role = item.role
    // 跳过无效role的消息
    if (!role || !validRoles.includes(role)) {
      console.warn('跳过无效role的历史消息:', role)
      continue
    }
// B10：无 content 的历史消息跳过（防止向 AI API 传空内容），
// 但带 imageFileID 的 AI 图片消息回放时替换为占位文本，保证图片不丢
// （占位文本注明不可展开，避免模型一本正经描述不存在的图片细节）
    if (typeof item.content !== 'string' || !item.content.trim()) {
      if (item.imageFileID) {
        messages.push({ role: role, content: '（此前AI生成了一张图片，此处无法查看细节，请不要展开描述它）' })
      } else {
        console.warn('跳过无content的历史消息:', item._id || '')
      }
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

// 保存消息（imageFileID：AI生成的图片，仅图片消息使用）
async function saveMessage(member, childId, sessionId, role, content, model, usage, thinking, imageFileID) {
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
        imageFileID: imageFileID || null,
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

    // 异步清理已过期的思考记录（按 expireAt 判定，与写入的 2 小时 TTL 一致）- 不阻塞主流程
    db.collection('aiThinkingProgress')
      .where({ expireAt: db.command.lt(new Date()) })
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

      // B9：流式路径同样生成会话标题（与 chat 路径对齐）
      generateSessionTitleIfNeeded(member, childId, sessionId, message)

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
async function getThinkingProgress(member, taskId) {
  try {
    if (!taskId) {
      return { code: -5, msg: '缺少任务ID' }
    }

    // B3：限定本家庭+本人发起的任务，防止凭 taskId 跨家庭读取他人对话
    const res = await db.collection('aiThinkingProgress')
      .where({ taskId: taskId, familyId: member.familyId })
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

    // B8：page/pageSize 缺省与类型防御，避免 skip(NaN)
    var safePage = Math.max(parseInt(page) || 1, 1)
    var safePageSize = Math.min(Math.max(parseInt(pageSize) || 20, 1), 100)

    const res = await db.collection('aiChats')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize)
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

// AI 图片生成（OpenRouter Images API）
// 参数：event.prompt 提示词；event.model 图片模型 id；event.aspectRatio 画幅；event.quality 清晰度；event.childId/event.sessionId 会话归属
async function generateImage(member, event) {
  try {
    const prompt = (event.prompt || '').trim()
    if (!prompt) {
      return { code: -5, msg: '请输入图片描述' }
    }
    if (prompt.length > 1000) {
      return { code: -5, msg: '图片描述过长，请限制在1000字符以内' }
    }
    const imageModel = event.model || 'openai/gpt-image-2'
    const childId = event.childId || ''
    const sessionId = event.sessionId || ('img_' + Date.now())
    const familyId = member.familyId

    // 1. 读取 API Key（与聊天一致的配置来源）
    const configResult = await getConfig(member, childId)
    if (configResult.code !== 0) return configResult
    const providerConfig = configResult.data.models && configResult.data.models.openrouter
    if (!providerConfig || !providerConfig.apiKey) {
      return { code: -3, msg: '请先在设置中配置OpenRouter的API Key' }
    }

    // 2. 调用 OpenRouter Images API（画幅/清晰度白名单校验后透传；
    // quality 上游仅接受 low/medium/high/auto，前端 standard 映射为 medium）
    const payload = { model: imageModel, prompt: prompt }
    const allowedRatios = ['1:1', '4:3', '3:4', '16:9', '9:16']
    if (event.aspectRatio && allowedRatios.indexOf(event.aspectRatio) > -1) {
      payload.aspect_ratio = event.aspectRatio
    }
    if (event.quality === 'high') {
      payload.quality = 'high'
    } else if (event.quality === 'standard') {
      payload.quality = 'medium'
    } else if (event.quality === 'low') {
      payload.quality = 'low'
    } else if (event.quality === 'auto') {
      payload.quality = 'auto'
    }

    // 参考图（图生图）：云存储 fileID 换临时 URL 后拼 input_references
    const refIDs = Array.isArray(event.imageFileID) ? event.imageFileID : (event.imageFileID ? [event.imageFileID] : [])
    if (refIDs.length > 0) {
      const cloudIDs = refIDs.filter(id => typeof id === 'string' && id.indexOf('cloud://') === 0)
      if (cloudIDs.length > 0) {
        try {
          const urlRes = await cloud.getTempFileURL({ fileList: cloudIDs })
          const refs = []
          if (urlRes.fileList) {
            urlRes.fileList.forEach(item => {
              if (item.tempFileURL) {
                refs.push({ type: 'image_url', image_url: { url: item.tempFileURL } })
              }
            })
          }
          if (refs.length > 0) payload.input_references = refs
        } catch (err) {
          console.error('参考图换链失败:', err)
          return { code: -1, msg: '参考图处理失败，请重试' }
        }
      }
    }

    const https = require('https')
    const reqResult = await new Promise((resolve) => {
      const data = JSON.stringify(payload)
      const req = https.request({
        hostname: 'openrouter.ai',
        path: '/api/v1/images',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + providerConfig.apiKey,
          'Content-Length': Buffer.byteLength(data),
          'HTTP-Referer': 'https://yuting-miniapp.com',
          'X-Title': 'Yuting MiniApp'
        }
      }, (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks)
            const result = JSON.parse(body.toString('utf8'))
            if (res.statusCode === 200 && result.data && result.data.length > 0) {
              resolve({ code: 0, data: result.data[0] })
            } else {
              resolve({ code: -1, msg: result.error?.message || ('生成失败(HTTP ' + res.statusCode + ')') })
            }
          } catch (err) {
            resolve({ code: -1, msg: '解析响应失败: ' + err.message })
          }
        })
      })
      req.setTimeout(55000, () => {
        req.destroy()
        resolve({ code: -1, msg: '生成超时，请稍后重试或换用更快的模型' })
      })
      req.on('error', (err) => {
        resolve({ code: -1, msg: '网络请求失败: ' + err.message })
      })
      req.write(data)
      req.end()
    })

    if (reqResult.code !== 0) {
      return reqResult
    }

    const imageData = reqResult.data
    if (!imageData.b64_json) {
      return { code: -1, msg: '生成结果中未包含图片数据' }
    }

    // 3. base64 转云存储（展示、历史持久化、保存/分享都走 fileID）
    const mediaType = imageData.media_type || 'image/png'
    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
    const ext = extMap[mediaType] || 'png'
    const cloudPath = 'ai-generated-images/' + familyId + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext
    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(imageData.b64_json, 'base64')
    })
    const fileID = uploadRes.fileID

    // 4. 消息落库（用户提示词 + AI图片回复），复用聊天历史体系。
    // 注意：图片生成成功已扣费，无论落库成败都必须返回 fileID（避免用户重试重复扣费），
    // 落库失败仅打日志
    const saveResults = await Promise.allSettled([
      saveMessage(member, childId, sessionId, 'user', prompt, 'openrouter:' + imageModel, null, null, refIDs.length > 0 ? refIDs : null),
      saveMessage(member, childId, sessionId, 'assistant', '已为你生成图片', 'openrouter:' + imageModel, null, null, fileID)
    ])
    saveResults.forEach(function(result, index) {
      if (result.status === 'rejected') {
        console.error(`图片消息落库失败(${index === 0 ? '用户' : 'AI'}):`, result.reason)
      }
    })

    return {
      code: 0,
      data: {
        fileID: fileID,
        model: imageModel,
        prompt: prompt
      }
    }
  } catch (err) {
    console.error('图片生成失败:', err)
    return { code: -2, msg: '图片生成失败: ' + err.message }
  }
}

// 从云数据库读取百度API密钥（带25天TTL）
let _baiduKeysCache = {}
let _baiduKeysCacheTime = {}
const BAIDU_KEYS_TTL = 25 * 24 * 60 * 60 * 1000 // 25天

// B6：按家庭取用本家庭的百度 TTS 密钥（缓存与查询均以 familyId 隔离），
// 不再"全库第一条"，防止 A 家庭的语音请求消耗 B 家庭配置的付费密钥
async function getBaiduKeys(familyId) {
  const now = Date.now()
  var cacheKey = familyId || '_global'
  if (_baiduKeysCache[cacheKey] && (now - _baiduKeysCacheTime[cacheKey]) < BAIDU_KEYS_TTL) {
    return _baiduKeysCache[cacheKey]
  }
  if (!_baiduKeysCacheTime) _baiduKeysCacheTime = {}

  if (familyId) {
    // 仅查本家庭配置；未配置则明确报错（B6）
    const configRes = await db.collection('aiConfigs').where({
      familyId: familyId,
      baiduTtsApiKey: db.command.exists(true)
    }).get()
    if (configRes.data.length > 0 && configRes.data[0].baiduTtsApiKey && configRes.data[0].baiduTtsSecretKey) {
      _baiduKeysCache[cacheKey] = {
        apiKey: configRes.data[0].baiduTtsApiKey,
        secretKey: configRes.data[0].baiduTtsSecretKey
      }
      _baiduKeysCacheTime[cacheKey] = now
      return _baiduKeysCache[cacheKey]
    }
    throw new Error('本家庭尚未配置百度TTS密钥，请管理员在语音设置中配置')
  }

  // 无家庭上下文（防御路径）：沿用旧的 systemConfig 兜底
  const res = await db.collection('systemConfig').where({ key: 'baiduTTS' }).get()
  if (res.data.length === 0) {
    throw new Error('百度TTS密钥未配置，请在语音设置中配置')
  }
  console.log('使用systemConfig中的百度TTS配置')
  _baiduKeysCache[cacheKey] = { apiKey: res.data[0].apiKey, secretKey: res.data[0].secretKey }
  _baiduKeysCacheTime[cacheKey] = now
  return _baiduKeysCache[cacheKey]
}

// 百度access_token缓存
let _baiduTokenCache = {}
let _baiduTokenCacheTime = {}
const BAIDU_TOKEN_TTL = 25 * 24 * 60 * 60 * 1000 // 25天

// 获取百度access_token
async function getBaiduAccessToken(familyId) {
  const now = Date.now()
  // B6：token 按家庭缓存（不同家庭的密钥换来的 token 不能混用）
  var tkCacheKey = familyId || '_global'
  _baiduTokenCache = _baiduTokenCache || {}
  _baiduTokenCacheTime = _baiduTokenCacheTime || {}
  if (_baiduTokenCache[tkCacheKey] && (now - _baiduTokenCacheTime[tkCacheKey]) < BAIDU_TOKEN_TTL) {
    return _baiduTokenCache[tkCacheKey]
  }

  const https = require('https')
  const keys = await getBaiduKeys(familyId)
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
          _baiduTokenCache[tkCacheKey] = result.access_token
          _baiduTokenCacheTime[tkCacheKey] = now
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
async function speechToText(audioData, familyId) {
  const https = require('https')
  
  try {
    // 获取access_token
    const accessToken = await getBaiduAccessToken(familyId)
    
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
async function textToSpeech(text, voice, baiduPer, mimoVoice, familyId) {
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
      return await mimoTTS(truncatedText, 'mimo-v2.5-tts', null, mimoVoice, familyId)
    } catch (err) {
      console.error('小米TTS异常:', err.message)
      return { code: -1, msg: '小米TTS服务不可用: ' + err.message }
    }
  } else if (baiduPer) {
    // 使用百度TTS
    try {
      return await baiduTTS(truncatedText, ttsVoice, baiduPer, familyId)
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
async function baiduTTS(text, voice, baiduPer, familyId) {
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
    const accessToken = await getBaiduAccessToken(familyId)
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
async function mimoTTS(text, voice, overrideApiKey, overrideVoice, familyId) {
  const https = require('https')

  if (!text || text.trim() === '') {
    return { code: -1, msg: '文本为空' }
  }

  // 移除emoji和特殊字符
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/\s+/g, ' ').trim()

  const voiceName = voice || 'mimo-v2.5-tts'
  const voiceParam = overrideVoice || '冰糖'

  // 获取小米API密钥（复用mimo模型的配置）
  let apiKey = overrideApiKey
  if (!apiKey) {
    // B6：仅查询本家庭的配置，防止跨家庭消耗他人付费密钥
    const configResult = await db.collection('aiConfigs').where({
      familyId: familyId || '',
      mimoTtsApiKey: db.command.exists(true)
    }).get()

    if (configResult.data && configResult.data.length > 0) {
      const config = configResult.data[0]
      // 优先使用TTS专用密钥，如果没有则使用模型配置的密钥
      apiKey = config.mimoTtsApiKey || config.models?.mimo?.apiKey || ''
    }
  }

  if (!apiKey) {
    return { code: -1, msg: '本家庭尚未配置小米API密钥，请管理员在模型配置中设置' }
  }

  console.log('mimoTTS调用参数:', {
    voiceName,
    voiceParam,
    apiKeyLength: apiKey.length,
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
          console.log('小米TTS响应:', { statusCode: res.statusCode, hasAudio: !!(result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.audio) })
          
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
async function getTtsConfig(member, childId) {
  try {
    // 从aiConfigs集合获取（与模型配置共用）
    // 使用与getConfig相同的查询条件（P1-17：childId 以客户端传入为准，member 上无该字段）
    const result = await db.collection('aiConfigs').where({
      familyId: member.familyId,
      childId: childId || ''
    }).get()

    if (result.data && result.data.length > 0) {
      const config = result.data[0]
      // 密钥防泄漏（P0-7）：TTS 合成在云端 textToSpeech 完成，前端只需就绪状态，不回传明文密钥
      return {
        code: 0,
        data: {
          mimoTtsReady: !!config.mimoTtsApiKey,
          baiduTtsReady: !!(config.baiduTtsApiKey && config.baiduTtsSecretKey)
        }
      }
    }

    return {
      code: 0,
      data: {
        mimoTtsReady: false,
        baiduTtsReady: false
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
    // P1-19 配套：TTS 密钥写入同样仅限管理员
    if (!isAdmin(member)) {
      return { code: -1, msg: '仅家庭管理员可修改 TTS 配置' }
    }

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
    
    // B5：只记录字段名，绝不输出密钥明文
    console.log('saveTtsConfig准备保存的字段:', Object.keys(updateData))
    
    // 查询现有配置（使用aiConfigs集合，与模型配置共用）
    // 使用与saveConfig相同的查询条件
    const result = await db.collection('aiConfigs').where({
      familyId: member.familyId,
      childId: event.childId || ''
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
          childId: event.childId || '',
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
        
        // B5：只打印摘要（code/音频长度），不输出含 base64 音频的完整 result
        console.log('音色测试:', voice, 'code:', result.code, 'audioLength:', (result.data && result.data.audio) ? result.data.audio.length : 0)

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
